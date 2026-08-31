const test = require('node:test');
const assert = require('node:assert/strict');
const State = require('../questionnaire-state.js');

const config = {
  questionnaire_version: 'q-v2',
  scoring_version: 'score-v1',
  data_version: 'data-v2',
  position_matrix_version: 'matrix-v1',
};

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    snapshot: () => new Map(values),
  };
}

test('state keeps explicit unknown null distinct from an unanswered question', () => {
  const state = State.createState(config);
  State.setAnswer(state, 'a01', null);
  assert.equal(Object.prototype.hasOwnProperty.call(state.answers, 'a01'), true);
  assert.equal(state.answers.a01, null);
  assert.equal(Object.prototype.hasOwnProperty.call(state.answers, 'a02'), false);
});

test('state persists the current question and never reads the legacy answer key', () => {
  const storage = memoryStorage();
  storage.setItem('kalpiPrototypeAnswersV1', JSON.stringify({ answers: { legacy: 2 } }));
  const state = State.createState(config);
  State.setAnswer(state, 'a01', -0.5);
  State.setCurrentQuestion(state, 'b01');
  State.save(storage, state);

  const restored = State.load(storage, config);
  assert.equal(restored.answers.a01, -0.5);
  assert.equal(restored.currentQuestionId, 'b01');
  assert.equal(Object.prototype.hasOwnProperty.call(restored.answers, 'legacy'), false);
  assert.ok(storage.snapshot().has('kalpiPrototypeAnswersV1'));
});

test('incompatible saved version starts a clean v2 state without deleting the stored record', () => {
  const storage = memoryStorage();
  storage.setItem(State.STORAGE_KEY, JSON.stringify({
    questionnaireVersion: 'old-questionnaire',
    scoringVersion: 'score-v1',
    dataVersion: 'data-v2',
    answers: { a01: 1 },
  }));

  const restored = State.load(storage, config);
  assert.deepEqual(restored.answers, {});
  assert.equal(restored.versionMismatch, true);
  assert.ok(storage.snapshot().has(State.STORAGE_KEY));
});

test('position-matrix migration preserves answers and refreshes data metadata', () => {
  const storage = memoryStorage();
  const previousConfig = { ...config, data_version: 'data-v1', position_matrix_version: 'matrix-v1' };
  const state = State.createState(previousConfig);
  State.setAnswer(state, 'a01', -1);
  State.setCurrentQuestion(state, 'b01');
  State.markCompleted(state);
  State.save(storage, state);

  const currentConfig = { ...config, data_version: 'data-v3', position_matrix_version: 'matrix-v2' };
  const restored = State.load(storage, currentConfig);

  assert.deepEqual(restored.answers, { a01: -1 });
  assert.equal(restored.currentQuestionId, 'b01');
  assert.ok(restored.completedAt);
  assert.equal(restored.dataVersion, 'data-v3');
  assert.equal(restored.positionMatrixVersion, 'matrix-v2');
  assert.equal(restored.versionMismatch, false);
});

test('pole-orientation migration negates only migrated answers and preserves completed-session metadata', () => {
  const storage = memoryStorage();
  storage.setItem(State.STORAGE_KEY, JSON.stringify({
    questionnaireVersion: 'kalpi-ru-core-2026-08-21-v3',
    scoringVersion: 'score-v1',
    dataVersion: 'data-v4',
    positionMatrixVersion: 'matrix-v2',
    answers: {
      security_settlement_tradeoff: -1,
      west_bank_sovereignty: -0.5,
      gaza_jewish_settlements: 0,
      palestinian_state_option: 0.5,
      law_of_return_grandchild_clause: 1,
      unknown: null,
    },
    priorityQuestionIds: ['security_settlement_tradeoff', 'palestinian_state_option'],
    currentQuestionId: 'gaza_jewish_settlements',
    completedAt: '2026-08-31T10:00:00.000Z',
    updatedAt: '2026-08-31T10:01:00.000Z',
  }));

  const restored = State.load(storage, {
    questionnaire_version: 'kalpi-ru-core-2026-08-31-v4',
    scoring_version: 'score-v1',
    data_version: 'data-v5',
    position_matrix_version: 'matrix-v3',
  });

  assert.deepEqual(restored.answers, {
    security_settlement_tradeoff: 1,
    west_bank_sovereignty: 0.5,
    gaza_jewish_settlements: 0,
    palestinian_state_option: 0.5,
    law_of_return_grandchild_clause: 1,
    unknown: null,
  });
  assert.deepEqual(restored.priorityQuestionIds, ['security_settlement_tradeoff', 'palestinian_state_option']);
  assert.equal(restored.currentQuestionId, 'gaza_jewish_settlements');
  assert.equal(restored.completedAt, '2026-08-31T10:00:00.000Z');
  assert.equal(restored.updatedAt, '2026-08-31T10:01:00.000Z');
  assert.equal(restored.versionMismatch, false);
});

test('state persists unique priorities selected before an answer', () => {
  const storage = memoryStorage();
  const state = State.createState(config);
  State.togglePriorityQuestion(state, 'a01');
  State.setAnswer(state, 'a02', null);
  State.togglePriorityQuestion(state, 'a02');
  State.save(storage, state);

  const restored = State.load(storage, config);
  assert.deepEqual(restored.priorityQuestionIds, ['a01', 'a02']);
});
