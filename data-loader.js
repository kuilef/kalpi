(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KalpiDataLoader = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const FILES = ['axes.json','parties.json','questions.json','positions.json','sources.json'];

  async function loadDataset(readJson) {
    const data = {};
    for (const filename of FILES) {
      try {
        data[filename.slice(0, -5)] = await readJson(filename);
      } catch (error) {
        throw new Error(`${filename}: ${error?.message || error}`);
      }
    }
    return data;
  }

  return { FILES, loadDataset };
});
