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

  return { computeDatasetAnalytics };
});
