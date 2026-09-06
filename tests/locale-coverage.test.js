const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const I18n = require('../i18n.js');
const Scoring = require('../scoring.js');
const Analytics = require('../analytics.js');
const QuestionnaireUi = require('../questionnaire-ui.js');
const ResultsUi = require('../results-ui.js');
const AnalyticsUi = require('../analytics-page.js');

const read = (filename) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', filename), 'utf8'));
const data = Object.fromEntries(['parties', 'questions', 'positions', 'sources', 'scoring-config'].map((name) => [name === 'scoring-config' ? 'scoringConfig' : name, read(`data/${name}.json`)]));
const groups = ['pages', 'ui', 'data', 'app']; // Same registration order as the browser.
const cyrillic = /[А-Яа-яЁё]/;
const placeholders = (text) => [...new Set(text.match(/\{\w+\}/g) || [])].sort();
const catalogs = Object.fromEntries(['en', 'he'].map((locale) => [locale, Object.fromEntries(groups.map((group) => [group, read(`locales/${group}-${locale}.json`)]))]));
const displayFields = [];
const add = (location, value) => { if (typeof value === 'string' && value.trim()) displayFields.push({ location, value }); };
for (const question of data.questions) {
  for (const [field, value] of Object.entries(question)) if (field.endsWith('_ru')) add(`question ${question.id}.${field}`, value);
}
for (const party of data.parties) for (const field of ['name_ru', 'leader_ru']) add(`party ${party.id}.${field}`, party[field]);
for (const family of data.scoringConfig.families) add(`family ${family.id}.label_ru`, family.label_ru);
for (const position of data.positions) add(`position ${position.party}/${position.question}.explanation_ru`, position.explanation_ru);
for (const source of data.sources) if (cyrillic.test(source.title || '')) add(`source ${source.id}.title`, source.title);

for (const locale of ['en', 'he']) {
  test(`${locale} catalogs have consistent keys, placeholders and translated values`, () => {
    const seen = new Map();
    const problems = [];
    for (const group of groups) {
      for (const [key, value] of Object.entries(catalogs[locale][group])) {
        if (typeof value !== 'string' || !value.trim()) { problems.push(`${group}: empty translation for ${key}`); continue; }
        if (cyrillic.test(value)) problems.push(`${group}: Cyrillic translation for ${key}`);
        if (JSON.stringify(placeholders(key)) !== JSON.stringify(placeholders(value))) problems.push(`${group}: placeholder mismatch for ${key}`);
        if (seen.has(key) && seen.get(key).value !== value) problems.push(`${seen.get(key).group}/${group}: conflicting translation for ${key}`);
        seen.set(key, { group, value });
      }
    }
    assert.deepEqual(problems, []);
  });

  test(`${locale} covers every canonical display field without translating original Hebrew titles`, () => {
    const merged = Object.assign({}, ...groups.map((group) => catalogs[locale][group]));
    const missing = displayFields.filter(({ value }) => cyrillic.test(value) && (!Object.hasOwn(merged, value) || !merged[value].trim()));
    assert.equal(missing.length, 0, `${missing.length} untranslated display fields; first examples:\n${missing.slice(0, 12).map(({ location, value }) => `${location}: ${value}`).join('\n')}`);
    I18n.register(locale, merged);
    I18n.setLocale(locale);
    try {
      for (const { location, value } of displayFields) assert.doesNotMatch(I18n.text(value), cyrillic, location);
      for (const source of data.sources) {
        if (/[\u0590-\u05ff]/.test(source.title || '') && !cyrillic.test(source.title)) assert.equal(I18n.text(source.title), source.title, `original title ${source.id}`);
      }
    } finally { I18n.setLocale('ru'); }
  });
}

