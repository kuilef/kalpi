(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiQuestionnaireUi = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const I18n = typeof module === 'object' && module.exports ? require('./i18n.js') : globalThis.KalpiI18n;
  const t = (text, params) => I18n.text(text, params);

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
      return `<span class="scale-choice"><input type="radio" name="${escapeHtml(question.id)}" id="${id}" value="${value}" data-shortcut="${number}"${checked} aria-label="${escapeHtml(t(label))}"><label for="${id}"><span class="choice-key" aria-hidden="true">${number}</span><span class="sr-only">${escapeHtml(t(label))}</span></label></span>`;
    };
    const importanceControl = importanceEnabled
      ? `<button class="importance-toggle" type="button" aria-pressed="${important}" aria-label="${escapeHtml(important ? t('Убрать отметку «Важно»') : t('Отметить вопрос как важный'))}">${important ? t('★ Важно') : t('☆ Важно')}</button>`
      : '';
    return `<article class="wizard-question" data-question-id="${escapeHtml(question.id)}">
      <fieldset>
        <legend><span class="question-heading"><span><span class="question-title">${escapeHtml(t(question.short_title_ru))}</span><span class="question-prompt">${escapeHtml(t(question.prompt_ru))}</span></span>${importanceControl}</span></legend>
        ${question.explanation_ru ? `<p class="question-explanation">${escapeHtml(t(question.explanation_ru))}</p>` : ''}
        <div class="poles"><p>${escapeHtml(t(question.left_pole_ru))}</p><p>${escapeHtml(t(question.right_pole_ru))}</p></div>
        <div class="scale" role="radiogroup" aria-label="${escapeHtml(t('Шкала ответа'))}">${SCALE.map((item, index) => choice(item.value, item.label, index + 1)).join('')}</div>
        <div class="unknown-choice"><span class="unknown-radio"><input type="radio" name="${escapeHtml(question.id)}" id="${question.id}-unknown" value="unknown" data-shortcut="0"${answer === null ? ' checked' : ''}><label class="unknown-label" for="${question.id}-unknown"><span class="unknown-number" aria-hidden="true">0</span><span>${escapeHtml(t('Не знаю / недостаточно информации'))}</span></label></span></div>
        <p class="keyboard-hint">${escapeHtml(t('Можно отвечать клавишами 1–5; 0 — «Не знаю».'))}<span class="desktop-keyboard-hint">${escapeHtml(t(' Enter — далее.'))}</span>${escapeHtml(t(' Если вопрос особенно важен для вас, нажмите ☆.'))}</p>
      </fieldset>
    </article>`;
  }

  return { SCALE, questionnaireProgress, questionOrdinal, renderQuestion };
});
