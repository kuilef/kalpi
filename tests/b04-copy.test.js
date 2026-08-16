const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const expectedPoles = {
  left_pole_ru: 'Муниципалитет решает сам',
  right_pole_ru: 'Сохраняются ограничения государства',
};

test('B04 uses the approved Russian public-transport poles in canonical data', () => {
  const questions = JSON.parse(fs.readFileSync(path.join(root, 'data', 'questions.json'), 'utf8'));
  const question = questions.find(({ code }) => code === 'B04');
  assert.ok(question, 'B04 question exists');
  assert.deepEqual({
    left_pole_ru: question.left_pole_ru,
    right_pole_ru: question.right_pole_ru,
  }, expectedPoles);
});
