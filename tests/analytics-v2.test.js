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

test('release gate requires global and every-slice coverage and original confidence', () => {
  const data = {
    parties: [{ id: 'p1' }, { id: 'p2' }],
    questions: [{ id: 'a1', status: 'core' }, { id: 'b1', status: 'core' }],
    positions: [
      { party: 'p1', question: 'a1', value: -1, confidence: 0.8, status: 'known', evidence: ['s1'], explanation_ru: 'x', last_verified: '2026-08-11' },
      { party: 'p1', question: 'b1', value: 1, confidence: 0.8, status: 'mixed', evidence: ['s1'], explanation_ru: 'x', last_verified: '2026-08-11' },
      { party: 'p2', question: 'a1', value: -1, confidence: 0.8, status: 'historical', evidence: ['s1'], explanation_ru: 'x', last_verified: '2026-08-11' },
      { party: 'p2', question: 'b1', value: null, confidence: 0, status: 'insufficient_data', evidence: [], explanation_ru: '', last_verified: null },
    ],
    sources: [{ id: 's1' }],
    scoringConfig: {
      families: [{ id: 'family-a', fundamental_questions: ['a1'], policy_questions: ['b1'] }],
      release_gate: {
        global_coverage_min: 0.7,
        slice_coverage_min: 0.6,
        global_original_confidence_min: 0.7,
        slice_original_confidence_min: 0.7,
      },
    },
  };

  const result = Analytics.computeReleaseGate(data);
  assert.equal(result.passed, false);
  assert.ok(result.failures.some((failure) => failure.includes('party p2 coverage')));
  assert.equal(result.metrics.summary.knownCells, 3);
});

test('research analytics exposes a filterable matrix, provenance and review queue', () => {
  const result = Analytics.computeResearchAnalytics({
    parties: [{ id: 'p1', name_ru: 'Партия' }],
    questions: [{ id: 'q1', status: 'core', short_title_ru: 'Вопрос' }, { id: 'q2', status: 'core', short_title_ru: 'Пробел' }],
    positions: [
      { party: 'p1', question: 'q1', value: 1, confidence: 0.4, status: 'mixed', entity_scope: 'LEADER', evidence: ['s1'], explanation_ru: 'x', last_verified: '2026-08-11' },
      { party: 'p1', question: 'q2', value: null, confidence: 0, status: 'insufficient_data', entity_scope: 'PARTY', evidence: [] },
    ],
    sources: [
      { id: 's1', verification_status: 'candidate_unverified', source_type: 'reputable_reporting' },
      { id: 's2', verification_status: 'verified', source_type: 'official' },
    ],
    scoringConfig: { families: [{ id: 'family', fundamental_questions: ['q1'], policy_questions: ['q2'] }] },
  });
  assert.equal(result.cells.length, 2);
  assert.equal(result.statusCounts.mixed, 1);
  assert.equal(result.scopeCounts.LEADER, 1);
  assert.equal(result.sourceVerificationCounts.candidate_unverified, 1);
  assert.deepEqual(result.unusedSources.map((source) => source.id), ['s2']);
  assert.equal(result.reviewQueue.length, 2);
});
