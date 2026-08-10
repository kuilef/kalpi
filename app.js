(function () {
  'use strict';
  const Core = window.KalpiCore;
  const I18n = window.KalpiI18n;
  const DEFAULT_DATA = window.KALPI_DATA;
  const BASELINE_DATA = window.KALPI_BASELINE_DATA || null;
  const Loader = window.KalpiDataLoader;
  const AxisStrips = window.KalpiAxisStrips;
  const ANSWER_KEY = 'kalpiPrototypeAnswersV1';
  const MIN_PARTY_AXIS_COVERAGE = 0.22;
  const MIN_USER_AXIS_COVERAGE = 0.18;
  const ANSWER_OPTIONS = [-2, -1, 0, 1, 2, 'skip'];
  const COPY = {
    en: { prototype: 'Kalpi · experimental prototype', headline: 'Which party is closest to your views?', lede: 'Answer concrete policy questions. An unknown party position is not neutral: it lowers data coverage and draws the ranking toward 50%.', languageLabel: 'Language', questionnaireEyebrow: 'Questionnaire', questionnaireTitle: 'Policy questions', answerHint: '“Neutral / unsure” is the substantive answer 0. “Skip” excludes the question from the calculation.', calculate: 'Show result', reset: 'Reset answers', resultEyebrow: 'Result', recommendation: 'Recommendation', ranking: 'Party ranking', whyThisParty: 'Why this party', mapTitle: 'Multidimensional map', mapHint: 'Choose any two axes. Parties lacking adequate data on either axis are not artificially placed at the centre.', axisProfile: 'Five-axis profile', transparencyEyebrow: 'Transparency', inspectionTitle: 'Your answers and party data', showData: 'Show data', hideData: 'Hide data', qualityEyebrow: 'Data quality', qualityTitle: 'How complete is the party dataset?', qualityHint: 'This is the evidence base: known positions, confidence, provenance and five-axis coverage. insufficient_data is not a neutral position.', partyCoverage: 'Coverage by party', axisReliability: 'Reliability of the five axes', weakQuestions: 'Questions with the weakest coverage', heatmapTitle: 'Heatmap: party × question', heatmapHint: 'Each cell is one party position. Select a cell to see its status, confidence and sources.', provenance: 'Provenance and source types', gaps: 'Remaining gaps', footer: 'This is a research tool, not a forecast of party behaviour after an election. Check the evidence and source dates.', answers: { '-2': 'Strongly oppose', '-1': 'Somewhat oppose', '0': 'Neutral / unsure', '1': 'Somewhat support', '2': 'Strongly support', skip: 'Skip' } },
    ru: { prototype: 'Kalpi · экспериментальный прототип', headline: 'Какая партия ближе к вашим позициям?', lede: 'Ответьте на конкретные вопросы. Неизвестная позиция партии не считается нейтральной: она уменьшает покрытие данных и приближает итоговый рейтинг к 50%.', languageLabel: 'Язык', questionnaireEyebrow: 'Опрос', questionnaireTitle: 'Политические вопросы', answerHint: '«Нейтрально / не уверен» — это содержательный ответ 0. «Пропустить» исключает вопрос из расчёта.', calculate: 'Показать результат', reset: 'Сбросить ответы', resultEyebrow: 'Результат', recommendation: 'Рекомендация', ranking: 'Рейтинг партий', whyThisParty: 'Почему эта партия', mapTitle: 'Многомерная карта', mapHint: 'Выберите любые две оси. Партии без достаточных данных по одной из осей не помещаются искусственно в центр.', axisProfile: 'Профиль по пяти осям', transparencyEyebrow: 'Прозрачность', inspectionTitle: 'Ответы и данные партий', showData: 'Показать данные', hideData: 'Скрыть данные', qualityEyebrow: 'Качество данных', qualityTitle: 'Насколько заполнена база партий?', qualityHint: 'Здесь считается доказательная база: известные позиции, confidence, происхождение evidence и покрытие пяти осей. insufficient_data не считается нейтральной позицией.', partyCoverage: 'Покрытие по партиям', axisReliability: 'Надёжность пяти осей', weakQuestions: 'Какие вопросы заполнены хуже всего', heatmapTitle: 'Heatmap: партия × вопрос', heatmapHint: 'Каждая клетка — одна позиция партии. Нажмите на клетку, чтобы увидеть статус, confidence и источники.', provenance: 'Provenance и типы источников', gaps: 'Оставшиеся пробелы', footer: 'Это исследовательский инструмент, а не прогноз поведения партии после выборов. Проверяйте evidence и даты источников.', answers: { '-2': 'Категорически против', '-1': 'Скорее против', '0': 'Нейтрально / не уверен', '1': 'Скорее за', '2': 'Полностью за', skip: 'Пропустить' } },
    he: { prototype: 'Kalpi · אבטיפוס ניסויי', headline: 'איזו מפלגה קרובה ביותר לעמדותיך?', lede: 'ענו על שאלות מדיניות קונקרטיות. עמדה לא ידועה של מפלגה אינה ניטרלית: היא מפחיתה את כיסוי הנתונים ומקרבת את הדירוג ל־50%.', languageLabel: 'שפה', questionnaireEyebrow: 'שאלון', questionnaireTitle: 'שאלות מדיניות', answerHint: '״ניטרלי / לא בטוח״ היא תשובה מהותית 0. ״דלג/י״ מוציאה את השאלה מהחישוב.', calculate: 'הצג תוצאה', reset: 'אפס תשובות', resultEyebrow: 'תוצאה', recommendation: 'המלצה', ranking: 'דירוג מפלגות', whyThisParty: 'למה המפלגה הזו', mapTitle: 'מפה רב־ממדית', mapHint: 'בחרו שני צירים. מפלגות ללא נתונים מספקים באחד הצירים אינן ממוקמות באופן מלאכותי במרכז.', axisProfile: 'פרופיל לפי חמישה צירים', transparencyEyebrow: 'שקיפות', inspectionTitle: 'התשובות שלך ונתוני המפלגות', showData: 'הצג נתונים', hideData: 'הסתר נתונים', qualityEyebrow: 'איכות נתונים', qualityTitle: 'עד כמה מאגר המפלגות מלא?', qualityHint: 'זהו בסיס הראיות: עמדות ידועות, confidence, מקור וכיסוי של חמישה צירים. insufficient_data אינו עמדה ניטרלית.', partyCoverage: 'כיסוי לפי מפלגה', axisReliability: 'מהימנות חמשת הצירים', weakQuestions: 'השאלות עם הכיסוי החלש ביותר', heatmapTitle: 'מפת חום: מפלגה × שאלה', heatmapHint: 'כל תא הוא עמדת מפלגה. בחרו תא כדי לראות סטטוס, confidence ומקורות.', provenance: 'מקור וסוגי מקורות', gaps: 'פערים שנותרו', footer: 'זהו כלי מחקרי, לא תחזית להתנהגות מפלגה לאחר בחירות. בדקו את הראיות ותאריכי המקורות.', answers: { '-2': 'מתנגד/ת מאוד', '-1': 'נוטה להתנגד', '0': 'ניטרלי / לא בטוח', '1': 'נוטה לתמוך', '2': 'תומך/ת מאוד', skip: 'דלג/י' } },
  };
  Object.assign(COPY.en, {
    axisStripsTitle: 'Positions across five axes',
    axisStripsHint: 'Coloured dots are parties; the separate dot is you. Hover or use the keyboard to see details.',
    mapDetailsTitle: 'Additional: multidimensional map',
    you: 'You', axisValue: 'Position', axisCoverage: 'Coverage',
    notShown: 'Not shown because of insufficient data',
    userNotShown: 'Your position is not shown: not enough answers on this axis.',
  });
  Object.assign(COPY.ru, {
    axisStripsTitle: 'Позиции по пяти осям',
    axisStripsHint: 'Цветные точки — партии; отдельная точка — вы. Наведите или перейдите к точке с клавиатуры, чтобы увидеть детали.',
    mapDetailsTitle: 'Дополнительно: многомерная карта',
    you: 'Вы', axisValue: 'Позиция', axisCoverage: 'Покрытие',
    notShown: 'Не показаны из-за недостатка данных',
    userNotShown: 'Ваша позиция не показана: недостаточно ответов по этой оси.',
  });
  Object.assign(COPY.he, {
    axisStripsTitle: 'מיקומים לאורך חמשת הצירים',
    axisStripsHint: 'נקודות צבעוניות הן מפלגות; הנקודה הנפרדת היא שלך. רחפו או עברו עם המקלדת לפרטים.',
    mapDetailsTitle: 'נוסף: מפה רב־ממדית',
    you: 'את/ה', axisValue: 'מיקום', axisCoverage: 'כיסוי',
    notShown: 'לא מוצגים בגלל מחסור בנתונים',
    userNotShown: 'המיקום שלך לא מוצג: אין מספיק תשובות בציר הזה.',
  });
  Object.assign(COPY.en, {
    markImportant: 'Important to me', unmarkImportant: 'Important', priorityResult: 'Important questions',
  });
  Object.assign(COPY.ru, {
    markImportant: 'Важно для меня', unmarkImportant: 'Важно', priorityResult: 'Важные для вас вопросы',
  });
  Object.assign(COPY.he, {
    markImportant: 'חשוב לי', unmarkImportant: 'חשוב', priorityResult: 'שאלות חשובות לך',
  });

  let data = DEFAULT_DATA;
  let dataSource = 'bundle';
  let dataSourceWarning = '';
  const storedQuestionnaireState = loadQuestionnaireState();
  let answers = storedQuestionnaireState.answers;
  let priorityQuestionIds = storedQuestionnaireState.priorityQuestionIds;
  let latestResults = null;
  let latestAxisState = null;
  let locale = I18n.loadLocale(window.localStorage);

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const pct = (v) => `${Math.round((v || 0) * 100)}%`;
  const t = (key) => COPY[locale][key] || key;
  const text = (record, key) => I18n.localized(record, key, locale);
  const answerLabel = (value) => t('answers')[String(value)] || String(value);
  const localizedLabel = (ru, en, he) => locale === 'he' ? he : locale === 'en' ? en : ru;
  const statusLabel = (value) => ({ known: localizedLabel('известно', 'known', 'ידוע'), mixed: localizedLabel('смешанная', 'mixed', 'מעורב'), historical: localizedLabel('историческая', 'historical', 'היסטורי'), insufficient_data: localizedLabel('недостаточно данных', 'insufficient data', 'אין די נתונים') }[value] || value);
  const scopeLabel = (value) => ({ CURRENT_LIST: localizedLabel('текущий список', 'current list', 'רשימה נוכחית'), PARTY: localizedLabel('партия', 'party', 'מפלגה'), FACTION: localizedLabel('фракция', 'faction', 'סיעה'), COMPONENT_PARTY: localizedLabel('партия-компонент', 'component party', 'מפלגת רכיב'), LEADER: localizedLabel('лидер', 'leader', 'מנהיג'), INDIVIDUAL_MK: localizedLabel('депутат', 'individual MK', 'חבר כנסת') }[value] || value);

  function loadQuestionnaireState() {
    try {
      const stored = JSON.parse(localStorage.getItem(ANSWER_KEY) || '{}');
      if (stored && typeof stored.answers === 'object' && !Array.isArray(stored.answers)) {
        return { answers: stored.answers, priorityQuestionIds: Array.isArray(stored.priorityQuestionIds) ? stored.priorityQuestionIds : [] };
      }
      return { answers: stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}, priorityQuestionIds: [] };
    } catch (_) { return { answers: {}, priorityQuestionIds: [] }; }
  }
  function saveAnswers() {
    try { localStorage.setItem(ANSWER_KEY, JSON.stringify({ answers, priorityQuestionIds })); } catch (_) {}
  }

  async function loadInitialDataset() {
    if (location.protocol !== 'file:') {
      try {
        const loaded = await Loader.loadDataset(async (filename) => {
          const response = await fetch(`data/${filename}?v=${Date.now()}`, { cache: 'no-store' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        });
        const errors = Core.validateDataset(loaded);
        if (errors.length) throw new Error(errors.slice(0, 6).join('; '));
        data = loaded;
        dataSource = 'json-files';
        dataSourceWarning = '';
        return;
      } catch (error) {
        data = DEFAULT_DATA;
        dataSource = 'bundle-fallback';
        dataSourceWarning = `Не удалось загрузить data/*.json: ${error.message}. Используется встроенный bundle.`;
        return;
      }
    }
    data = DEFAULT_DATA;
    dataSource = 'bundle-file';
    dataSourceWarning = 'Страница открыта через file://. Файлы data/*.json браузер напрямую не читает; замена JSON не изменит страницу. Запустите start.bat или выполните python tools/build_data_bundle.py.';
  }

  function renderDataSourceStatus() {
    const analytics = Core.computeDatasetAnalytics({
      parties: data.parties, questions: data.questions, positions: data.positions, sources: data.sources, axes: data.axes
    });
    const labels = {
      'json-files': 'data/*.json (загружены напрямую)',
      'bundle-file': 'data/default-data.js (режим file://)',
      'bundle-fallback': 'data/default-data.js (fallback)',
      'bundle': 'data/default-data.js'
    };
    const warning = dataSourceWarning ? `<div class="source-warning">${esc(dataSourceWarning)}</div>` : '';
    $('data-source-status').classList.remove('hidden');
    $('data-source-status').innerHTML = `<strong>${locale === 'he' ? 'נתונים פעילים:' : locale === 'en' ? 'Active data:' : 'Активные данные:'}</strong> ${esc(labels[dataSource] || dataSource)} · known ${analytics.summary.usableCells}/${analytics.summary.totalCells} · weighted ${pct(analytics.summary.weightedCoverage)}${warning}`;
  }
  function activeParties() { return data.parties.filter((p) => p.active !== false); }
  function enabledQuestions() { return data.questions.filter((q) => q.enabled !== false); }
  function questionById(id) { return data.questions.find((q) => q.id === id); }
  function partyById(id) { return data.parties.find((p) => p.id === id); }
  function sourceById(id) { return data.sources.find((s) => s.id === id); }

  function showValidation() {
    const errors = Core.validateDataset(data);
    const panel = $('developer-warnings');
    if (!errors.length) { panel.classList.add('hidden'); panel.innerHTML = ''; return; }
    panel.classList.remove('hidden');
    panel.innerHTML = `<strong>${localizedLabel('Предупреждения данных', 'Data warnings', 'אזהרות נתונים')} (${errors.length})</strong><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`;
  }

  function renderQuestions() {
    const host = $('questions-container');
    const qs = enabledQuestions();
    const groups = new Map();
    qs.forEach((q) => {
      const group = text(q, 'group');
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(q);
    });
    let index = 0;
    host.innerHTML = [...groups.entries()].map(([group, groupQs]) => `
      <div class="question-group">
        <h3 class="question-group-title">${esc(group)}</h3>
        ${groupQs.map((q) => {
          index += 1;
          const current = answers[q.id];
          const options = ANSWER_OPTIONS.map((value) => {
            const id = `${q.id}-${String(value).replace('-', 'm')}`;
            const checked = String(current) === String(value) ? 'checked' : '';
            return `<span class="answer-option"><input type="radio" name="${esc(q.id)}" id="${id}" value="${value}" ${checked}><label for="${id}">${esc(answerLabel(value))}</label></span>`;
          }).join('');
          const important = priorityQuestionIds.includes(q.id);
          const priorityLabel = important ? t('unmarkImportant') : t('markImportant');
          return `<article class="question-card ${current !== undefined ? 'answered' : ''}" data-question="${esc(q.id)}">
            <div class="question-meta">
              <div class="question-number">${locale === 'he' ? 'שאלה' : locale === 'en' ? 'Question' : 'Вопрос'} ${index}</div>
              <button class="priority-toggle ${important ? 'selected' : ''}" type="button" data-priority-id="${esc(q.id)}" aria-pressed="${important}" aria-label="${esc(priorityLabel)}"><span aria-hidden="true">${important ? '★' : '☆'}</span>${esc(priorityLabel)}</button>
            </div>
            <div class="question-text">${esc(text(q, 'text'))}</div>
            ${locale === 'ru' ? `<p class="question-explanation">${esc(q.explanation_ru)}</p>` : ''}
            <div class="answer-options">${options}</div>
          </article>`;
        }).join('')}
      </div>`).join('');

    host.querySelectorAll('input[type=radio]').forEach((input) => input.addEventListener('change', (ev) => {
      const qid = ev.target.name;
      answers[qid] = ev.target.value === 'skip' ? 'skip' : Number(ev.target.value);
      saveAnswers();
      ev.target.closest('.question-card').classList.add('answered');
      updateProgress();
    }));
    host.querySelectorAll('[data-priority-id]').forEach((button) => button.addEventListener('click', () => {
      const questionId = button.dataset.priorityId;
      priorityQuestionIds = priorityQuestionIds.includes(questionId)
        ? priorityQuestionIds.filter((id) => id !== questionId)
        : [...priorityQuestionIds, questionId];
      saveAnswers();
      renderQuestions();
      if (latestResults) renderResults();
    }));
    updateProgress();
  }

  function updateProgress() {
    const qs = enabledQuestions();
    const answered = qs.filter((q) => Object.prototype.hasOwnProperty.call(answers, q.id)).length;
    $('progress').textContent = `${answered} / ${qs.length}`;
    $('progress-bar').style.width = qs.length ? `${answered / qs.length * 100}%` : '0%';
  }

  function activePriorityQuestionIds() {
    return Core.normalizePriorityQuestionIds({ priorityQuestionIds, answers, questions: enabledQuestions() });
  }

  function computeResults() {
    const qs = enabledQuestions();
    return activeParties().map((party) => ({
      party,
      ...Core.scoreParty({ partyId: party.id, answers, questions: qs, positions: data.positions, priorityQuestionIds })
    })).sort((a, b) => b.finalScore - a.finalScore || b.coverage - a.coverage || b.agreement - a.agreement);
  }

  function renderResults(recalculate = true) {
    const substantiveCount = Object.values(answers).filter((v) => v !== 'skip').length;
    if (recalculate && !substantiveCount) {
      alert(locale === 'he' ? 'יש לענות לפחות על שאלה אחת או לבחור תשובה מהותית במקום דילוג.' : locale === 'en' ? 'Answer at least one question or choose a substantive response instead of skipping.' : 'Ответьте хотя бы на один вопрос или выберите содержательный вариант вместо «Пропустить».');
      return;
    }
    if (recalculate) latestResults = computeResults();
    if (!latestResults?.length) return;
    const top = latestResults[0];
    $('results').classList.remove('hidden');
    $('data-inspection').classList.remove('hidden');
    $('data-quality').classList.remove('hidden');
    $('recommendation-title').textContent = `${locale === 'he' ? 'הקרובה ביותר:' : locale === 'en' ? 'Closest match:' : 'Ближе всего:'} ${text(top.party, 'name')}`;
    $('recommendation-card').innerHTML = `
      <div class="recommendation-hero">
        <div class="hero-party"><span>${locale === 'he' ? 'ההתאמה הטובה ביותר' : locale === 'en' ? 'Best match' : 'Лучшее совпадение'}</span><strong>${esc(text(top.party, 'name'))}</strong><span>${esc(text(top.party, 'leader'))}</span></div>
        <div class="metric-card"><span class="value">${pct(top.finalScore)}</span><span class="label">${locale === 'he' ? 'ציון סופי' : locale === 'en' ? 'final score' : 'итоговый score'}</span></div>
        <div class="metric-card"><span class="value">${pct(top.agreement)}</span><span class="label">${locale === 'he' ? 'התאמת עמדות ידועות' : locale === 'en' ? 'known-position agreement' : 'совпадение известных позиций'}</span></div>
        <div class="metric-card"><span class="value">${pct(top.coverage)}</span><span class="label">${locale === 'he' ? 'כיסוי נתונים' : locale === 'en' ? 'data coverage' : 'покрытие данных'}</span></div>
      </div>
      <p class="hint">${locale === 'he' ? `אין נתונים לגבי ${top.unknownCount} מהשאלות שעליהן ענית. כיסוי נמוך מקרב אוטומטית את הציון ל־50%.` : locale === 'en' ? `There is no data for ${top.unknownCount} of your answered questions. Low coverage automatically pulls the score toward 50%.` : `Неизвестно по ${top.unknownCount} из ваших отвеченных вопросов. При малом покрытии score автоматически сжимается к 50%.`}</p>
      <p class="priority-result">${t('priorityResult')}: ${activePriorityQuestionIds().length}.</p>`;

    $('ranking').innerHTML = latestResults.map((r, i) => `<div class="ranking-row">
      <span>${i + 1}</span><strong>${esc(text(r.party, 'name'))}</strong><span class="score">${pct(r.finalScore)}</span><span class="coverage-mini">${locale === 'he' ? 'נתונים' : locale === 'en' ? 'data' : 'данные'} ${pct(r.coverage)}</span>
    </div>`).join('');
    renderExplanation(top);
    renderAxes();
    renderInspection();
    renderDataQuality();
    renderDataSourceStatus();
    $('results').focus({ preventScroll: true });
    window.scrollTo({ top: $('results').offsetTop - 12, behavior: 'smooth' });
  }

  function renderExplanation(result) {
    const buckets = { matches: [], near: [], disagree: [], unknown: [] };
    result.details.forEach((d) => {
      const q = questionById(d.questionId);
      if (!q) return;
      if (d.status === 'insufficient_data') buckets.unknown.push(text(q, 'text'));
      else if (d.agreement >= .875) buckets.matches.push(text(q, 'text'));
      else if (d.agreement >= .625) buckets.near.push(text(q, 'text'));
      else buckets.disagree.push(text(q, 'text'));
    });
    const section = (title, cls, items) => items.length ? `<h4>${title} (${items.length})</h4><ul class="explanation-list ${cls}">${items.slice(0, 7).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    $('explanation').innerHTML =
      section(locale === 'he' ? 'התאמות חזקות' : locale === 'en' ? 'Strong matches' : 'Сильные совпадения', 'matches', buckets.matches) +
      section(locale === 'he' ? 'עמדות קרובות' : locale === 'en' ? 'Near matches' : 'Близкие позиции', 'near', buckets.near) +
      section(locale === 'he' ? 'חילוקי דעות' : locale === 'en' ? 'Disagreements' : 'Расхождения', 'disagree', buckets.disagree) +
      section(locale === 'he' ? 'אין די נתונים' : locale === 'en' ? 'Insufficient data' : 'Недостаточно данных', 'unknown', buckets.unknown);
  }

  function axisResults() {
    const qs = enabledQuestions();
    const userAxes = Core.computeUserAxes({ answers, questions: qs, axes: data.axes, minCoverage: MIN_USER_AXIS_COVERAGE });
    const partyAxes = Object.fromEntries(activeParties().map((party) => [party.id, Core.computePartyAxes({
      partyId: party.id, questions: qs, positions: data.positions, axes: data.axes, minCoverage: MIN_PARTY_AXIS_COVERAGE
    })]));
    return { userAxes, partyAxes };
  }

  function renderAxes() {
    const { userAxes, partyAxes } = axisResults();
    latestAxisState = { userAxes, partyAxes };
    const xSelect = $('map-x-axis');
    const ySelect = $('map-y-axis');
    if (!xSelect.options.length) {
      data.axes.forEach((axis, i) => {
        xSelect.add(new Option(text(axis, 'name'), axis.id, false, i === 1));
        ySelect.add(new Option(text(axis, 'name'), axis.id, false, i === 2));
      });
      xSelect.value = data.axes[1]?.id || data.axes[0]?.id;
      ySelect.value = data.axes[2]?.id || data.axes[1]?.id;
    }
    if (!xSelect.dataset.bound) {
      xSelect.addEventListener('change', () => latestAxisState && drawMap(latestAxisState.userAxes, latestAxisState.partyAxes));
      ySelect.addEventListener('change', () => latestAxisState && drawMap(latestAxisState.userAxes, latestAxisState.partyAxes));
      window.addEventListener('resize', () => latestAxisState && drawMap(latestAxisState.userAxes, latestAxisState.partyAxes));
      xSelect.dataset.bound = '1'; ySelect.dataset.bound = '1';
    }
    drawMap(userAxes, partyAxes);
    renderAxisStrips(userAxes, partyAxes);
  }

  function drawMap(userAxes, partyAxes) {
    const canvas = $('party-map');
    const wrap = canvas.parentElement;
    const cssWidth = Math.max(320, wrap.clientWidth || 900);
    const cssHeight = Math.max(320, wrap.clientHeight || Math.round(cssWidth * .66));
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssWidth * dpr); canvas.height = Math.round(cssHeight * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,cssWidth,cssHeight);
    const margin = { left: 72, right: 52, top: 54, bottom: 72 };
    const w = cssWidth - margin.left - margin.right, h = cssHeight - margin.top - margin.bottom;
    const xId = $('map-x-axis').value, yId = $('map-y-axis').value;
    const xMeta = data.axes.find((a) => a.id === xId), yMeta = data.axes.find((a) => a.id === yId);
    if (!xMeta || !yMeta || xId === yId) {
      ctx.fillStyle = '#66717e'; ctx.font = '14px system-ui'; ctx.fillText(locale === 'he' ? 'יש לבחור שני צירים שונים.' : locale === 'en' ? 'Choose two different axes.' : 'Выберите две разные оси.', margin.left, margin.top);
      return;
    }
    const sx = (v) => margin.left + ((v + 100) / 200) * w;
    const sy = (v) => margin.top + (1 - (v + 100) / 200) * h;
    ctx.strokeStyle = '#dce1e7'; ctx.lineWidth = 1;
    for (const tick of [-100,-50,0,50,100]) {
      ctx.beginPath(); ctx.moveTo(sx(tick), margin.top); ctx.lineTo(sx(tick), margin.top+h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(margin.left, sy(tick)); ctx.lineTo(margin.left+w, sy(tick)); ctx.stroke();
    }
    ctx.strokeStyle = '#9aa4af'; ctx.lineWidth = 1.4;
    ctx.strokeRect(margin.left, margin.top, w, h);
    ctx.fillStyle = '#53606d'; ctx.font = '12px system-ui';
    ctx.textAlign='left'; ctx.fillText(text(xMeta, 'negative'), margin.left, cssHeight-18);
    ctx.textAlign='right'; ctx.fillText(text(xMeta, 'positive'), margin.left+w, cssHeight-18);
    ctx.save(); ctx.translate(18, margin.top+h); ctx.rotate(-Math.PI/2); ctx.textAlign='left'; ctx.fillText(text(yMeta, 'negative'),0,0); ctx.restore();
    ctx.save(); ctx.translate(18, margin.top); ctx.rotate(-Math.PI/2); ctx.textAlign='right'; ctx.fillText(text(yMeta, 'positive'),0,0); ctx.restore();

    const omitted=[];
    const visible=[];
    activeParties().forEach((party) => {
      const ax=partyAxes[party.id]?.[xId], ay=partyAxes[party.id]?.[yId];
      if (!ax || !ay || ax.status !== 'known' || ay.status !== 'known') omitted.push(text(party, 'name'));
      else visible.push({party,x:ax.value,y:ay.value});
    });
    visible.forEach((item, i) => {
      const x=sx(item.x), y=sy(item.y);
      ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fillStyle='#275d9f'; ctx.fill();
      ctx.font='12px system-ui'; ctx.fillStyle='#18202a'; ctx.textAlign='left';
      const dy = (i % 3 - 1) * 12;
      ctx.fillText(text(item.party, 'name'), x+8, y+4+dy);
    });
    const ux=userAxes[xId], uy=userAxes[yId];
    if (ux?.status === 'known' && uy?.status === 'known') {
      const x=sx(ux.value), y=sy(uy.value);
      ctx.save(); ctx.translate(x,y); ctx.rotate(Math.PI/4); ctx.fillStyle='#a33a3a'; ctx.fillRect(-6,-6,12,12); ctx.restore();
      ctx.fillStyle='#a33a3a'; ctx.font='700 13px system-ui'; ctx.textAlign='left'; ctx.fillText(locale === 'he' ? 'את/ה' : locale === 'en' ? 'You' : 'Вы',x+10,y-9);
    } else {
      omitted.unshift(locale === 'he' ? 'המשתמש/ת (אין די תשובות בצירים שנבחרו)' : locale === 'en' ? 'You (not enough answers on the selected axes)' : 'Пользователь (недостаточно ваших ответов по выбранным осям)');
    }
    $('map-omitted').textContent = omitted.length ? (locale === 'he' ? `לא מוצגים בגלל מחסור בנתונים: ${omitted.join(', ')}.` : locale === 'en' ? `Not shown because of insufficient data: ${omitted.join(', ')}.` : `Не показаны из-за недостатка данных: ${omitted.join(', ')}.`) : (locale === 'he' ? 'לכל המפלגות יש כיסוי נתונים מספק בצירים שנבחרו.' : locale === 'en' ? 'All parties have adequate coverage on the selected axes.' : 'Все партии имеют достаточное покрытие по выбранным осям.');
  }

  function axisValue(value) {
    const rounded = Math.round(value);
    return `${rounded > 0 ? '+' : ''}${rounded}`;
  }

  function markerDescription(name, coordinate) {
    return `${name}: ${t('axisValue')} ${axisValue(coordinate.value)}, ${t('axisCoverage')} ${pct(coordinate.coverage)}.`;
  }

  function bindAxisStripTooltip(host) {
    if (host.dataset.tooltipBound) return;
    const marker = (target) => target?.closest?.('.axis-marker');
    const show = (target) => {
      const activeMarker = marker(target);
      if (!activeMarker) return;
      const strip = activeMarker.closest('.axis-strip');
      const tooltip = strip?.querySelector('.axis-strip-tooltip');
      if (!tooltip) return;
      tooltip.textContent = activeMarker.dataset.tooltip;
      tooltip.style.setProperty('--marker-left', activeMarker.style.getPropertyValue('--marker-left'));
      tooltip.hidden = false;
    };
    const hideWhenLeaving = (event) => {
      const strip = event.target.closest?.('.axis-strip');
      if (!strip || strip.contains(event.relatedTarget)) return;
      const tooltip = strip.querySelector('.axis-strip-tooltip');
      if (tooltip) tooltip.hidden = true;
    };
    host.addEventListener('pointerover', (event) => show(event.target));
    host.addEventListener('focusin', (event) => show(event.target));
    host.addEventListener('pointerout', hideWhenLeaving);
    host.addEventListener('focusout', hideWhenLeaving);
    host.dataset.tooltipBound = '1';
  }

  function renderAxisStrips(userAxes, partyAxes) {
    const host = $('axis-strips');
    const parties = latestResults ? latestResults.map((result) => result.party) : activeParties();
    host.innerHTML = data.axes.map((axis) => {
      const markers = AxisStrips.buildMarkers({ parties, partyAxes, axisId: axis.id });
      const knownPartyIds = new Set(markers.map((marker) => marker.partyId));
      const omittedParties = parties.filter((party) => !knownPartyIds.has(party.id)).map((party) => text(party, 'name'));
      const userCoordinate = userAxes[axis.id];
      const tooltipId = `axis-strip-tooltip-${axis.id}`;
      const partyMarkers = markers.map((marker) => {
        const party = partyById(marker.partyId);
        const description = markerDescription(text(party, 'name'), marker);
        const position = Math.max(0, Math.min(100, (marker.value + 100) / 2));
        return `<button type="button" class="axis-marker party-marker" style="--marker-left:${position}%;--marker-color:${esc(marker.color)}" aria-label="${esc(description)}" aria-describedby="${tooltipId}" data-tooltip="${esc(description)}"></button>`;
      }).join('');
      const userMarker = userCoordinate?.status === 'known' ? (() => {
        const description = markerDescription(t('you'), userCoordinate);
        const position = Math.max(0, Math.min(100, (userCoordinate.value + 100) / 2));
        return `<button type="button" class="axis-marker user-marker" style="--marker-left:${position}%" aria-label="${esc(description)}" aria-describedby="${tooltipId}" data-tooltip="${esc(description)}"></button>`;
      })() : '';
      const omitted = [];
      if (omittedParties.length) omitted.push(`${t('notShown')}: ${omittedParties.join(', ')}.`);
      if (userCoordinate?.status !== 'known') omitted.push(t('userNotShown'));
      return `<article class="axis-strip"><div class="axis-strip-label"><h4>${esc(text(axis, 'name'))}</h4></div><div class="axis-strip-content"><div class="axis-poles"><span>${esc(text(axis, 'negative'))}</span><span>${esc(text(axis, 'positive'))}</span></div><div class="axis-track"><span class="axis-track-centre" aria-hidden="true"></span>${partyMarkers}${userMarker}<div id="${tooltipId}" class="axis-strip-tooltip" role="tooltip" hidden></div></div>${omitted.length ? `<p class="axis-strip-missing">${esc(omitted.join(' '))}</p>` : ''}</div></article>`;
    }).join('');
    bindAxisStripTooltip(host);
  }

  function positionDisplay(position) {
    if (!position || position.status === 'insufficient_data') return '<span class="badge">insufficient_data</span>';
    const scopeContext = ['COMPONENT_PARTY','LEADER','INDIVIDUAL_MK'].includes(position.entity_scope);
    const evidence = (position.evidence || []).map((id) => sourceById(id)).filter(Boolean);
    const links = evidence.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.source_type)}</a>`).join(', ');
    return `<strong>${esc(answerLabel(position.value))}</strong><br>
      <span class="badge ${scopeContext ? 'context' : ''}">${esc(statusLabel(position.status))} · ${esc(scopeLabel(position.entity_scope))}</span>
      <span class="badge">conf ${Math.round(position.confidence * 100)}%</span>${links ? `<br>${links}` : ''}`;
  }

  function renderDataQuality() {
    const analytics = Core.computeDatasetAnalytics({ data, baselineData: BASELINE_DATA, axisCoverageThreshold: MIN_PARTY_AXIS_COVERAGE });
    const s = analytics.summary;
    const metric = (value, label, note = '') => `<div class="quality-metric"><span class="value">${esc(value)}</span><span class="label">${esc(label)}</span>${note ? `<span class="note">${esc(note)}</span>` : ''}</div>`;

    $('quality-summary').innerHTML = [
      metric(`${s.usableCells} / ${s.totalCells}`, localizedLabel('известных позиций', 'known positions', 'עמדות ידועות'), pct(s.rawCoverage)),
      metric(pct(s.weightedCoverage), 'weighted coverage', localizedLabel('с учётом confidence и scope', 'including confidence and scope', 'כולל confidence והיקף ייחוס')),
      metric(pct(s.avgEffectiveConfidence), localizedLabel('средний effective confidence', 'average effective confidence', 'effective confidence ממוצע'), `${s.highConfidenceCells} high-confidence`),
      metric(`${s.usedSourceCount} / ${s.sourceCount}`, localizedLabel('используемых источников', 'sources used', 'מקורות בשימוש'), localizedLabel('у позиций текущей матрицы', 'in the current matrix', 'במטריצה הנוכחית')),
      metric(String(s.insufficientCells), 'insufficient_data', localizedLabel('оставшиеся пробелы', 'remaining gaps', 'פערים שנותרו')),
    ].join('');

    if (analytics.comparison) {
      const c = analytics.comparison;
      const signed = (n) => `${n > 0 ? '+' : ''}${n}`;
      $('quality-comparison').innerHTML = `<div class="quality-comparison-banner">
        <div><strong>${localizedLabel('Изменение относительно исходной базы', 'Change from the baseline dataset', 'שינוי לעומת מאגר הבסיס')}</strong><br><span class="hint">${localizedLabel('Baseline сохранён внутри прототипа отдельно от активных research-данных.', 'The baseline is kept in the prototype separately from active research data.', 'מאגר הבסיס נשמר באבטיפוס בנפרד מנתוני המחקר הפעילים.')}</span></div>
        <div class="comparison-metrics">
          <span><strong>${c.baselineUsableCells} → ${c.currentUsableCells}</strong><small>${localizedLabel('известных клеток', 'known cells', 'תאים ידועים')} (${signed(c.deltaUsableCells)})</small></span>
          <span><strong>${pct(c.baselineWeightedCoverage)} → ${pct(c.currentWeightedCoverage)}</strong><small>weighted coverage</small></span>
          <span><strong>+${c.gainedKnown}</strong><small>${localizedLabel('новых позиций', 'new positions', 'עמדות חדשות')}</small></span>
          <span><strong>−${c.lostKnown}</strong><small>${localizedLabel('утрачено', 'lost', 'אבדו')}</small></span>
          <span><strong>${c.valueChanged}</strong><small>${localizedLabel('изменённых позиций', 'changed stances', 'עמדות ששונו')}</small></span>
          <span><strong>↑${c.confidenceImproved} / ↓${c.confidenceDecreased}</strong><small>${localizedLabel('confidence изменён', 'confidence changed', 'confidence השתנה')}</small></span>
          <span><strong>+${c.sourcesAdded}</strong><small>${localizedLabel('новых source ID', 'new source IDs', 'מזהי מקור חדשים')}</small></span>
        </div>
      </div>`;
    } else {
      $('quality-comparison').innerHTML = `<p class="hint">${localizedLabel('Baseline отсутствует: показывается только текущее состояние базы.', 'No baseline: only the current dataset is shown.', 'אין מאגר בסיס: מוצג רק מצב המאגר הנוכחי.')}</p>`;
    }

    const partyRows = activeParties().map((party) => ({ party, stats: analytics.byParty[party.id] }))
      .sort((a, b) => a.stats.rawCoverage - b.stats.rawCoverage || text(a.party, 'name').localeCompare(text(b.party, 'name'), locale));
    $('quality-parties').innerHTML = `<table class="quality-table"><thead><tr><th>${localizedLabel('Партия', 'Party', 'מפלגה')}</th><th>Known</th><th>Raw</th><th>Weighted</th><th>Eff. conf</th><th>High conf</th>${analytics.comparison ? '<th>Δ known</th>' : ''}</tr></thead><tbody>
      ${partyRows.map(({ party, stats }) => `<tr><td><strong>${esc(text(party, 'name'))}</strong></td><td>${stats.usableCells}/${stats.totalCells}</td><td>${pct(stats.rawCoverage)}</td><td>${pct(stats.weightedCoverage)}</td><td>${pct(stats.avgEffectiveConfidence)}</td><td>${stats.highConfidenceCells}</td>${analytics.comparison ? `<td class="${stats.deltaUsableCells > 0 ? 'delta-positive' : stats.deltaUsableCells < 0 ? 'delta-negative' : ''}">${stats.deltaUsableCells > 0 ? '+' : ''}${stats.deltaUsableCells}</td>` : ''}</tr>`).join('')}
    </tbody></table>`;

    const axisRows = data.axes.map((axis) => ({ axis, stats: analytics.byAxis[axis.id] }))
      .sort((a, b) => a.stats.averageCoverage - b.stats.averageCoverage);
    $('quality-axes').innerHTML = `<table class="quality-table"><thead><tr><th>${localizedLabel('Ось', 'Axis', 'ציר')}</th><th>${localizedLabel('Достаточно данных', 'Adequate data', 'נתונים מספקים')}</th><th>${localizedLabel('Среднее покрытие', 'Average coverage', 'כיסוי ממוצע')}</th><th>${localizedLabel('Слабее всего', 'Weakest', 'החלש ביותר')}</th></tr></thead><tbody>
      ${axisRows.map(({ axis, stats }) => {
        const weak = activeParties().map((p) => ({ name: text(p, 'name'), cov: stats.partyCoverage[p.id]?.coverage || 0 }))
          .sort((a,b) => a.cov - b.cov).slice(0,3).map((x) => `${x.name} ${pct(x.cov)}`).join(', ');
        return `<tr><td><strong>${esc(text(axis, 'name'))}</strong></td><td>${stats.supportedParties}/${stats.totalParties}</td><td>${pct(stats.averageCoverage)}</td><td class="quality-small">${esc(weak)}</td></tr>`;
      }).join('')}
    </tbody></table>`;

    const questionRows = enabledQuestions().map((question) => ({ question, stats: analytics.byQuestion[question.id] }))
      .sort((a, b) => a.stats.rawCoverage - b.stats.rawCoverage || a.stats.weightedCoverage - b.stats.weightedCoverage);
    $('quality-questions').innerHTML = `<table class="quality-table wide-quality-table"><thead><tr><th>${localizedLabel('Вопрос', 'Question', 'שאלה')}</th><th>${localizedLabel('Блок', 'Group', 'קבוצה')}</th><th>Known</th><th>Raw</th><th>Weighted</th><th>Eff. conf</th></tr></thead><tbody>
      ${questionRows.map(({ question, stats }) => `<tr><td>${esc(text(question, 'text'))}</td><td>${esc(text(question, 'group'))}</td><td>${stats.usableCells}/${stats.totalCells}</td><td>${pct(stats.rawCoverage)}</td><td>${pct(stats.weightedCoverage)}</td><td>${pct(stats.avgEffectiveConfidence)}</td></tr>`).join('')}
    </tbody></table>`;

    const countRows = (obj, labels = {}) => Object.entries(obj).sort((a,b) => b[1]-a[1]).map(([k,v]) => `<tr><td>${esc(labels[k] || k)}</td><td>${v}</td></tr>`).join('');
    $('quality-provenance').innerHTML = `<div class="provenance-grid">
       <div><h4>${localizedLabel('Уровень атрибуции', 'Entity scope', 'רמת ייחוס')}</h4><table class="mini-count-table">${countRows(analytics.provenance, Object.fromEntries(Object.keys(analytics.provenance).map((key) => [key, scopeLabel(key)])))}</table></div>
       <div><h4>${localizedLabel('Статус', 'Status', 'סטטוס')}</h4><table class="mini-count-table">${countRows(analytics.statuses, Object.fromEntries(Object.keys(analytics.statuses).map((key) => [key, statusLabel(key)])))}</table></div>
       <div><h4>${localizedLabel('Типы используемых источников', 'Used source types', 'סוגי המקורות שבשימוש')}</h4><table class="mini-count-table">${countRows(analytics.sourceTypes)}</table></div>
    </div>`;

    const gapOrder = analytics.gaps.slice().sort((a,b) => {
      const qa = analytics.byQuestion[a.questionId]?.rawCoverage ?? 1;
      const qb = analytics.byQuestion[b.questionId]?.rawCoverage ?? 1;
      if (qa !== qb) return qa - qb;
      return text(partyById(a.partyId), 'name').localeCompare(text(partyById(b.partyId), 'name'), locale);
    });
    $('quality-gaps').innerHTML = gapOrder.length ? `<p class="hint">${locale === 'he' ? `סה״כ ${gapOrder.length}. תחילה מוצגות השאלות עם הכיסוי הכללי הנמוך ביותר.` : locale === 'en' ? `Total ${gapOrder.length}. Questions with the lowest overall coverage appear first.` : `Всего ${gapOrder.length}. Сначала показаны вопросы с самым низким общим покрытием.`}</p><div class="gap-list">${gapOrder.map((gap) => `<div><strong>${esc(text(partyById(gap.partyId), 'name'))}</strong><span>${esc(text(questionById(gap.questionId), 'text'))}</span></div>`).join('')}</div>` : `<p>${locale === 'he' ? 'אין פערים.' : locale === 'en' ? 'No gaps.' : 'Пробелов нет.'}</p>`;

    const positionMap = new Map(data.positions.map((p) => [`${p.party}::${p.question}`, p]));
    const heatQuestions = enabledQuestions();
    $('quality-heatmap').innerHTML = `<table class="quality-heatmap-table"><thead><tr><th class="heat-party-head">${locale === 'he' ? 'מפלגה' : locale === 'en' ? 'Party' : 'Партия'}</th>${heatQuestions.map((q,i) => `<th title="${esc(text(q, 'text'))}">Q${i+1}</th>`).join('')}</tr></thead><tbody>
      ${activeParties().map((party) => `<tr><th>${esc(text(party, 'name'))}</th>${heatQuestions.map((q) => {
        const pos = positionMap.get(`${party.id}::${q.id}`);
        const effective = Core.effectivePositionConfidence(pos);
        const tier = effective <= 0 ? 'missing' : effective >= .85 ? 'high' : effective >= .65 ? 'mid' : 'low';
        const label = effective <= 0 ? '?' : Math.round(effective * 100);
        return `<td><button type="button" class="heat-cell heat-${tier}" data-party="${esc(party.id)}" data-question="${esc(q.id)}" title="${esc(text(party, 'name'))} · ${esc(text(q, 'text'))} · effective confidence ${label}${effective <= 0 ? '' : '%'}">${label}</button></td>`;
      }).join('')}</tr>`).join('')}
    </tbody></table>`;
    $('quality-heatmap').querySelectorAll('.heat-cell').forEach((button) => button.addEventListener('click', () => renderQualityCellDetail(button.dataset.party, button.dataset.question)));
  }

  function renderEvidenceCards(position) {
    const sources = (position?.evidence || []).map((id) => sourceById(id)).filter(Boolean);
    if (!sources.length) return `<p class="hint">${localizedLabel('Нет привязанного источника.', 'No linked source.', 'אין מקור מקושר.')}</p>`;
    return sources.map((source) => {
      const context = locale === 'ru' ? source.notes_ru : source.notes_en || source.notes_ru || '';
      return `<article class="evidence-source-card">
        <a href="${esc(source.url)}" target="_blank" rel="noopener"><strong>${esc(source.title || source.id)}</strong></a>
        <p class="evidence-source-meta">${esc(source.source_type || '')}${source.date ? ` · ${esc(source.date)}` : ''}</p>
        ${context ? `<p><span class="evidence-context-label">${localizedLabel('Контекст источника', 'Source context', 'הקשר המקור')}</span> ${esc(context)}</p>` : ''}
      </article>`;
    }).join('');
  }

  function renderQualityCellDetail(partyId, questionId) {
    const party = partyById(partyId);
    const question = questionById(questionId);
    const position = data.positions.find((p) => p.party === partyId && p.question === questionId) || null;
    const baselinePosition = BASELINE_DATA?.positions?.find((p) => p.party === partyId && p.question === questionId) || null;
    const effective = Core.effectivePositionConfidence(position);
    const baselineText = !baselinePosition || baselinePosition.status === 'insufficient_data'
      ? 'insufficient_data'
      : `${answerLabel(baselinePosition.value)}; conf ${Math.round((baselinePosition.confidence || 0) * 100)}%; ${baselinePosition.entity_scope}`;
    $('quality-cell-detail').innerHTML = `<h4>${esc(party ? text(party, 'name') : partyId)} · ${esc(question ? text(question, 'text') : questionId)}</h4>
      <div class="quality-detail-grid"><div><span class="hint">Сейчас</span><br>${positionDisplay(position)}${effective > 0 ? `<br><span class="hint">effective confidence: ${pct(effective)}</span>` : ''}</div><div><span class="hint">Baseline</span><br>${esc(baselineText)}</div></div>
      <div class="evidence-conclusion"><strong>${localizedLabel('Проверяемое утверждение для этой оценки', 'Verifiable statement for this score', 'טענה ניתנת לבדיקה לציון זה')}</strong><p>${position?.status === 'insufficient_data' ? localizedLabel('Для этой пары «партия × вопрос» недостаточно данных; значение не подставляется.', 'There is insufficient data for this party-question pair; no value is substituted.', 'אין מספיק נתונים לזוג מפלגה-שאלה זה; לא מוחלף ערך.') : `${esc(party ? text(party, 'name') : partyId)} — ${esc(answerLabel(position.value))}; ${esc(statusLabel(position.status))} · ${esc(scopeLabel(position.entity_scope))}.`}</p></div>
      <h4>${localizedLabel('Источники', 'Sources', 'מקורות')}</h4>${renderEvidenceCards(position)}`;
  }

  function renderInspection() {
    const answeredQs = enabledQuestions().filter((q) => Object.prototype.hasOwnProperty.call(answers, q.id) && answers[q.id] !== 'skip');
    $('inspection-content').innerHTML = answeredQs.map((q) => {
      const cells = activeParties().map((party) => {
        const position = data.positions.find((p) => p.party === party.id && p.question === q.id);
        return `<div class="position-cell"><strong>${esc(text(party, 'name'))}</strong><br>${positionDisplay(position)}</div>`;
      }).join('');
      return `<details class="inspection-question"><summary>${esc(text(q, 'text'))} — ${locale === 'he' ? 'התשובה שלך:' : locale === 'en' ? 'your answer:' : 'ваш ответ:'} ${esc(answerLabel(answers[q.id]))}</summary><div class="position-grid">${cells}</div></details>`;
    }).join('') || `<p class="hint">${locale === 'he' ? 'אין שאלות שנענו.' : locale === 'en' ? 'No answered questions.' : 'Нет отвеченных вопросов.'}</p>`;
  }

  $('calculate-results').addEventListener('click', renderResults);
  $('reset-answers').addEventListener('click', () => {
    const confirmation = locale === 'he' ? 'לאפס את כל התשובות?' : locale === 'en' ? 'Reset all answers?' : 'Сбросить все ответы?';
    if (!confirm(confirmation)) return;
    answers = {}; priorityQuestionIds = []; saveAnswers(); renderQuestions();
    latestResults = null; latestAxisState = null;
    $('results').classList.add('hidden'); $('data-inspection').classList.add('hidden'); $('data-quality').classList.add('hidden'); $('data-source-status').classList.add('hidden');
  });
  $('toggle-inspection').addEventListener('click', () => {
    const content = $('inspection-content');
    const opening = content.classList.contains('hidden');
    content.classList.toggle('hidden', !opening);
    $('toggle-inspection').textContent = opening ? t('hideData') : t('showData');
  });

  function applyLocale(nextLocale) {
    locale = I18n.saveLocale(window.localStorage, nextLocale);
    document.documentElement.lang = locale;
    document.documentElement.dir = I18n.isRtl(locale) ? 'rtl' : 'ltr';
    document.title = `Kalpi — ${t('questionnaireTitle')}`;
    document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => { element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel)); });
    document.querySelectorAll('[data-locale]').forEach((button) => {
      const selected = button.dataset.locale === locale;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('selected', selected);
    });
    $('toggle-inspection').textContent = $('inspection-content').classList.contains('hidden') ? t('showData') : t('hideData');
    $('party-map').setAttribute('aria-label', locale === 'he' ? 'מפת מיקום המפלגות והמשתמש' : locale === 'en' ? 'Map of parties and the user' : 'Карта расположения партий и пользователя');
    renderQuestions();
    if (latestResults) renderResults(false);
  }

  document.querySelectorAll('[data-locale]').forEach((button) => button.addEventListener('click', () => applyLocale(button.dataset.locale)));

  async function init() {
    await loadInitialDataset();
    showValidation();
    applyLocale(locale);
  }

  init();
})();
