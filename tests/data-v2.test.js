const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const load = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', name), 'utf8'));

test('v2 core questionnaire contains 26 core questions in display order after removing B14', () => {
  const questions = load('questions.json');
  assert.equal(questions.length, 26);
  assert.deepEqual(questions.map((question) => question.code), [
    'A01', 'A02', 'A03', 'A04', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11',
    'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10', 'B11', 'B12',
    'B13', 'B14', 'B15', 'B16',
  ]);
  for (const [index, question] of questions.entries()) {
    assert.equal(question.status, 'core');
    assert.equal(question.display_order, index + 1);
    assert.ok(question.prompt_ru.trim());
    assert.ok(question.left_pole_ru.trim());
    assert.ok(question.right_pole_ru.trim());
  }
});

test('A01 names the military-control tradeoff without changing its answer direction', () => {
  const a01 = load('questions.json').find((question) => question.id === 'security_settlement_tradeoff');

  assert.deepEqual(
    {
      prompt_ru: a01.prompt_ru,
      left_pole_ru: a01.left_pole_ru,
      right_pole_ru: a01.right_pole_ru,
    },
    {
      prompt_ru: 'Следует ли Израилю сохранять военный контроль в Иудее и Самарии, на юге Ливана и в секторе Газа?',
      left_pole_ru: 'Нет, нужно сократить военное присутствие в обмен на политические договоренности',
      right_pole_ru: 'Да, это обеспечивает безопасность',
    },
  );
});

test('B14 removal keeps stable question ids and applies the new giyur wording before renumbering', () => {
  const questions = load('questions.json');
  const positions = load('positions.json');
  const config = load('scoring-config.json');
  const byId = new Map(questions.map((question) => [question.id, question]));
  const gaza = byId.get('gaza_jewish_settlements');
  const conversion = byId.get('non_orthodox_conversion_recognition');
  const arabParties = byId.get('arab_parties_government_participation');

  assert.equal(byId.has('public_gender_separation'), false);
  assert.equal(positions.some((position) => position.question === 'public_gender_separation'), false);
  assert.deepEqual(
    [gaza, conversion, arabParties].map((question) => [question.id, question.code, question.display_order]),
    [
      ['gaza_jewish_settlements', 'B14', 24],
      ['non_orthodox_conversion_recognition', 'B15', 25],
      ['arab_parties_government_participation', 'B16', 26],
    ],
  );
  assert.equal(conversion.prompt_ru, 'Следует ли сохранять признание реформистского и консервативного гиюра для целей Закона о возвращении?');
  assert.equal(conversion.left_pole_ru, 'Сохранять признание');
  assert.equal(conversion.right_pole_ru, 'Признавать только гиюр по ортодоксальным стандартам');
  assert.equal(conversion.explanation_ru, 'Сейчас реформистский и консервативный гиюр признаётся для целей Закона о возвращении, но не обязательно признаётся Главным раввинатом в вопросах религиозного личного статуса.');
  assert.deepEqual(config.families.find((family) => family.id === 'religion_lifestyle').policy_questions, [
    'civil_marriage', 'shabbat_public_transport',
  ]);
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
  assert.equal(new Set(assigned).size, 26);
  assert.deepEqual(new Set(assigned), questionIds);
  assert.deepEqual(config.families.find((family) => family.id === 'religion_lifestyle').policy_questions, [
    'civil_marriage', 'shabbat_public_transport',
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
  assert.equal(config.questionnaire_version, 'kalpi-ru-core-2026-08-31-v4');
  assert.equal(config.party_positions_version, 'kalpi-positions-prototype-v2');
  assert.equal(config.position_matrix_version, 'kalpi-position-matrix-2026-08-31-v3');
  assert.equal(config.scoring_version, 'kalpi-family-score-v3');
  assert.equal(config.data_version, 'kalpi-data-prototype-v5');
});