test('language rendering preserves canonical data, answers, priorities and the complete score matrix', () => {
  const questions = data.questions.filter((question) => question.status === 'core');
  const answers = Object.fromEntries(questions.map((question, index) => [question.id, index % 7 === 6 ? null : [-1, -.5, 0, .5, 1][index % 5]]));
  const priorityQuestionIds = questions.slice(0, 3).map((question) => question.id);
  const inputs = { ...data, answers, priorityQuestionIds };
  const before = JSON.stringify(inputs);
  const baseline = Scoring.buildRecommendation(inputs);
  assert.equal(baseline.ready, true, 'fixture must exercise a real recommendation');
  const baselineMatrix = data.parties.map((party) => Scoring.scoreParty({ ...inputs, partyId: party.id }));
  const research = Analytics.computeResearchAnalytics(data);
  const gate = Analytics.computeReleaseGate(data);
  const sourcesById = new Map(data.sources.map((source) => [source.id, source]));
  try {
    for (const locale of ['ru', 'en', 'he', 'ru']) {
      if (locale !== 'ru') for (const group of groups) I18n.register(locale, catalogs[locale][group]);
      I18n.setLocale(locale);
      const recommendation = Scoring.buildRecommendation(inputs);
      const html = [
        ...questions.map((question, index) => QuestionnaireUi.renderQuestion({ question, index, total: questions.length, answer: answers[question.id], importanceEnabled: true, important: priorityQuestionIds.includes(question.id) })),
        ResultsUi.renderLiveResult({ recommendation, questions, answers, priorityQuestionIds, sourcesById }),
        AnalyticsUi.renderAnalytics({ gate, research }), AnalyticsUi.renderMatrix(research.cells, data.parties, questions),
        ...research.cells.map(AnalyticsUi.renderDetail), AnalyticsUi.renderProvenance(research), AnalyticsUi.renderReviewQueue(research.reviewQueue),
      ].join('');
      assert.deepEqual(recommendation, baseline, `${locale}: recommendation changed`);
      assert.deepEqual(data.parties.map((party) => Scoring.scoreParty({ ...inputs, partyId: party.id })), baselineMatrix, `${locale}: score matrix changed`);
      assert.equal(JSON.stringify(inputs), before, `${locale}: render mutated canonical inputs`);
      assert.ok(html.includes('ranking-row'), `${locale}: fixture did not render rankings`);
    }
  } finally { I18n.setLocale('ru'); }
});

for (const locale of ['en', 'he']) {
  test(`${locale} analytics renders every current position and metadata status without Cyrillic`, () => {
    for (const group of groups) I18n.register(locale, catalogs[locale][group]);
    I18n.setLocale(locale);
    try {
      const research = Analytics.computeResearchAnalytics(data);
      const html = [...research.cells.map(AnalyticsUi.renderDetail), AnalyticsUi.renderProvenance(research), AnalyticsUi.renderReviewQueue(research.reviewQueue)].join('');
      const unexpected = html.match(/[^<>]*[А-Яа-яЁё][^<>]*/g) || [];
      assert.equal(unexpected.length, 0, `${locale}: Cyrillic render fragments: ${unexpected.slice(0, 5).join('\n')}`);
    } finally { I18n.setLocale('ru'); }
  });
}

for (const locale of ['en', 'he']) {
  test(`${locale} current analytics metadata has display labels instead of raw codes`, () => {
    for (const group of groups) I18n.register(locale, catalogs[locale][group]);
    I18n.setLocale(locale);
    try {
      const research = Analytics.computeResearchAnalytics(data);
      const text = AnalyticsUi.renderProvenance(research).replace(/<[^>]*>/g, ' ');
      const codes = [...Object.keys(research.sourceVerificationCounts), ...Object.keys(research.sourceTypeCounts), ...Object.keys(research.scopeCounts)].filter((code) => code.includes('_') || /^[A-Z]+$/.test(code));
      for (const code of codes) assert.ok(!text.includes(code), `${locale}: raw metadata code ${code}`);
      for (const status of Object.keys(research.sourceVerificationCounts)) {
        const date = /_(\d{4}-\d{2}-\d{2})$/.exec(status);
        if (date) assert.ok(text.includes(date[1]), `${locale}: verification date missing: ${date[1]}`);
      }
    } finally { I18n.setLocale('ru'); }
  });
}
