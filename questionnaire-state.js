(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiQuestionnaireState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY = 'kalpiQuestionnaireStateV2';
  const POLE_ORIENTATION_MIGRATION = {
    fromQuestionnaireVersion: 'kalpi-ru-core-2026-08-21-v3',
    toQuestionnaireVersion: 'kalpi-ru-core-2026-08-31-v4',
    questionIds: new Set([
      'security_settlement_tradeoff',
      'territory_separation_tradeoff',
      'religion_lifestyle_tradeoff',
      'majority_institutional_limits_tradeoff',
      'jewish_state_civic_equality_tradeoff',
      'traditional_norms_personal_freedom_tradeoff',
      'taxes_public_services_tradeoff',
      'market_regulation_tradeoff',
      'social_support_redistribution_tradeoff',
      'west_bank_sovereignty',
      'supreme_court_appointments',
      'knesset_supreme_court_final_say',
      'gaza_jewish_settlements',
    ]),
  };

  function createState(config, overrides = {}) {
    return {
      questionnaireVersion: config.questionnaire_version,
      scoringVersion: config.scoring_version,
      dataVersion: config.data_version,
      positionMatrixVersion: config.position_matrix_version,
      answers: {},
      priorityQuestionIds: [],
      currentQuestionId: null,
      completedAt: null,
      updatedAt: null,
      versionMismatch: false,
      ...overrides,
    };
  }

  function isAnswerStateCompatible(saved, config) {
    return saved
      && saved.questionnaireVersion === config.questionnaire_version
      && saved.scoringVersion === config.scoring_version
      && saved.answers && typeof saved.answers === 'object' && !Array.isArray(saved.answers);
  }

  function migratePoleOrientationState(saved, config) {
    if (
      !saved
      || saved.questionnaireVersion !== POLE_ORIENTATION_MIGRATION.fromQuestionnaireVersion
      || config.questionnaire_version !== POLE_ORIENTATION_MIGRATION.toQuestionnaireVersion
      || saved.scoringVersion !== config.scoring_version
      || !saved.answers || typeof saved.answers !== 'object' || Array.isArray(saved.answers)
    ) return null;

    const answers = Object.fromEntries(Object.entries(saved.answers).map(([questionId, value]) => [
      questionId,
      POLE_ORIENTATION_MIGRATION.questionIds.has(questionId) && typeof value === 'number'
        ? (value === 0 ? 0 : -value)
        : value,
    ]));
    return createState(config, {
      answers,
      priorityQuestionIds: normalizePriorityQuestionIds(saved.priorityQuestionIds),
      currentQuestionId: typeof saved.currentQuestionId === 'string' ? saved.currentQuestionId : null,
      completedAt: typeof saved.completedAt === 'string' ? saved.completedAt : null,
      updatedAt: typeof saved.updatedAt === 'string' ? saved.updatedAt : null,
    });
  }

  function load(storage, config) {
    try {
      const saved = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
      if (isAnswerStateCompatible(saved, config)) return createState(config, {
        answers: saved.answers,
        priorityQuestionIds: normalizePriorityQuestionIds(saved.priorityQuestionIds),
        currentQuestionId: typeof saved.currentQuestionId === 'string' ? saved.currentQuestionId : null,
        completedAt: typeof saved.completedAt === 'string' ? saved.completedAt : null,
        updatedAt: typeof saved.updatedAt === 'string' ? saved.updatedAt : null,
      });
      const migrated = migratePoleOrientationState(saved, config);
      if (migrated) return migrated;
      if (saved) return createState(config, { versionMismatch: true });
    } catch (_) {
      return createState(config, { versionMismatch: true });
    }
    return createState(config);
  }

  function setAnswer(state, questionId, value) {
    state.answers[questionId] = value;
    state.priorityQuestionIds = normalizePriorityQuestionIds(state.priorityQuestionIds);
    state.updatedAt = new Date().toISOString();
  }

  function normalizePriorityQuestionIds(priorityQuestionIds) {
    return [...new Set(Array.isArray(priorityQuestionIds) ? priorityQuestionIds : [])]
      .filter((questionId) => typeof questionId === 'string');
  }

  function togglePriorityQuestion(state, questionId) {
    const priorities = new Set(normalizePriorityQuestionIds(state.priorityQuestionIds));
    if (priorities.has(questionId)) priorities.delete(questionId);
    else if (typeof questionId === 'string') priorities.add(questionId);
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
      positionMatrixVersion: state.positionMatrixVersion,
      answers: state.answers,
      priorityQuestionIds: normalizePriorityQuestionIds(state.priorityQuestionIds),
      currentQuestionId: state.currentQuestionId,
      completedAt: state.completedAt,
      updatedAt: state.updatedAt,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  }

  return { STORAGE_KEY, createState, load, save, setAnswer, togglePriorityQuestion, setCurrentQuestion, markCompleted };
});
