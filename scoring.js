(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiScoring = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCORE_EPSILON = 1e-12;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isSubstantiveAnswer(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= -1 && value <= 1;
  }

  function questionSimilarity(userValue, partyValue) {
    return clamp(1 - Math.abs(Number(userValue) - Number(partyValue)) / 2, 0, 1);
  }

  function confidenceAdjustedSimilarity(rawSimilarity, confidence) {
    return 0.5 + clamp(Number(confidence), 0, 1) * (Number(rawSimilarity) - 0.5);
  }

  function mean(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  function weightedMean(items, selector) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    return totalWeight ? items.reduce((sum, item) => sum + selector(item) * item.weight, 0) / totalWeight : null;
  }

  function positionConfidence(position, scoringConfig) {
    if (!position || position.value == null || position.status === 'insufficient_data') return 0;
    if (scoringConfig?.prototype_trust_policy === 'all_value_positions_full_confidence') return 1;
    return clamp(Number(position.confidence), 0, 1);
  }

  function hasKnownPosition(position) {
    return Boolean(position && position.value != null && position.status !== 'insufficient_data');
  }

  function calculateComponent({ questionIds, answers, positionMap, scoringConfig }) {
    const questions = [];
    for (const questionId of questionIds || []) {
      if (!Object.prototype.hasOwnProperty.call(answers || {}, questionId)) continue;
      const userValue = answers[questionId];
      if (!isSubstantiveAnswer(userValue)) continue;

      const position = positionMap.get(questionId) || null;
      const knownPosition = hasKnownPosition(position);
      const confidence = positionConfidence(position, scoringConfig);
      const partyValue = knownPosition ? Number(position.value) : null;
      const rawSimilarity = partyValue == null ? null : questionSimilarity(userValue, partyValue);
      const evidenceSimilarity = rawSimilarity == null
        ? 0.5
        : confidenceAdjustedSimilarity(rawSimilarity, confidence);

      questions.push({
        questionId,
        weight: 1,
        userValue,
        partyValue,
        confidence,
        rawSimilarity,
        evidenceSimilarity,
        coverage: confidence,
        position,
        originalStatus: position?.status || 'insufficient_data',
        originalConfidence: position ? clamp(Number(position.confidence), 0, 1) : 0,
        effectiveStatus: knownPosition && confidence > 0 ? 'known' : 'insufficient_data',
        effectiveConfidence: confidence,
      });
    }

    if (!questions.length) return null;
    const scoredQuestions = questions.filter((question) => question.rawSimilarity != null);
    return {
      score: weightedMean(scoredQuestions, (question) => question.evidenceSimilarity),
      coverage: weightedMean(questions, (question) => question.coverage),
      rawScore: weightedMean(scoredQuestions, (question) => question.rawSimilarity),
      questions,
    };
  }

  function calculateFamily({ family, answers, positionMap, scoringConfig }) {
    const fundamental = calculateComponent({
      questionIds: family.fundamental_questions,
      answers,
      positionMap,
      scoringConfig,
    });
    const policy = calculateComponent({
      questionIds: family.policy_questions,
      answers,
      positionMap,
      scoringConfig,
    });
    const components = [
      fundamental && { component: fundamental, weight: Number(family.fundamental_weight) || 0 },
      policy && { component: policy, weight: Number(family.policy_weight) || 0 },
    ].filter(Boolean);
    if (!components.length) return null;

    const normalizeComponents = (items, selector) => {
      if (!items.length) return null;
      const weightSum = items.reduce((sum, item) => sum + item.weight, 0);
      return weightSum > 0
        ? items.reduce((sum, item) => sum + selector(item.component) * item.weight, 0) / weightSum
        : mean(items.map((item) => selector(item.component)));
    };
    const scoreComponents = components.filter((item) => item.component.score != null);
    const rawComponents = components.map((item) => ({ component: item.component, weight: item.weight })).filter((item) => item.component.rawScore != null);

    return {
      familyId: family.id,
      score: normalizeComponents(scoreComponents, (component) => component.score),
      coverage: normalizeComponents(components, (component) => component.coverage),
      rawScore: normalizeComponents(rawComponents, (component) => component.rawScore),
      fundamental,
      policy,
      questions: [...(fundamental?.questions || []), ...(policy?.questions || [])],
    };
  }

  function calculateFamilyCoverage(args) {
    const family = calculateFamily(args);
    return family ? family.coverage : null;
  }

  function scoreParty({ partyId, answers, positions, scoringConfig, priorityQuestionIds = [] }) {
    const positionMap = new Map(
      (positions || []).filter((position) => position.party === partyId).map((position) => [position.question, position])
    );
    const enabledPriorities = scoringConfig?.user_importance_enabled
      ? priorityQuestionIds.filter((questionId) => isSubstantiveAnswer(answers?.[questionId]))
      : [];
    const prioritySet = new Set(enabledPriorities);
    const priorityFamilyIds = new Set((scoringConfig?.families || [])
      .filter((family) => [...(family.fundamental_questions || []), ...(family.policy_questions || [])]
        .some((questionId) => prioritySet.has(questionId)))
      .map((family) => family.id));
    const configuredFamilyMultiplier = Number(scoringConfig?.user_importance_family_multiplier ?? 2);
    const familyImportanceMultiplier = scoringConfig?.user_importance_enabled
      ? (Number.isFinite(configuredFamilyMultiplier) ? Math.max(1, configuredFamilyMultiplier) : 2)
      : 1;
    const familyResults = (scoringConfig?.families || [])
      .map((family) => ({ family, result: calculateFamily({ family, answers, positionMap, scoringConfig }) }))
      .filter((item) => item.result);
    const baseFamilyWeight = (item) => Number(item.family.family_weight) || 0;
    const scoreFamilyWeight = (item) => baseFamilyWeight(item)
      * (priorityFamilyIds.has(item.family.id) ? familyImportanceMultiplier : 1);
    const totalWeight = familyResults.reduce((sum, item) => sum + baseFamilyWeight(item), 0);
    const aggregate = (key, usePriorityWeights = false) => {
      const items = key === 'score' || key === 'rawScore'
        ? familyResults.filter((item) => item.result[key] != null)
        : familyResults;
      if (!items.length) return null;
      const weightOf = usePriorityWeights ? scoreFamilyWeight : baseFamilyWeight;
      const weightSum = items.reduce((sum, item) => sum + weightOf(item), 0);
      if (weightSum <= 0) return mean(items.map((item) => item.result[key]));
      return items.reduce((sum, item) => sum + item.result[key] * weightOf(item), 0) / weightSum;
    };
    return {
      partyId,
      score: aggregate('score', true),
      coverage: aggregate('coverage'),
      rawScore: aggregate('rawScore', true),
      answeredFamilyWeight: totalWeight,
      families: familyResults.map((item) => item.result),
    };
  }

  function rankParties({ parties, answers, positions, scoringConfig, priorityQuestionIds = [] }) {
    return (parties || []).map((party, index) => ({
      ...scoreParty({ partyId: party.id, answers, positions, scoringConfig, priorityQuestionIds }),
      party,
      _index: index,
    })).sort((left, right) => {
      const scoreDifference = (right.score ?? -Infinity) - (left.score ?? -Infinity);
      if (Math.abs(scoreDifference) > SCORE_EPSILON) return scoreDifference;
      const coverageDifference = (right.coverage ?? -Infinity) - (left.coverage ?? -Infinity);
      if (coverageDifference) return coverageDifference;
      return left._index - right._index;
    }).map(({ _index, ...result }) => result);
  }

  function answeredFamilyIds({ answers, scoringConfig }) {
    const answered = new Set(Object.entries(answers || {})
      .filter(([, value]) => isSubstantiveAnswer(value))
      .map(([questionId]) => questionId));
    return (scoringConfig?.families || [])
      .filter((family) => [...(family.fundamental_questions || []), ...(family.policy_questions || [])]
        .some((questionId) => answered.has(questionId)))
      .map((family) => family.id);
  }

  function buildRecommendation({ parties, answers, positions, scoringConfig, priorityQuestionIds = [] }) {
    const policy = scoringConfig?.result_policy || {};
    const substantiveAnswerCount = Object.values(answers || {}).filter(isSubstantiveAnswer).length;
    const answeredFamilies = answeredFamilyIds({ answers, scoringConfig });
    const minAnswers = Number(policy.min_substantive_answers ?? 1);
    const minFamilies = Number(policy.min_answered_families ?? 1);
    const minPartyCoverage = Number(policy.min_party_result_coverage ?? 0);
    const nearTiePoints = Number(policy.near_tie_points ?? 0);
    const ready = substantiveAnswerCount >= minAnswers && answeredFamilies.length >= minFamilies;
    const ranked = rankParties({ parties, answers, positions, scoringConfig, priorityQuestionIds }).map((result) => ({
      ...result,
      eligible: ready && Number(result.coverage || 0) >= minPartyCoverage,
    }));
    const eligible = ranked.filter((result) => result.eligible);
    const ineligible = ranked.filter((result) => !result.eligible);
    const leader = eligible[0] || null;
    const displayed = [...eligible, ...ineligible].map((result) => ({
      ...result,
      gapFromLeader: leader ? Math.max(0, leader.score - result.score) : null,
      nearTie: Boolean(leader && result.partyId !== leader.partyId && result.eligible && leader.score - result.score <= nearTiePoints),
    }));
    const displayedLeader = displayed.find((result) => result.partyId === leader?.partyId) || null;
    return {
      ready,
      reasons: [
        ...(substantiveAnswerCount < minAnswers ? [`need ${minAnswers} substantive answers`] : []),
        ...(answeredFamilies.length < minFamilies ? [`need ${minFamilies} answered families`] : []),
        ...(!leader && ready ? ['no party meets minimum result coverage'] : []),
      ],
      substantiveAnswerCount,
      answeredFamilyIds: answeredFamilies,
      ranked: displayed,
      leader: displayedLeader,
      nearTies: displayed.filter((result) => result.nearTie),
    };
  }

  return {
    isSubstantiveAnswer,
    questionSimilarity,
    confidenceAdjustedSimilarity,
    calculateComponent,
    calculateFamily,
    calculateFamilyCoverage,
    scoreParty,
    rankParties,
    answeredFamilyIds,
    buildRecommendation,
  };
});
