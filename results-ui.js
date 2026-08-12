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

  function renderFamily(family, sourcesById) {
    const questionHtml = (family.questions || []).map((question) => {
      const sourceHtml = renderSources(question, sourcesById);
      const originalStatus = question.originalStatus || question.position?.status || 'insufficient_data';
      const originalConfidence = question.originalConfidence ?? question.position?.confidence ?? 0;
      const scope = question.position?.entity_scope || '—';
      const partyValue = question.partyValue == null ? 'нет позиции' : String(question.partyValue);
      return `<details class="question-evidence"><summary>${escapeHtml(question.questionId)} · совпадение ${pct(question.evidenceSimilarity)} · coverage ${pct(question.coverage)}</summary><dl class="evidence-facts"><div><dt>Ваш ответ</dt><dd>${escapeHtml(question.userValue)}</dd></div><div><dt>Позиция партии</dt><dd>${escapeHtml(partyValue)}</dd></div><div><dt>Исходный status</dt><dd>${escapeHtml(originalStatus)}</dd></div><div><dt>Исходный confidence</dt><dd>${pct(originalConfidence)}</dd></div><div><dt>Entity scope</dt><dd>${escapeHtml(scope)}</dd></div></dl><p>${escapeHtml(question.position?.explanation_ru || 'Позиция партии по этому вопросу отсутствует.')}</p>${sourceHtml ? `<p class="evidence-sources">Источники: ${sourceHtml}</p>` : ''}</details>`;
    }).join('');
    return `<article class="family-result"><div class="family-result-heading"><h3>${escapeHtml(family.label_ru || family.familyId)}</h3><strong>${pct(family.score)}</strong></div><div class="family-bar" aria-label="Совпадение ${pct(family.score)}"><span style="width:${Math.round(Number(family.score || 0) * 100)}%"></span></div><p>Покрытие данных: ${pct(family.coverage)}</p>${questionHtml}</article>`;
  }

  function renderRankingRow(result, index) {
    const gap = result.gapFromLeader == null ? '—' : result.gapFromLeader === 0 ? 'лидер' : `−${pct(result.gapFromLeader)}`;
    return `<li class="ranking-row${result.eligible ? '' : ' ranking-row-ineligible'}"><span class="ranking-place">${index + 1}</span><strong>${escapeHtml(result.party?.name_ru || result.partyId)}</strong><span>${pct(result.score)}</span><span>данные ${pct(result.coverage)}</span><span>${gap}</span></li>`;
  }

  function renderLiveResult({ recommendation, sourcesById }) {
    if (!recommendation?.ready || !recommendation.leader) {
      const reasons = (recommendation?.reasons || []).join('; ');
      return `<section class="live-result insufficient-user-result"><p class="eyebrow">Недостаточно данных о ваших взглядах</p><h2>Недостаточно содержательных ответов для рекомендации</h2><p>Для устойчивого сравнения нужны минимум 8 содержательных ответов в 6 тематических families. Сейчас: ${escapeHtml(reasons || 'уточните ответы по нескольким темам')}.</p></section>`;
    }
    const leader = recommendation.leader;
    const ranked = recommendation.ranked || [];
    const eligible = ranked.filter((result) => result.eligible);
    const ineligible = ranked.filter((result) => !result.eligible);
    const families = leader.families || [];
    const matches = [...families].sort((left, right) => right.score - left.score).slice(0, 3);
    const disagreements = [...families].sort((left, right) => left.score - right.score).slice(0, 3);
    const nearTies = recommendation.nearTies || [];

    return `<section class="live-result"><p class="eyebrow">Результат</p><h2>Ближе всего по вашим ответам: ${escapeHtml(leader.party?.name_ru || leader.partyId)}</h2><p class="result-score">${pct(leader.score)}</p><p class="result-summary">Совпадение по указанным политическим предпочтениям; это не совет голосовать за партию. Покрытие именно ваших ответов: ${pct(leader.coverage)}.</p>${nearTies.length ? `<section class="near-ties"><h3>Практически равные альтернативы</h3><p>${nearTies.map((result) => `${escapeHtml(result.party?.name_ru || result.partyId)} (${pct(result.score)})`).join(' · ')}</p></section>` : ''}<section class="result-ranking"><h3>Рейтинг партий</h3><ol>${eligible.map(renderRankingRow).join('')}</ol>${ineligible.length ? `<h4>Мало данных для рекомендации</h4><ol start="${eligible.length + 1}">${ineligible.map((result, index) => renderRankingRow(result, eligible.length + index)).join('')}</ol>` : ''}</section><section class="result-highlights"><div><h3>Сильнее всего совпадает</h3><ul>${matches.map((family) => `<li>${escapeHtml(family.label_ru || family.familyId)} · ${pct(family.score)}</li>`).join('')}</ul></div><div><h3>Сильнее всего расходится</h3><ul>${disagreements.map((family) => `<li>${escapeHtml(family.label_ru || family.familyId)} · ${pct(family.score)}</li>`).join('')}</ul></div></section><section class="family-profile"><p class="eyebrow">Тематический профиль</p><h3>Совпадения и расхождения по families</h3>${families.map((family) => renderFamily(family, sourcesById)).join('')}</section><p class="analytics-link"><a href="analytics.html">Открыть подробную аналитику данных</a></p></section>`;
  }

  return { renderDataNotReady, renderLiveResult };
});
