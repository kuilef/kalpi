(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiDataValidation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const QUESTION_KINDS = new Set(['fundamental', 'policy']);
  const QUESTION_STATUSES = new Set(['core', 'experimental', 'adaptive', 'disabled']);
  const QUESTION_SCOPES = new Set(['permanent', 'election_specific']);
  const POSITION_STATUSES = new Set(['known', 'mixed', 'historical', 'insufficient_data']);

  function arrayOrError(data, key, errors) {
    if (!Array.isArray(data?.[key])) {
      errors.push(`${key} must be an array`);
      return [];
    }
    return data[key];
  }

  function ids(items, label, errors) {
    const result = new Set();
    for (const item of items) {
      if (!item || typeof item.id !== 'string' || !item.id) {
        errors.push(`${label}: missing id`);
      } else if (result.has(item.id)) {
        errors.push(`${label}: duplicate id ${item.id}`);
      } else {
        result.add(item.id);
      }
    }
    return result;
  }

  function validateDataset(data, options = {}) {
    const requireSources = options.requireSources !== false;
    const errors = [];
    const parties = arrayOrError(data, 'parties', errors);
    const questions = arrayOrError(data, 'questions', errors);
    const positions = arrayOrError(data, 'positions', errors);
    const sources = requireSources ? arrayOrError(data, 'sources', errors) : (Array.isArray(data?.sources) ? data.sources : []);
    const config = data?.scoringConfig;
    if (!config || typeof config !== 'object' || Array.isArray(config)) errors.push('scoringConfig must be an object');
    if (!Array.isArray(config?.families)) errors.push('scoringConfig.families must be an array');

    const partyIds = ids(parties, 'party', errors);
    const questionIds = ids(questions, 'question', errors);
    const sourceIds = ids(sources, 'source', errors);
    const activePartyIds = new Set(parties.filter((party) => party.active !== false).map((party) => party.id));
    const seenCodes = new Set();
    const seenOrders = new Set();

    for (const question of questions) {
      if (!QUESTION_KINDS.has(question.kind)) errors.push(`question ${question.id}: invalid kind`);
      if (!QUESTION_STATUSES.has(question.status)) errors.push(`question ${question.id}: invalid status`);
      if (!QUESTION_SCOPES.has(question.scope)) errors.push(`question ${question.id}: invalid scope`);
      for (const field of ['code', 'short_title_ru', 'prompt_ru', 'left_pole_ru', 'right_pole_ru']) {
        if (typeof question[field] !== 'string' || !question[field].trim()) errors.push(`question ${question.id}: missing ${field}`);
      }
      if (seenCodes.has(question.code)) errors.push(`question: duplicate code ${question.code}`);
      seenCodes.add(question.code);
      if (!Number.isInteger(question.display_order) || question.display_order < 1) errors.push(`question ${question.id}: invalid display_order`);
      if (seenOrders.has(question.display_order)) errors.push(`question: duplicate display_order ${question.display_order}`);
      seenOrders.add(question.display_order);
    }

    const familyIds = new Set();
    const assignments = new Map();
    for (const family of config?.families || []) {
      if (!family || typeof family.id !== 'string' || !family.id) {
        errors.push('family: missing id');
        continue;
      }
      if (familyIds.has(family.id)) errors.push(`family: duplicate id ${family.id}`);
      familyIds.add(family.id);
      for (const weight of ['fundamental_weight', 'policy_weight', 'family_weight']) {
        if (!Number.isFinite(Number(family[weight])) || Number(family[weight]) < 0) errors.push(`family ${family.id}: invalid ${weight}`);
      }
      for (const [kind, key] of [['fundamental', 'fundamental_questions'], ['policy', 'policy_questions']]) {
        if (!Array.isArray(family[key])) {
          errors.push(`family ${family.id}: ${key} must be an array`);
          continue;
        }
        for (const questionId of family[key]) {
          if (!questionIds.has(questionId)) {
            errors.push(`family ${family.id}: unknown question ${questionId}`);
            continue;
          }
          const question = questions.find((item) => item.id === questionId);
          if (question.kind !== kind) errors.push(`family ${family.id}: question ${questionId} has wrong kind`);
          if (assignments.has(questionId)) errors.push(`question ${questionId}: assigned to more than one family`);
          assignments.set(questionId, family.id);
        }
      }
    }
    for (const question of questions.filter((item) => item.status === 'core')) {
      if (!assignments.has(question.id)) errors.push(`question ${question.id}: missing family assignment`);
    }

    const pairs = new Set();
    for (const position of positions) {
      const key = `${position?.party}/${position?.question}`;
      if (pairs.has(key)) errors.push(`duplicate position ${key}`);
      pairs.add(key);
      if (!partyIds.has(position.party)) errors.push(`position ${key}: unknown party`);
      if (!questionIds.has(position.question)) errors.push(`position ${key}: unknown question`);
      if (!POSITION_STATUSES.has(position.status)) errors.push(`position ${key}: invalid status`);
      if (!Number.isFinite(Number(position.confidence)) || Number(position.confidence) < 0 || Number(position.confidence) > 1) errors.push(`position ${key}: confidence must be in [0, 1]`);
      if (position.value != null && (!Number.isFinite(Number(position.value)) || Number(position.value) < -1 || Number(position.value) > 1)) errors.push(`position ${key}: value must be in [-1, 1]`);
      if (position.status === 'insufficient_data' && (position.value !== null || Number(position.confidence) !== 0)) errors.push(`position ${key}: insufficient_data requires null value and zero confidence`);
      if (position.status !== 'insufficient_data') {
        if (position.value == null) errors.push(`position ${key}: known position requires value`);
        if (!Array.isArray(position.evidence) || !position.evidence.length) errors.push(`position ${key}: known position requires evidence`);
        if (typeof position.explanation_ru !== 'string' || !position.explanation_ru.trim()) errors.push(`position ${key}: known position requires explanation_ru`);
        if (typeof position.last_verified !== 'string' || !position.last_verified.trim()) errors.push(`position ${key}: known position requires last_verified`);
      }
      if (requireSources) for (const sourceId of position.evidence || []) if (!sourceIds.has(sourceId)) errors.push(`position ${key}: unknown evidence ${sourceId}`);
    }
    for (const partyId of activePartyIds) {
      for (const question of questions.filter((item) => item.status === 'core')) {
        const key = `${partyId}/${question.id}`;
        if (!pairs.has(key)) errors.push(`missing position ${key}`);
      }
    }

    if (!['data_not_ready', 'live'].includes(config?.recommendation_mode)) errors.push('invalid recommendation_mode');
    if (config?.prototype_trust_policy != null && config.prototype_trust_policy !== 'all_value_positions_full_confidence') errors.push('invalid prototype_trust_policy');
    const resultPolicy = config?.result_policy;
    if (resultPolicy != null) {
      for (const field of ['min_substantive_answers', 'min_answered_families']) {
        if (!Number.isInteger(Number(resultPolicy[field])) || Number(resultPolicy[field]) < 1) errors.push(`invalid result_policy.${field}`);
      }
      for (const field of ['min_party_result_coverage', 'near_tie_points']) {
        if (!Number.isFinite(Number(resultPolicy[field])) || Number(resultPolicy[field]) < 0 || Number(resultPolicy[field]) > 1) errors.push(`invalid result_policy.${field}`);
      }
    }
    const releaseGate = config?.release_gate;
    if (releaseGate != null) {
      for (const field of ['global_coverage_min', 'slice_coverage_min']) {
        if (!Number.isFinite(Number(releaseGate[field])) || Number(releaseGate[field]) < 0 || Number(releaseGate[field]) > 1) errors.push(`invalid release_gate.${field}`);
      }
    }
    if (config?.recommendation_mode === 'live') {
      if (!positions.some((position) => position.status !== 'insufficient_data')) errors.push('live recommendation_mode requires known positions');
      if (config.prototype_trust_policy !== 'all_value_positions_full_confidence') errors.push('live recommendation_mode requires prototype_trust_policy');
      if (!resultPolicy) errors.push('live recommendation_mode requires result_policy');
      if (!releaseGate) errors.push('live recommendation_mode requires release_gate');
    }
    return errors;
  }

  return { validateDataset };
});
