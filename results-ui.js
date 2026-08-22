(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiResultsUi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  function pct(value) {
    return `${Math.round(Number(value || 0) * 100)}%`;
  }

  function percentagePoints(value) {
    return `${Math.round(Number(value || 0) * 100)} п.п.`;
  }

  function ratio(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.min(1, Math.max(0, numeric));
  }

  const ANSWER_VALUES = [-1, -0.5, 0, 0.5, 1];

  function answerLabel(question, value) {
    if (value == null) return 'Нет подтверждённой позиции';
    if (!question) return String(value);
    if (value === -1) return 'Полностью ближе к левому полюсу';
    if (value === -0.5) return 'Скорее ближе к левому полюсу';
    if (value === 0) return 'Промежуточная позиция';
    if (value === 0.5) return 'Скорее ближе к правому полюсу';
    if (value === 1) return 'Полностью ближе к правому полюсу';
    return String(value);
  }

  function lowerFirst(value) {
    const text = String(value || '');
    return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
  }

  function userAnswerLabel(question, value) {
    if (value == null) return 'Не знаю / недостаточно информации';
    if (!question || !Number.isFinite(Number(value))) return 'Ответ не выбран';
    const numeric = Number(value);
    if (numeric === -1) return question.left_pole_ru || 'Левый полюс';
    if (numeric === -0.5) return `Скорее ${lowerFirst(question.left_pole_ru)}`;
    if (numeric === 0) return 'Промежуточная позиция';
    if (numeric === 0.5) return `Скорее ${lowerFirst(question.right_pole_ru)}`;
    if (numeric === 1) return question.right_pole_ru || 'Правый полюс';
    return 'Ответ не выбран';
  }

  function positionClass(value) {
    return String(value).replace('-', 'minus').replace('.', '_');
  }

  function renderPositionAxis(question, userValue, partyValue) {
    if (!question) return '';
    const marker = (name, label, value) => value === value && value === Number(value)
      ? `<span class="position-marker position-marker-${name}" data-position-marker="${name}" aria-hidden="true">${label}</span>`
      : '';
    const slots = ANSWER_VALUES.map((value) => `<span class="position-axis-slot position-axis-slot-${positionClass(value)}"><span class="position-axis-tick" aria-hidden="true"></span>${userValue === value ? marker('user', 'В', value) : ''}${partyValue === value ? marker('party', 'П', value) : ''}</span>`).join('');
    return `<div class="position-axis" role="group" aria-label="Положение ответов на шкале вопроса"><div class="position-axis-poles"><span><b>Левый полюс</b>${escapeHtml(question.left_pole_ru)}</span><span><b>Правый полюс</b>${escapeHtml(question.right_pole_ru)}</span></div><div class="position-axis-track">${slots}</div><div class="position-axis-legend"><span><i class="position-marker position-marker-user" aria-hidden="true">В</i> Вы: ${escapeHtml(answerLabel(question, userValue))}</span><span><i class="position-marker position-marker-party" aria-hidden="true">П</i> Партия: ${escapeHtml(answerLabel(question, partyValue))}</span></div></div>`;
  }

  function substantiveAnswerLabel(count) {
    const lastTwo = count % 100;
    const last = count % 10;
    if (lastTwo < 11 || lastTwo > 14) {
      if (last === 1) return `${count} содержательный ответ`;
      if (last >= 2 && last <= 4) return `${count} содержательных ответа`;
    }
    return `${count} содержательных ответов`;
  }

  function renderDataNotReady({ questions, answers, coverage }) {
    const substantive = (questions || []).filter((question) => typeof answers?.[question.id] === 'number').length;
    const unknown = (questions || []).filter((question) => answers?.[question.id] === null).length;
    return `<section class="data-not-ready-result"><h2>Данные партий ещё не готовы для рекомендации</h2><p>Ваши ответы сохранены. Мы не показываем рейтинг, пока матрица позиций партий не прошла установленную проверку покрытия и источников.</p><dl class="completion-metrics"><div><dt>Содержательные ответы</dt><dd>${substantiveAnswerLabel(substantive)}</dd></div><div><dt>Не знаю</dt><dd>${unknown} ответ «Не знаю»</dd></div><div><dt>Матрица позиций</dt><dd>${coverage?.knownCells || 0} / ${coverage?.totalCells || 0}</dd></div></dl></section>`;
  }

  function renderSources(question, sourcesById) {
    return (question.position?.evidence || []).map((sourceId) => {
      const source = sourcesById.get(sourceId);
      if (!source) return `<span>${escapeHtml(sourceId)}</span>`;
      const label = escapeHtml(source.title || source.id);
      return source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${label}</a>` : `<span>${label}</span>`;
    }).join(', ');
  }

  function renderFamily(family, sourcesById, questionsById, { openQuestions = false, comparableOnly = false } = {}) {
    const hasScore = family.score != null;
    const score = ratio(family.score);
    const scoreLabel = hasScore ? pct(family.score) : 'Нет данных для сравнения';
    const scoreMarkup = hasScore
      ? `<div class="family-bar" aria-label="Совпадение ${scoreLabel}"><progress class="family-progress" max="1" value="${score}">${scoreLabel}</progress></div>`
      : `<p class="family-score-missing">${scoreLabel}</p>`;
    const openAttribute = openQuestions ? ' open' : '';
    const visibleQuestions = (family.questions || []).filter((question) => !comparableOnly || question.partyValue != null);
    const questionHtml = visibleQuestions.map((question) => {
      const questionData = questionsById.get(question.questionId);
      const sourceHtml = renderSources(question, sourcesById);
      const scope = question.position?.entity_scope || '—';
      const partyValue = question.partyValue == null ? null : Number(question.partyValue);
      const title = questionData?.short_title_ru || question.questionId;
      const promptHtml = questionData?.prompt_ru ? `<p class="question-profile-prompt">${escapeHtml(questionData.prompt_ru)}</p>` : '';
      const axisHtml = renderPositionAxis(questionData, Number(question.userValue), partyValue);
      return `<details class="question-evidence"${openAttribute}><summary><span class="question-evidence-title">${escapeHtml(title)}</span><span class="question-evidence-meta">совпадение ${pct(question.evidenceSimilarity)} · покрытие ${pct(question.coverage)}</span></summary>${promptHtml}${axisHtml}<dl class="evidence-facts"><div><dt>Ваш ответ</dt><dd>${escapeHtml(answerLabel(questionData, Number(question.userValue)))}</dd></div><div><dt>Позиция партии</dt><dd>${escapeHtml(answerLabel(questionData, partyValue))}</dd></div><div><dt>Совпадение</dt><dd>${pct(question.evidenceSimilarity)}</dd></div><div><dt>Покрытие данных</dt><dd>${pct(question.coverage)}</dd></div></dl><div class="evidence-provenance"><p class="evidence-scope"><strong>Entity scope</strong>: ${escapeHtml(scope)}</p><p>${escapeHtml(question.position?.explanation_ru || 'Позиция партии по этому вопросу отсутствует.')}</p>${sourceHtml ? `<p class="evidence-sources">Источники: ${sourceHtml}</p>` : ''}</div></details>`;
    }).join('');
    return `<article class="family-result"><div class="family-result-heading"><h3>${escapeHtml(family.label_ru || family.familyId)}</h3><strong>${scoreLabel}</strong></div>${scoreMarkup}<p>Покрытие данных: ${pct(family.coverage)}</p>${questionHtml}</article>`;
  }

  function renderRankingRow(result, index) {
    const gap = result.gapFromLeader == null ? '—' : result.gapFromLeader === 0 ? 'лидер' : `−${pct(result.gapFromLeader)}`;
    const isLikud = result.partyId === 'likud';
    const partyName = `${escapeHtml(result.party?.name_ru || result.partyId)}${isLikud ? '<sup class="ranking-footnote-marker"><a href="#likud-data-note" aria-label="Сноска о данных Ликуда">*</a></sup>' : ''}`;
    return `<li class="ranking-row${result.eligible ? '' : ' ranking-row-ineligible'}"><span class="ranking-place">${index + 1}</span><strong>${partyName}</strong><span>${pct(result.score)}</span><span>данные ${pct(result.coverage)}</span><span>${gap}</span></li>`;
  }

  function formatRecommendationReason(reason) {
    const substantiveMatch = /^need (\d+) substantive answers$/.exec(String(reason));
    if (substantiveMatch) return `нужно минимум ${substantiveMatch[1]} содержательных ответов`;
    const familiesMatch = /^need (\d+) answered families$/.exec(String(reason));
    if (familiesMatch) return `нужно ответить минимум в ${familiesMatch[1]} тематических группах`;
    if (reason === 'no party meets minimum result coverage') return 'ни одна партия не достигла минимального покрытия данных';
    return reason;
  }

  function renderPriorityPicker({ questions = [], answers = {}, priorityQuestionIds = [] } = {}) {
    if (!questions.length) return '';
    const priorities = new Set(priorityQuestionIds);
    const rows = questions.map((question) => {
      const questionId = question.id;
      const selected = priorities.has(questionId);
      const answer = answers?.[questionId];
      return `<article class="priority-question" data-priority-question-id="${escapeHtml(questionId)}"><div class="priority-question-heading"><div><h4 class="priority-question-title">${escapeHtml(question.short_title_ru || questionId)}</h4><p class="priority-question-answer">${escapeHtml(userAnswerLabel(question, answer))}</p></div><button class="priority-question-toggle" type="button" data-priority-toggle="${escapeHtml(questionId)}" aria-pressed="${selected}" aria-label="${selected ? 'Убрать отметку «Важно»' : 'Отметить вопрос как важный'}">${selected ? '★' : '☆'}</button></div><button class="priority-context-toggle" type="button" data-priority-context="${escapeHtml(questionId)}">Показать вопрос</button><p class="priority-question-prompt hidden" data-priority-prompt="${escapeHtml(questionId)}">${escapeHtml(question.prompt_ru || '')}</p></article>`;
    }).join('');
    return `<details class="priority-picker" aria-labelledby="priority-picker-heading"><summary class="priority-picker-summary result-disclosure-summary"><span id="priority-picker-heading" class="result-disclosure-label">Выберите важные для вас вопросы</span></summary><div class="priority-picker-body"><p class="priority-picker-copy">Ваши ответы уже сохранены. Отметьте вопросы, которые относятся к темам, особенно важным для вас.</p><div class="priority-picker-tools"><span>☆ — отметить вопрос как важный</span><button class="priority-expand" type="button" data-priority-expand>Показать полные формулировки</button></div><div class="priority-question-list" data-priority-list>${rows}</div><div class="priority-picker-footer"><button class="primary" type="button" data-priority-apply>Пересчитать результат</button></div></div></details>`;
  }

  function renderLiveResult({ recommendation, questions = [], answers = {}, priorityQuestionIds = [], sourcesById }) {
    if (!recommendation?.ready || !recommendation.leader) {
      const reasons = (recommendation?.reasons || []).map(formatRecommendationReason).join('; ');
      return `<section class="live-result insufficient-user-result"><p class="eyebrow">Недостаточно данных о ваших взглядах</p><h2>Недостаточно содержательных ответов для рекомендации</h2><p>Для устойчивого сравнения нужны минимум 8 содержательных ответов в 6 тематических группах. Сейчас: ${escapeHtml(reasons || 'уточните ответы по нескольким темам')}.</p></section>`;
    }
    const leader = recommendation.leader;
    const ranked = recommendation.ranked || [];
    const eligible = ranked.filter((result) => result.eligible);
    const families = (leader.families || []).filter((family) => family.score != null);
    const disagreements = [...families].sort((left, right) => left.score - right.score).slice(0, 3);
    const disagreementIds = new Set(disagreements.map((family) => family.familyId));
    const matches = [...families]
      .sort((left, right) => right.score - left.score)
      .filter((family) => !disagreementIds.has(family.familyId))
      .slice(0, 3);
    const topComparisonCount = Math.min(3, eligible.length);
    const topComparisonGap = topComparisonCount >= 2
      ? Number(eligible[0].score) - Number(eligible[topComparisonCount - 1].score)
      : null;
    const closeTopNote = topComparisonGap != null && topComparisonGap <= 0.05 + Number.EPSILON
      ? `<p class="ranking-note">Топ-${topComparisonCount} близки: разница между первым и ${topComparisonCount === 2 ? 'вторым' : 'третьим'} местом — ${percentagePoints(topComparisonGap)}</p>`
      : '';
    const questionsById = new Map(questions.map((question) => [question.id, question]));

    const profile = `<details class="family-profile family-profile-details"><summary class="family-profile-summary result-disclosure-summary"><span class="result-disclosure-label">Где ваши ответы расходятся с мнением партии</span><span class="result-disclosure-action">Подробнее</span></summary><div class="family-profile-body"><h3>Сильнее всего расходится</h3>${disagreements.map((family) => renderFamily(family, sourcesById, questionsById, { openQuestions: true, comparableOnly: true })).join('')}<h3 class="profile-subheading">Сильнее всего совпадает</h3>${matches.map((family) => renderFamily(family, sourcesById, questionsById, { comparableOnly: true })).join('')}</div></details>`;
    const priorityPicker = renderPriorityPicker({ questions, answers, priorityQuestionIds });
    const visibleRanking = eligible.slice(0, 7);
    const includesLikud = visibleRanking.some((result) => result.partyId === 'likud');
    const likudNote = includesLikud
      ? '<p id="likud-data-note" class="ranking-footnote"><sup aria-hidden="true">*</sup> По Ликуду в основном использованы данные коалиционных голосований; опубликованной программы партии найти не удалось.</p>'
      : '';
    return `<section class="live-result"><h2>Ближе всего по вашим ответам: ${escapeHtml(leader.party?.name_ru || leader.partyId)}</h2><p class="result-score">${pct(leader.score)}</p><p class="result-summary">Совпадение по указанным политическим предпочтениям; это не совет голосовать за партию. Покрытие именно ваших ответов: ${pct(leader.coverage)}.</p><section class="result-ranking"><h3>Рейтинг партий</h3>${closeTopNote}<ol>${visibleRanking.map(renderRankingRow).join('')}</ol>${likudNote}</section>${profile}${priorityPicker}<p class="analytics-link"><a href="analytics.html">Открыть подробную аналитику данных</a></p></section>`;
  }

  return { renderDataNotReady, renderLiveResult };
});
