const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const load = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', name), 'utf8'));

test('v2 core questionnaire contains 27 core questions in display order', () => {
  const questions = load('questions.json');
  assert.equal(questions.length, 27);
  assert.deepEqual(questions.map((question) => question.code), [
    'A01', 'A02', 'A03', 'A04', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11',
    'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10', 'B11', 'B12',
    'B13', 'B14', 'B15', 'B16', 'B17',
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
  assert.equal(config.recommendation_mode, 'live');
  assert.equal(config.prototype_trust_policy, 'all_value_positions_full_confidence');
  assert.deepEqual(config.release_gate, {
    global_coverage_min: 0.8,
    slice_coverage_min: 0.5,
  });
  assert.deepEqual(config.result_policy, {
    min_substantive_answers: 8,
    min_answered_families: 6,
    min_party_result_coverage: 0.5,
    near_tie_points: 0.03,
  });
  assert.deepEqual(config.answer_values, [-1, -0.5, 0, 0.5, 1]);
  assert.equal(config.user_importance_enabled, true);
  assert.equal(config.user_importance_family_multiplier, 2);
  assert.equal(config.families.length, 14);
  assert.equal(new Set(assigned).size, 27);
  assert.deepEqual(new Set(assigned), questionIds);
  assert.deepEqual(config.families.find((family) => family.id === 'religion_lifestyle').policy_questions, [
    'civil_marriage', 'shabbat_public_transport', 'public_gender_separation',
  ]);
  assert.deepEqual(config.families.find((family) => family.id === 'territory_separation').policy_questions, [
    'west_bank_sovereignty', 'gaza_jewish_settlements',
  ]);
  assert.deepEqual(config.families.find((family) => family.id === 'immigration_identity').policy_questions, [
    'law_of_return_grandchild_clause', 'non_orthodox_conversion_recognition',
  ]);
  assert.deepEqual(config.families.find((family) => family.id === 'government_coalition').policy_questions, [
    'arab_parties_government_participation',
  ]);
  assert.equal(config.families.find((family) => family.id === 'religion_lifestyle').policy_weight, 0.4);
  assert.equal(config.families.find((family) => family.id === 'immigration_identity').fundamental_weight, 0);
  assert.equal(config.families.find((family) => family.id === 'immigration_identity').policy_weight, 1);
  for (const familyId of ['education_standards', 'immigration_identity', 'october_7_accountability', 'government_coalition']) {
    assert.equal(config.families.find((family) => family.id === familyId).family_weight, 0.5);
  }
  assert.equal(config.families.find((family) => family.id === 'october_7_accountability').family_type, 'standalone_policy');
});

test('education standards family keeps B07 as its only policy question', () => {
  const questions = load('questions.json');
  const positions = load('positions.json');
  const config = load('scoring-config.json');
  const education = config.families.find((family) => family.id === 'education_standards');

  assert.equal(questions.some((question) => question.code === 'A05'), false);
  assert.deepEqual(education.fundamental_questions, []);
  assert.deepEqual(education.policy_questions, ['core_curriculum_funding']);
  assert.equal(education.fundamental_weight, 0);
  assert.equal(education.policy_weight, 1);
  assert.equal(positions.some((position) => position.question === 'education_autonomy_standards_tradeoff'), false);
  assert.equal(positions.filter((position) => position.question === 'core_curriculum_funding').length, 12);
});

test('canonical data declares a distinct position matrix version', () => {
  const config = load('scoring-config.json');

  assert.equal(typeof config.party_positions_version, 'string');
  assert.equal(typeof config.position_matrix_version, 'string');
  assert.notEqual(config.position_matrix_version, config.party_positions_version);
  assert.equal(config.scoring_version, 'kalpi-family-score-v3');
  assert.equal(config.data_version, 'kalpi-data-prototype-v4');
});
