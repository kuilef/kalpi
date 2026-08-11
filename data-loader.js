(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KalpiDataLoader = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const FILES = ['parties.json','questions.json','positions.json','sources.json','scoring-config.json'];

  function dataKey(filename) {
    return filename === 'scoring-config.json' ? 'scoringConfig' : filename.slice(0, -5);
  }

  async function loadDataset(readJson) {
    const data = {};
    for (const filename of FILES) {
      try {
        data[dataKey(filename)] = await readJson(filename);
      } catch (error) {
        throw new Error(`${filename}: ${error?.message || error}`);
      }
    }
    return data;
  }

  return { FILES, loadDataset };
});
