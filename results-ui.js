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
    return `<section class="data-not-ready-result"><p class="eyebrow">Результат сохранён</p><h2>Данные партий ещё не готовы для рекомендации</h2><p>Ваши ответы сохранены. Мы не показываем рейтинг, пока матрица позиций партий не прошла установленную проверку покрытия и источников.</p><dl class="completion-metrics"><div><dt>Содержательные ответы</dt><dd>${substantiveAnswerLabel(substantive)}</dd></div><div><dt>Не знаю</dt><dd>${unknown} ответ «Не знаю»</dd></div><div><dt>Матрица позиций</dt><dd>${coverage?.knownCells || 0} / ${coverage?.totalCells || 0}</dd></div></dl></section>`;
  }

  function renderSources(question, sourcesById) {
    return (question.position?.evidence || []).map((sourceId) => {
      const source = sourcesById.get(sourceId);
      if (!source) return `<span>${escapeHtml(sourceId)}</span>`;
      const label = escapeHtml(source.title || source.id);
      return source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${label}</a>` : `<span>${label}</span>`;
    }).join(', ');
  }

  function renderFamily(family, sourcesById, questionsById) {
    const score = ratio(family.score);
    const questionHtml = (family.questions || []).map((question) => {
      const questionData = questionsById.get(question.questionId);
      const sourceHtml = renderSources(question, sourcesById);
      const originalStatus = question.originalStatus || question.position?.status || 'insufficient_data';
      const originalConfidence = question.originalConfidence ?? question.position?.confidence ?? 0;
      const scope = question.position?.entity_scope || '—';
      const partyValue = question.partyValue == null ? null : Number(question.partyValue);
      const title = questionData?.short_title_ru || question.questionId;
      const promptHtml = questionData?.prompt_ru ? `<p class="question-profile-prompt">${escapeHtml(questionData.prompt_ru)}</p>` : '';
      const axisHtml = renderPositionAxis(questionData, Number(question.userValue), partyValue);
      return `<details class="question-evidence"><summary><span class="question-evidence-title">${escapeHtml(title)}</span><span class="question-evidence-meta">совпадение ${pct(question.evidenceSimilarity)} · покрытие ${pct(question.coverage)}</span></summary>${promptHtml}${axisHtml}<dl class="evidence-facts"><div><dt>Ваш ответ</dt><dd>${escapeHtml(answerLabel(questionData, Number(question.userValue)))}</dd></div><div><dt>Позиция партии</dt><dd>${escapeHtml(answerLabel(questionData, partyValue))}</dd></div><div><dt>Совпадение</dt><dd>${pct(question.evidenceSimilarity)}</dd></div><div><dt>Покрытие данных</dt><dd>${pct(question.coverage)}</dd></div></dl><details class="evidence-provenance"><summary>Подробности источников</summary><dl class="evidence-facts"><div><dt>Исходные значения</dt><dd>${escapeHtml(`${question.userValue} / ${question.partyValue == null ? 'нет позиции' : question.partyValue}`)}</dd></div><div><dt>Исходный status</dt><dd>${escapeHtml(originalStatus)}</dd></div><div><dt>Исходный confidence</dt><dd>${pct(originalConfidence)}</dd></div><div><dt>Entity scope</dt><dd>${escapeHtml(scope)}</dd></div></dl><p>${escapeHtml(question.position?.explanation_ru || 'Позиция партии по этому вопросу отсутствует.')}</p>${sourceHtml ? `<p class="evidence-sources">Источники: ${sourceHtml}</p>` : ''}</details></details>`;
    }).join('');
    return `<article class="family-result"><div class="family-result-heading"><h3>${escapeHtml(family.label_ru || family.familyId)}</h3><strong>${pct(family.score)}</strong></div><div class="family-bar" aria-label="Совпадение ${pct(family.score)}"><progress class="family-progress" max="1" value="${score}">${pct(score)}</progress></div><p>Покрытие данных: ${pct(family.coverage)}</p>${questionHtml}</article>`;
  }

  function renderRankingRow(result, index) {
    const gap = result.gapFromLeader == null ? '—' : result.gapFromLeader === 0 ? 'лидер' : `−${pct(result.gapFromLeader)}`;
    return `<li class="ranking-row${result.eligible ? '' : ' ranking-row-ineligible'}"><span class="ranking-place">${index + 1}</span><strong>${escapeHtml(result.party?.name_ru || result.partyId)}</strong><span>${pct(result.score)}</span><span>данные ${pct(result.coverage)}</span><span>${gap}</span></li>`;
  }

  function renderLiveResult({ recommendation, questions = [], sourcesById }) {
    if (!recommendation?.ready || !recommendation.leader) {
      const reasons = (recommendation?.reasons || []).join('; ');
      return `<section class="live-result insufficient-user-result"><p class="eyebrow">Недостаточно данных о ваших взглядах</p><h2>Недостаточно содержательных ответов для рекомендации</h2><p>Для устойчивого сравнения нужны минимум 8 содержательных ответов в 6 тематических группах. Сейчас: ${escapeHtml(reasons || 'уточните ответы по нескольким темам')}.</p></section>`;
    }
    const leader = recommendation.leader;
    const ranked = recommendation.ranked || [];
    const eligible = ranked.filter((result) => result.eligible);
    const ineligible = ranked.filter((result) => !result.eligible);
    const families = leader.families || [];
    const matches = [...families].sort((left, right) => right.score - left.score).slice(0, 3);
    const disagreements = [...families].sort((left, right) => left.score - right.score).slice(0, 3);
    const nearTies = recommendation.nearTies || [];
    const questionsById = new Map(questions.map((question) => [question.id, question]));

    return `<section class="live-result"><p class="eyebrow">Результат</p><h2>Ближе всего по вашим ответам: ${escapeHtml(leader.party?.name_ru || leader.partyId)}</h2><p class="result-score">${pct(leader.score)}</p><p class="result-summary">Совпадение по указанным политическим предпочтениям; это не совет голосовать за партию. Покрытие именно ваших ответов: ${pct(leader.coverage)}.</p>${nearTies.length ? `<section class="near-ties"><h3>Практически равные альтернативы</h3><p>${nearTies.map((result) => `${escapeHtml(result.party?.name_ru || result.partyId)} (${pct(result.score)})`).join(' · ')}</p></section>` : ''}<section class="result-ranking"><h3>Рейтинг партий</h3><ol>${eligible.map(renderRankingRow).join('')}</ol>${ineligible.length ? `<h4>Мало данных для рекомендации</h4><ol start="${eligible.length + 1}">${ineligible.map((result, index) => renderRankingRow(result, eligible.length + index)).join('')}</ol>` : ''}</section><section class="result-highlights"><div><h3>Сильнее всего совпадает</h3><ul>${matches.map((family) => `<li>${escapeHtml(family.label_ru || family.familyId)} · ${pct(family.score)}</li>`).join('')}</ul></div><div><h3>Сильнее всего расходится</h3><ul>${disagreements.map((family) => `<li>${escapeHtml(family.label_ru || family.familyId)} · ${pct(family.score)}</li>`).join('')}</ul></div></section><section class="family-profile"><p class="eyebrow">Тематический профиль</p><h3>Совпадения и расхождения по тематическим группам</h3>${families.map((family) => renderFamily(family, sourcesById, questionsById)).join('')}</section><p class="analytics-link"><a href="analytics.html">Открыть подробную аналитику данных</a></p></section>`;
  }

  return { renderDataNotReady, renderLiveResult };
});
