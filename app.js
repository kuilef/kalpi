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
  const $ = (id) => document.getElementById(id);
  const debugEnabled = new URLSearchParams(location.search).get('debug') === '1';
  let data;
  let state;
  let sourcesPromise;

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
    data = await Loader.loadDataset(async (filename) => {
      const response = await fetch(`data/${filename}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }, { includeSources: false });
  }

  async function loadSources() {
    const response = await fetch('data/sources.json');
    if (!response.ok) throw new Error(`sources.json: HTTP ${response.status}`);
    data.sources = await response.json();
    showWarnings();
    return data.sources;
  }

  function ensureSourcesLoaded() {
    if (Array.isArray(data.sources)) return Promise.resolve(data.sources);
    if (!sourcesPromise) sourcesPromise = loadSources();
    return sourcesPromise;
  }

  function showWarnings() {
    const errors = Validation.validateDataset(data, { requireSources: Array.isArray(data.sources) });
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
    const total = questions().length;
    const ordinal = currentIndex() + 1;
    $('progress').textContent = QuestionnaireUi.questionOrdinal(currentIndex(), total);
    $('progress-bar').style.setProperty('--progress', total ? ordinal / total : 0);
  }

  function advanceAfterAnswer() {
    const keepResultsInPlace = Boolean(state.completedAt);
    const index = currentIndex();
    if (index === questions().length - 1) {
      State.markCompleted(state);
      saveState();
      renderResults(!keepResultsInPlace);
      return;
    }
    State.setCurrentQuestion(state, questions()[index + 1].id);
    saveState();
    renderQuestion();
    if (keepResultsInPlace) renderResults(false);
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
      important: state.priorityQuestionIds.includes(question.id),
      importanceEnabled: data.scoringConfig.user_importance_enabled,
    });
    $('previous-question').disabled = index === 0;
    $('next-question').disabled = !hasAnswer(question.id);
    $('next-question').textContent = index === allQuestions.length - 1 ? 'Показать результат' : 'Далее';
    document.querySelectorAll('#question-content input[type="radio"]').forEach((input) => input.addEventListener('change', () => {
      State.setAnswer(state, question.id, input.value === 'unknown' ? null : Number(input.value));
      saveState();
      advanceAfterAnswer();
    }));
    document.querySelector('.importance-toggle')?.addEventListener('click', () => {
      State.togglePriorityQuestion(state, question.id);
      saveState();
      renderQuestion();
      renderResults(false);
    });
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
      priorityQuestionIds: state.priorityQuestionIds,
      positions: fixture.positions,
      scoringConfig: data.scoringConfig,
    });
    const familyLabels = new Map((data.scoringConfig.families || []).map((family) => [family.id, family.label_ru]));
    const trace = fixtureResult.families.map((family) => `<details><summary>${escapeHtml(familyLabels.get(family.familyId) || family.familyId)}: score ${Math.round(family.score * 100)}%, coverage ${Math.round(family.coverage * 100)}%</summary><ul>${family.questions.map((question) => `<li>${escapeHtml(question.questionId)} → raw ${question.rawSimilarity == null ? 'нет позиции' : Math.round(question.rawSimilarity * 100) + '%'} → adjusted ${Math.round(question.evidenceSimilarity * 100)}%; confidence ${Math.round(question.confidence * 100)}%; coverage ${Math.round(question.coverage * 100)}%</li>`).join('')}</ul></details>`).join('');
    host.innerHTML = `<p class="eyebrow">Debug</p><h2 id="debug-title">Покрытие данных v2</h2><p>Canonical matrix: ${analytics.summary.knownCells}/${analytics.summary.totalCells}; средний confidence ${Math.round(analytics.summary.averageConfidence * 100)}%.</p><details open><summary>По parties</summary><table><tbody>${Object.entries(analytics.byParty).map(([id, item]) => row(id, item)).join('')}</tbody></table></details><details><summary>По тематическим группам</summary><table><tbody>${Object.entries(analytics.byFamily).map(([id, item]) => row(id, item)).join('')}</tbody></table></details><details><summary>Пробелы (${analytics.gaps.length})</summary><ul>${analytics.gaps.map((gap) => `<li>${escapeHtml(gap.partyId)} × ${escapeHtml(gap.questionId)}</li>`).join('')}</ul></details><section class="debug-fixture"><h3>Синтетический fixture: трассировка score</h3><p>Только для проверки UI. Он не является canonical data и не смешивается с партийной матрицей.</p><p>${escapeHtml(fixture.party.name_ru)}: score ${Math.round((fixtureResult.score || 0) * 100)}%, coverage ${Math.round((fixtureResult.coverage || 0) * 100)}%.</p>${trace}</section>`;
  }

  async function renderResults(focusResults = true) {
    const analytics = Analytics.computeDatasetAnalytics(data);
    const host = $('results');
    host.classList.remove('hidden');
    try {
      if (data.scoringConfig.recommendation_mode === 'data_not_ready') {
        host.innerHTML = ResultsUi.renderDataNotReady({ questions: questions(), answers: state.answers, coverage: analytics.summary });
      } else {
        await ensureSourcesLoaded();
        const gate = Analytics.computeReleaseGate(data);
        if (!gate.passed) {
          host.innerHTML = ResultsUi.renderDataNotReady({ questions: questions(), answers: state.answers, coverage: analytics.summary });
        } else {
          const sourcesById = new Map((data.sources || []).map((source) => [source.id, source]));
          const recommendation = Scoring.buildRecommendation({ parties: data.parties.filter((party) => party.active !== false), answers: state.answers, positions: data.positions, priorityQuestionIds: state.priorityQuestionIds, scoringConfig: data.scoringConfig });
          const labels = new Map((data.scoringConfig.families || []).map((family) => [family.id, family.label_ru]));
          recommendation.leader?.families.forEach((family) => { family.label_ru = labels.get(family.familyId); });
          host.innerHTML = ResultsUi.renderLiveResult({ recommendation, sourcesById });
        }
      }
    } catch (error) {
      host.innerHTML = `<p class="gate-fail"><strong>Не удалось загрузить источники.</strong> ${escapeHtml(error?.message || error)}</p>`;
    }
    renderDebug(analytics);
    if (focusResults) {
      host.focus({ preventScroll: true });
      window.scrollTo({ top: host.offsetTop - 12, behavior: 'smooth' });
    }
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

  init().catch((error) => {
    const host = $('developer-warnings');
    host.classList.remove('hidden');
    host.innerHTML = `<strong>Не удалось загрузить данные.</strong><p>${escapeHtml(error?.message || error)}. Запустите Kalpi через локальный HTTP-сервер.</p>`;
  });
})();
