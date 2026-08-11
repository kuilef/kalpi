const test = require('node:test');
const assert = require('node:assert/strict');
const Results = require('../results-ui.js');

test('data-not-ready result reports completion without inventing a party ranking', () => {
  const html = Results.renderDataNotReady({
    questions: [{ id: 'a1' }, { id: 'b1' }],
    answers: { a1: -1, b1: null },
    coverage: { knownCells: 0, totalCells: 24 },
  });
  assert.match(html, /Данные партий ещё не готовы/);
  assert.match(html, /1 содержательный ответ/);
  assert.match(html, /1 ответ «Не знаю»/);
  assert.doesNotMatch(html, /Лучшее совпадение/);
});

test('data-not-ready result uses readable Russian counts for many substantive answers', () => {
  const html = Results.renderDataNotReady({
    questions: Array.from({ length: 23 }, (_, index) => ({ id: `q${index}` })),
    answers: Object.fromEntries(Array.from({ length: 23 }, (_, index) => [`q${index}`, index === 0 ? null : 0])),
    coverage: { knownCells: 0, totalCells: 276 },
  });
  assert.match(html, /22 содержательных ответа/);
});

test('live fixture result exposes family score, coverage, and evidence drill-down', () => {
  const html = Results.renderLiveResult({
    result: {
      party: { name_ru: 'Партия' }, score: 0.8, coverage: 0.9,
      families: [{ familyId: 'f', label_ru: 'Семья', score: 0.8, coverage: 0.9, questions: [{
        questionId: 'q', userValue: -1, partyValue: -1, confidence: 1, rawSimilarity: 1,
        evidenceSimilarity: 1, position: { explanation_ru: 'Объяснение', evidence: ['source'] },
      }]}],
    },
    sourcesById: new Map([['source', { title: 'Источник', url: 'https://example.test' }]]),
  });
  assert.match(html, /80%/);
  assert.match(html, /90%/);
  assert.match(html, /Семья/);
  assert.match(html, /Объяснение/);
  assert.match(html, /Источник/);
});
