const test = require('node:test');
const assert = require('node:assert/strict');
const UI = require('../questionnaire-ui.js');

const question = {
  id: 'a01',
  code: 'A01',
  short_title_ru: 'Тема',
  prompt_ru: 'Какой вариант вам ближе?',
  left_pole_ru: 'Левый полюс',
  right_pole_ru: 'Правый полюс',
  explanation_ru: 'Полное пояснение.',
};

test('question UI renders two poles and no preselected response', () => {
  const html = UI.renderQuestion({ question, index: 0, total: 23, answer: undefined });
  assert.match(html, /<fieldset/);
  assert.match(html, /Левый полюс/);
  assert.match(html, /Правый полюс/);
  assert.match(html, /Полное пояснение/);
  assert.equal((html.match(/type="radio"/g) || []).length, 6);
  assert.equal((html.match(/<label\b/g) || []).length, 6);
  assert.match(html, /class="choice-key" aria-hidden="true">1<\/span>/);
  assert.match(html, /class="choice-key" aria-hidden="true">5<\/span>/);
  assert.match(html, /class="unknown-number" aria-hidden="true">0<\/span>/);
  assert.doesNotMatch(html, /checked/);
  assert.doesNotMatch(html, /Нейтрально/);
});

test('question UI exposes labelled response keys and the keyboard instruction', () => {
  const html = UI.renderQuestion({ question, index: 0, total: 23, answer: undefined });
  assert.match(html, /class="choice-key" aria-hidden="true">1<\/span>/);
  assert.match(html, /class="choice-intensity">Полностью<\/span>/);
  assert.match(html, /class="choice-intensity">Посередине<\/span>/);
  assert.match(html, /Можно отвечать клавишами 1–5; 0 — «Не знаю»\./);
  assert.doesNotMatch(html, /choice-number/);
});

test('question UI renders unknown as a separate selected response', () => {
  const html = UI.renderQuestion({ question, index: 4, total: 23, answer: null });
  assert.match(html, /Не знаю \/ недостаточно информации/);
  assert.match(html, /value="unknown" data-shortcut="0" checked/);
  assert.match(html, /Вопрос 5 из 23/);
});

test('progress counts explicit unknown as answered', () => {
  assert.deepEqual(UI.questionnaireProgress([
    { id: 'one' }, { id: 'two' }, { id: 'three' },
  ], { one: -1, two: null }), { answered: 2, total: 3 });
});
