const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../core.js');

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', name), 'utf8'));
}

test('canonical dataset has 12 parties, five axes and at least 25 questions', () => {
  const parties = load('parties.json');
  const axes = load('axes.json');
  const questions = load('questions.json');
  assert.equal(parties.filter((p) => p.active).length, 12);
  assert.equal(axes.length, 5);
  assert.ok(questions.filter((q) => q.enabled).length >= 25);
});

test('every active party has an explicit position record for every enabled question', () => {
  const parties = load('parties.json').filter((p) => p.active);
  const questions = load('questions.json').filter((q) => q.enabled);
  const positions = load('positions.json');
  const keys = new Set(positions.map((p) => `${p.party}|${p.question}`));
  for (const party of parties) {
    for (const q of questions) assert.ok(keys.has(`${party.id}|${q.id}`), `missing ${party.id}/${q.id}`);
  }
  assert.ok(positions.some((p) => p.status === 'insufficient_data'));
});

test('canonical dataset passes core validation', () => {
  const data = {
    axes: load('axes.json'),
    parties: load('parties.json'),
    questions: load('questions.json'),
    positions: load('positions.json'),
    sources: load('sources.json'),
  };
  assert.deepEqual(Core.validateDataset(data), []);
});
