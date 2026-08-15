(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiAnalyticsPage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  function pct(value) { return `${Math.round(Number(value || 0) * 100)}%`; }

  const LABELS = {
    known: 'подтверждённая позиция', mixed: 'противоречивые данные', historical: 'исторические данные', insufficient_data: 'недостаточно данных',
    PARTY: 'партия', COMPONENT_PARTY: 'составная партия', CURRENT_LIST: 'текущий список', FACTION: 'фракция', HISTORICAL: 'историческая позиция', LEADER: 'лидер', INDIVIDUAL_MK: 'депутат',
    candidate_unverified: 'кандидат без проверки', 'previously_researched_2026-08-08': 'исследовано ранее (08.08.2026)', 'researched_2026-08-09': 'исследовано (09.08.2026)', 'researched_2026-08-10': 'исследовано (10.08.2026)', 'researched_2026-08-12': 'исследовано (12.08.2026)', 'reverified_2026-08-10': 'перепроверено (10.08.2026)', verified: 'проверен', not_recorded: 'не указано',
    official_document: 'официальный документ', reputable_reporting: 'надёжное СМИ', plenary_protocol: 'протокол заседания',
  };

  function label(value) { return LABELS[value] || String(value || 'не указано'); }

  function statList(values) {
    return Object.entries(values || {}).map(([label, count]) => `<li><span>${escapeHtml(label)}</span><strong>${escapeHtml(count)}</strong></li>`).join('');
  }

  function renderAnalytics({ gate, research }) {
    const summary = gate.metrics.summary;
    const gateHtml = gate.passed ? '' : `<p class="gate-fail"><strong>Порог готовности не пройден.</strong> ${escapeHtml(gate.failures.join(' · '))}</p>`;
    return `<h2>Качество и границы прототипа</h2>${gateHtml}<p>В матрице ${summary.knownCells} из ${summary.totalCells} заполненных ячеек; средняя исходная достоверность — ${pct(summary.averageConfidence)}. Для расчёта рейтинга позиция со значением получает расчётную достоверность 100%, но исходный статус и источники сохраняются ниже.</p><dl class="completion-metrics"><div><dt>Покрытие</dt><dd>${summary.knownCells} / ${summary.totalCells}</dd></div><div><dt>Исходная достоверность</dt><dd>${pct(summary.averageConfidence)}</dd></div><div><dt>Очередь перепроверки</dt><dd>${research.reviewQueue.length}</dd></div></dl>`;
  }

  function matrixCellClass(cell) {
    const value = cell?.position?.value;
    if (value == null) return 'matrix-value-missing';
    if (value < 0) return 'matrix-value-negative';
    if (value > 0) return 'matrix-value-positive';
    return 'matrix-value-neutral';
  }

  function renderMatrix(cells, parties, questions) {
    const byKey = new Map(cells.map((cell) => [`${cell.party.id}/${cell.question.id}`, cell]));
    const button = (cell, party, question) => {
      if (!cell) return '<td>—</td>';
      const value = cell.position.value == null ? '—' : cell.position.value;
      return `<td><button class="matrix-cell ${matrixCellClass(cell)}" type="button" data-cell-key="${escapeHtml(party.id)}/${escapeHtml(question.id)}" aria-label="${escapeHtml(party.name_ru || party.id)}, ${escapeHtml(question.short_title_ru || question.id)}: ${escapeHtml(label(cell.position.status))}">${escapeHtml(value)}</button></td>`;
    };
    const desktop = `<table class="analytics-matrix-table"><thead><tr><th scope="col">Партия</th>${questions.map((question) => `<th scope="col" title="${escapeHtml(question.short_title_ru || question.id)}">${escapeHtml(question.code || question.id)}</th>`).join('')}</tr></thead><tbody>${parties.map((party) => `<tr><th scope="row">${escapeHtml(party.name_ru || party.id)}</th>${questions.map((question) => button(byKey.get(`${party.id}/${question.id}`), party, question)).join('')}</tr>`).join('')}</tbody></table>`;
    const mobile = `<table class="analytics-matrix-table"><thead><tr><th scope="col">Вопрос</th>${parties.map((party) => `<th scope="col" title="${escapeHtml(party.name_ru || party.id)}">${escapeHtml(party.name_ru || party.id)}</th>`).join('')}</tr></thead><tbody>${questions.map((question) => `<tr><th scope="row" title="${escapeHtml(question.short_title_ru || question.id)}">${escapeHtml(question.short_title_ru || question.id)}</th>${parties.map((party) => button(byKey.get(`${party.id}/${question.id}`), party, question)).join('')}</tr>`).join('')}</tbody></table>`;
    return `<div class="analytics-matrix-desktop">${desktop}</div><div class="analytics-matrix-mobile">${mobile}</div>`;
  }

  function renderDetail(cell) {
    if (!cell) return '<h2>Выберите позицию</h2><p>Нажмите на ячейку в таблице, чтобы увидеть объяснение, статус, достоверность, принадлежность позиции и связанные источники.</p>';
    const position = cell.position;
    const evidence = (cell.evidence || []).map((source) => source.url
      ? `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title || source.id)}</a> <span>${escapeHtml(label(source.verification_status))}</span></li>`
      : `<li>${escapeHtml(source.title || source.id)} <span>${escapeHtml(label(source.verification_status))}</span></li>`).join('');
    return `<h2>${escapeHtml(cell.party.name_ru || cell.party.id)} · ${escapeHtml(cell.question.short_title_ru || cell.question.id)}</h2><dl class="evidence-facts"><div><dt>Значение</dt><dd>${escapeHtml(position.value == null ? 'нет позиции' : position.value)}</dd></div><div><dt>Статус</dt><dd>${escapeHtml(label(position.status))}</dd></div><div><dt>Достоверность</dt><dd>${pct(position.confidence)}</dd></div><div><dt>Принадлежность позиции</dt><dd>${escapeHtml(label(position.entity_scope))}</dd></div><div><dt>Последняя проверка</dt><dd>${escapeHtml(position.last_verified || 'не указана')}</dd></div></dl><p>${escapeHtml(position.explanation_ru || 'Для этой пары пока нет достаточной позиции.')}</p><h3>Источники</h3>${evidence ? `<ul class="source-list">${evidence}</ul>` : '<p>Источники не указаны.</p>'}`;
  }

  function renderProvenance(research) {
    const unused = research.unusedSources.length
      ? `<details><summary>Неиспользуемые источники (${research.unusedSources.length})</summary><ul class="source-list">${research.unusedSources.map((source) => `<li>${escapeHtml(source.title || source.id)}</li>`).join('')}</ul></details>`
      : '<p>Все источники связаны хотя бы с одной позицией.</p>';
    const labelled = (values) => Object.fromEntries(Object.entries(values).map(([key, count]) => [label(key), count]));
    return `<h2>Происхождение данных</h2><div class="provenance-grid"><section><h3>Исходные статусы</h3><ul>${statList(labelled(research.statusCounts))}</ul></section><section><h3>Принадлежность позиции</h3><ul>${statList(labelled(research.scopeCounts))}</ul></section><section><h3>Проверка источников</h3><ul>${statList(labelled(research.sourceVerificationCounts))}</ul></section><section><h3>Типы источников</h3><ul>${statList(labelled(research.sourceTypeCounts))}</ul></section></div>${unused}`;
  }

  function renderReviewQueue(queue) {
    const rows = queue.slice(0, 40).map((cell) => `<tr><td>${escapeHtml(cell.party.name_ru || cell.party.id)}</td><td>${escapeHtml(cell.question.short_title_ru || cell.question.id)}</td><td>${escapeHtml(label(cell.position.status))}</td><td>${pct(cell.position.confidence)}</td><td>${escapeHtml(label(cell.position.entity_scope))}</td></tr>`).join('');
    return `<h2>Очередь перепроверки</h2><p>Сначала показаны пробелы, затем записи с достоверностью ниже 70%. Показаны первые ${Math.min(queue.length, 40)} из ${queue.length}.</p><div class="table-scroll"><table class="audit-table"><thead><tr><th>Партия</th><th>Вопрос</th><th>Статус</th><th>Достоверность</th><th>Принадлежность позиции</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function initBrowserPage() {
    if (typeof window === 'undefined' || !window.document || !window.KalpiAnalytics) return;
    const $ = (id) => document.getElementById(id);
    const Loader = window.KalpiDataLoader;
    const Validation = window.KalpiDataValidation;
    let data;
    const fetchData = async () => {
      data = await Loader.loadDataset(async (filename) => {
        const response = await fetch(`data/${filename}?v=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      });
    };
    const option = (value, label) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
    const fillSelect = (id, values, label) => { $(id).insertAdjacentHTML('beforeend', values.map((value) => option(value, label(value))).join('')); };
    const filters = () => ({
      party: $('analytics-party-filter').value,
      family: $('analytics-family-filter').value,
      status: $('analytics-status-filter').value,
      scope: $('analytics-scope-filter').value,
      verification: $('analytics-verification-filter').value,
    });
    const matches = (cell, filter) => (!filter.party || cell.party.id === filter.party)
      && (!filter.family || cell.familyId === filter.family)
      && (!filter.status || cell.position.status === filter.status)
      && (!filter.scope || cell.position.entity_scope === filter.scope)
      && (!filter.verification || cell.evidence.some((source) => (source.verification_status || 'not_recorded') === filter.verification));
    const render = () => {
      const gate = window.KalpiAnalytics.computeReleaseGate(data);
      const research = window.KalpiAnalytics.computeResearchAnalytics(data);
      const allCells = research.cells;
      const visible = allCells.filter((cell) => matches(cell, filters()));
      const parties = data.parties.filter((party) => !filters().party || party.id === filters().party);
      const questions = data.questions.filter((question) => question.status === 'core' && (!filters().family || visible.some((cell) => cell.question.id === question.id)));
      $('analytics-summary').innerHTML = renderAnalytics({ gate, research });
      $('analytics-matrix').innerHTML = renderMatrix(visible, parties, questions);
      $('analytics-provenance').innerHTML = renderProvenance(research);
      $('analytics-review-queue').innerHTML = renderReviewQueue(research.reviewQueue);
      document.querySelectorAll('[data-cell-key]').forEach((button) => button.addEventListener('click', () => {
        const cell = allCells.find((item) => `${item.party.id}/${item.question.id}` === button.dataset.cellKey);
        $('analytics-detail').innerHTML = renderDetail(cell);
        $('analytics-detail').focus({ preventScroll: true });
      }));
    };
    (async () => {
      try {
        await fetchData();
      } catch (error) {
        $('analytics-summary').innerHTML = `<p class="gate-fail"><strong>Не удалось загрузить данные.</strong> ${escapeHtml(error?.message || error)}. Запустите Kalpi через локальный HTTP-сервер.</p>`;
        return;
      }
      const errors = Validation.validateDataset(data);
      if (errors.length) $('analytics-summary').innerHTML = `<p class="gate-fail"><strong>Ошибка данных.</strong> ${escapeHtml(errors.join(' · '))}</p>`;
      const research = window.KalpiAnalytics.computeResearchAnalytics(data);
      fillSelect('analytics-party-filter', data.parties.filter((party) => party.active !== false).map((party) => party.id), (id) => data.parties.find((party) => party.id === id).name_ru || id);
      fillSelect('analytics-family-filter', [...new Set(research.cells.map((cell) => cell.familyId).filter(Boolean))], (id) => data.scoringConfig.families.find((family) => family.id === id)?.label_ru || id);
      fillSelect('analytics-status-filter', Object.keys(research.statusCounts), label);
      fillSelect('analytics-scope-filter', Object.keys(research.scopeCounts), label);
      fillSelect('analytics-verification-filter', Object.keys(research.sourceVerificationCounts), label);
      for (const id of ['analytics-party-filter', 'analytics-family-filter', 'analytics-status-filter', 'analytics-scope-filter', 'analytics-verification-filter']) $(id).addEventListener('change', render);
      $('analytics-detail').innerHTML = renderDetail(null);
      render();
    })();
  }

  if (typeof window !== 'undefined' && window.document) initBrowserPage();
  return { renderAnalytics, renderMatrix, matrixCellClass, renderDetail, renderProvenance, renderReviewQueue };
});
