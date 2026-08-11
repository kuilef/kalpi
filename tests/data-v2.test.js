const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const load = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', name), 'utf8'));

test('v2 core questionnaire contains the approved 23 Russian questions in display order', () => {
  const questions = load('questions.json');
  assert.equal(questions.length, 23);
  assert.deepEqual(questions.map((question) => question.code), [
    'A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11',
    'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10', 'B11', 'B12',
  ]);
  for (const [index, question] of questions.entries()) {
    assert.equal(question.status, 'core');
    assert.equal(question.display_order, index + 1);
    assert.ok(question.prompt_ru.trim());
    assert.ok(question.left_pole_ru.trim());
    assert.ok(question.right_pole_ru.trim());
  }
});

test('scoring config assigns every core question to exactly one approved family', () => {
  const config = load('scoring-config.json');
  const questionIds = new Set(load('questions.json').map((question) => question.id));
  const assigned = config.families.flatMap((family) => [
    ...(family.fundamental_questions || []),
    ...(family.policy_questions || []),
  ]);
  assert.equal(config.recommendation_mode, 'data_not_ready');
  assert.deepEqual(config.answer_values, [-1, -0.5, 0, 0.5, 1]);
  assert.equal(config.user_importance_enabled, false);
  assert.equal(config.families.length, 12);
  assert.equal(new Set(assigned).size, 23);
  assert.deepEqual(new Set(assigned), questionIds);
  assert.equal(config.families.find((family) => family.id === 'religion_lifestyle').policy_weight, 0.4);
  assert.equal(config.families.find((family) => family.id === 'october_7_accountability').family_type, 'standalone_policy');
});

test('v2 positions are an explicit empty party-question matrix', () => {
  const parties = load('parties.json').filter((party) => party.active !== false);
  const questions = load('questions.json');
  const positions = load('positions.json');
  assert.equal(positions.length, parties.length * questions.length);
  for (const position of positions) {
    assert.equal(position.value, null);
    assert.equal(position.confidence, 0);
    assert.equal(position.status, 'insufficient_data');
    assert.equal(position.entity_scope, 'PARTY');
    assert.deepEqual(position.evidence, []);
    assert.equal(position.last_verified, null);
  }
});
