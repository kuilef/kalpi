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
  assert.doesNotMatch(html, />Ваши взгляды</);
  assert.match(html, /<section id="questionnaire"[^>]*aria-label="Опросник"/);
  assert.match(html, /<section id="questionnaire" class="questionnaire-panel" aria-label="Опросник">/);
  assert.match(html, /<div class="questionnaire-progress">[\s\S]*id="progress"[\s\S]*<progress id="progress-bar" max="1" value="0"><\/progress>[\s\S]*<\/div>/);
  assert.match(html, /<div class="questionnaire-card">[\s\S]*id="question-content"[\s\S]*id="previous-question"[\s\S]*id="next-question"[\s\S]*<\/div>/);
  assert.match(html, /<h1 class="questionnaire-hero-title">Какая партия вам ближе\?<\/h1>/);
  assert.match(html, /<p class="lede">Ответьте на вопросы и сравните свои взгляды с партиями на выборах в Кнессет 2026<\/p>/);
  assert.doesNotMatch(html, /Выберите сторону на шкале между двумя содержательными полюсами/);
  assert.doesNotMatch(html, /<header[\s\S]*href="analytics\.html"[\s\S]*<\/header>/);
  assert.match(html, /href="methodology\.html"[^>]*>Как считается результат и чего он не показывает<\/a>[\s\S]*href="analytics\.html"[^>]*>Открыть аналитику данных<\/a>/);
});

test('public pages load canonical JSON at runtime without a generated data bundle', () => {
  const html = read('index.html');
  const analyticsHtml = read('analytics.html');
  for (const script of ['data-loader.js', 'data-validation.js', 'scoring.js', 'analytics.js', 'questionnaire-state.js', 'questionnaire-ui.js', 'results-ui.js', 'app.js']) {
    assert.match(html, new RegExp(`<script src="${script.replace('.', '\\.')}"`));
  }
  for (const page of [html, analyticsHtml]) assert.doesNotMatch(page, /data\/default-data\.js/);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'data', 'default-data.js')), false);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'tools', 'build_data_bundle.py')), false);
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

test('questionnaire starts from bootstrap data and defers party matrix and sources', () => {
  const app = read('app.js');
  const analytics = read('analytics-page.js');
  const server = read('tools/serve.py');
  assert.match(app, /Loader\.loadQuestionnaireBootstrap\(readJson\)/);
  assert.match(app, /Loader\.loadQuestionnaireBackground\(readJson\)/);
  assert.match(app, /Object\.assign\(data, backgroundData\)/);
  assert.match(app, /await ensureQuestionnaireBackgroundLoaded\(\)/);
  assert.match(app, /ensureSourcesLoaded\(\)/);
  assert.doesNotMatch(app, /Date\.now\(\)/);
  assert.doesNotMatch(app, /cache:\s*['"]no-store['"]/);
  assert.doesNotMatch(analytics, /Date\.now\(\)/);
  assert.doesNotMatch(analytics, /cache:\s*['"]no-store['"]/);
  assert.match(server, /gzip/i);
  assert.match(server, /Content-Encoding/);
  assert.match(server, /Cache-Control.*max-age=300/);
  assert.doesNotMatch(server, /Cache-Control.*no-cache/);
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

test('importance recalculation stays hidden before completion but final answer still reveals results', () => {
  const app = read('app.js');
  assert.match(app, /async function renderResults\(focusResults = true, revealResults = true\)/);
  assert.match(app, /if \(revealResults\) host\.classList\.remove\('hidden'\);/);
  assert.match(app, /else host\.classList\.add\('hidden'\);/);
  assert.match(app, /renderResults\(false, state\.completedAt\)/);
  assert.match(app, /renderResults\(!keepResultsInPlace\);/);
});

test('stylesheet presents response choices as plain numeric segments', () => {
  const css = read('styles.css');
  assert.match(css, /\.choice-key \{[^}]*font:/);
  assert.match(css, /\.keyboard-hint \{[^}]*font:/);
  assert.doesNotMatch(css, /\.choice-key \{[^}]*border:/);
  assert.doesNotMatch(css, /\.choice-intensity/);
});

test('mobile answer poles use readable half-width labels aligned to scale edges', () => {
  const css = read('styles.css');
  const mobile = css.match(/@media \(max-width:620px\) \{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(mobile, /\.poles \{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(mobile, /\.poles p:first-child,\.poles p:last-child \{[^}]*grid-column:auto[^}]*overflow-wrap:normal/);
  assert.match(mobile, /\.poles p:last-child \{[^}]*text-align:end/);
});

test('questionnaire hero title stays on one line with a narrow-screen fluid size', () => {
  const css = read('styles.css');
  assert.match(css, /\.questionnaire-hero-title \{[^}]*font-size:clamp\(1\.45rem, 6\.5vw, 3\.2rem\)/);
  assert.match(css, /\.questionnaire-hero-title \{[^}]*white-space:nowrap/);
});

test('question progress stays right-aligned without a visible section heading', () => {
  const css = read('styles.css');
  assert.match(css, /\.progress-text \{[^}]*margin-inline-start:auto/);
});

test('questionnaire uses a separate progress region and an editorial question card', () => {
  const css = read('styles.css');
  assert.match(css, /\.questionnaire-panel \{[^}]*background:transparent[^}]*box-shadow:none/);
  assert.match(css, /\.questionnaire-card \{[^}]*border:1px solid var\(--ink\)[^}]*background:var\(--surface\)/);
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
  assert.match(css, /transition:width/);
  assert.doesNotMatch(css, /transition:transform/);
});

test('progress rendering uses a native progress value without inline styles', () => {
  const app = read('app.js');
  const css = read('styles.css');
  assert.match(app, /const progressBar = \$\('progress-bar'\);/);
  assert.match(app, /progressBar\.value = total \? ordinal \/ total : 0;/);
  assert.doesNotMatch(app, /progress-bar'\)\.style\.setProperty/);
  assert.doesNotMatch(app, /progress-bar'\)\.style\./);
  assert.match(css, /\.progress-track > progress/);
  assert.match(css, /\.family-progress/);
});
