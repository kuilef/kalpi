(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiDebugFixture = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function isSubstantive(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= -1 && value <= 1;
  }

  function missing(questionId) {
    return {
      party: 'synthetic_debug_fixture',
      question: questionId,
      value: null,
      confidence: 0,
      status: 'insufficient_data',
      entity_scope: 'FIXTURE_ONLY',
      evidence: [],
      explanation_ru: '',
      last_verified: null,
    };
  }

  function createSyntheticFixture({ questions, answers }) {
    const positions = (questions || []).map((question, index) => {
      const answer = answers?.[question.id];
      if (!isSubstantive(answer) || index % 2 !== 0) return missing(question.id);
      return {
        party: 'synthetic_debug_fixture',
        question: question.id,
        value: answer,
        confidence: 0.8,
        status: 'fixture_only',
        entity_scope: 'FIXTURE_ONLY',
        evidence: ['synthetic-debug-evidence'],
        explanation_ru: 'Синтетическая запись для проверки визуализации; не является политической позицией.',
        last_verified: '2026-08-11',
      };
    });
    return {
      party: { id: 'synthetic_debug_fixture', name_ru: 'Синтетический пример (только debug)' },
      positions,
    };
  }

  return { createSyntheticFixture };
});
