(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KalpiDataLoader = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const FILES = ['parties.json','questions.json','positions.json','sources.json','scoring-config.json'];
  const CORE_FILES = FILES.filter((filename) => filename !== 'sources.json');

  function dataKey(filename) {
    return filename === 'scoring-config.json' ? 'scoringConfig' : filename.slice(0, -5);
  }

  async function loadDataset(readJson, options = {}) {
    const files = options.includeSources === false ? CORE_FILES : FILES;
    const data = {};
    for (const filename of files) {
      try {
        data[dataKey(filename)] = await readJson(filename);
      } catch (error) {
        throw new Error(`${filename}: ${error?.message || error}`);
      }
    }
    return data;
  }

  return { FILES, CORE_FILES, loadDataset };
});
