const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Validation = require('../data-validation.js');

const load = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', name), 'utf8'));
const validData = () => ({
  parties: load('parties.json'),
  questions: load('questions.json'),
  positions: load('positions.json'),
  sources: load('sources.json'),
  scoringConfig: load('scoring-config.json'),
});

test('canonical v2 data validates with explicit missing party positions', () => {
  assert.deepEqual(Validation.validateDataset(validData()), []);
});

test('core runtime dataset can be validated before deferred sources arrive', () => {
  const data = validData();
  delete data.sources;
  assert.deepEqual(Validation.validateDataset(data, { requireSources: false }), []);
});

test('v2 validation rejects a question without one family assignment or a valid scale value', () => {
  const data = validData();
  data.scoringConfig.families[0].fundamental_questions = [];
  data.positions[0] = { ...data.positions[0], value: 2, confidence: 1, status: 'known' };
  const errors = Validation.validateDataset(data);
  assert.ok(errors.some((error) => error.includes('missing family assignment')));
  assert.ok(errors.some((error) => error.includes('value must be in [-1, 1]')));
});

test('v2 validation rejects a known position without evidence, explanation, and verification date', () => {
  const data = validData();
  data.positions[0] = {
    ...data.positions[0],
    value: -1,
    confidence: 0.8,
    status: 'known',
    evidence: [],
    explanation_ru: '',
    last_verified: null,
  };
  const errors = Validation.validateDataset(data);
  assert.ok(errors.some((error) => error.includes('known position requires evidence')));
  assert.ok(errors.some((error) => error.includes('known position requires explanation_ru')));
  assert.ok(errors.some((error) => error.includes('known position requires last_verified')));
});

test('v2 validation rejects an incomplete prototype live policy', () => {
  const data = validData();
  data.scoringConfig.prototype_trust_policy = 'guess';
  data.scoringConfig.result_policy.min_substantive_answers = 0;
  data.scoringConfig.release_gate.global_coverage_min = 1.1;
  const errors = Validation.validateDataset(data);
  assert.ok(errors.some((error) => error.includes('invalid prototype_trust_policy')));
  assert.ok(errors.some((error) => error.includes('invalid result_policy.min_substantive_answers')));
  assert.ok(errors.some((error) => error.includes('invalid release_gate.global_coverage_min')));
});
