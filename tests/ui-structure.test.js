const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('v2 page exposes the single-question flow, review, results, and opt-in debug host', () => {
  const html = read('index.html');
  for (const id of ['questionnaire', 'question-content', 'previous-question', 'next-question', 'review', 'complete-questionnaire', 'results', 'debug']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(html, /locale-en|priority-toggle|axis-strips|party-map/);
});

test('v2 page loads only the family-score runtime modules and generated v2 bundle', () => {
  const html = read('index.html');
  for (const script of ['data-loader.js', 'data-validation.js', 'scoring.js', 'analytics.js', 'questionnaire-state.js', 'questionnaire-ui.js', 'results-ui.js', 'data/default-data.js', 'app.js']) {
    assert.match(html, new RegExp(`<script src="${script.replace('.', '\\.')}"`));
  }
  assert.doesNotMatch(html, /axis-strips\.js|i18n\.js|baseline-data\.js/);
});

test('app uses data-not-ready mode as a hard production gate and only exposes analytics after ?debug=1', () => {
  const app = read('app.js');
  assert.match(app, /get\('debug'\) === '1'/);
  assert.match(app, /recommendation_mode === 'data_not_ready'/);
  assert.match(app, /ResultsUi\.renderDataNotReady/);
  assert.match(app, /State\.load\(window\.localStorage, data\.scoringConfig\)/);
});

test('app advances on a response selection and maps keyboard digits 0 through 5 to the radio controls', () => {
  const app = read('app.js');
  assert.match(app, /function advanceAfterAnswer\(\)/);
  assert.match(app, /if \(index === questions\(\)\.length - 1\) \{\s*renderReview\(\)/);
  assert.match(app, /document\.addEventListener\('keydown'/);
  assert.match(app, /event\.key < '0' \|\| event\.key > '5'/);
  assert.match(app, /input\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
});

test('stylesheet provides responsive pole layout, touch targets, and visible focus treatment', () => {
  const css = read('styles.css');
  assert.match(css, /button:focus-visible/);
  assert.match(css, /min-height:52px/);
  assert.match(css, /@media \(max-width:620px\)/);
  assert.match(css, /\.poles \{ grid-template-columns:1fr; /);
  assert.doesNotMatch(css, /max-width:520px/);
  assert.match(css, /\.unknown-radio \{[^}]*width:100%/);
});
