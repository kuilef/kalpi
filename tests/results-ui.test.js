const test = require('node:test');
const assert = require('node:assert/strict');
const Results = require('../results-ui.js');

function family(familyId, score) {
  return {
    familyId,
    label_ru: familyId,
    score,
    coverage: 1,
    questions: [{
      questionId: `${familyId}-question`,
      userValue: -1,
      partyValue: score < 0.5 ? 1 : -1,
      evidenceSimilarity: score,
      coverage: 1,
      position: { explanation_ru: 'Объяснение', entity_scope: 'PARTY', evidence: [] },
    }],
  };
}

function recommendationForScores(scores, families = [family('family', 0.8)]) {
  const ranked = scores.map((score, index) => ({
    partyId: `party-${index + 1}`,
    party: { name_ru: `Партия ${index + 1}` },
    score,
    coverage: 1,
    gapFromLeader: scores[0] - score,
    eligible: true,
  }));
  return {
    ready: true,
    leader: { party: ranked[0].party, score: scores[0], coverage: 1, families },
    ranked,
    nearTies: [],
  };
}

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

test('missing family score is rendered as missing data rather than zero percent', () => {
  const html = Results.renderLiveResult({
    recommendation: recommendationForScores([0.8], [
      { familyId: 'missing', label_ru: 'Нет данных', score: null, coverage: 0, questions: [] },
    ]),
    sourcesById: new Map(),
  });

  assert.match(html, /Нет данных для сравнения/);
  assert.match(html, /Покрытие данных: 0%/);
  assert.doesNotMatch(html, /<progress class="family-progress" max="1" value="0">/);
});

test('live result places a collapsed disagreement profile before compact priority selection', () => {
  const html = Results.renderLiveResult({
    questions: [
      {
        id: 'territory',
        short_title_ru: 'Территория и разделение',
        prompt_ru: 'Что вам ближе в отношении территории?',
        left_pole_ru: 'Сохранять контроль',
        right_pole_ru: 'Территориальное разделение',
      },
      {
        id: 'inquiry',
        short_title_ru: 'Расследование 7 октября',
        prompt_ru: 'Как должна формироваться комиссия?',
        left_pole_ru: 'Назначает председатель суда',
        right_pole_ru: 'Определяется через Кнессет',
      },
    ],
    answers: { territory: -0.5, inquiry: 1 },
    priorityQuestionIds: ['inquiry'],
    recommendation: recommendationForScores([0.71], [family('Разногласие', 0.39)]),
    sourcesById: new Map(),
  });

  assert.match(html, /<details class="family-profile family-profile-details">/);
  assert.match(html, /Где ваши ответы расходятся с мнением партии/);
  assert.ok(html.indexOf('family-profile-details') < html.indexOf('priority-picker'));
  assert.match(html, /Выберите важные вопросы/);
  assert.match(html, /Скорее сохранять контроль/);
  assert.match(html, /data-priority-question-id="inquiry"/);
  assert.match(html, /data-priority-toggle="inquiry"[^>]*aria-pressed="true"/);
  assert.match(html, /data-priority-context="territory"/);
  assert.match(html, /Показать полные формулировки/);
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

test('live result shows only the top seven eligible parties and notes a close top three', () => {
  const html = Results.renderLiveResult({
    recommendation: recommendationForScores([0.71, 0.68, 0.66, 0.65, 0.64, 0.64, 0.63, 0.57]),
    sourcesById: new Map(),
  });

  assert.match(html, /Партия 7/);
  assert.doesNotMatch(html, /Партия 8/);
  assert.match(html, /class="ranking-note"/);
  assert.match(html, /Топ-3 близки/);
  assert.match(html, /5 п\.п\./);
});

test('thematic profile places expanded disagreements before collapsed matches', () => {
  const families = [
    family('Разногласие 1', 0.1),
    family('Разногласие 2', 0.2),
    family('Разногласие 3', 0.3),
    family('Совпадение 1', 0.8),
    family('Совпадение 2', 0.9),
    family('Совпадение 3', 1),
  ];
  const html = Results.renderLiveResult({
    recommendation: recommendationForScores([0.71], families),
    sourcesById: new Map(),
  });

  assert.ok(html.indexOf('Сильнее всего расходится') < html.indexOf('Сильнее всего совпадает'));
  assert.equal((html.match(/<details class="question-evidence" open>/g) || []).length, 3);
  assert.equal((html.match(/<details class="question-evidence">/g) || []).length, 3);
  assert.ok(html.indexOf('Разногласие 1') < html.indexOf('Совпадение 1'));
  assert.doesNotMatch(html, /Эти тематические группы показываем сразу/);
  assert.doesNotMatch(html, /Эти группы оставляем ниже/);
});

test('near-top note is omitted when the top three gap exceeds five percentage points', () => {
  const html = Results.renderLiveResult({
    recommendation: recommendationForScores([0.71, 0.68, 0.64]),
    sourcesById: new Map(),
  });

  assert.doesNotMatch(html, /Топ-3 близки/);
});

test('near-top note compares two parties when only two eligible results exist', () => {
  const html = Results.renderLiveResult({
    recommendation: recommendationForScores([0.71, 0.68]),
    sourcesById: new Map(),
  });

  assert.match(html, /Топ-2 близки/);
  assert.match(html, /3 п\.п\./);
});

test('near-top note includes an exact five-point gap despite floating-point rounding', () => {
  const html = Results.renderLiveResult({
    recommendation: recommendationForScores([0.7125, 0.6791666666666666, 0.6625]),
    sourcesById: new Map(),
  });

  assert.match(html, /Топ-3 близки/);
  assert.match(html, /5 п\.п\./);
});
