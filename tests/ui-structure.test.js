const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
function read(name) { return fs.readFileSync(path.join(root, name), 'utf8'); }

test('questionnaire precedes initially hidden analysis', () => {
  const html = read('index.html');
  for (const id of ['questionnaire', 'results', 'data-inspection', 'data-quality']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.ok(html.indexOf('id="questionnaire"') < html.indexOf('id="results"'));
  assert.ok(html.indexOf('id="results"') < html.indexOf('id="data-quality"'));
  assert.match(html, /id="data-quality"[^>]*class="[^"]*hidden/);
});

test('scripts load core, bundled data and app in that order', () => {
  const html = read('index.html');
  const core = html.indexOf('core.js');
  const data = html.indexOf('data/default-data.js');
  const app = html.indexOf('app.js');
  assert.ok(core >= 0 && data > core && app > data);
});

test('questionnaire markup includes progress, question host and result action', () => {
  const html = read('index.html');
  assert.match(html, /id=["']progress["']/);
  assert.match(html, /id=["']questions-container["']/);
  assert.match(html, /id=["']calculate-results["']/);
});

test('results include five axis strips and retain the 2D map as collapsed details', () => {
  const html = read('index.html');
  assert.match(html, /id=["']axis-strips["']/);
  assert.match(html, /<details id=["']multidimensional-map["']/);
  assert.match(html, /<details id=["']multidimensional-map["'][^>]*>/);
  assert.doesNotMatch(html, /<details id=["']multidimensional-map["'][^>]*\sopen(?:\s|=|>)/);
  assert.doesNotMatch(html, /id=["']axis-profile["']/);
  for (const id of ['map-x-axis','map-y-axis','party-map','map-omitted']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.ok(html.indexOf('axis-strips.js') < html.indexOf('app.js'));
});

test('app renders focusable strip markers with a shared tooltip', () => {
  const app = read('app.js');
  assert.match(app, /function renderAxisStrips\s*\(/);
  assert.match(app, /function bindAxisStripTooltip\s*\(/);
  assert.match(app, /aria-label/);
  assert.match(app, /role=["']tooltip["']/);
  assert.match(app, /AxisStrips\.buildMarkers/);
});

test('page offers three locales and no browser data controls', () => {
  const html = read('index.html');
  for (const id of ['locale-en', 'locale-ru', 'locale-he']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  for (const id of ['data-update', 'data-files', 'apply-data', 'restore-data', 'export-data', 'data-update-status']) {
    assert.doesNotMatch(html, new RegExp(`id=["']${id}["']`));
  }
});

test('page exposes on-page data quality analytics hosts', () => {
  const html = read('index.html');
  for (const id of [
    'data-quality','quality-summary','quality-comparison','quality-parties','quality-questions',
    'quality-axes','quality-provenance','quality-heatmap','quality-gaps','quality-cell-detail'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('baseline bundle loads after active bundled data and before app', () => {
  const html = read('index.html');
  const data = html.indexOf('data/default-data.js');
  const baseline = html.indexOf('data/baseline-data.js');
  const app = html.indexOf('app.js');
  assert.ok(data >= 0 && baseline > data && app > baseline);
});

test('app renders data quality only with an explicitly calculated result', () => {
  const app = read('app.js');
  assert.match(app, /function renderDataQuality\s*\(/);
  assert.match(app, /Core\.computeDatasetAnalytics/);
  assert.doesNotMatch(app, /\$\('apply-data'\)|\$\('restore-data'\)|\$\('export-data'\)/);
});

test('page exposes active dataset source and loads browser data loader before app', () => {
  const html = read('index.html');
  assert.match(html, /id=["']data-source-status["']/);
  const loader = html.indexOf('data-loader.js');
  const app = html.indexOf('app.js');
  assert.ok(loader >= 0 && app > loader);
});

test('stylesheet defines editorial and RTL treatment', () => {
  const css = read('styles.css');
  assert.match(css, /html\[dir=["']rtl["']\]/);
  assert.match(css, /\.locale-switcher/);
  assert.match(css, /font-family:[^;]*serif/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});

test('app attempts direct data-json loading outside file protocol and warns in file mode', () => {
  const app = read('app.js');
  assert.match(app, /location\.protocol\s*!==\s*['"]file:['"]/);
  assert.match(app, /Loader\.loadDataset/);
  assert.match(app, /start\.bat/);
});
