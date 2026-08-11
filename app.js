(function () {
  'use strict';

  const Loader = window.KalpiDataLoader;
  const Validation = window.KalpiDataValidation;
  const Scoring = window.KalpiScoring;
  const Analytics = window.KalpiAnalytics;
  const State = window.KalpiQuestionnaireState;
  const QuestionnaireUi = window.KalpiQuestionnaireUi;
  const ResultsUi = window.KalpiResultsUi;
  const DebugFixture = window.KalpiDebugFixture;
  const DEFAULT_DATA = window.KALPI_DATA;
  const $ = (id) => document.getElementById(id);
  const debugEnabled = new URLSearchParams(location.search).get('debug') === '1';
  let data = DEFAULT_DATA;
  let state;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  function questions() {
    return (data.questions || []).filter((question) => question.status === 'core').sort((left, right) => left.display_order - right.display_order);
  }

  function currentIndex() {
    const index = questions().findIndex((question) => question.id === state.currentQuestionId);
    return index < 0 ? 0 : index;
  }

  function hasAnswer(questionId) {
    return Object.prototype.hasOwnProperty.call(state.answers, questionId);
  }

  function saveState() {
    try { State.save(window.localStorage, state); } catch (_) {}
  }

  async function loadDataset() {
    if (location.protocol === 'file:') return;
    try {
      data = await Loader.loadDataset(async (filename) => {
        const response = await fetch(`data/${filename}?v=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      });
    } catch (_) {
      data = DEFAULT_DATA;
    }
  }

  function showWarnings() {
    const errors = Validation.validateDataset(data);
    const host = $('developer-warnings');
    if (!errors.length) {
      host.classList.add('hidden');
      host.innerHTML = '';
      return;
    }
    host.classList.remove('hidden');
    host.innerHTML = `<strong>Ошибка данных (${errors.length})</strong><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}</ul>`;
  }

  function updateProgress() {
    const progress = QuestionnaireUi.questionnaireProgress(questions(), state.answers);
    $('progress').textContent = `${progress.answered} / ${progress.total}`;
    $('progress-bar').style.width = progress.total ? `${progress.answered / progress.total * 100}%` : '0%';
  }

  function advanceAfterAnswer() {
    const index = currentIndex();
    if (index === questions().length - 1) {
      renderReview();
      return;
    }
    State.setCurrentQuestion(state, questions()[index + 1].id);
    saveState();
    renderQuestion();
  }

  function renderQuestion() {
    const allQuestions = questions();
    const index = currentIndex();
    const question = allQuestions[index];
    State.setCurrentQuestion(state, question.id);
    saveState();
    updateProgress();
    $('question-content').innerHTML = QuestionnaireUi.renderQuestion({
      question,
      index,
      total: allQuestions.length,
      answer: hasAnswer(question.id) ? state.answers[question.id] : undefined,
    });
    $('previous-question').disabled = index === 0;
    $('next-question').disabled = !hasAnswer(question.id);
    $('next-question').textContent = index === allQuestions.length - 1 ? 'Проверить ответы' : 'Далее';
    document.querySelectorAll('#question-content input[type="radio"]').forEach((input) => input.addEventListener('change', () => {
      State.setAnswer(state, question.id, input.value === 'unknown' ? null : Number(input.value));
      saveState();
      advanceAfterAnswer();
    }));
  }

  function familyByQuestion() {
    const mapping = new Map();
    for (const family of data.scoringConfig.families || []) {
      for (const questionId of [...family.fundamental_questions, ...family.policy_questions]) mapping.set(questionId, family);
    }
    return mapping;
  }

  function answerSummary(question) {
    const value = state.answers[question.id];
    if (value === null) return 'Не знаю / недостаточно информации';
    const item = QuestionnaireUi.SCALE.find((scale) => scale.value === value);
    return item ? item.label : 'Нет ответа';
  }

  function renderReview() {
    const mapping = familyByQuestion();
    const grouped = new Map();
    for (const question of questions()) {
      const family = mapping.get(question.id);
      const label = family?.label_ru || 'Без family';
      if (!grouped.has(label)) grouped.set(label, []);
      grouped.get(label).push(question);
    }
    $('review-content').innerHTML = [...grouped.entries()].map(([label, entries]) => `<section class="review-family"><h3>${escapeHtml(label)}</h3><ul>${entries.map((question) => `<li><strong>${escapeHtml(question.code)}</strong><span>${escapeHtml(answerSummary(question))}</span><button type="button" data-edit-question="${escapeHtml(question.id)}">Изменить</button></li>`).join('')}</ul></section>`).join('');
    $('questionnaire').classList.add('hidden');
    $('review').classList.remove('hidden');
    $('review').focus({ preventScroll: true });
    window.scrollTo({ top: $('review').offsetTop - 12, behavior: 'smooth' });
    document.querySelectorAll('[data-edit-question]').forEach((button) => button.addEventListener('click', () => {
      State.setCurrentQuestion(state, button.dataset.editQuestion);
      saveState();
      $('review').classList.add('hidden');
      $('questionnaire').classList.remove('hidden');
      renderQuestion();
      $('questionnaire').focus?.({ preventScroll: true });
    }));
  }

  function renderDebug(analytics) {
    if (!debugEnabled) return;
    const host = $('debug');
    host.classList.remove('hidden');
    const row = (label, item) => `<tr><th>${escapeHtml(label)}</th><td>${item.knownCells}/${item.totalCells}</td><td>${Math.round(item.averageConfidence * 100)}%</td></tr>`;
    const fixture = DebugFixture.createSyntheticFixture({ questions: questions(), answers: state.answers });
    const fixtureResult = Scoring.scoreParty({
      partyId: fixture.party.id,
      answers: state.answers,
      positions: fixture.positions,
      scoringConfig: data.scoringConfig,
    });
    const familyLabels = new Map((data.scoringConfig.families || []).map((family) => [family.id, family.label_ru]));
    const trace = fixtureResult.families.map((family) => `<details><summary>${escapeHtml(familyLabels.get(family.familyId) || family.familyId)}: score ${Math.round(family.score * 100)}%, coverage ${Math.round(family.coverage * 100)}%</summary><ul>${family.questions.map((question) => `<li>${escapeHtml(question.questionId)} → raw ${question.rawSimilarity == null ? 'нет позиции' : Math.round(question.rawSimilarity * 100) + '%'} → adjusted ${Math.round(question.evidenceSimilarity * 100)}%; confidence ${Math.round(question.confidence * 100)}%; coverage ${Math.round(question.coverage * 100)}%</li>`).join('')}</ul></details>`).join('');
    host.innerHTML = `<p class="eyebrow">Debug</p><h2 id="debug-title">Покрытие данных v2</h2><p>Canonical matrix: ${analytics.summary.knownCells}/${analytics.summary.totalCells}; средний confidence ${Math.round(analytics.summary.averageConfidence * 100)}%.</p><details open><summary>По parties</summary><table><tbody>${Object.entries(analytics.byParty).map(([id, item]) => row(id, item)).join('')}</tbody></table></details><details><summary>По families</summary><table><tbody>${Object.entries(analytics.byFamily).map(([id, item]) => row(id, item)).join('')}</tbody></table></details><details><summary>Пробелы (${analytics.gaps.length})</summary><ul>${analytics.gaps.map((gap) => `<li>${escapeHtml(gap.partyId)} × ${escapeHtml(gap.questionId)}</li>`).join('')}</ul></details><section class="debug-fixture"><h3>Синтетический fixture: трассировка score</h3><p>Только для проверки UI. Он не является canonical data и не смешивается с партийной матрицей.</p><p>${escapeHtml(fixture.party.name_ru)}: score ${Math.round((fixtureResult.score || 0) * 100)}%, coverage ${Math.round((fixtureResult.coverage || 0) * 100)}%.</p>${trace}</section>`;
  }

  function renderResults() {
    const analytics = Analytics.computeDatasetAnalytics(data);
    const host = $('results');
    host.classList.remove('hidden');
    if (data.scoringConfig.recommendation_mode === 'data_not_ready') {
      host.innerHTML = ResultsUi.renderDataNotReady({ questions: questions(), answers: state.answers, coverage: analytics.summary });
    } else {
      const sourcesById = new Map((data.sources || []).map((source) => [source.id, source]));
      const ranked = Scoring.rankParties({ parties: data.parties.filter((party) => party.active !== false), answers: state.answers, positions: data.positions, scoringConfig: data.scoringConfig });
      const top = ranked[0];
      const labels = new Map((data.scoringConfig.families || []).map((family) => [family.id, family.label_ru]));
      top.families.forEach((family) => { family.label_ru = labels.get(family.familyId); });
      host.innerHTML = ResultsUi.renderLiveResult({ result: top, sourcesById });
    }
    renderDebug(analytics);
    host.focus({ preventScroll: true });
    window.scrollTo({ top: host.offsetTop - 12, behavior: 'smooth' });
  }

  function bindEvents() {
    $('previous-question').addEventListener('click', () => {
      const index = currentIndex();
      if (index <= 0) return;
      State.setCurrentQuestion(state, questions()[index - 1].id);
      saveState();
      renderQuestion();
    });
    $('next-question').addEventListener('click', () => {
      const index = currentIndex();
      const question = questions()[index];
      if (!hasAnswer(question.id)) return;
      advanceAfterAnswer();
    });
    document.addEventListener('keydown', (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.key < '0' || event.key > '5' || $('questionnaire').classList.contains('hidden')) return;
      const input = document.querySelector(`#question-content input[data-shortcut="${event.key}"]`);
      if (!input) return;
      event.preventDefault();
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    $('review-back').addEventListener('click', () => {
      $('review').classList.add('hidden');
      $('questionnaire').classList.remove('hidden');
      renderQuestion();
    });
    $('complete-questionnaire').addEventListener('click', () => {
      State.markCompleted(state);
      saveState();
      $('review').classList.add('hidden');
      renderResults();
    });
  }

  async function init() {
    await loadDataset();
    showWarnings();
    state = State.load(window.localStorage, data.scoringConfig);
    if (!state.currentQuestionId || !questions().some((question) => question.id === state.currentQuestionId)) State.setCurrentQuestion(state, questions()[0].id);
    if (state.versionMismatch) {
      $('state-notice').classList.remove('hidden');
      $('state-notice').textContent = 'Версия опросника изменилась: начат новый сеанс, предыдущая запись в браузере сохранена.';
    }
    bindEvents();
    renderQuestion();
  }

  init();
})();
