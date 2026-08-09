(function () {
  'use strict';
  const Core = window.KalpiCore;
  const DEFAULT_DATA = window.KALPI_DATA;
  const BASELINE_DATA = window.KALPI_BASELINE_DATA || null;
  const Loader = window.KalpiDataLoader;
  const ANSWER_KEY = 'kalpiPrototypeAnswersV1';
  const MIN_PARTY_AXIS_COVERAGE = 0.22;
  const MIN_USER_AXIS_COVERAGE = 0.18;
  const ANSWER_OPTIONS = [
    [-2, 'Категорически против'], [-1, 'Скорее против'], [0, 'Нейтрально / не уверен'],
    [1, 'Скорее за'], [2, 'Полностью за'], ['skip', 'Пропустить']
  ];
  const VALUE_LABELS = new Map(ANSWER_OPTIONS.map(([v, label]) => [String(v), label]));

  let data = DEFAULT_DATA;
  let dataSource = 'bundle';
  let dataSourceWarning = '';
  let answers = loadAnswers();
  let latestResults = null;
  let latestAxisState = null;

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const pct = (v) => `${Math.round((v || 0) * 100)}%`;

  function loadAnswers() {
    try { return JSON.parse(localStorage.getItem(ANSWER_KEY) || '{}'); }
    catch (_) { return {}; }
  }
  function saveAnswers() {
    try { localStorage.setItem(ANSWER_KEY, JSON.stringify(answers)); } catch (_) {}
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
      'imported': 'импортированные JSON в текущей вкладке',
      'bundle': 'data/default-data.js'
    };
    const warning = dataSourceWarning ? `<div class="source-warning">${esc(dataSourceWarning)}</div>` : '';
    $('data-source-status').innerHTML = `<strong>Активные данные:</strong> ${esc(labels[dataSource] || dataSource)} · known ${analytics.summary.usableCells}/${analytics.summary.totalCells} · weighted ${pct(analytics.summary.weightedCoverage)}${warning}`;
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
    panel.innerHTML = `<strong>Предупреждения данных (${errors.length})</strong><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>`;
  }

  function renderQuestions() {
    const host = $('questions-container');
    const qs = enabledQuestions();
    const groups = new Map();
    qs.forEach((q) => {
      const group = q.group_ru || 'Другие вопросы';
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
          const options = ANSWER_OPTIONS.map(([value, label]) => {
            const id = `${q.id}-${String(value).replace('-', 'm')}`;
            const checked = String(current) === String(value) ? 'checked' : '';
            return `<span class="answer-option"><input type="radio" name="${esc(q.id)}" id="${id}" value="${value}" ${checked}><label for="${id}">${esc(label)}</label></span>`;
          }).join('');
          return `<article class="question-card ${current !== undefined ? 'answered' : ''}" data-question="${esc(q.id)}">
            <div class="question-number">Вопрос ${index}</div>
            <div class="question-text">${esc(q.text_ru)}</div>
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
    updateProgress();
  }

  function updateProgress() {
    const qs = enabledQuestions();
    const answered = qs.filter((q) => Object.prototype.hasOwnProperty.call(answers, q.id)).length;
    $('progress').textContent = `${answered} / ${qs.length}`;
    $('progress-bar').style.width = qs.length ? `${answered / qs.length * 100}%` : '0%';
  }

  function computeResults() {
    const qs = enabledQuestions();
    return activeParties().map((party) => ({
      party,
      ...Core.scoreParty({ partyId: party.id, answers, questions: qs, positions: data.positions })
    })).sort((a, b) => b.finalScore - a.finalScore || b.coverage - a.coverage || b.agreement - a.agreement);
  }

  function renderResults() {
    const substantiveCount = Object.values(answers).filter((v) => v !== 'skip').length;
    if (!substantiveCount) {
      alert('Ответьте хотя бы на один вопрос или выберите содержательный вариант вместо «Пропустить».');
      return;
    }
    latestResults = computeResults();
    const top = latestResults[0];
    $('results').classList.remove('hidden');
    $('data-inspection').classList.remove('hidden');
    $('recommendation-title').textContent = `Ближе всего: ${top.party.name_ru}`;
    $('recommendation-card').innerHTML = `
      <div class="recommendation-hero">
        <div class="hero-party"><span>Лучшее совпадение</span><strong>${esc(top.party.name_ru)}</strong><span>${esc(top.party.leader || '')}</span></div>
        <div class="metric-card"><span class="value">${pct(top.finalScore)}</span><span class="label">итоговый score</span></div>
        <div class="metric-card"><span class="value">${pct(top.agreement)}</span><span class="label">совпадение известных позиций</span></div>
        <div class="metric-card"><span class="value">${pct(top.coverage)}</span><span class="label">покрытие данных</span></div>
      </div>
      <p class="hint">Неизвестно по ${top.unknownCount} из ваших отвеченных вопросов. При малом покрытии score автоматически сжимается к 50%.</p>`;

    $('ranking').innerHTML = latestResults.map((r, i) => `<div class="ranking-row">
      <span>${i + 1}</span><strong>${esc(r.party.name_ru)}</strong><span class="score">${pct(r.finalScore)}</span><span class="coverage-mini">данные ${pct(r.coverage)}</span>
    </div>`).join('');
    renderExplanation(top);
    renderAxes();
    renderInspection();
    window.scrollTo({ top: $('results').offsetTop - 12, behavior: 'smooth' });
  }

  function renderExplanation(result) {
    const buckets = { matches: [], near: [], disagree: [], unknown: [] };
    result.details.forEach((d) => {
      const q = questionById(d.questionId);
      if (!q) return;
      if (d.status === 'insufficient_data') buckets.unknown.push(q.text_ru);
      else if (d.agreement >= .875) buckets.matches.push(q.text_ru);
      else if (d.agreement >= .625) buckets.near.push(q.text_ru);
      else buckets.disagree.push(q.text_ru);
    });
    const section = (title, cls, items) => items.length ? `<h4>${title} (${items.length})</h4><ul class="explanation-list ${cls}">${items.slice(0, 7).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    $('explanation').innerHTML =
      section('Сильные совпадения', 'matches', buckets.matches) +
      section('Близкие позиции', 'near', buckets.near) +
      section('Расхождения', 'disagree', buckets.disagree) +
      section('Недостаточно данных', 'unknown', buckets.unknown);
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
        xSelect.add(new Option(axis.name_ru, axis.id, false, i === 1));
        ySelect.add(new Option(axis.name_ru, axis.id, false, i === 2));
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
    renderAxisProfile(userAxes, partyAxes);
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
      ctx.fillStyle = '#66717e'; ctx.font = '14px system-ui'; ctx.fillText('Выберите две разные оси.', margin.left, margin.top);
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
    ctx.textAlign='left'; ctx.fillText(xMeta.negative_ru, margin.left, cssHeight-18);
    ctx.textAlign='right'; ctx.fillText(xMeta.positive_ru, margin.left+w, cssHeight-18);
    ctx.save(); ctx.translate(18, margin.top+h); ctx.rotate(-Math.PI/2); ctx.textAlign='left'; ctx.fillText(yMeta.negative_ru,0,0); ctx.restore();
    ctx.save(); ctx.translate(18, margin.top); ctx.rotate(-Math.PI/2); ctx.textAlign='right'; ctx.fillText(yMeta.positive_ru,0,0); ctx.restore();

    const omitted=[];
    const visible=[];
    activeParties().forEach((party) => {
      const ax=partyAxes[party.id]?.[xId], ay=partyAxes[party.id]?.[yId];
      if (!ax || !ay || ax.status !== 'known' || ay.status !== 'known') omitted.push(party.name_ru);
      else visible.push({party,x:ax.value,y:ay.value});
    });
    visible.forEach((item, i) => {
      const x=sx(item.x), y=sy(item.y);
      ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fillStyle='#275d9f'; ctx.fill();
      ctx.font='12px system-ui'; ctx.fillStyle='#18202a'; ctx.textAlign='left';
      const dy = (i % 3 - 1) * 12;
      ctx.fillText(item.party.name_ru, x+8, y+4+dy);
    });
    const ux=userAxes[xId], uy=userAxes[yId];
    if (ux?.status === 'known' && uy?.status === 'known') {
      const x=sx(ux.value), y=sy(uy.value);
      ctx.save(); ctx.translate(x,y); ctx.rotate(Math.PI/4); ctx.fillStyle='#a33a3a'; ctx.fillRect(-6,-6,12,12); ctx.restore();
      ctx.fillStyle='#a33a3a'; ctx.font='700 13px system-ui'; ctx.textAlign='left'; ctx.fillText('Вы',x+10,y-9);
    } else {
      omitted.unshift('Пользователь (недостаточно ваших ответов по выбранным осям)');
    }
    $('map-omitted').textContent = omitted.length ? `Не показаны из-за недостатка данных: ${omitted.join(', ')}.` : 'Все партии имеют достаточное покрытие по выбранным осям.';
  }

  function renderAxisProfile(userAxes, partyAxes) {
    const order = latestResults ? latestResults.map((r) => r.party) : activeParties();
    const head = `<thead><tr><th>Ось</th><th>Вы</th>${order.map((p) => `<th>${esc(p.name_ru)}</th>`).join('')}</tr></thead>`;
    const cell = (axisResult) => axisResult?.status === 'known'
      ? `<span class="axis-value-known">${axisResult.value > 0 ? '+' : ''}${Math.round(axisResult.value)}</span><br><span class="coverage-mini">${pct(axisResult.coverage)}</span>`
      : `<span class="axis-value-missing">?</span>`;
    const body = `<tbody>${data.axes.map((axis) => `<tr><td><strong>${esc(axis.name_ru)}</strong></td><td>${cell(userAxes[axis.id])}</td>${order.map((party) => `<td>${cell(partyAxes[party.id]?.[axis.id])}</td>`).join('')}</tr>`).join('')}</tbody>`;
    $('axis-profile').innerHTML = `<table class="axis-table">${head}${body}</table>`;
  }

  function positionDisplay(position) {
    if (!position || position.status === 'insufficient_data') return '<span class="badge">insufficient_data</span>';
    const scopeContext = ['COMPONENT_PARTY','LEADER','INDIVIDUAL_MK'].includes(position.entity_scope);
    const evidence = (position.evidence || []).map((id) => sourceById(id)).filter(Boolean);
    const links = evidence.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.source_type)}</a>`).join(', ');
    return `<strong>${esc(VALUE_LABELS.get(String(position.value)) || position.value)}</strong><br>
      <span class="badge ${scopeContext ? 'context' : ''}">${esc(position.status)} · ${esc(position.entity_scope)}</span>
      <span class="badge">conf ${Math.round(position.confidence * 100)}%</span>${links ? `<br>${links}` : ''}`;
  }

  function renderDataQuality() {
    const analytics = Core.computeDatasetAnalytics({ data, baselineData: BASELINE_DATA, axisCoverageThreshold: MIN_PARTY_AXIS_COVERAGE });
    const s = analytics.summary;
    const metric = (value, label, note = '') => `<div class="quality-metric"><span class="value">${esc(value)}</span><span class="label">${esc(label)}</span>${note ? `<span class="note">${esc(note)}</span>` : ''}</div>`;

    $('quality-summary').innerHTML = [
      metric(`${s.usableCells} / ${s.totalCells}`, 'известных позиций', pct(s.rawCoverage)),
      metric(pct(s.weightedCoverage), 'weighted coverage', 'с учётом confidence и scope'),
      metric(pct(s.avgEffectiveConfidence), 'средний effective confidence', `${s.highConfidenceCells} high-confidence`),
      metric(`${s.usedSourceCount} / ${s.sourceCount}`, 'используемых источников', 'у позиций текущей матрицы'),
      metric(String(s.insufficientCells), 'insufficient_data', 'оставшиеся пробелы'),
    ].join('');

    if (analytics.comparison) {
      const c = analytics.comparison;
      const signed = (n) => `${n > 0 ? '+' : ''}${n}`;
      $('quality-comparison').innerHTML = `<div class="quality-comparison-banner">
        <div><strong>Изменение относительно исходной базы</strong><br><span class="hint">Baseline сохранён внутри прототипа отдельно от активных research-данных.</span></div>
        <div class="comparison-metrics">
          <span><strong>${c.baselineUsableCells} → ${c.currentUsableCells}</strong><small>известных клеток (${signed(c.deltaUsableCells)})</small></span>
          <span><strong>${pct(c.baselineWeightedCoverage)} → ${pct(c.currentWeightedCoverage)}</strong><small>weighted coverage</small></span>
          <span><strong>+${c.gainedKnown}</strong><small>новых позиций</small></span>
          <span><strong>−${c.lostKnown}</strong><small>утрачено</small></span>
          <span><strong>${c.valueChanged}</strong><small>изменённых stance</small></span>
          <span><strong>↑${c.confidenceImproved} / ↓${c.confidenceDecreased}</strong><small>confidence изменён</small></span>
          <span><strong>+${c.sourcesAdded}</strong><small>новых source ID</small></span>
        </div>
      </div>`;
    } else {
      $('quality-comparison').innerHTML = '<p class="hint">Baseline отсутствует: показывается только текущее состояние базы.</p>';
    }

    const partyRows = activeParties().map((party) => ({ party, stats: analytics.byParty[party.id] }))
      .sort((a, b) => a.stats.rawCoverage - b.stats.rawCoverage || a.party.name_ru.localeCompare(b.party.name_ru, 'ru'));
    $('quality-parties').innerHTML = `<table class="quality-table"><thead><tr><th>Партия</th><th>Known</th><th>Raw</th><th>Weighted</th><th>Eff. conf</th><th>High conf</th>${analytics.comparison ? '<th>Δ known</th>' : ''}</tr></thead><tbody>
      ${partyRows.map(({ party, stats }) => `<tr><td><strong>${esc(party.name_ru)}</strong></td><td>${stats.usableCells}/${stats.totalCells}</td><td>${pct(stats.rawCoverage)}</td><td>${pct(stats.weightedCoverage)}</td><td>${pct(stats.avgEffectiveConfidence)}</td><td>${stats.highConfidenceCells}</td>${analytics.comparison ? `<td class="${stats.deltaUsableCells > 0 ? 'delta-positive' : stats.deltaUsableCells < 0 ? 'delta-negative' : ''}">${stats.deltaUsableCells > 0 ? '+' : ''}${stats.deltaUsableCells}</td>` : ''}</tr>`).join('')}
    </tbody></table>`;

    const axisRows = data.axes.map((axis) => ({ axis, stats: analytics.byAxis[axis.id] }))
      .sort((a, b) => a.stats.averageCoverage - b.stats.averageCoverage);
    $('quality-axes').innerHTML = `<table class="quality-table"><thead><tr><th>Ось</th><th>Достаточно данных</th><th>Среднее покрытие</th><th>Слабее всего</th></tr></thead><tbody>
      ${axisRows.map(({ axis, stats }) => {
        const weak = activeParties().map((p) => ({ name: p.name_ru, cov: stats.partyCoverage[p.id]?.coverage || 0 }))
          .sort((a,b) => a.cov - b.cov).slice(0,3).map((x) => `${x.name} ${pct(x.cov)}`).join(', ');
        return `<tr><td><strong>${esc(axis.name_ru)}</strong></td><td>${stats.supportedParties}/${stats.totalParties}</td><td>${pct(stats.averageCoverage)}</td><td class="quality-small">${esc(weak)}</td></tr>`;
      }).join('')}
    </tbody></table>`;

    const questionRows = enabledQuestions().map((question) => ({ question, stats: analytics.byQuestion[question.id] }))
      .sort((a, b) => a.stats.rawCoverage - b.stats.rawCoverage || a.stats.weightedCoverage - b.stats.weightedCoverage);
    $('quality-questions').innerHTML = `<table class="quality-table wide-quality-table"><thead><tr><th>Вопрос</th><th>Блок</th><th>Known</th><th>Raw</th><th>Weighted</th><th>Eff. conf</th></tr></thead><tbody>
      ${questionRows.map(({ question, stats }) => `<tr><td>${esc(question.text_ru)}</td><td>${esc(question.group_ru || '')}</td><td>${stats.usableCells}/${stats.totalCells}</td><td>${pct(stats.rawCoverage)}</td><td>${pct(stats.weightedCoverage)}</td><td>${pct(stats.avgEffectiveConfidence)}</td></tr>`).join('')}
    </tbody></table>`;

    const countRows = (obj, labels = {}) => Object.entries(obj).sort((a,b) => b[1]-a[1]).map(([k,v]) => `<tr><td>${esc(labels[k] || k)}</td><td>${v}</td></tr>`).join('');
    $('quality-provenance').innerHTML = `<div class="provenance-grid">
      <div><h4>Entity scope</h4><table class="mini-count-table">${countRows(analytics.provenance)}</table></div>
      <div><h4>Status</h4><table class="mini-count-table">${countRows(analytics.statuses)}</table></div>
      <div><h4>Типы используемых источников</h4><table class="mini-count-table">${countRows(analytics.sourceTypes)}</table></div>
    </div>`;

    const gapOrder = analytics.gaps.slice().sort((a,b) => {
      const qa = analytics.byQuestion[a.questionId]?.rawCoverage ?? 1;
      const qb = analytics.byQuestion[b.questionId]?.rawCoverage ?? 1;
      if (qa !== qb) return qa - qb;
      return (partyById(a.partyId)?.name_ru || '').localeCompare(partyById(b.partyId)?.name_ru || '', 'ru');
    });
    $('quality-gaps').innerHTML = gapOrder.length ? `<p class="hint">Всего ${gapOrder.length}. Сначала показаны вопросы с самым низким общим покрытием.</p><div class="gap-list">${gapOrder.map((gap) => `<div><strong>${esc(partyById(gap.partyId)?.name_ru || gap.partyId)}</strong><span>${esc(questionById(gap.questionId)?.text_ru || gap.questionId)}</span></div>`).join('')}</div>` : '<p>Пробелов нет.</p>';

    const positionMap = new Map(data.positions.map((p) => [`${p.party}::${p.question}`, p]));
    const heatQuestions = enabledQuestions();
    $('quality-heatmap').innerHTML = `<table class="quality-heatmap-table"><thead><tr><th class="heat-party-head">Партия</th>${heatQuestions.map((q,i) => `<th title="${esc(q.text_ru)}">Q${i+1}</th>`).join('')}</tr></thead><tbody>
      ${activeParties().map((party) => `<tr><th>${esc(party.name_ru)}</th>${heatQuestions.map((q) => {
        const pos = positionMap.get(`${party.id}::${q.id}`);
        const effective = Core.effectivePositionConfidence(pos);
        const tier = effective <= 0 ? 'missing' : effective >= .85 ? 'high' : effective >= .65 ? 'mid' : 'low';
        const label = effective <= 0 ? '?' : Math.round(effective * 100);
        return `<td><button type="button" class="heat-cell heat-${tier}" data-party="${esc(party.id)}" data-question="${esc(q.id)}" title="${esc(party.name_ru)} · ${esc(q.text_ru)} · effective confidence ${label}${effective <= 0 ? '' : '%'}">${label}</button></td>`;
      }).join('')}</tr>`).join('')}
    </tbody></table>`;
    $('quality-heatmap').querySelectorAll('.heat-cell').forEach((button) => button.addEventListener('click', () => renderQualityCellDetail(button.dataset.party, button.dataset.question)));
  }

  function renderQualityCellDetail(partyId, questionId) {
    const party = partyById(partyId);
    const question = questionById(questionId);
    const position = data.positions.find((p) => p.party === partyId && p.question === questionId) || null;
    const baselinePosition = BASELINE_DATA?.positions?.find((p) => p.party === partyId && p.question === questionId) || null;
    const effective = Core.effectivePositionConfidence(position);
    const evidence = (position?.evidence || []).map((id) => sourceById(id)).filter(Boolean);
    const evidenceHtml = evidence.length ? `<ul>${evidence.map((src) => `<li><a href="${esc(src.url)}" target="_blank" rel="noopener"><strong>${esc(src.title || src.id)}</strong></a>${src.date ? ` · ${esc(src.date)}` : ''}<br><span class="hint">${esc(src.source_type || '')}${src.notes_ru ? ` — ${esc(src.notes_ru)}` : ''}</span></li>`).join('')}</ul>` : '<p class="hint">Нет evidence.</p>';
    const baselineText = !baselinePosition || baselinePosition.status === 'insufficient_data'
      ? 'insufficient_data'
      : `${VALUE_LABELS.get(String(baselinePosition.value)) || baselinePosition.value}; conf ${Math.round((baselinePosition.confidence || 0) * 100)}%; ${baselinePosition.entity_scope}`;
    $('quality-cell-detail').innerHTML = `<h4>${esc(party?.name_ru || partyId)} · ${esc(question?.text_ru || questionId)}</h4>
      <div class="quality-detail-grid"><div><span class="hint">Сейчас</span><br>${positionDisplay(position)}${effective > 0 ? `<br><span class="hint">effective confidence: ${pct(effective)}</span>` : ''}</div><div><span class="hint">Baseline</span><br>${esc(baselineText)}</div></div>
      <h4>Источники</h4>${evidenceHtml}`;
  }

  function renderInspection() {
    const answeredQs = enabledQuestions().filter((q) => Object.prototype.hasOwnProperty.call(answers, q.id) && answers[q.id] !== 'skip');
    $('inspection-content').innerHTML = answeredQs.map((q) => {
      const cells = activeParties().map((party) => {
        const position = data.positions.find((p) => p.party === party.id && p.question === q.id);
        return `<div class="position-cell"><strong>${esc(party.name_ru)}</strong><br>${positionDisplay(position)}</div>`;
      }).join('');
      return `<details class="inspection-question"><summary>${esc(q.text_ru)} — ваш ответ: ${esc(VALUE_LABELS.get(String(answers[q.id])))}</summary><div class="position-grid">${cells}</div></details>`;
    }).join('') || '<p class="hint">Нет отвеченных вопросов.</p>';
  }

  function refreshForDataChange(message) {
    latestResults = null;
    $('map-x-axis').innerHTML = '';
    $('map-y-axis').innerHTML = '';
    $('results').classList.add('hidden');
    $('data-inspection').classList.add('hidden');
    showValidation();
    renderQuestions();
    renderDataQuality();
    renderDataSourceStatus();
    $('data-update-status').textContent = message;
  }

  async function importSelectedData() {
    const files = [...$('data-files').files];
    const byName = new Map(files.map((f) => [f.name, f]));
    if (!files.length) {
      $('data-update-status').textContent = 'Сначала выберите JSON-файлы.';
      return;
    }
    try {
      let next;
      const allRequired = Loader.FILES.every((name) => byName.has(name));
      const researchPair = byName.has('positions.json') && byName.has('sources.json');
      if (allRequired) {
        next = {};
        for (const filename of Loader.FILES) next[filename.replace('.json','')] = JSON.parse(await byName.get(filename).text());
      } else if (researchPair && files.length === 2) {
        next = {
          ...data,
          positions: JSON.parse(await byName.get('positions.json').text()),
          sources: JSON.parse(await byName.get('sources.json').text())
        };
      } else {
        $('data-update-status').textContent = 'Выберите либо все пять canonical JSON, либо только positions.json + sources.json.';
        return;
      }
      const errors = Core.validateDataset(next);
      if (errors.length) {
        const exportHint = errors.some((e) => e.includes('positions must be an array') || e.includes('sources must be an array'))
          ? ' Похоже, выбран экспорт сессии Deep Research, а не сами итоговые файлы.' : '';
        $('data-update-status').textContent = `Набор отклонён: ${errors.slice(0,4).join('; ')}${errors.length > 4 ? '…' : ''}${exportHint}`;
        return;
      }
      data = next;
      dataSource = 'imported';
      dataSourceWarning = '';
      refreshForDataChange(`Применён пользовательский набор: ${next.parties.length} партий, ${next.questions.length} вопросов.`);
    } catch (error) {
      $('data-update-status').textContent = `Ошибка чтения JSON: ${error.message}`;
    }
  }

  function restoreBundledData() {
    data = DEFAULT_DATA;
    dataSource = 'bundle';
    dataSourceWarning = '';
    refreshForDataChange('Восстановлены встроенные данные прототипа.');
  }

  function exportActiveData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kalpi-active-dataset.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    $('data-update-status').textContent = 'Активный набор экспортирован одним JSON-файлом.';
  }

  $('calculate-results').addEventListener('click', renderResults);
  $('reset-answers').addEventListener('click', () => {
    if (!confirm('Сбросить все ответы?')) return;
    answers = {}; saveAnswers(); renderQuestions();
    $('results').classList.add('hidden'); $('data-inspection').classList.add('hidden');
  });
  $('apply-data').addEventListener('click', importSelectedData);
  $('restore-data').addEventListener('click', restoreBundledData);
  $('export-data').addEventListener('click', exportActiveData);
  $('toggle-inspection').addEventListener('click', () => {
    const content = $('inspection-content');
    const opening = content.classList.contains('hidden');
    content.classList.toggle('hidden', !opening);
    $('toggle-inspection').textContent = opening ? 'Скрыть данные' : 'Показать данные';
  });

  async function init() {
    await loadInitialDataset();
    $('data-update-status').textContent = dataSource === 'json-files'
      ? 'Используются актуальные файлы из папки data.'
      : 'См. строку «Активные данные» выше.';
    showValidation();
    renderQuestions();
    renderDataQuality();
    renderDataSourceStatus();
  }

  init();
})();
