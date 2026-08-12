# Questionnaire Response Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present the five questionnaire responses as labelled keyboard-addressable segments and disclose numeric shortcuts.

**Architecture:** Keep all six existing radio inputs and `data-shortcut` values. Update only the questionnaire renderer markup and its CSS; tests prove the visible response contract and the existing shortcut handler remains the integration seam.

**Tech Stack:** Vanilla JavaScript, CSS Grid, Node.js built-in test runner.

## Global Constraints

- Preserve values `-1`, `-0.5`, `0`, `0.5`, `1`, plus the distinct unknown `null` value.
- Preserve keys `1–5` for scale choices and `0` for unknown; do not change auto-advance, scoring, or data.
- Retain the warm-paper, ink, and rust editorial system, visible focus, and a usable 390px viewport.

---

### Task 1: Add failing tests for the new visible contract

**Files:**
- Modify: `tests/questionnaire-ui.test.js:15-28`
- Modify: `tests/ui-structure.test.js:63-86`

**Interfaces:**
- Consumes: `UI.renderQuestion({ question, index, total, answer })`.
- Produces: regression coverage for response keys, intensity labels, keyboard hint, and segment styles.

- [ ] **Step 1: Add this renderer test**

```js
test('question UI exposes labelled response keys and the keyboard instruction', () => {
  const html = UI.renderQuestion({ question, index: 0, total: 23, answer: undefined });
  assert.match(html, /class="choice-key" aria-hidden="true">1<\/span>/);
  assert.match(html, /class="choice-intensity">Полностью<\/span>/);
  assert.match(html, /class="choice-intensity">Посередине<\/span>/);
  assert.match(html, /Можно отвечать клавишами 1–5; 0 — «Не знаю»\./);
  assert.doesNotMatch(html, /choice-number/);
});
```

- [ ] **Step 2: Verify red**

Run: `node --test tests/questionnaire-ui.test.js`

Expected: failure because the new classes and hint do not exist yet.

- [ ] **Step 3: Add this stylesheet test**

```js
test('stylesheet presents response choices as labelled keyboard segments', () => {
  const css = read('styles.css');
  assert.match(css, /\.choice-key \{[^}]*font:/);
  assert.match(css, /\.choice-intensity \{[^}]*font:/);
  assert.match(css, /\.keyboard-hint \{[^}]*font:/);
  assert.doesNotMatch(css, /\.scale-choice label span\[aria-hidden\] \{[^}]*border-radius:50%/);
});
```

- [ ] **Step 4: Verify red**

Run: `node --test tests/ui-structure.test.js`

Expected: failure because the new class rules do not exist and the radio-circle rule remains.

### Task 2: Render and style response segments

**Files:**
- Modify: `questionnaire-ui.js:8-40`
- Modify: `styles.css:56-66`
- Test: `tests/questionnaire-ui.test.js`
- Test: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: `SCALE` and `app.js` lookup `input[data-shortcut]`.
- Produces: `.choice-key`, `.choice-intensity`, `.keyboard-hint`, and unchanged input names, values, and shortcut attributes.

- [ ] **Step 1: Add per-option intensity strings**

```js
const SCALE = [
  { value: -1, label: 'Полностью ближе к левому варианту', intensity: 'Полностью' },
  { value: -0.5, label: 'Скорее ближе к левому варианту', intensity: 'Скорее' },
  { value: 0, label: 'Промежуточная позиция между двумя вариантами', intensity: 'Посередине' },
  { value: 0.5, label: 'Скорее ближе к правому варианту', intensity: 'Скорее' },
  { value: 1, label: 'Полностью ближе к правому варианту', intensity: 'Полностью' },
];
```

- [ ] **Step 2: Render each option with visible key and intensity, then add the hint**

```js
<span class="choice-key" aria-hidden="true">${number}</span>
<span class="choice-intensity">${escapeHtml(intensity)}</span>
<p class="keyboard-hint">Можно отвечать клавишами 1–5; 0 — «Не знаю».</p>
```

- [ ] **Step 3: Replace the circle-only styling with this segment styling**

```css
.scale-choice label { display:grid; grid-template-rows:auto auto; place-content:center; gap:5px; text-align:center; }
.choice-key { display:grid; place-items:center; width:24px; height:24px; margin-inline:auto; border:1px solid currentColor; font:700 .78rem/1 system-ui,sans-serif; }
.choice-intensity { font:600 clamp(.67rem, 1.7vw, .78rem)/1.15 system-ui,sans-serif; }
.keyboard-hint { margin:10px 0 0; color:var(--muted); font:.78rem/1.45 system-ui,sans-serif; }
.scale-choice input:checked + label .choice-key { color:var(--ink); background:var(--surface); }
```

- [ ] **Step 4: Verify green**

Run: `node --test tests/questionnaire-ui.test.js tests/ui-structure.test.js`

Expected: all focused renderer and structure tests pass.

- [ ] **Step 5: Check browser behaviour**

Run: `python tools/serve.py --no-browser`

Expected: at 390px, the scale and its hint fit with no page-level horizontal scroll; mouse and keys `0–5` select the matching response; the last response still opens results.

- [ ] **Step 6: Commit only these files**

Run: `git add questionnaire-ui.js styles.css tests/questionnaire-ui.test.js tests/ui-structure.test.js; git commit -m "feat: clarify questionnaire response controls"`

### Task 3: Run the project regression checks

**Files:**
- Modify: `docs/manual-browser-check.md` only if the browser check yields a material new observation.

**Interfaces:**
- Consumes: completed response-control rendering and styles.
- Produces: fresh evidence that UI work does not affect data bundle or release gate.

- [ ] **Step 1: Run JavaScript tests**

Run: `node --test tests/*.test.js`

Expected: exit code 0 and no failed tests.

- [ ] **Step 2: Run bundle and gate checks**

Run: `python tests/bundle.test.py; python tools/build_data_bundle.py --check; node tools/release-gate-report.js --check`

Expected: each command exits 0 and no generated data bundle changes.

- [ ] **Step 3: Commit browser-check documentation only if it changed**

Run: `git add docs/manual-browser-check.md; git commit -m "docs: record questionnaire control check"`
