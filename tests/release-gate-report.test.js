const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Report = require('../tools/release-gate-report.js');

const load = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', name), 'utf8'));

test('release report passes the candidate matrix and all declared synthetic fixtures', () => {
  const data = {
    parties: load('parties.json'),
    questions: load('questions.json'),
    positions: load('positions.json'),
    sources: load('sources.json'),
    scoringConfig: load('scoring-config.json'),
  };
  const report = Report.buildReport(data);
  assert.equal(report.gate.passed, true);
  assert.equal(report.fixtures.every((fixture) => fixture.passed), true);
  assert.match(Report.renderMarkdown(report), /Release gate: PASS/);
});
