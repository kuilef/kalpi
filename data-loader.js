(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KalpiDataLoader = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const FILES = ['parties.json','questions.json','positions.json','sources.json','scoring-config.json'];
  const CORE_FILES = FILES.filter((filename) => filename !== 'sources.json');
  const QUESTIONNAIRE_BOOTSTRAP_FILES = ['questions.json', 'scoring-config.json'];
  const QUESTIONNAIRE_BACKGROUND_FILES = ['parties.json', 'positions.json'];

  function dataKey(filename) {
    return filename === 'scoring-config.json' ? 'scoringConfig' : filename.slice(0, -5);
  }

  async function loadFiles(readJson, files) {
    const entries = await Promise.all(files.map(async (filename) => {
      try {
        return [dataKey(filename), await readJson(filename)];
      } catch (error) {
        throw new Error(`${filename}: ${error?.message || error}`);
      }
    }));
    return Object.fromEntries(entries);
  }

  function loadDataset(readJson, options = {}) {
    return loadFiles(readJson, options.includeSources === false ? CORE_FILES : FILES);
  }

  function loadQuestionnaireBootstrap(readJson) {
    return loadFiles(readJson, QUESTIONNAIRE_BOOTSTRAP_FILES);
  }

  function loadQuestionnaireBackground(readJson) {
    return loadFiles(readJson, QUESTIONNAIRE_BACKGROUND_FILES);
  }

  return { FILES, CORE_FILES, QUESTIONNAIRE_BOOTSTRAP_FILES, QUESTIONNAIRE_BACKGROUND_FILES, loadDataset, loadQuestionnaireBootstrap, loadQuestionnaireBackground };
});
