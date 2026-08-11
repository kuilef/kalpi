const test = require('node:test');
const assert = require('node:assert/strict');
const State = require('../questionnaire-state.js');

const config = {
  questionnaire_version: 'q-v2',
  scoring_version: 'score-v1',
  data_version: 'data-v2',
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
