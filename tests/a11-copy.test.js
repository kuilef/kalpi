const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const expectedPoles = {
  left_pole_ru: 'Гарантировать базовую социальную защиту, не стремясь специально сокращать разницу в доходах',
  right_pole_ru: 'Активно сокращать разницу в доходах с помощью налогов, выплат и государственных услуг',
};

test('A11 uses the approved Russian social-policy poles in canonical data', () => {
  const questions = JSON.parse(fs.readFileSync(path.join(root, 'data', 'questions.json'), 'utf8'));
  const question = questions.find(({ code }) => code === 'A11');
  assert.ok(question, 'A11 question exists');
  assert.deepEqual({
    left_pole_ru: question.left_pole_ru,
    right_pole_ru: question.right_pole_ru,
  }, expectedPoles);
});
