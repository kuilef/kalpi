const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const expectedExplanations = {
  knesset_supreme_court_final_say: 'Основные законы имеют в Израиле конституционный статус. Вопрос в том, кто должен иметь последнее слово, если Верховный суд признаёт обычный закон противоречащим Основным законам: суд или парламентское большинство.',
  nation_state_law_equality: 'Закон закрепляет Израиль как национальное государство еврейского народа, но прямо не закрепляет равенство всех граждан. Добавление такой нормы дало бы судам и государственным органам более прямое основание требовать равного отношения к гражданам независимо от их национальности или религии. Оно не отменило бы еврейский характер государства или Закон о возвращении.',
};

function selectExplanations(questions) {
  return Object.fromEntries(Object.keys(expectedExplanations).map((id) => {
    const question = questions.find((item) => item.id === id);
    assert.ok(question, `${id} question exists`);
    return [id, question.explanation_ru];
  }));
}

test('questions 20 and 21 use the approved Russian explanations in canonical data', () => {
  const questions = JSON.parse(fs.readFileSync(path.join(root, 'data', 'questions.json'), 'utf8'));
  assert.deepEqual(selectExplanations(questions), expectedExplanations);
});
