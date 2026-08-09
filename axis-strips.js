(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KalpiAxisStrips = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const PARTY_COLORS = Object.freeze({
    likud: '#3569a8',
    beyahad: '#d27628',
    shas: '#43835a',
    utj: '#7a5a9e',
    raam: '#b04a79',
    otzma: '#8e5d34',
    yisrael_beytenu: '#16828b',
    democrats: '#b8403e',
    yashar: '#697b2d',
    religious_zionism: '#9a497b',
    bait_zioni: '#476f9b',
    hadash_taal: '#7547a8',
  });

  function getPartyColor(partyId) {
    const color = PARTY_COLORS[partyId];
    if (!color) throw new Error(`No configured marker colour for party: ${partyId}`);
    return color;
  }

  function buildMarkers({ parties, partyAxes, axisId }) {
    return parties.flatMap((party) => {
      const coordinate = partyAxes[party.id]?.[axisId];
      if (coordinate?.status !== 'known') return [];
      return [{
        partyId: party.id,
        color: getPartyColor(party.id),
        value: coordinate.value,
        coverage: coordinate.coverage,
      }];
    });
  }

  return Object.freeze({ PARTY_COLORS, getPartyColor, buildMarkers });
});
