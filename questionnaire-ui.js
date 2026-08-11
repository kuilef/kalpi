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

  function renderQuestion({ question, index, total, answer }) {
    const choice = (value, label, className = 'scale-choice') => {
      const id = `${question.id}-${String(value).replace('-', 'minus').replace('.', '_')}`;
      const checked = (value === 'unknown' && answer === null) || (value !== 'unknown' && answer === value) ? ' checked' : '';
      return `<span class="${className}"><input type="radio" name="${escapeHtml(question.id)}" id="${id}" value="${value}"${checked} aria-label="${escapeHtml(label)}"><label for="${id}"><span aria-hidden="true"></span><span class="sr-only">${escapeHtml(label)}</span></label></span>`;
    };
    return `<article class="wizard-question" data-question-id="${escapeHtml(question.id)}">
      <p class="question-code">${escapeHtml(question.code)} · Вопрос ${index + 1} из ${total}</p>
      <fieldset>
        <legend><span class="question-title">${escapeHtml(question.short_title_ru)}</span><span class="question-prompt">${escapeHtml(question.prompt_ru)}</span></legend>
        ${question.explanation_ru ? `<p class="question-explanation">${escapeHtml(question.explanation_ru)}</p>` : ''}
        <div class="poles"><p>${escapeHtml(question.left_pole_ru)}</p><p>${escapeHtml(question.right_pole_ru)}</p></div>
        <div class="scale" role="radiogroup" aria-label="Шкала ответа">${SCALE.map((item) => choice(item.value, item.label)).join('')}</div>
        <div class="unknown-choice"><span class="unknown-radio"><input type="radio" name="${escapeHtml(question.id)}" id="${question.id}-unknown" value="unknown"${answer === null ? ' checked' : ''}><label class="unknown-label" for="${question.id}-unknown">Не знаю / недостаточно информации</label></span></div>
      </fieldset>
    </article>`;
  }

  return { SCALE, questionnaireProgress, renderQuestion };
});
