(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiQuestionnaireState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'kalpiQuestionnaireStateV2';

  function createState(config, overrides = {}) {
    return {
      questionnaireVersion: config.questionnaire_version,
      scoringVersion: config.scoring_version,
      dataVersion: config.data_version,
      answers: {},
      priorityQuestionIds: [],
      currentQuestionId: null,
      completedAt: null,
      updatedAt: null,
      versionMismatch: false,
      ...overrides,
    };
  }

  function isCompatible(saved, config) {
    return saved
      && saved.questionnaireVersion === config.questionnaire_version
      && saved.scoringVersion === config.scoring_version
      && saved.dataVersion === config.data_version
      && saved.answers && typeof saved.answers === 'object' && !Array.isArray(saved.answers);
  }

  function load(storage, config) {
    try {
      const saved = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
      if (isCompatible(saved, config)) return createState(config, {
        answers: saved.answers,
        priorityQuestionIds: normalizePriorityQuestionIds(saved.priorityQuestionIds, saved.answers),
        currentQuestionId: typeof saved.currentQuestionId === 'string' ? saved.currentQuestionId : null,
        completedAt: typeof saved.completedAt === 'string' ? saved.completedAt : null,
        updatedAt: typeof saved.updatedAt === 'string' ? saved.updatedAt : null,
      });
      if (saved) return createState(config, { versionMismatch: true });
    } catch (_) {
      return createState(config, { versionMismatch: true });
    }
    return createState(config);
  }

  function setAnswer(state, questionId, value) {
    state.answers[questionId] = value;
    state.priorityQuestionIds = normalizePriorityQuestionIds(state.priorityQuestionIds, state.answers);
    state.updatedAt = new Date().toISOString();
  }

  function normalizePriorityQuestionIds(priorityQuestionIds, answers) {
    return [...new Set(Array.isArray(priorityQuestionIds) ? priorityQuestionIds : [])]
      .filter((questionId) => typeof questionId === 'string' && typeof answers?.[questionId] === 'number' && Number.isFinite(answers[questionId]));
  }

  function togglePriorityQuestion(state, questionId) {
    const priorities = new Set(normalizePriorityQuestionIds(state.priorityQuestionIds, state.answers));
    if (priorities.has(questionId)) priorities.delete(questionId);
    else if (typeof state.answers?.[questionId] === 'number' && Number.isFinite(state.answers[questionId])) priorities.add(questionId);
    state.priorityQuestionIds = [...priorities];
    state.updatedAt = new Date().toISOString();
  }

  function setCurrentQuestion(state, questionId) {
    state.currentQuestionId = questionId;
    state.updatedAt = new Date().toISOString();
  }

  function markCompleted(state) {
    state.completedAt = new Date().toISOString();
    state.updatedAt = state.completedAt;
  }

  function save(storage, state) {
    const serializable = {
      questionnaireVersion: state.questionnaireVersion,
      scoringVersion: state.scoringVersion,
      dataVersion: state.dataVersion,
      answers: state.answers,
      priorityQuestionIds: normalizePriorityQuestionIds(state.priorityQuestionIds, state.answers),
      currentQuestionId: state.currentQuestionId,
      completedAt: state.completedAt,
      updatedAt: state.updatedAt,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  }

  return { STORAGE_KEY, createState, load, save, setAnswer, togglePriorityQuestion, setCurrentQuestion, markCompleted };
});
