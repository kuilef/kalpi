const test = require('node:test');
const assert = require('node:assert/strict');
const Analytics = require('../analytics.js');

test('analytics reports party, question, and family coverage from the explicit matrix', () => {
  const result = Analytics.computeDatasetAnalytics({
    parties: [{ id: 'p1' }, { id: 'p2' }],
    questions: [{ id: 'a1', status: 'core' }, { id: 'b1', status: 'core' }],
    positions: [
      { party: 'p1', question: 'a1', value: -1, confidence: 1, status: 'known' },
      { party: 'p1', question: 'b1', value: null, confidence: 0, status: 'insufficient_data' },
      { party: 'p2', question: 'a1', value: -1, confidence: 0.5, status: 'known' },
      { party: 'p2', question: 'b1', value: null, confidence: 0, status: 'insufficient_data' },
    ],
    scoringConfig: { families: [{ id: 'family', fundamental_questions: ['a1'], policy_questions: ['b1'] }] },
  });
  assert.deepEqual(result.summary, { knownCells: 2, totalCells: 4, averageConfidence: 0.75 });
  assert.equal(result.byParty.p1.knownCells, 1);
  assert.equal(result.byQuestion.b1.knownCells, 0);
  assert.equal(result.byFamily.family.knownCells, 2);
  assert.equal(result.gaps.length, 2);
});
