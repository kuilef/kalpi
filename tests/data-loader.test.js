const test = require('node:test');
const assert = require('node:assert/strict');
const Loader = require('../data-loader.js');

const filenames = ['parties.json','questions.json','positions.json','sources.json','scoring-config.json'];

test('loadDataset reads the v2 runtime JSON files into dataset keys', async () => {
  const payloads = Object.fromEntries(filenames.map((name) => [name, [{ id: name }]]));
  const calls = [];
  const data = await Loader.loadDataset(async (name) => { calls.push(name); return payloads[name]; });
  assert.deepEqual(calls, filenames);
  assert.deepEqual(Object.keys(data), ['parties','questions','positions','sources','scoringConfig']);
  assert.equal(data.positions[0].id, 'positions.json');
  assert.equal(data.scoringConfig[0].id, 'scoring-config.json');
});

test('loadDataset propagates a descriptive filename when JSON loading fails', async () => {
  await assert.rejects(
    Loader.loadDataset(async (name) => {
      if (name === 'positions.json') throw new Error('bad json');
      return [];
    }),
    /positions\.json: bad json/
  );
});

test('loadDataset can defer sources without changing the canonical file names', async () => {
  const payloads = Object.fromEntries(filenames.map((name) => [name, [{ id: name }]]));
  const calls = [];
  const data = await Loader.loadDataset(async (name) => { calls.push(name); return payloads[name]; }, { includeSources: false });
  assert.deepEqual(calls, ['parties.json', 'questions.json', 'positions.json', 'scoring-config.json']);
  assert.deepEqual(Object.keys(data), ['parties', 'questions', 'positions', 'scoringConfig']);
  assert.equal(data.sources, undefined);
});
