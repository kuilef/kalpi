const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../core.js');

function validDatasetFixture() {
  return {
    axes: [{ id: 'a', name_ru: 'Ось', name_en: 'Axis', name_he: 'ציר', negative_ru: 'минус', negative_en: 'negative', negative_he: 'שלילי', positive_ru: 'плюс', positive_en: 'positive', positive_he: 'חיובי' }],
    parties: [{ id: 'p', name_ru: 'Партия', name_en: 'Party', name_he: 'מפלגה', leader_ru: 'Лидер', leader_en: 'Leader', leader_he: 'מנהיג' }],
    questions: [{ id: 'q', text_ru: 'Вопрос', text_en: 'Question', text_he: 'שאלה', group_ru: 'Группа', group_en: 'Group', group_he: 'קבוצה', axis_weights: { a: 1 } }],
    positions: [{ party: 'p', question: 'q', value: 1, status: 'known', confidence: 1, entity_scope: 'PARTY', evidence: ['s'] }],
    sources: [{ id: 's', notes_ru: 'Заметка', notes_en: 'Note', notes_he: 'הערה' }],
  };
}

test('validation reports a missing Hebrew question field', () => {
  const data = validDatasetFixture();
  delete data.questions[0].text_he;
  assert.ok(Core.validateDataset(data).includes('question q: missing text_he'));
});

const questions = [
  { id: 'q1', importance_default: 1, axis_weights: { a: 1 }, enabled: true },
  { id: 'q2', importance_default: 1, axis_weights: { a: 1 }, enabled: true },
];

test('exact answer match has agreement 1', () => {
  assert.equal(Core.computeAgreement(2, 2), 1);
});

test('opposite answers have agreement 0', () => {
  assert.equal(Core.computeAgreement(2, -2), 0);
});

test('insufficient position is excluded from agreement but lowers coverage', () => {
  const result = Core.scoreParty({
    partyId: 'p1',
    answers: { q1: 2, q2: 2 },
    questions,
    positions: [
      { party: 'p1', question: 'q1', value: 2, status: 'known', confidence: 1 },
      { party: 'p1', question: 'q2', value: null, status: 'insufficient_data', confidence: 0 },
    ],
  });
  assert.equal(result.agreement, 1);
  assert.equal(result.coverage, 0.5);
  assert.equal(result.finalScore, 0.75);
  assert.equal(result.knownCount, 1);
  assert.equal(result.unknownCount, 1);
});

test('low coverage shrinks a perfect match toward 0.5', () => {
  const result = Core.scoreParty({
    partyId: 'p1',
    answers: { q1: 2, q2: 2 },
    questions,
    positions: [{ party: 'p1', question: 'q1', value: 2, status: 'known', confidence: 0.2 }],
  });
  assert.equal(result.agreement, 1);
  assert.equal(result.coverage, 0.1);
  assert.equal(result.finalScore, 0.55);
});

test('skipped answer affects neither score nor coverage denominator', () => {
  const result = Core.scoreParty({
    partyId: 'p1',
    answers: { q1: 2, q2: 'skip' },
    questions,
    positions: [{ party: 'p1', question: 'q1', value: 2, status: 'known', confidence: 1 }],
  });
  assert.equal(result.coverage, 1);
  assert.equal(result.finalScore, 1);
});

test('neutral answer zero is substantive and not treated as skipped', () => {
  const result = Core.scoreParty({
    partyId: 'p1',
    answers: { q1: 0 },
    questions,
    positions: [{ party: 'p1', question: 'q1', value: 2, status: 'known', confidence: 1 }],
  });
  assert.equal(result.agreement, 0.5);
  assert.equal(result.coverage, 1);
});

test('party axis is insufficient when effective coverage is below threshold', () => {
  const axis = Core.computeAxisCoordinate({
    axisId: 'a',
    questions,
    answersOrPositions: { q1: { value: 2, confidence: 1, usable: true }, q2: null },
    minCoverage: 0.75,
  });
  assert.equal(axis.status, 'insufficient_data');
  assert.equal(axis.value, null);
  assert.equal(axis.coverage, 0.5);
});

