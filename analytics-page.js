(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KalpiAnalyticsPage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const I18n = typeof module === 'object' && module.exports ? require('./i18n.js') : globalThis.KalpiI18n;
  const t = (text, params) => I18n.text(text, params);

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
  }

  const LABELS = {
    known: 'подтверждённая позиция', mixed: 'противоречивые данные', historical: 'исторические данные', insufficient_data: 'недостаточно данных',
    PARTY: 'партия', COMPONENT_PARTY: 'составная партия', CURRENT_LIST: 'текущий список', FACTION: 'фракция', HISTORICAL: 'историческая позиция', LEADER: 'лидер', INDIVIDUAL_MK: 'депутат',
    candidate_unverified: 'кандидат без проверки', 'previously_researched_2026-08-08': 'исследовано ранее (08.08.2026)', 'researched_2026-08-09': 'исследовано (09.08.2026)', 'researched_2026-08-10': 'исследовано (10.08.2026)', 'researched_2026-08-12': 'исследовано (12.08.2026)', 'reverified_2026-08-10': 'перепроверено (10.08.2026)', verified: 'проверен', not_recorded: 'не указано',
    party_ideology: 'идеология партии', party_platform: 'программа партии', parliamentary_vote: 'парламентское голосование', official_statement: 'официальное заявление', secondary_research: 'вторичное исследование', other: 'другое', transcript: 'стенограмма', bill: 'законопроект', party_statement: 'заявление партии', official_legal_guidance: 'официальное правовое разъяснение',
    official_document: 'официальный документ', reputable_reporting: 'надёжное СМИ', plenary_protocol: 'протокол заседания',
  };

  function label(value) {
    if (value === 'LEADER' && I18n.getLocale() !== 'ru') return t('Лидер партии');
    if (LABELS[value]) return t(LABELS[value]);
    const dated = /^(verified|reverified|researched|previously_researched)_(\d{4}-\d{2}-\d{2})$/.exec(String(value));
    if (dated) {
      const templates = { verified: 'проверен ({date})', reverified: 'перепроверено ({date})', researched: 'исследовано ({date})', previously_researched: 'исследовано ранее ({date})' };
      return t(templates[dated[1]], { date: dated[2] });
    }
    return t(String(value || 'не указано'));
  }

  function statList(values) {
    return Object.entries(values || {}).map(([label, count]) => `<li><span>${escapeHtml(t(label))}</span><strong>${escapeHtml(count)}</strong></li>`).join('');
  }

  function renderAnalytics({ gate, research }) {
    const summary = gate.metrics.summary;
    const gateHtml = gate.passed ? '' : `<p class="gate-fail"><strong>${escapeHtml(t('Порог готовности не пройден.'))}</strong> ${escapeHtml(gate.failures.join(' · '))}</p>`;
    return `<h2>${escapeHtml(t('Качество и границы прототипа'))}</h2>${gateHtml}<p>${escapeHtml(t('В матрице {known} из {total} заполненных ячеек. Источники, статус, принадлежность позиции и дата проверки доступны ниже.', { known: summary.knownCells, total: summary.totalCells }))}</p><dl class="completion-metrics"><div><dt>${escapeHtml(t('Покрытие'))}</dt><dd>${summary.knownCells} / ${summary.totalCells}</dd></div><div><dt>${escapeHtml(t('Очередь перепроверки'))}</dt><dd>${research.reviewQueue.length}</dd></div></dl>`;
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
      return `<td><button class="matrix-cell ${matrixCellClass(cell)}" type="button" data-cell-key="${escapeHtml(party.id)}/${escapeHtml(question.id)}" aria-label="${escapeHtml(t(party.name_ru || party.id))}, ${escapeHtml(t(question.short_title_ru || question.id))}: ${escapeHtml(label(cell.position.status))}">${escapeHtml(value)}</button></td>`;
    };
    const desktop = `<table class="analytics-matrix-table"><thead><tr><th scope="col">${escapeHtml(t('Партия'))}</th>${questions.map((question) => `<th scope="col" title="${escapeHtml(t(question.short_title_ru || question.id))}">${escapeHtml(question.code || question.id)}</th>`).join('')}</tr></thead><tbody>${parties.map((party) => `<tr><th scope="row">${escapeHtml(t(party.name_ru || party.id))}</th>${questions.map((question) => button(byKey.get(`${party.id}/${question.id}`), party, question)).join('')}</tr>`).join('')}</tbody></table>`;
    const mobile = `<table class="analytics-matrix-table"><thead><tr><th scope="col">${escapeHtml(t('Вопрос'))}</th>${parties.map((party) => `<th scope="col" title="${escapeHtml(t(party.name_ru || party.id))}">${escapeHtml(t(party.name_ru || party.id))}</th>`).join('')}</tr></thead><tbody>${questions.map((question) => `<tr><th scope="row" title="${escapeHtml(t(question.short_title_ru || question.id))}">${escapeHtml(t(question.short_title_ru || question.id))}</th>${parties.map((party) => button(byKey.get(`${party.id}/${question.id}`), party, question)).join('')}</tr>`).join('')}</tbody></table>`;
    return `<div class="analytics-matrix-desktop">${desktop}</div><div class="analytics-matrix-mobile">${mobile}</div>`;
  }

  function renderDetail(cell) {
    if (!cell) return `<h2>${escapeHtml(t('Выберите позицию'))}</h2><p>${escapeHtml(t('Нажмите на ячейку в таблице, чтобы увидеть объяснение, статус, принадлежность позиции и связанные источники.'))}</p>`;
    const position = cell.position;
    const evidence = (cell.evidence || []).map((source) => source.url
      ? `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener"><bdi dir="auto">${escapeHtml(t(source.title || source.id))}</bdi></a> <span>${escapeHtml(label(source.verification_status))}</span></li>`
      : `<li><bdi dir="auto">${escapeHtml(t(source.title || source.id))}</bdi> <span>${escapeHtml(label(source.verification_status))}</span></li>`).join('');
    return `<h2>${escapeHtml(t(cell.party.name_ru || cell.party.id))} · ${escapeHtml(t(cell.question.short_title_ru || cell.question.id))}</h2><dl class="evidence-facts"><div><dt>${escapeHtml(t('Значение'))}</dt><dd>${escapeHtml(position.value == null ? t('нет позиции') : position.value)}</dd></div><div><dt>${escapeHtml(t('Статус'))}</dt><dd>${escapeHtml(label(position.status))}</dd></div><div><dt>${escapeHtml(t('Принадлежность позиции'))}</dt><dd>${escapeHtml(label(position.entity_scope))}</dd></div><div><dt>${escapeHtml(t('Последняя проверка'))}</dt><dd>${escapeHtml(position.last_verified || t('не указана'))}</dd></div></dl><p>${escapeHtml(t(position.explanation_ru || 'Для этой пары пока нет достаточной позиции.'))}</p><h3>${escapeHtml(t('Источники'))}</h3>${evidence ? `<ul class="source-list">${evidence}</ul>` : `<p>${escapeHtml(t('Источники не указаны.'))}</p>`}`;
  }

  function renderProvenance(research) {
    const unused = research.unusedSources.length
      ? `<details><summary>${escapeHtml(t('Неиспользуемые источники ({count})', { count: research.unusedSources.length }))}</summary><ul class="source-list">${research.unusedSources.map((source) => `<li><bdi dir="auto">${escapeHtml(t(source.title || source.id))}</bdi></li>`).join('')}</ul></details>`
      : `<p>${escapeHtml(t('Все источники связаны хотя бы с одной позицией.'))}</p>`;
    const labelled = (values) => Object.fromEntries(Object.entries(values).map(([key, count]) => [label(key), count]));
    return `<h2>${escapeHtml(t('Происхождение данных'))}</h2><div class="provenance-grid"><section><h3>${escapeHtml(t('Исходные статусы'))}</h3><ul>${statList(labelled(research.statusCounts))}</ul></section><section><h3>${escapeHtml(t('Принадлежность позиции'))}</h3><ul>${statList(labelled(research.scopeCounts))}</ul></section><section><h3>${escapeHtml(t('Проверка источников'))}</h3><ul>${statList(labelled(research.sourceVerificationCounts))}</ul></section><section><h3>${escapeHtml(t('Типы источников'))}</h3><ul>${statList(labelled(research.sourceTypeCounts))}</ul></section></div>${unused}`;
  }

  function renderReviewQueue(queue) {
    const rows = queue.slice(0, 40).map((cell) => `<tr><td>${escapeHtml(t(cell.party.name_ru || cell.party.id))}</td><td>${escapeHtml(t(cell.question.short_title_ru || cell.question.id))}</td><td>${escapeHtml(label(cell.position.status))}</td><td>${escapeHtml(label(cell.position.entity_scope))}</td></tr>`).join('');
    return `<h2>${escapeHtml(t('Очередь перепроверки'))}</h2><p>${escapeHtml(t('Здесь показаны пары партия × вопрос, для которых пока недостаточно данных. Показаны первые {shown} из {total}.', { shown: Math.min(queue.length, 40), total: queue.length }))}</p><div class="table-scroll"><table class="audit-table"><thead><tr><th>${escapeHtml(t('Партия'))}</th><th>${escapeHtml(t('Вопрос'))}</th><th>${escapeHtml(t('Статус'))}</th><th>${escapeHtml(t('Принадлежность позиции'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function initBrowserPage() {
    if (typeof window === 'undefined' || !window.document || !window.KalpiAnalytics) return;
    const $ = (id) => document.getElementById(id);
    const Loader = window.KalpiDataLoader;
    const Validation = window.KalpiDataValidation;
    let data;
    let selectedCellKey = null;
    const fetchData = async () => {
      data = await Loader.loadDataset(async (filename) => {
        const response = await fetch(`data/${filename}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      });
    };
    const option = (value, label) => `<option value="${escapeHtml(value)}">${escapeHtml(t(label))}</option>`;
    const fillSelect = (id, values, label) => {
      const select = $(id);
      const selected = select.value;
      while (select.options.length > 1) select.remove(1);
      select.insertAdjacentHTML('beforeend', values.map((value) => option(value, t(label(value)))).join(''));
      select.value = selected;
    };
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
      $('analytics-detail').innerHTML = renderDetail(allCells.find((cell) => `${cell.party.id}/${cell.question.id}` === selectedCellKey));
      document.querySelectorAll('[data-cell-key]').forEach((button) => button.addEventListener('click', () => {
        selectedCellKey = button.dataset.cellKey;
        const cell = allCells.find((item) => `${item.party.id}/${item.question.id}` === button.dataset.cellKey);
        $('analytics-detail').innerHTML = renderDetail(cell);
        $('analytics-detail').focus({ preventScroll: true });
      }));
    };
    (async () => {
      try {
        await I18n.ready;
        await fetchData();
      } catch (error) {
        $('analytics-summary').innerHTML = `<p class="gate-fail"><strong>${escapeHtml(t('Не удалось загрузить данные.'))}</strong> ${escapeHtml(error?.message || error)}. ${escapeHtml(t('Запустите Kalpi через локальный HTTP-сервер.'))}</p>`;
        return;
      }
      const errors = Validation.validateDataset(data);
      if (errors.length) $('analytics-summary').innerHTML = `<p class="gate-fail"><strong>${escapeHtml(t('Ошибка данных.'))}</strong> ${escapeHtml(errors.join(' · '))}</p>`;
      const research = window.KalpiAnalytics.computeResearchAnalytics(data);
      const fillFilters = () => {
      fillSelect('analytics-party-filter', data.parties.filter((party) => party.active !== false).map((party) => party.id), (id) => data.parties.find((party) => party.id === id).name_ru || id);
      fillSelect('analytics-family-filter', [...new Set(research.cells.map((cell) => cell.familyId).filter(Boolean))], (id) => data.scoringConfig.families.find((family) => family.id === id)?.label_ru || id);
      fillSelect('analytics-status-filter', Object.keys(research.statusCounts), label);
      fillSelect('analytics-scope-filter', Object.keys(research.scopeCounts), label);
      fillSelect('analytics-verification-filter', Object.keys(research.sourceVerificationCounts), label);
      };
      fillFilters();
      window.addEventListener('kalpi:languagechange', () => { fillFilters(); render(); });
      for (const id of ['analytics-party-filter', 'analytics-family-filter', 'analytics-status-filter', 'analytics-scope-filter', 'analytics-verification-filter']) $(id).addEventListener('change', render);
      $('analytics-detail').innerHTML = renderDetail(null);
      render();
    })();
  }

  if (typeof window !== 'undefined' && window.document) initBrowserPage();
  return { renderAnalytics, renderMatrix, matrixCellClass, renderDetail, renderProvenance, renderReviewQueue };
});
