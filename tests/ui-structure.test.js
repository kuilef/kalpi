const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('v2 page exposes the single-question flow, direct results, and opt-in debug host', () => {
  const html = read('index.html');
  for (const id of ['questionnaire', 'question-content', 'previous-question', 'next-question', 'results', 'debug']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(html, /id="review"/);
  assert.doesNotMatch(html, /complete-questionnaire|review-back|review-content/);
  assert.doesNotMatch(html, /locale-en|priority-toggle|axis-strips|party-map/);
  assert.doesNotMatch(html, />Перед завершением</);
  assert.doesNotMatch(html, /Kalpi · русский опросник/);
  assert.doesNotMatch(html, /<p class="eyebrow">Опрос<\/p>/);
  assert.match(html, /href="analytics\.html"/);
});

test('home footer links to a concise methodology page that explains coalition limits', () => {
  const html = read('index.html');
  const methodology = read('methodology.html');
  assert.match(html, /href="methodology\.html"/);
  assert.match(html, /Коалиции и голосования после выборов могут измениться/);
  assert.match(methodology, /не прогнозирует будущую коалицию/);
  assert.match(methodology, /Полное описание методики — в <a/);
  assert.match(methodology, />README на GitHub</);
  assert.match(methodology, /href="https:\/\/github\.com\/kuilef\/kalpi#readme"/);
});

test('v2 page loads only the family-score runtime modules and generated v2 bundle', () => {
  const html = read('index.html');
  for (const script of ['data-loader.js', 'data-validation.js', 'scoring.js', 'analytics.js', 'questionnaire-state.js', 'questionnaire-ui.js', 'results-ui.js', 'data/default-data.js', 'app.js']) {
    assert.match(html, new RegExp(`<script src="${script.replace('.', '\\.')}"`));
  }
  assert.doesNotMatch(html, /axis-strips\.js|i18n\.js|baseline-data\.js/);
});

test('public analytics page has accessible filter and detail hosts', () => {
  const html = read('analytics.html');
  for (const id of ['analytics-party-filter', 'analytics-family-filter', 'analytics-status-filter', 'analytics-scope-filter', 'analytics-verification-filter', 'analytics-summary', 'analytics-matrix', 'analytics-detail', 'analytics-provenance', 'analytics-review-queue']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /analytics-page\.js/);
});

test('app uses a runtime release gate before it exposes the live recommendation', () => {
  const app = read('app.js');
  assert.match(app, /get\('debug'\) === '1'/);
  assert.match(app, /Analytics\.computeReleaseGate\(data\)/);
  assert.match(app, /gate\.passed/);
  assert.match(app, /Scoring\.buildRecommendation/);
  assert.match(app, /ResultsUi\.renderLiveResult\(\{ recommendation/);
  assert.match(app, /ResultsUi\.renderDataNotReady/);
  assert.match(app, /State\.load\(window\.localStorage, data\.scoringConfig\)/);
});

test('app advances on a response selection, renders results after the final answer, and maps keyboard digits 0 through 5 to the radio controls', () => {
  const app = read('app.js');
  assert.match(app, /function advanceAfterAnswer\(\)/);
  assert.match(app, /if \(index === questions\(\)\.length - 1\) \{\s*State\.markCompleted\(state\);\s*saveState\(\);\s*renderResults\(!keepResultsInPlace\);/);
  assert.doesNotMatch(app, /function renderReview\(/);
  assert.doesNotMatch(app, /review-back|complete-questionnaire|review-content/);
  assert.match(app, /document\.addEventListener\('keydown'/);
  assert.match(app, /event\.key < '0' \|\| event\.key > '5'/);
  assert.match(app, /input\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
});

test('changing an answer after results are visible refreshes them without moving focus or scrolling', () => {
  const app = read('app.js');
  assert.match(app, /const keepResultsInPlace = Boolean\(state\.completedAt\);/);
  assert.match(app, /if \(keepResultsInPlace\) renderResults\(false\);/);
  assert.match(app, /renderResults\(!keepResultsInPlace\);/);
});

test('app persists importance toggles and recalculates without moving focus to results', () => {
  const app = read('app.js');
  assert.match(app, /State\.togglePriorityQuestion\(state, question\.id\)/);
  assert.match(app, /renderResults\(false\)/);
  assert.match(app, /priorityQuestionIds: state\.priorityQuestionIds/);
});

test('stylesheet provides responsive pole layout, touch targets, and visible focus treatment', () => {
  const css = read('styles.css');
  assert.match(css, /button:focus-visible/);
  assert.match(css, /min-height:52px/);
  assert.match(css, /@media \(max-width:620px\)/);
  assert.match(css, /\.poles \{ grid-template-columns:1fr; /);
  assert.doesNotMatch(css, /max-width:520px/);
  assert.match(css, /\.unknown-radio \{[^}]*width:100%/);
  assert.match(css, /\.analytics-filters/);
  assert.match(css, /\.table-scroll/);
  assert.match(css, /\.family-bar/);
  assert.match(css, /\.analytics-matrix-table/);
  assert.match(css, /\.analytics-matrix-desktop/);
  assert.match(css, /\.analytics-matrix-mobile/);
  assert.match(css, /\.matrix-cell \{[^}]*min-width:30px/);
  assert.match(css, /\.matrix-cell \{[^}]*min-height:30px/);
  assert.match(css, /\.analytics-matrix-mobile \.matrix-cell \{[^}]*width:30px/);
  assert.match(css, /\.analytics-matrix-mobile \.matrix-cell \{[^}]*height:30px/);
  assert.match(css, /@media \(max-width:620px\)[\s\S]*\.analytics-matrix-desktop[^}]*display:none/);
  assert.match(css, /@media \(max-width:620px\)[\s\S]*\.analytics-matrix-mobile[^}]*display:block/);
});

test('stylesheet presents response choices as plain numeric segments', () => {
  const css = read('styles.css');
  assert.match(css, /\.choice-key \{[^}]*font:/);
  assert.match(css, /\.keyboard-hint \{[^}]*font:/);
  assert.doesNotMatch(css, /\.choice-key \{[^}]*border:/);
  assert.doesNotMatch(css, /\.choice-intensity/);
});

test('stylesheet normalizes semantic colors, focus states, and reduced motion', () => {
  const css = read('styles.css');
  assert.match(css, /--track:/);
  assert.match(css, /--notice-bg:/);
  assert.match(css, /--link:/);
  assert.match(css, /select:focus-visible/);
  assert.match(css, /a:focus-visible/);
  assert.match(css, /summary:focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /transition:transform/);
  assert.doesNotMatch(css, /transition:width/);
});

test('progress rendering uses a composite transform instead of layout width', () => {
  const app = read('app.js');
  const css = read('styles.css');
  assert.match(app, /progress-bar'\)\.style\.setProperty\('--progress'/);
  assert.doesNotMatch(app, /progress-bar'\)\.style\.width/);
  assert.match(css, /\.progress-track > div \{[^}]*transform:scaleX/);
});
