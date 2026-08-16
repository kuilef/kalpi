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

test('live result exposes leader, near ties, full ranking, family profile, and evidence drill-down', () => {
  const html = Results.renderLiveResult({
    recommendation: {
      ready: true,
      leader: {
        party: { name_ru: 'Партия' }, score: 0.8, coverage: 0.9,
        families: [{ familyId: 'f', label_ru: 'Семья', score: 0.8, coverage: 0.9, questions: [{
        questionId: 'q', userValue: -1, partyValue: -1, confidence: 1, rawSimilarity: 1,
        evidenceSimilarity: 1, originalStatus: 'mixed', originalConfidence: 0.6,
        position: { explanation_ru: 'Объяснение', entity_scope: 'LEADER', evidence: ['source'] },
        }]}],
        gapFromLeader: 0,
      },
      nearTies: [{ partyId: 'near', party: { name_ru: 'Рядом' }, score: 0.78, coverage: 0.9, gapFromLeader: 0.02 }],
      ranked: [
        { partyId: 'winner', party: { name_ru: 'Партия' }, score: 0.8, coverage: 0.9, gapFromLeader: 0, eligible: true },
        { partyId: 'near', party: { name_ru: 'Рядом' }, score: 0.78, coverage: 0.9, gapFromLeader: 0.02, eligible: true },
        { partyId: 'thin', party: { name_ru: 'Мало данных' }, score: 0.81, coverage: 0.4, gapFromLeader: 0, eligible: false },
      ],
    },
    sourcesById: new Map([['source', { title: 'Источник', url: 'https://example.test' }]]),
  });
  assert.match(html, /80%/);
  assert.match(html, /90%/);
  assert.match(html, /Ближе всего по вашим ответам/);
  assert.match(html, /Практически равные альтернативы/);
  assert.match(html, /Рейтинг партий/);
  assert.match(html, /Мало данных для рекомендации/);
  assert.match(html, /Семья/);
  assert.match(html, /Объяснение/);
  assert.match(html, /mixed/);
  assert.match(html, /LEADER/);
  assert.match(html, /Источник/);
  assert.match(html, /<progress class="family-progress" max="1" value="0\.8">/);
  assert.doesNotMatch(html, /\sstyle=/);
  assert.doesNotMatch(html, /--family-score/);
});

test('live result explains when the user has not covered enough families', () => {
  const html = Results.renderLiveResult({
    recommendation: { ready: false, reasons: ['need 8 substantive answers', 'need 6 answered families'], ranked: [], nearTies: [], leader: null },
    sourcesById: new Map(),
  });
  assert.match(html, /Недостаточно содержательных ответов/);
  assert.match(html, /8/);
  assert.match(html, /6/);
});