test('adding a previously missing position changes derived party axis without code changes', () => {
  const base = Core.computePartyAxes({
    partyId: 'p1',
    questions,
    positions: [{ party: 'p1', question: 'q1', value: 2, status: 'known', confidence: 1 }],
    axes: [{ id: 'a' }],
    minCoverage: 0.4,
  });
  const expanded = Core.computePartyAxes({
    partyId: 'p1',
    questions,
    positions: [
      { party: 'p1', question: 'q1', value: 2, status: 'known', confidence: 1 },
      { party: 'p1', question: 'q2', value: -2, status: 'known', confidence: 1 },
    ],
    axes: [{ id: 'a' }],
    minCoverage: 0.4,
  });
  assert.equal(base.a.status, 'known');
  assert.equal(base.a.value, 100);
  assert.equal(expanded.a.status, 'known');
  assert.equal(expanded.a.value, 0);
});

test('skipped question does not affect user axis while neutral zero does', () => {
  const skipped = Core.computeUserAxes({
    answers: { q1: 2, q2: 'skip' }, questions, axes: [{ id: 'a' }], minCoverage: 0
  });
  const neutral = Core.computeUserAxes({
    answers: { q1: 2, q2: 0 }, questions, axes: [{ id: 'a' }], minCoverage: 0
  });
  assert.equal(skipped.a.value, 100);
  assert.equal(neutral.a.value, 50);
});

test('dataset validation reports invalid references and ranges', () => {
  const errors = Core.validateDataset({
    axes: [{ id: 'a' }],
    parties: [{ id: 'p1' }],
    questions: [{ id: 'q1', enabled: true, axis_weights: { bad_axis: 1 } }],
    sources: [{ id: 's1' }],
    positions: [
      { party: 'missing', question: 'q1', value: 3, status: 'known', confidence: 1.2, entity_scope: 'PARTY', evidence: ['missing_source'] },
    ],
  });
  assert.ok(errors.some((e) => e.includes('unknown party')));
  assert.ok(errors.some((e) => e.includes('value')));
  assert.ok(errors.some((e) => e.includes('confidence')));
  assert.ok(errors.some((e) => e.includes('unknown evidence')));
  assert.ok(errors.some((e) => e.includes('unknown axis')));
});

test('valid dataset has no validation errors', () => {
  const errors = Core.validateDataset(validDatasetFixture());
  assert.deepEqual(errors, []);
});

test('dataset analytics reports coverage, confidence, party/question breakdown and gaps', () => {
  const data = {
    axes: [{ id: 'a' }],
    parties: [{ id: 'p1', active: true }, { id: 'p2', active: true }],
    questions: [
      { id: 'q1', enabled: true, importance_default: 1, axis_weights: { a: 1 } },
      { id: 'q2', enabled: true, importance_default: 1, axis_weights: { a: 1 } },
    ],
    sources: [
      { id: 's1', source_type: 'party_platform' },
      { id: 's2', source_type: 'parliamentary_vote' },
      { id: 's3', source_type: 'leader_statement' },
    ],
    positions: [
      { party: 'p1', question: 'q1', value: 2, status: 'known', confidence: 1, entity_scope: 'PARTY', evidence: ['s1'] },
      { party: 'p1', question: 'q2', value: null, status: 'insufficient_data', confidence: 0, entity_scope: 'PARTY', evidence: [] },
      { party: 'p2', question: 'q1', value: 1, status: 'known', confidence: 0.5, entity_scope: 'COMPONENT_PARTY', evidence: ['s3'] },
      { party: 'p2', question: 'q2', value: -1, status: 'mixed', confidence: 0.8, entity_scope: 'PARTY', evidence: ['s2'] },
    ],
  };

  const result = Core.computeDatasetAnalytics({ data, axisCoverageThreshold: 0.35 });

  assert.equal(result.summary.totalCells, 4);
  assert.equal(result.summary.usableCells, 3);
  assert.equal(result.summary.rawCoverage, 0.75);
  assert.equal(result.summary.weightedCoverage, (1 + 0.5 * 0.65 + 0.8) / 4);
  assert.equal(result.summary.usedSourceCount, 3);
  assert.equal(result.byParty.p1.usableCells, 1);
  assert.equal(result.byParty.p2.usableCells, 2);
  assert.equal(result.byQuestion.q1.usableCells, 2);
  assert.equal(result.byQuestion.q2.usableCells, 1);
  assert.equal(result.gaps.length, 1);
  assert.deepEqual(result.gaps[0], { partyId: 'p1', questionId: 'q2' });
  assert.equal(result.byAxis.a.supportedParties, 2);
  assert.equal(result.provenance.COMPONENT_PARTY, 1);
  assert.equal(result.statuses.insufficient_data, 1);
});

