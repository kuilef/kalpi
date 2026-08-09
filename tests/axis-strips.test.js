const test = require('node:test');
const assert = require('node:assert/strict');
const Strips = require('../axis-strips.js');

test('each configured party has a stable predefined colour', () => {
  assert.equal(Strips.getPartyColor('likud'), '#3569a8');
  assert.equal(Strips.getPartyColor('hadash_taal'), '#7547a8');
  assert.notEqual(Strips.getPartyColor('likud'), Strips.getPartyColor('hadash_taal'));
  assert.throws(() => Strips.getPartyColor('unknown_party'), /No configured marker colour/);
});

test('buildMarkers includes only known party coordinates for an axis', () => {
  const markers = Strips.buildMarkers({
    axisId: 'economy',
    parties: [{ id: 'likud' }, { id: 'shas' }],
    partyAxes: {
      likud: { economy: { status: 'known', value: 62.4, coverage: 0.8 } },
      shas: { economy: { status: 'insufficient_data', value: null, coverage: 0.1 } },
    },
  });
  assert.deepEqual(markers, [{ partyId: 'likud', color: '#3569a8', value: 62.4, coverage: 0.8 }]);
});
