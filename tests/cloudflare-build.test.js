'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildCloudflareSite, isSafeOutputDirectory } = require('../tools/build_cloudflare_site.js');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const EXPECTED_FILES = [
  'index.html',
  'analytics.html',
  'methodology.html',
  'styles.css',
  'data-loader.js',
  'data-validation.js',
  'scoring.js',
  'analytics.js',
  'analytics-page.js',
  'questionnaire-state.js',
  'questionnaire-ui.js',
  'results-ui.js',
  'debug-fixture.js',
  'app.js',
  'data/parties.json',
  'data/questions.json',
  'data/positions.json',
  'data/sources.json',
  'data/scoring-config.json',
  '_headers',
  '_redirects',
];

test('buildCloudflareSite copies only the public runtime allowlist', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kalpi-pages-'));
  const outputDir = path.join(temporaryRoot, 'dist');

  try {
    const result = buildCloudflareSite({ rootDir: PROJECT_ROOT, outputDir });

    assert.deepEqual(result.files, [...EXPECTED_FILES].sort());
    assert.equal(fs.existsSync(path.join(outputDir, 'index.html')), true);
    assert.equal(fs.existsSync(path.join(outputDir, 'data', 'positions.json')), true);
    assert.equal(fs.existsSync(path.join(outputDir, 'tests')), false);
    assert.equal(fs.existsSync(path.join(outputDir, 'README.md')), false);
    assert.equal(fs.existsSync(path.join(outputDir, 'tools')), false);
    assert.match(fs.readFileSync(path.join(outputDir, '_headers'), 'utf8'), /X-Content-Type-Options: nosniff/);
    assert.match(fs.readFileSync(path.join(outputDir, '_redirects'), 'utf8'), /^\/analytics \/analytics\.html 200$/m);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('isSafeOutputDirectory rejects broad destructive targets', () => {
  const safeTemporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'kalpi-pages-safe-'));
  try {
    assert.equal(isSafeOutputDirectory(PROJECT_ROOT, path.parse(PROJECT_ROOT).root), false);
    assert.equal(isSafeOutputDirectory(PROJECT_ROOT, path.dirname(PROJECT_ROOT)), false);
    assert.equal(isSafeOutputDirectory(PROJECT_ROOT, path.join(PROJECT_ROOT, 'dist')), true);
    assert.equal(isSafeOutputDirectory(PROJECT_ROOT, safeTemporaryDirectory), true);
  } finally {
    fs.rmSync(safeTemporaryDirectory, { recursive: true, force: true });
  }
});