test('dataset analytics compares active data with baseline and reports research gains', () => {
  const common = {
    axes: [{ id: 'a' }],
    parties: [{ id: 'p1', active: true }, { id: 'p2', active: true }],
    questions: [
      { id: 'q1', enabled: true, importance_default: 1, axis_weights: { a: 1 } },
      { id: 'q2', enabled: true, importance_default: 1, axis_weights: { a: 1 } },
    ],
  };
  const baselineData = {
    ...common,
    sources: [{ id: 's1', source_type: 'party_platform' }, { id: 's2', source_type: 'parliamentary_vote' }],
    positions: [
      { party: 'p1', question: 'q1', value: 2, status: 'known', confidence: 0.7, entity_scope: 'PARTY', evidence: ['s1'] },
      { party: 'p1', question: 'q2', value: null, status: 'insufficient_data', confidence: 0, entity_scope: 'PARTY', evidence: [] },
      { party: 'p2', question: 'q1', value: null, status: 'insufficient_data', confidence: 0, entity_scope: 'PARTY', evidence: [] },
      { party: 'p2', question: 'q2', value: -1, status: 'known', confidence: 0.9, entity_scope: 'PARTY', evidence: ['s2'] },
    ],
  };
  const data = {
    ...common,
    sources: [...baselineData.sources, { id: 's3', source_type: 'leader_statement' }],
    positions: [
      { party: 'p1', question: 'q1', value: 2, status: 'known', confidence: 1, entity_scope: 'PARTY', evidence: ['s1'] },
      { party: 'p1', question: 'q2', value: null, status: 'insufficient_data', confidence: 0, entity_scope: 'PARTY', evidence: [] },
      { party: 'p2', question: 'q1', value: 1, status: 'known', confidence: 0.8, entity_scope: 'PARTY', evidence: ['s3'] },
      { party: 'p2', question: 'q2', value: 1, status: 'known', confidence: 0.7, entity_scope: 'PARTY', evidence: ['s2'] },
    ],
  };

  const result = Core.computeDatasetAnalytics({ data, baselineData, axisCoverageThreshold: 0.35 });

  assert.equal(result.comparison.baselineUsableCells, 2);
  assert.equal(result.comparison.currentUsableCells, 3);
  assert.equal(result.comparison.gainedKnown, 1);
  assert.equal(result.comparison.lostKnown, 0);
  assert.equal(result.comparison.valueChanged, 1);
  assert.equal(result.comparison.confidenceImproved, 1);
  assert.equal(result.comparison.confidenceDecreased, 1);
  assert.equal(result.comparison.sourcesAdded, 1);
  assert.equal(result.byParty.p2.deltaUsableCells, 1);
});

test('validateDataset rejects non-array top-level collections', () => {
  const malformed = {
    axes: [], parties: [], questions: [],
    positions: { version: 1, widget_state: {} },
    sources: { version: 1, activity_messages: [] }
  };
  const errors = Core.validateDataset(malformed);
  assert.ok(errors.some((e) => e.includes('positions must be an array')));
  assert.ok(errors.some((e) => e.includes('sources must be an array')));
});

test('validateDataset requires exactly one position for every party-question pair', () => {
  const data = {
    axes: [{ id: 'a' }],
    parties: [{ id: 'p', active: true }],
    questions: [{ id: 'q', axis_weights: { a: 1 } }],
    positions: [],
    sources: []
  };
  const errors = Core.validateDataset(data);
  assert.ok(errors.some((e) => e.includes('missing position p/q')));
});

test('validateDataset rejects duplicate party-question positions', () => {
  const position = { party: 'p', question: 'q', value: null, status: 'insufficient_data', confidence: 0, entity_scope: 'PARTY', evidence: [] };
  const data = {
    axes: [{ id: 'a' }],
    parties: [{ id: 'p', active: true }],
    questions: [{ id: 'q', axis_weights: { a: 1 } }],
    positions: [position, { ...position }],
    sources: []
  };
  const errors = Core.validateDataset(data);
  assert.ok(errors.some((e) => e.includes('duplicate position p/q')));
});
