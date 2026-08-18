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
  assert.equal((html.match(/type="radio"/g) || []).length, 6);
  assert.equal((html.match(/<label\b/g) || []).length, 6);
  assert.match(html, /class="choice-key" aria-hidden="true">1<\/span>/);
  assert.match(html, /class="choice-key" aria-hidden="true">5<\/span>/);
  assert.match(html, /class="unknown-number" aria-hidden="true">0<\/span>/);
  assert.doesNotMatch(html, /checked/);
});

test('question UI exposes plain response digits without legacy intensity markup', () => {
  const html = UI.renderQuestion({ question, index: 0, total: 23, answer: undefined });
  assert.match(html, /class="choice-key" aria-hidden="true">1<\/span>/);
  assert.doesNotMatch(html, /choice-intensity/);
  assert.doesNotMatch(html, /choice-number/);
});

test('question UI renders unknown as a separate selected response', () => {
  const html = UI.renderQuestion({ question, index: 4, total: 23, answer: null });
  assert.match(html, /value="unknown" data-shortcut="0" checked/);
});

test('question UI renders an enabled importance control before and after an answer', () => {
  const selected = UI.renderQuestion({ question, index: 0, total: 23, answer: -1, important: true, importanceEnabled: true });
  const unanswered = UI.renderQuestion({ question, index: 0, total: 23, answer: undefined, important: false, importanceEnabled: true });
  assert.match(selected, /class="importance-toggle"[^>]*aria-pressed="true"/);
  assert.match(unanswered, /class="importance-toggle"[^>]*aria-pressed="false"/);
  assert.doesNotMatch(unanswered, /class="importance-toggle"[^>]*disabled/);
});

test('question ordinal identifies the currently open question rather than answered questions', () => {
  assert.equal(UI.questionOrdinal(4, 23), '5 / 23');
});

test('progress counts explicit unknown as answered', () => {
  assert.deepEqual(UI.questionnaireProgress([
    { id: 'one' }, { id: 'two' }, { id: 'three' },
  ], { one: -1, two: null }), { answered: 2, total: 3 });
});
