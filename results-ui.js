(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiResultsUi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  function pct(value) {
    return `${Math.round(Number(value || 0) * 100)}%`;
  }

  function substantiveAnswerLabel(count) {
    const remainder = Math.abs(count) % 100;
    if (remainder >= 11 && remainder <= 14) return `${count} содержательных ответов`;
    if (remainder % 10 === 1) return `${count} содержательный ответ`;
    if (remainder % 10 >= 2 && remainder % 10 <= 4) return `${count} содержательных ответа`;
    return `${count} содержательных ответов`;
  }

  function renderDataNotReady({ questions, answers, coverage }) {
    const answered = (questions || []).filter((question) => Object.prototype.hasOwnProperty.call(answers || {}, question.id));
    const unknown = answered.filter((question) => answers[question.id] === null).length;
    const substantive = answered.length - unknown;
    return `<section class="data-not-ready-result">
      <p class="eyebrow">Опрос завершён</p>
      <h2>Данные партий ещё не готовы</h2>
      <p>Ваши ответы сохранены. Сравнение с партиями появится после проверки и заполнения позиций по новому набору вопросов.</p>
      <dl class="completion-metrics"><div><dt>Содержательные ответы</dt><dd>${substantiveAnswerLabel(substantive)}</dd></div><div><dt>Не знаю</dt><dd>${unknown} ответ «Не знаю»</dd></div><div><dt>Матрица позиций</dt><dd>${coverage?.knownCells || 0} / ${coverage?.totalCells || 0}</dd></div></dl>
    </section>`;
  }

  function renderLiveResult({ result, sourcesById }) {
    const familyHtml = (result.families || []).map((family) => {
      const details = (family.questions || []).map((question) => {
        const sources = (question.position?.evidence || []).map((id) => sourcesById?.get(id)).filter(Boolean)
          .map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title || source.id)}</a>`).join(', ');
        return `<details><summary>${escapeHtml(question.questionId)} · ${pct(question.evidenceSimilarity)} · coverage ${pct(question.coverage)}</summary><p>${escapeHtml(question.position?.explanation_ru || 'Нет пояснения.')}</p>${sources ? `<p>${sources}</p>` : ''}</details>`;
      }).join('');
      return `<article class="family-result"><h3>${escapeHtml(family.label_ru || family.familyId)}</h3><p>${pct(family.score)} · coverage ${pct(family.coverage)}</p>${details}</article>`;
    }).join('');
    return `<section class="live-result"><h2>${escapeHtml(result.party?.name_ru || result.partyId)}</h2><p class="result-score">${pct(result.score)}</p><p>Покрытие данных: ${pct(result.coverage)}</p>${familyHtml}</section>`;
  }

  return { renderDataNotReady, renderLiveResult };
});
