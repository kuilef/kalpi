(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiQuestionnaireUi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCALE = [
    { value: -1, label: 'Полностью ближе к левому варианту' },
    { value: -0.5, label: 'Скорее ближе к левому варианту' },
    { value: 0, label: 'Промежуточная позиция между двумя вариантами' },
    { value: 0.5, label: 'Скорее ближе к правому варианту' },
    { value: 1, label: 'Полностью ближе к правому варианту' },
  ];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  function questionnaireProgress(questions, answers) {
    return {
      answered: (questions || []).filter((question) => Object.prototype.hasOwnProperty.call(answers || {}, question.id)).length,
      total: (questions || []).length,
    };
  }

  function questionOrdinal(index, total) {
    return `${index + 1} / ${total}`;
  }

  function renderQuestion({ question, index, total, answer, important = false, importanceEnabled = false }) {
    const choice = (value, label, number) => {
      const id = `${question.id}-${String(value).replace('-', 'minus').replace('.', '_')}`;
      const checked = answer === value ? ' checked' : '';
      return `<span class="scale-choice"><input type="radio" name="${escapeHtml(question.id)}" id="${id}" value="${value}" data-shortcut="${number}"${checked} aria-label="${escapeHtml(label)}"><label for="${id}"><span class="choice-key" aria-hidden="true">${number}</span><span class="sr-only">${escapeHtml(label)}</span></label></span>`;
    };
    const canPrioritize = importanceEnabled && typeof answer === 'number' && Number.isFinite(answer);
    const importanceControl = importanceEnabled
      ? `<button class="importance-toggle" type="button" aria-pressed="${important}" aria-label="${important ? 'Убрать отметку «Важно»' : 'Отметить вопрос как важный'}"${canPrioritize ? '' : ' disabled'}>${important ? '★ Важно' : '☆ Важно'}</button>`
      : '';
    return `<article class="wizard-question" data-question-id="${escapeHtml(question.id)}">
      <fieldset>
        <legend><span class="question-heading"><span><span class="question-title">${escapeHtml(question.short_title_ru)}</span><span class="question-prompt">${escapeHtml(question.prompt_ru)}</span></span>${importanceControl}</span></legend>
        ${question.explanation_ru ? `<p class="question-explanation">${escapeHtml(question.explanation_ru)}</p>` : ''}
        <div class="poles"><p>${escapeHtml(question.left_pole_ru)}</p><p>${escapeHtml(question.right_pole_ru)}</p></div>
        <div class="scale" role="radiogroup" aria-label="Шкала ответа">${SCALE.map((item, index) => choice(item.value, item.label, index + 1)).join('')}</div>
        <p class="keyboard-hint">Можно отвечать клавишами 1–5; 0 — «Не знаю».</p>
        <div class="unknown-choice"><span class="unknown-radio"><input type="radio" name="${escapeHtml(question.id)}" id="${question.id}-unknown" value="unknown" data-shortcut="0"${answer === null ? ' checked' : ''}><label class="unknown-label" for="${question.id}-unknown"><span class="unknown-number" aria-hidden="true">0</span><span>Не знаю / недостаточно информации</span></label></span></div>
      </fieldset>
    </article>`;
  }

  return { SCALE, questionnaireProgress, questionOrdinal, renderQuestion };
});
