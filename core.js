(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const USABLE_STATUSES = new Set(['known', 'mixed', 'historical']);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function computeAgreement(userValue, partyValue) {
    const distance = Math.abs(Number(userValue) - Number(partyValue)) / 4;
    return clamp(1 - distance, 0, 1);
  }

  function isAnswered(value) {
    return value !== undefined && value !== null && value !== 'skip';
  }

  function normalizePriorityQuestionIds({ priorityQuestionIds = [], answers, questions }) {
    const eligibleIds = new Set(
      (questions || [])
        .filter((question) => question.enabled !== false && isAnswered(answers?.[question.id]))
        .map((question) => question.id)
    );
    return [...new Set(priorityQuestionIds)].filter((id) => eligibleIds.has(id));
  }

  function effectivePositionConfidence(position) {
    if (!position || !USABLE_STATUSES.has(position.status) || position.value == null) return 0;
    const confidence = clamp(Number(position.confidence ?? 0), 0, 1);
    if (position.entity_scope === 'COMPONENT_PARTY' || position.entity_scope === 'LEADER' || position.entity_scope === 'INDIVIDUAL_MK') {
      return confidence * 0.65;
    }
    return confidence;
  }

  function scoreParty({ partyId, answers, questions, positions, priorityQuestionIds = [] }) {
    const positionMap = new Map(
      (positions || []).filter((p) => p.party === partyId).map((p) => [p.question, p])
    );
    const priorities = new Set(normalizePriorityQuestionIds({ priorityQuestionIds, answers, questions }));

    let totalAnsweredWeight = 0;
    let knownEffectiveWeight = 0;
    let agreementWeightedSum = 0;
    let knownCount = 0;
    let unknownCount = 0;
    const details = [];

    for (const question of questions || []) {
      if (question.enabled === false) continue;
      const userValue = answers ? answers[question.id] : undefined;
      if (!isAnswered(userValue)) continue;

      const rankingWeight = priorities.has(question.id) ? 2 : 1;
      totalAnsweredWeight += rankingWeight;
      const position = positionMap.get(question.id);
      const confidence = effectivePositionConfidence(position);

      if (confidence <= 0) {
        unknownCount += 1;
        details.push({ questionId: question.id, status: 'insufficient_data', userValue, position: position || null });
        continue;
      }

      const effectiveWeight = rankingWeight * confidence;
      const agreementQ = computeAgreement(userValue, position.value);
      knownEffectiveWeight += effectiveWeight;
      agreementWeightedSum += agreementQ * effectiveWeight;
      knownCount += 1;
      details.push({ questionId: question.id, status: position.status, userValue, partyValue: position.value, agreement: agreementQ, effectiveWeight, position });
    }

    const agreement = knownEffectiveWeight > 0 ? agreementWeightedSum / knownEffectiveWeight : 0.5;
    const coverage = totalAnsweredWeight > 0 ? clamp(knownEffectiveWeight / totalAnsweredWeight, 0, 1) : 0;
    const finalScore = agreement * coverage + 0.5 * (1 - coverage);

    return { agreement, coverage, finalScore, knownCount, unknownCount, details };
  }

  function computeAxisCoordinate({ axisId, questions, answersOrPositions, minCoverage = 0.35 }) {
    let totalRelevantWeight = 0;
    let effectiveWeight = 0;
    let weightedSum = 0;

    for (const question of questions || []) {
      if (question.enabled === false) continue;
      const axisWeight = Number((question.axis_weights || {})[axisId] || 0);
      if (!axisWeight) continue;
      const importance = Math.max(0, Number(question.importance_default ?? 1));
      const baseWeight = Math.abs(axisWeight) * importance;
      totalRelevantWeight += baseWeight;

      const entry = answersOrPositions ? answersOrPositions[question.id] : null;
      if (!entry || entry.usable === false || entry.value == null) continue;
      const confidence = clamp(Number(entry.confidence ?? 1), 0, 1);
      if (confidence <= 0) continue;
      const w = baseWeight * confidence;
      effectiveWeight += w;
      weightedSum += Number(entry.value) * axisWeight * importance * confidence;
    }

    const coverage = totalRelevantWeight > 0 ? clamp(effectiveWeight / totalRelevantWeight, 0, 1) : 0;
    if (effectiveWeight <= 0 || coverage < minCoverage) {
      return { status: 'insufficient_data', value: null, coverage };
    }
    const nativeValue = weightedSum / effectiveWeight;
    return { status: 'known', value: clamp(nativeValue * 50, -100, 100), coverage };
  }

  function computeUserAxes({ answers, questions, axes, minCoverage = 0 }) {
    const entries = {};
    for (const question of questions || []) {
      const v = answers ? answers[question.id] : undefined;
      if (!isAnswered(v)) continue;
      entries[question.id] = { value: Number(v), confidence: 1, usable: true };
    }
    const result = {};
    for (const axis of axes || []) {
      result[axis.id] = computeAxisCoordinate({ axisId: axis.id, questions, answersOrPositions: entries, minCoverage });
    }
    return result;
  }

  function computePartyAxes({ partyId, questions, positions, axes, minCoverage = 0.35 }) {
    const entries = {};
    for (const position of positions || []) {
      if (position.party !== partyId) continue;
      const confidence = effectivePositionConfidence(position);
      if (confidence <= 0) continue;
      entries[position.question] = { value: Number(position.value), confidence, usable: true };
    }
    const result = {};
    for (const axis of axes || []) {
      result[axis.id] = computeAxisCoordinate({ axisId: axis.id, questions, answersOrPositions: entries, minCoverage });
    }
    return result;
  }

  function computeDatasetAnalytics({ data, baselineData = null, axisCoverageThreshold = 0.35 }) {
    const parties = (data?.parties || []).filter((p) => p.active !== false);
    const questions = (data?.questions || []).filter((q) => q.enabled !== false);
    const axes = data?.axes || [];
    const positions = data?.positions || [];
    const sources = data?.sources || [];
    const positionMap = new Map(positions.map((p) => [`${p.party}::${p.question}`, p]));
    const baselinePositionMap = new Map((baselineData?.positions || []).map((p) => [`${p.party}::${p.question}`, p]));
    const sourceMap = new Map(sources.map((s) => [s.id, s]));
    const baselineSourceIds = new Set((baselineData?.sources || []).map((s) => s.id));

    const byParty = Object.fromEntries(parties.map((p) => [p.id, {
      partyId: p.id, totalCells: questions.length, usableCells: 0, rawCoverage: 0, weightedCoverage: 0,
      avgConfidence: 0, avgEffectiveConfidence: 0, highConfidenceCells: 0, deltaUsableCells: null,
      _rawConfidenceSum: 0, _effectiveConfidenceSum: 0,
    }]));
    const byQuestion = Object.fromEntries(questions.map((q) => [q.id, {
      questionId: q.id, totalCells: parties.length, usableCells: 0, rawCoverage: 0, weightedCoverage: 0,
      avgConfidence: 0, avgEffectiveConfidence: 0, highConfidenceCells: 0,
      _rawConfidenceSum: 0, _effectiveConfidenceSum: 0,
    }]));
    const provenance = {};
    const statuses = { known: 0, mixed: 0, historical: 0, insufficient_data: 0 };
    const gaps = [];
    const usedEvidenceIds = new Set();
    let usableCells = 0;
    let rawConfidenceSum = 0;
    let effectiveConfidenceSum = 0;
    let highConfidenceCells = 0;

    let gainedKnown = 0;
    let lostKnown = 0;
    let valueChanged = 0;
    let confidenceImproved = 0;
    let confidenceDecreased = 0;
    let baselineUsableCells = 0;
    let baselineEffectiveConfidenceSum = 0;

    for (const party of parties) {
      let baselinePartyUsable = 0;
      for (const question of questions) {
        const key = `${party.id}::${question.id}`;
        const position = positionMap.get(key) || null;
        const effective = effectivePositionConfidence(position);
        const usable = effective > 0;
        const rawConfidence = usable ? clamp(Number(position.confidence ?? 0), 0, 1) : 0;
        const status = usable ? position.status : 'insufficient_data';
        statuses[status] = (statuses[status] || 0) + 1;

        if (usable) {
          usableCells += 1;
          rawConfidenceSum += rawConfidence;
          effectiveConfidenceSum += effective;
          if (effective >= 0.85) highConfidenceCells += 1;
          provenance[position.entity_scope] = (provenance[position.entity_scope] || 0) + 1;
          for (const evidenceId of position.evidence || []) usedEvidenceIds.add(evidenceId);

          const partyStats = byParty[party.id];
          partyStats.usableCells += 1;
          partyStats._rawConfidenceSum += rawConfidence;
          partyStats._effectiveConfidenceSum += effective;
          if (effective >= 0.85) partyStats.highConfidenceCells += 1;

          const questionStats = byQuestion[question.id];
          questionStats.usableCells += 1;
          questionStats._rawConfidenceSum += rawConfidence;
          questionStats._effectiveConfidenceSum += effective;
          if (effective >= 0.85) questionStats.highConfidenceCells += 1;
        } else {
          gaps.push({ partyId: party.id, questionId: question.id });
        }

        if (baselineData) {
          const baselinePosition = baselinePositionMap.get(key) || null;
          const baselineEffective = effectivePositionConfidence(baselinePosition);
          const baselineUsable = baselineEffective > 0;
          if (baselineUsable) {
            baselineUsableCells += 1;
            baselinePartyUsable += 1;
            baselineEffectiveConfidenceSum += baselineEffective;
          }
          if (!baselineUsable && usable) gainedKnown += 1;
          if (baselineUsable && !usable) lostKnown += 1;
          if (baselineUsable && usable) {
            if (Number(baselinePosition.value) !== Number(position.value)) valueChanged += 1;
            const diff = effective - baselineEffective;
            if (diff > 0.05) confidenceImproved += 1;
            else if (diff < -0.05) confidenceDecreased += 1;
          }
        }
      }
      if (baselineData) byParty[party.id].deltaUsableCells = byParty[party.id].usableCells - baselinePartyUsable;
    }

    const totalCells = parties.length * questions.length;
    for (const stats of Object.values(byParty)) {
      stats.rawCoverage = stats.totalCells ? stats.usableCells / stats.totalCells : 0;
      stats.weightedCoverage = stats.totalCells ? stats._effectiveConfidenceSum / stats.totalCells : 0;
      stats.avgConfidence = stats.usableCells ? stats._rawConfidenceSum / stats.usableCells : 0;
      stats.avgEffectiveConfidence = stats.usableCells ? stats._effectiveConfidenceSum / stats.usableCells : 0;
      delete stats._rawConfidenceSum; delete stats._effectiveConfidenceSum;
    }
    for (const stats of Object.values(byQuestion)) {
      stats.rawCoverage = stats.totalCells ? stats.usableCells / stats.totalCells : 0;
      stats.weightedCoverage = stats.totalCells ? stats._effectiveConfidenceSum / stats.totalCells : 0;
      stats.avgConfidence = stats.usableCells ? stats._rawConfidenceSum / stats.usableCells : 0;
      stats.avgEffectiveConfidence = stats.usableCells ? stats._effectiveConfidenceSum / stats.usableCells : 0;
      delete stats._rawConfidenceSum; delete stats._effectiveConfidenceSum;
    }

    const byAxis = {};
    for (const axis of axes) {
      let coverageSum = 0;
      let supportedParties = 0;
      const partyCoverage = {};
      for (const party of parties) {
        const result = computePartyAxes({ partyId: party.id, questions, positions, axes: [axis], minCoverage: axisCoverageThreshold })[axis.id];
        const coverage = result?.coverage || 0;
        coverageSum += coverage;
        partyCoverage[party.id] = { coverage, status: result?.status || 'insufficient_data' };
        if (result?.status === 'known') supportedParties += 1;
      }
      byAxis[axis.id] = {
        axisId: axis.id,
        totalParties: parties.length,
        supportedParties,
        averageCoverage: parties.length ? coverageSum / parties.length : 0,
        partyCoverage,
      };
    }

    const sourceTypes = {};
    for (const sourceId of usedEvidenceIds) {
      const type = sourceMap.get(sourceId)?.source_type || 'unknown';
      sourceTypes[type] = (sourceTypes[type] || 0) + 1;
    }

    const summary = {
      totalCells,
      usableCells,
      insufficientCells: totalCells - usableCells,
      rawCoverage: totalCells ? usableCells / totalCells : 0,
      weightedCoverage: totalCells ? effectiveConfidenceSum / totalCells : 0,
      avgConfidence: usableCells ? rawConfidenceSum / usableCells : 0,
      avgEffectiveConfidence: usableCells ? effectiveConfidenceSum / usableCells : 0,
      highConfidenceCells,
      sourceCount: sources.length,
      usedSourceCount: usedEvidenceIds.size,
    };

    const comparison = baselineData ? {
      baselineUsableCells,
      currentUsableCells: usableCells,
      baselineRawCoverage: totalCells ? baselineUsableCells / totalCells : 0,
      currentRawCoverage: summary.rawCoverage,
      baselineWeightedCoverage: totalCells ? baselineEffectiveConfidenceSum / totalCells : 0,
      currentWeightedCoverage: summary.weightedCoverage,
      deltaUsableCells: usableCells - baselineUsableCells,
      gainedKnown,
      lostKnown,
      valueChanged,
      confidenceImproved,
      confidenceDecreased,
      sourcesAdded: sources.filter((s) => !baselineSourceIds.has(s.id)).length,
    } : null;

    return { summary, byParty, byQuestion, byAxis, provenance, statuses, sourceTypes, gaps, comparison };
  }

  function validateDataset(data) {
    const errors = [];
    for (const key of ['axes', 'parties', 'questions', 'positions', 'sources']) {
      if (!Array.isArray(data?.[key])) errors.push(`${key} must be an array`);
    }
    const axes = Array.isArray(data?.axes) ? data.axes : [];
    const parties = Array.isArray(data?.parties) ? data.parties : [];
    const questions = Array.isArray(data?.questions) ? data.questions : [];
    const positions = Array.isArray(data?.positions) ? data.positions : [];
    const sources = Array.isArray(data?.sources) ? data.sources : [];

    const duplicateErrors = (items, label) => {
      const seen = new Set();
      for (const item of items) {
        if (!item || typeof item.id !== 'string' || !item.id) { errors.push(`${label}: missing id`); continue; }
        if (seen.has(item.id)) errors.push(`${label}: duplicate id ${item.id}`);
        seen.add(item.id);
      }
      return seen;
    };

    const axisIds = duplicateErrors(axes, 'axes');
    const partyIds = duplicateErrors(parties, 'parties');
    const questionIds = duplicateErrors(questions, 'questions');
    const sourceIds = duplicateErrors(sources, 'sources');

    const requireLocalized = (records, label, fields) => {
      for (const record of records) {
        for (const field of fields) {
          for (const locale of ['en', 'ru', 'he']) {
            const key = `${field}_${locale}`;
            if (typeof record?.[key] !== 'string' || !record[key].trim()) {
              errors.push(`${label} ${record?.id || '(missing id)'}: missing ${key}`);
            }
          }
        }
      }
    };
    requireLocalized(axes, 'axis', ['name', 'negative', 'positive']);
    requireLocalized(parties, 'party', ['name', 'leader']);
    requireLocalized(questions, 'question', ['text', 'group']);

    for (const question of questions) {
      for (const axisId of Object.keys(question.axis_weights || {})) {
        if (!axisIds.has(axisId)) errors.push(`question ${question.id}: unknown axis ${axisId}`);
        const weight = Number(question.axis_weights[axisId]);
        if (!Number.isFinite(weight) || Math.abs(weight) > 2) errors.push(`question ${question.id}: invalid axis weight ${axisId}`);
      }
    }

    const allowedStatuses = new Set(['known', 'mixed', 'historical', 'insufficient_data']);
    const allowedScopes = new Set(['CURRENT_LIST', 'PARTY', 'FACTION', 'COMPONENT_PARTY', 'LEADER', 'INDIVIDUAL_MK']);
    const positionKeys = new Map();
    for (const position of positions) {
      const pairKey = `${position?.party}/${position?.question}`;
      positionKeys.set(pairKey, (positionKeys.get(pairKey) || 0) + 1);
      if (positionKeys.get(pairKey) === 2) errors.push(`duplicate position ${pairKey}`);
      if (!partyIds.has(position.party)) errors.push(`position ${position.party}/${position.question}: unknown party ${position.party}`);
      if (!questionIds.has(position.question)) errors.push(`position ${position.party}/${position.question}: unknown question ${position.question}`);
      if (!allowedStatuses.has(position.status)) errors.push(`position ${position.party}/${position.question}: invalid status ${position.status}`);
      if (!allowedScopes.has(position.entity_scope)) errors.push(`position ${position.party}/${position.question}: invalid entity_scope ${position.entity_scope}`);
      if (position.status === 'insufficient_data') {
        if (position.value !== null) errors.push(`position ${position.party}/${position.question}: insufficient_data value must be null`);
      } else if (!Number.isFinite(Number(position.value)) || Number(position.value) < -2 || Number(position.value) > 2) {
        errors.push(`position ${position.party}/${position.question}: value must be in [-2, 2]`);
      }
      const confidence = Number(position.confidence);
      if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) errors.push(`position ${position.party}/${position.question}: confidence must be in [0, 1]`);
      for (const evidenceId of position.evidence || []) {
        if (!sourceIds.has(evidenceId)) errors.push(`position ${position.party}/${position.question}: unknown evidence ${evidenceId}`);
      }
    }

    for (const party of parties) {
      for (const question of questions) {
        const pairKey = `${party.id}/${question.id}`;
        if (!positionKeys.has(pairKey)) errors.push(`missing position ${pairKey}`);
      }
    }

    return errors;
  }

  return {
    computeAgreement,
    normalizePriorityQuestionIds,
    scoreParty,
    computeAxisCoordinate,
    computeUserAxes,
    computePartyAxes,
    validateDataset,
    effectivePositionConfidence,
    isAnswered,
    computeDatasetAnalytics,
  };
});
