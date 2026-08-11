const test = require('node:test');
const assert = require('node:assert/strict');
const Fixture = require('../debug-fixture.js');

test('synthetic debug fixture is visibly separate and never reuses canonical records', () => {
  const fixture = Fixture.createSyntheticFixture({
    questions: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    answers: { a: -1, b: 1, c: null },
  });

  assert.equal(fixture.party.id, 'synthetic_debug_fixture');
  assert.match(fixture.party.name_ru, /синтетический/i);
  assert.deepEqual(fixture.positions.map((position) => [position.question, position.value]), [
    ['a', -1],
    ['b', null],
    ['c', null],
  ]);
  assert.equal(fixture.positions[0].confidence, 0.8);
  assert.equal(fixture.positions[1].status, 'insufficient_data');
});
