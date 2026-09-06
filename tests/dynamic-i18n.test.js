const test = require('node:test');
const assert = require('node:assert/strict');
const I18n = require('../i18n.js');
const Questionnaire = require('../questionnaire-ui.js');
const Results = require('../results-ui.js');
const Analytics = require('../analytics-page.js');

for (const locale of ['en', 'he']) {
  test(`${locale} dynamic UI translates display text and preserves scale values`, () => {
    I18n.register(locale, require(`../locales/ui-${locale}.json`));
    I18n.setLocale(locale);
    try {
      const question = { id: 'q', short_title_ru: 'Вопрос', prompt_ru: 'Выберите позицию', left_pole_ru: 'Левый полюс', right_pole_ru: 'Правый полюс', explanation_ru: 'Нет данных для сравнения' };
      const party = { id: 'p', name_ru: 'Партия' };
      const source = { id: 's', title: 'פרוטוקול הכנסת', url: 'https://example.com', verification_status: 'verified' };
      const position = { value: 1, status: 'known', entity_scope: 'PARTY', evidence: ['s'], explanation_ru: 'Нет подтверждённой позиции' };
      const cell = { party, question, position, evidence: [source] };
      const research = { reviewQueue: [cell], unusedSources: [source], statusCounts: { known: 1 }, scopeCounts: { PARTY: 1 }, sourceVerificationCounts: { verified: 1 }, sourceTypeCounts: { official_document: 1 } };
      const family = { familyId: 'f', label_ru: 'Вопрос', score: .8, coverage: 1, questions: [{ questionId: 'q', userValue: -.5, partyValue: 1, evidenceSimilarity: .8, coverage: 1, position }] };
      const leader = { party, partyId: 'p', score: .8, coverage: 1, families: [family], eligible: true, gapFromLeader: 0 };
      const questionnaire = Questionnaire.renderQuestion({ question, index: 0, total: 1, answer: -.5, important: true, importanceEnabled: true });
      const html = [questionnaire,
        Results.renderDataNotReady({ questions: [question], answers: { q: null }, coverage: {} }),
        Results.renderLiveResult({ recommendation: { ready: false, reasons: ['need 8 substantive answers', 'need 6 answered families'] } }),
        Results.renderLiveResult({ recommendation: { ready: true, leader, ranked: [leader, { ...leader, score: .79, gapFromLeader: .01 }] }, questions: [question], answers: { q: -.5 }, priorityQuestionIds: ['q'], sourcesById: new Map([['s', source]]) }),
        Analytics.renderAnalytics({ gate: { passed: false, failures: [], metrics: { summary: { knownCells: 1, totalCells: 2 } } }, research }),
        Analytics.renderMatrix([cell], [party], [question]), Analytics.renderDetail(cell), Analytics.renderDetail(null), Analytics.renderProvenance(research), Analytics.renderReviewQueue([cell]),
      ].join('');
      assert.doesNotMatch(html, /[А-Яа-яЁё]/);
      assert.match(questionnaire, /value="-0.5" data-shortcut="2" checked/);
      assert.ok(questionnaire.indexOf('value="-1"') < questionnaire.indexOf('value="1"'));
      assert.match(html, /data-position-marker="user"/);
      assert.match(html, /data-cell-key="p\/q"/);
      assert.match(html, /href="https:\/\/example.com"/);
      assert.match(html, /aria-pressed="true"/);
      assert.match(html, /<bdi dir="auto">פרוטוקול הכנסת<\/bdi>/);
      assert.doesNotMatch(html, /\{(?:count|coverage|position|party|match|place|gap)\}/);
    } finally { I18n.setLocale('ru'); }
  });
}

test('party leader attribution is distinct from ranking leader in English and Hebrew', () => {
  const question = { id: 'q', short_title_ru: 'Вопрос', left_pole_ru: 'Левый полюс', right_pole_ru: 'Правый полюс' };
  const party = { id: 'p', name_ru: 'Партия' };
  const position = { entity_scope: 'LEADER', status: 'known', value: 1, evidence: [] };
  const family = { familyId: 'f', score: 1, coverage: 1, questions: [{ questionId: 'q', userValue: 1, partyValue: 1, evidenceSimilarity: 1, coverage: 1, position }] };
  const leader = { party, partyId: 'p', score: 1, coverage: 1, families: [family], eligible: true, gapFromLeader: 0 };
  try {
    for (const [locale, attribution, ranking] of [['en', 'party leader', 'leader'], ['he', 'מנהיג המפלגה', 'מוביל'], ['ru', 'лидер', 'лидер']]) {
      if (locale !== 'ru') I18n.register(locale, require(`../locales/ui-${locale}.json`));
      I18n.setLocale(locale);
      const detail = Analytics.renderDetail({ party, question, position, evidence: [] });
      assert.ok(detail.includes(`<dd>${attribution}</dd>`));
      const result = Results.renderLiveResult({ recommendation: { ready: true, leader, ranked: [leader] }, questions: [question], answers: { q: 1 }, sourcesById: new Map() });
      assert.ok(result.includes(`<span>${ranking}</span>`));
      assert.ok(result.includes(`</strong>: ${locale === 'ru' ? 'LEADER' : attribution}</p>`));
    }
  } finally { I18n.setLocale('ru'); }
});
