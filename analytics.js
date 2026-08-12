(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiAnalytics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function usable(position) {
    return position && position.status !== 'insufficient_data' && position.value != null && Number(position.confidence) > 0;
  }

  function computeDatasetAnalytics({ parties, questions, positions, scoringConfig }) {
    const activeParties = (parties || []).filter((party) => party.active !== false);
    const coreQuestions = (questions || []).filter((question) => question.status === 'core');
    const map = new Map((positions || []).map((position) => [`${position.party}/${position.question}`, position]));
    const byParty = Object.fromEntries(activeParties.map((party) => [party.id, { knownCells: 0, totalCells: coreQuestions.length, averageConfidence: 0, _sum: 0 }]));
    const byQuestion = Object.fromEntries(coreQuestions.map((question) => [question.id, { knownCells: 0, totalCells: activeParties.length, averageConfidence: 0, _sum: 0 }]));
    const gaps = [];
    let knownCells = 0;
    let confidenceSum = 0;

    for (const party of activeParties) {
      for (const question of coreQuestions) {
        const position = map.get(`${party.id}/${question.id}`);
        if (usable(position)) {
          const confidence = Number(position.confidence);
          knownCells += 1;
          confidenceSum += confidence;
          byParty[party.id].knownCells += 1;
          byParty[party.id]._sum += confidence;
          byQuestion[question.id].knownCells += 1;
          byQuestion[question.id]._sum += confidence;
        } else {
          gaps.push({ partyId: party.id, questionId: question.id });
        }
      }
    }
    for (const item of [...Object.values(byParty), ...Object.values(byQuestion)]) {
      item.averageConfidence = item.knownCells ? item._sum / item.knownCells : 0;
      delete item._sum;
    }
    const byFamily = {};
    for (const family of scoringConfig?.families || []) {
      const questionIds = [...(family.fundamental_questions || []), ...(family.policy_questions || [])];
      const cells = questionIds.flatMap((questionId) => activeParties.map((party) => map.get(`${party.id}/${questionId}`)));
      const known = cells.filter(usable);
      byFamily[family.id] = {
        knownCells: known.length,
        totalCells: cells.length,
        averageConfidence: known.length ? known.reduce((sum, position) => sum + Number(position.confidence), 0) / known.length : 0,
      };
    }
    return {
      summary: { knownCells, totalCells: activeParties.length * coreQuestions.length, averageConfidence: knownCells ? confidenceSum / knownCells : 0 },
      byParty,
      byQuestion,
      byFamily,
      gaps,
    };
  }

  function computeReleaseGate(data) {
    const analytics = computeDatasetAnalytics(data || {});
    const gate = data?.scoringConfig?.release_gate || {};
    const coverageMin = Number(gate.global_coverage_min ?? 1);
    const sliceCoverageMin = Number(gate.slice_coverage_min ?? 1);
    const confidenceMin = Number(gate.global_original_confidence_min ?? 1);
    const sliceConfidenceMin = Number(gate.slice_original_confidence_min ?? 1);
    const failures = [];
    const failCoverage = (label, item, minimum) => {
      const coverage = item.totalCells ? item.knownCells / item.totalCells : 0;
      if (coverage < minimum) failures.push(`${label} coverage ${coverage.toFixed(3)} is below ${minimum.toFixed(3)}`);
    };
    const failConfidence = (label, item, minimum) => {
      if (item.knownCells && item.averageConfidence < minimum) failures.push(`${label} original confidence ${item.averageConfidence.toFixed(3)} is below ${minimum.toFixed(3)}`);
    };

    failCoverage('global', analytics.summary, coverageMin);
    failConfidence('global', analytics.summary, confidenceMin);
    for (const [partyId, item] of Object.entries(analytics.byParty)) {
      failCoverage(`party ${partyId}`, item, sliceCoverageMin);
      failConfidence(`party ${partyId}`, item, sliceConfidenceMin);
    }
    for (const [questionId, item] of Object.entries(analytics.byQuestion)) {
      failCoverage(`question ${questionId}`, item, sliceCoverageMin);
      failConfidence(`question ${questionId}`, item, sliceConfidenceMin);
    }
    for (const [familyId, item] of Object.entries(analytics.byFamily)) {
      failCoverage(`family ${familyId}`, item, sliceCoverageMin);
      failConfidence(`family ${familyId}`, item, sliceConfidenceMin);
    }

    const parties = (data?.parties || []).filter((party) => party.active !== false);
    const questions = (data?.questions || []).filter((question) => question.status === 'core');
    const expectedKeys = new Set(parties.flatMap((party) => questions.map((question) => `${party.id}/${question.id}`)));
    const seenKeys = new Set();
    const sourceIds = new Set((data?.sources || []).map((source) => source.id));
    for (const position of data?.positions || []) {
      const key = `${position.party}/${position.question}`;
      if (!expectedKeys.has(key)) failures.push(`unexpected position ${key}`);
      if (seenKeys.has(key)) failures.push(`duplicate position ${key}`);
      seenKeys.add(key);
      for (const sourceId of position.evidence || []) {
        if (!sourceIds.has(sourceId)) failures.push(`missing evidence source ${sourceId} for ${key}`);
      }
    }
    for (const key of expectedKeys) if (!seenKeys.has(key)) failures.push(`missing position ${key}`);
    return { passed: failures.length === 0, failures, metrics: analytics };
  }

  function computeResearchAnalytics(data) {
    const parties = (data?.parties || []).filter((party) => party.active !== false);
    const questions = (data?.questions || []).filter((question) => question.status === 'core');
    const positions = data?.positions || [];
    const sources = data?.sources || [];
    const sourceById = new Map(sources.map((source) => [source.id, source]));
    const positionByKey = new Map(positions.map((position) => [`${position.party}/${position.question}`, position]));
    const familyByQuestion = new Map();
    for (const family of data?.scoringConfig?.families || []) {
      for (const questionId of [...(family.fundamental_questions || []), ...(family.policy_questions || [])]) familyByQuestion.set(questionId, family.id);
    }
    const statusCounts = { known: 0, mixed: 0, historical: 0, insufficient_data: 0 };
    const scopeCounts = {};
    const sourceVerificationCounts = {};
    const sourceTypeCounts = {};
    const usedEvidenceIds = new Set();
    const cells = [];

    for (const party of parties) {
      for (const question of questions) {
        const position = positionByKey.get(`${party.id}/${question.id}`) || {
          party: party.id, question: question.id, value: null, confidence: 0, status: 'insufficient_data', entity_scope: 'PARTY', evidence: [], explanation_ru: '', last_verified: null,
        };
        const status = position.status || 'insufficient_data';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        const scope = position.entity_scope || 'not_recorded';
        scopeCounts[scope] = (scopeCounts[scope] || 0) + 1;
        const evidence = (position.evidence || []).map((sourceId) => {
          usedEvidenceIds.add(sourceId);
          return sourceById.get(sourceId) || { id: sourceId, verification_status: 'missing' };
        });
        cells.push({ party, question, familyId: familyByQuestion.get(question.id) || null, position, evidence });
      }
    }
    for (const source of sources) {
      const verification = source.verification_status || 'not_recorded';
      const type = source.source_type || 'not_recorded';
      sourceVerificationCounts[verification] = (sourceVerificationCounts[verification] || 0) + 1;
      sourceTypeCounts[type] = (sourceTypeCounts[type] || 0) + 1;
    }
    const reviewQueue = [...cells]
      .filter((cell) => cell.position.status === 'insufficient_data' || Number(cell.position.confidence || 0) < 0.7)
      .sort((left, right) => {
        const leftGap = left.position.status === 'insufficient_data' ? 0 : 1;
        const rightGap = right.position.status === 'insufficient_data' ? 0 : 1;
        return leftGap - rightGap || Number(left.position.confidence || 0) - Number(right.position.confidence || 0);
      });
    return {
      cells,
      statusCounts,
      scopeCounts,
      sourceVerificationCounts,
      sourceTypeCounts,
      unusedSources: sources.filter((source) => !usedEvidenceIds.has(source.id)),
      reviewQueue,
    };
  }

  return { computeDatasetAnalytics, computeReleaseGate, computeResearchAnalytics };
});
