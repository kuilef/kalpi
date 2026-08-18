const test = require('node:test');
const assert = require('node:assert/strict');
const Results = require('../results-ui.js');

test('data-not-ready result reports completion without inventing a party ranking', () => {
  const html = Results.renderDataNotReady({
    questions: [{ id: 'a1' }, { id: 'b1' }],
    answers: { a1: -1, b1: null },
    coverage: { knownCells: 0, totalCells: 24 },
  });
  assert.match(html, /class="data-not-ready-result"/);
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
  assert.match(html, /<progress class="family-progress" max="1" value="0\.8">/);
  assert.doesNotMatch(html, /\sstyle=/);
  assert.doesNotMatch(html, /--family-score/);
});

test('thematic profile shows position markers and evidence provenance', () => {
  const html = Results.renderLiveResult({
    questions: [{
      id: 'q',
      short_title_ru: 'Тема',
      prompt_ru: 'Вопрос',
      left_pole_ru: 'Первый вариант',
      right_pole_ru: 'Второй вариант',
    }],
    recommendation: {
      ready: true,
      leader: {
        party: { name_ru: 'Партия' }, score: 0.8, coverage: 0.9,
        families: [{ familyId: 'f', label_ru: 'Семья', score: 0.8, coverage: 0.9, questions: [{
          questionId: 'q', userValue: -1, partyValue: 0,
          evidenceSimilarity: 0.5, coverage: 1, originalStatus: 'mixed', originalConfidence: 0.64,
          position: { explanation_ru: 'Объяснение', entity_scope: 'PARTY', evidence: ['source'] },
        }]}],
      },
      nearTies: [],
      ranked: [{ partyId: 'winner', party: { name_ru: 'Партия' }, score: 0.8, coverage: 0.9, gapFromLeader: 0, eligible: true }],
    },
    sourcesById: new Map([['source', { title: 'Источник', url: 'https://example.test' }]]),
  });

  assert.match(html, /data-position-marker="user"/);
  assert.match(html, /data-position-marker="party"/);
  assert.match(html, /<div class="evidence-provenance">/);
  assert.doesNotMatch(html, /<summary>security_settlement_tradeoff/);
});
