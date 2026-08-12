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

  function statList(values) {
    return Object.entries(values || {}).map(([label, count]) => `<li><span>${escapeHtml(label)}</span><strong>${escapeHtml(count)}</strong></li>`).join('');
  }

  function renderAnalytics({ gate, research }) {
    const summary = gate.metrics.summary;
    const gateHtml = gate.passed
      ? '<p class="gate-pass"><strong>Release gate пройден.</strong> Runtime может показывать prototype-ranking.</p>'
      : `<p class="gate-fail"><strong>Release gate не пройден.</strong> ${escapeHtml(gate.failures.join(' · '))}</p>`;
    return `<p class="eyebrow">Сводка</p><h2>Качество и границы prototype</h2>${gateHtml}<p>В матрице ${summary.knownCells} из ${summary.totalCells} usable ячеек; средний исходный confidence — ${pct(summary.averageConfidence)}. Для ranking позиция с value получает effective confidence 100%, но исходный status и evidence сохраняются ниже.</p><dl class="completion-metrics"><div><dt>Покрытие</dt><dd>${summary.knownCells} / ${summary.totalCells}</dd></div><div><dt>Исходный confidence</dt><dd>${pct(summary.averageConfidence)}</dd></div><div><dt>Очередь перепроверки</dt><dd>${research.reviewQueue.length}</dd></div></dl>`;
  }

  function cellClass(cell) {
    return `matrix-${String(cell.position.status || 'insufficient_data').replace(/[^a-z_]/g, '')}`;
  }

  function renderMatrix(cells, parties, questions) {
    const byKey = new Map(cells.map((cell) => [`${cell.party.id}/${cell.question.id}`, cell]));
    const button = (cell, party, question) => {
      if (!cell) return '<td>—</td>';
      const value = cell.position.value == null ? '—' : cell.position.value;
      return `<td><button class="matrix-cell ${cellClass(cell)}" type="button" data-cell-key="${escapeHtml(party.id)}/${escapeHtml(question.id)}" aria-label="${escapeHtml(party.name_ru || party.id)}, ${escapeHtml(question.short_title_ru || question.id)}: ${escapeHtml(cell.position.status)}">${escapeHtml(value)}</button></td>`;
    };
    const desktop = `<table class="analytics-matrix-table"><thead><tr><th scope="col">Партия</th>${questions.map((question) => `<th scope="col" title="${escapeHtml(question.short_title_ru || question.id)}">${escapeHtml(question.code || question.id)}</th>`).join('')}</tr></thead><tbody>${parties.map((party) => `<tr><th scope="row">${escapeHtml(party.name_ru || party.id)}</th>${questions.map((question) => button(byKey.get(`${party.id}/${question.id}`), party, question)).join('')}</tr>`).join('')}</tbody></table>`;
    const mobile = `<table class="analytics-matrix-table"><thead><tr><th scope="col">Вопрос</th>${parties.map((party) => `<th scope="col" title="${escapeHtml(party.name_ru || party.id)}">${escapeHtml(party.name_ru || party.id)}</th>`).join('')}</tr></thead><tbody>${questions.map((question) => `<tr><th scope="row" title="${escapeHtml(question.short_title_ru || question.id)}">${escapeHtml(question.short_title_ru || question.id)}</th>${parties.map((party) => button(byKey.get(`${party.id}/${question.id}`), party, question)).join('')}</tr>`).join('')}</tbody></table>`;
    return `<div class="analytics-matrix-desktop">${desktop}</div><div class="analytics-matrix-mobile">${mobile}</div>`;
  }

  function renderDetail(cell) {
    if (!cell) return '<p class="eyebrow">Ячейка матрицы</p><h2>Выберите позицию</h2><p>Нажмите на ячейку в таблице, чтобы увидеть explanation, статус, confidence, scope и связанные источники.</p>';
    const position = cell.position;
    const evidence = (cell.evidence || []).map((source) => source.url
      ? `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.title || source.id)}</a> <span>${escapeHtml(source.verification_status || 'not_recorded')}</span></li>`
      : `<li>${escapeHtml(source.title || source.id)} <span>${escapeHtml(source.verification_status || 'not_recorded')}</span></li>`).join('');
    return `<p class="eyebrow">Ячейка матрицы</p><h2>${escapeHtml(cell.party.name_ru || cell.party.id)} · ${escapeHtml(cell.question.short_title_ru || cell.question.id)}</h2><dl class="evidence-facts"><div><dt>Value</dt><dd>${escapeHtml(position.value == null ? 'нет позиции' : position.value)}</dd></div><div><dt>Status</dt><dd>${escapeHtml(position.status)}</dd></div><div><dt>Confidence</dt><dd>${pct(position.confidence)}</dd></div><div><dt>Entity scope</dt><dd>${escapeHtml(position.entity_scope || 'not_recorded')}</dd></div><div><dt>Последняя проверка</dt><dd>${escapeHtml(position.last_verified || 'не указана')}</dd></div></dl><p>${escapeHtml(position.explanation_ru || 'Для этой пары пока нет достаточной позиции.')}</p><h3>Источники</h3>${evidence ? `<ul class="source-list">${evidence}</ul>` : '<p>Источники не указаны.</p>'}`;
  }

  function renderProvenance(research) {
    const unused = research.unusedSources.length
      ? `<details><summary>Неиспользуемые источники (${research.unusedSources.length})</summary><ul class="source-list">${research.unusedSources.map((source) => `<li>${escapeHtml(source.title || source.id)}</li>`).join('')}</ul></details>`
      : '<p>Все источники связаны хотя бы с одной позицией.</p>';
    return `<p class="eyebrow">Provenance</p><h2>Откуда берутся позиции</h2><div class="provenance-grid"><section><h3>Исходные статусы</h3><ul>${statList(research.statusCounts)}</ul></section><section><h3>Entity scopes</h3><ul>${statList(research.scopeCounts)}</ul></section><section><h3>Проверка источников</h3><ul>${statList(research.sourceVerificationCounts)}</ul></section><section><h3>Типы источников</h3><ul>${statList(research.sourceTypeCounts)}</ul></section></div>${unused}`;
  }

  function renderReviewQueue(queue) {
    const rows = queue.slice(0, 40).map((cell) => `<tr><td>${escapeHtml(cell.party.name_ru || cell.party.id)}</td><td>${escapeHtml(cell.question.short_title_ru || cell.question.id)}</td><td>${escapeHtml(cell.position.status)}</td><td>${pct(cell.position.confidence)}</td><td>${escapeHtml(cell.position.entity_scope || 'not_recorded')}</td></tr>`).join('');
    return `<p class="eyebrow">Следующая проверка</p><h2>Очередь перепроверки</h2><p>Сначала показаны пробелы, затем записи с confidence ниже 70%. Показаны первые ${Math.min(queue.length, 40)} из ${queue.length}.</p><div class="table-scroll"><table class="audit-table"><thead><tr><th>Партия</th><th>Вопрос</th><th>Status</th><th>Confidence</th><th>Scope</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function initBrowserPage() {
    if (typeof window === 'undefined' || !window.document || !window.KalpiAnalytics) return;
    const $ = (id) => document.getElementById(id);
    const Loader = window.KalpiDataLoader;
    const Validation = window.KalpiDataValidation;
    let data = window.KALPI_DATA;
    const fetchData = async () => {
      if (location.protocol === 'file:') return;
      try {
        data = await Loader.loadDataset(async (filename) => {
          const response = await fetch(`data/${filename}?v=${Date.now()}`, { cache: 'no-store' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        });
      } catch (_) { data = window.KALPI_DATA; }
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
      await fetchData();
      const errors = Validation.validateDataset(data);
      if (errors.length) $('analytics-summary').innerHTML = `<p class="gate-fail"><strong>Ошибка данных.</strong> ${escapeHtml(errors.join(' · '))}</p>`;
      const research = window.KalpiAnalytics.computeResearchAnalytics(data);
      fillSelect('analytics-party-filter', data.parties.filter((party) => party.active !== false).map((party) => party.id), (id) => data.parties.find((party) => party.id === id).name_ru || id);
      fillSelect('analytics-family-filter', [...new Set(research.cells.map((cell) => cell.familyId).filter(Boolean))], (id) => data.scoringConfig.families.find((family) => family.id === id)?.label_ru || id);
      fillSelect('analytics-status-filter', Object.keys(research.statusCounts), (id) => id);
      fillSelect('analytics-scope-filter', Object.keys(research.scopeCounts), (id) => id);
      fillSelect('analytics-verification-filter', Object.keys(research.sourceVerificationCounts), (id) => id);
      for (const id of ['analytics-party-filter', 'analytics-family-filter', 'analytics-status-filter', 'analytics-scope-filter', 'analytics-verification-filter']) $(id).addEventListener('change', render);
      $('analytics-detail').innerHTML = renderDetail(null);
      render();
    })();
  }

  if (typeof window !== 'undefined' && window.document) initBrowserPage();
  return { renderAnalytics, renderMatrix, renderDetail, renderProvenance, renderReviewQueue };
});
