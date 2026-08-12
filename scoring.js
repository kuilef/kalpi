(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiScoring = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

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
    return {
      score: mean(questions.map((question) => question.evidenceSimilarity)),
      coverage: mean(questions.map((question) => question.coverage)),
      rawScore: mean(questions.filter((question) => question.rawSimilarity != null).map((question) => question.rawSimilarity)),
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

    const weightSum = components.reduce((sum, item) => sum + item.weight, 0);
    const normalized = weightSum > 0
      ? (selector) => components.reduce((sum, item) => sum + selector(item.component) * item.weight, 0) / weightSum
      : (selector) => mean(components.map((item) => selector(item.component)));
    const rawComponents = components.map((item) => ({ component: item.component, weight: item.weight })).filter((item) => item.component.rawScore != null);
    const rawWeightSum = rawComponents.reduce((sum, item) => sum + item.weight, 0);
    const rawScore = rawComponents.length
      ? (rawWeightSum > 0
        ? rawComponents.reduce((sum, item) => sum + item.component.rawScore * item.weight, 0) / rawWeightSum
        : mean(rawComponents.map((item) => item.component.rawScore)))
      : null;

    return {
      familyId: family.id,
      score: normalized((component) => component.score),
      coverage: normalized((component) => component.coverage),
      rawScore,
      fundamental,
      policy,
      questions: [...(fundamental?.questions || []), ...(policy?.questions || [])],
    };
  }

  function calculateFamilyCoverage(args) {
    const family = calculateFamily(args);
    return family ? family.coverage : null;
  }

  function scoreParty({ partyId, answers, positions, scoringConfig }) {
    const positionMap = new Map(
      (positions || []).filter((position) => position.party === partyId).map((position) => [position.question, position])
    );
    const familyResults = (scoringConfig?.families || [])
      .map((family) => ({ family, result: calculateFamily({ family, answers, positionMap, scoringConfig }) }))
      .filter((item) => item.result);
    const totalWeight = familyResults.reduce((sum, item) => sum + (Number(item.family.family_weight) || 0), 0);
    const aggregate = (key) => {
      if (!familyResults.length) return null;
      if (totalWeight <= 0) return mean(familyResults.map((item) => item.result[key]));
      return familyResults.reduce((sum, item) => sum + item.result[key] * (Number(item.family.family_weight) || 0), 0) / totalWeight;
    };
    const rawFamilies = familyResults.filter((item) => item.result.rawScore != null);
    const rawWeight = rawFamilies.reduce((sum, item) => sum + (Number(item.family.family_weight) || 0), 0);

    return {
      partyId,
      score: aggregate('score'),
      coverage: aggregate('coverage'),
      rawScore: rawFamilies.length
        ? (rawWeight > 0
          ? rawFamilies.reduce((sum, item) => sum + item.result.rawScore * (Number(item.family.family_weight) || 0), 0) / rawWeight
          : mean(rawFamilies.map((item) => item.result.rawScore)))
        : null,
      answeredFamilyWeight: totalWeight,
      families: familyResults.map((item) => item.result),
    };
  }

  function rankParties({ parties, answers, positions, scoringConfig }) {
    return (parties || []).map((party, index) => ({
      ...scoreParty({ partyId: party.id, answers, positions, scoringConfig }),
      party,
      _index: index,
    })).sort((left, right) => {
      const scoreDifference = (right.score ?? -Infinity) - (left.score ?? -Infinity);
      if (scoreDifference) return scoreDifference;
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

  function buildRecommendation({ parties, answers, positions, scoringConfig }) {
    const policy = scoringConfig?.result_policy || {};
    const substantiveAnswerCount = Object.values(answers || {}).filter(isSubstantiveAnswer).length;
    const answeredFamilies = answeredFamilyIds({ answers, scoringConfig });
    const minAnswers = Number(policy.min_substantive_answers ?? 1);
    const minFamilies = Number(policy.min_answered_families ?? 1);
    const minPartyCoverage = Number(policy.min_party_result_coverage ?? 0);
    const nearTiePoints = Number(policy.near_tie_points ?? 0);
    const ready = substantiveAnswerCount >= minAnswers && answeredFamilies.length >= minFamilies;
    const ranked = rankParties({ parties, answers, positions, scoringConfig }).map((result) => ({
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
