# CSP-Compliant Progress Bars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Remove runtime inline-style usage so the strict Cloudflare CSP can render all progress indicators without console violations, while preserving questionnaire state, importance weighting, ranking, and responsive behavior.

**Architecture:** Replace the two dynamic CSS custom-property paths with native HTML progress elements. The questionnaire progress value will be updated through the DOM value property, and family scores will be rendered as bounded value attributes; both are data properties, not inline CSS. Keep styles.css as the only styling mechanism and leave CSP unchanged.

**Tech Stack:** Static HTML, vanilla JavaScript, external CSS, Node.js built-in test runner, Cloudflare Pages headers.

## Global Constraints

- Do not add unsafe-inline to cloudflare/_headers; keep style-src 'self'.
- Do not change scoring, priorityQuestionIds, localStorage state, canonical JSON data, or Russian UI copy.
- Remove both runtime paths: results-ui.js must not emit style="...", and app.js must not call .style.setProperty() for progress.
- Preserve the existing progress ranges: questionnaire progress is 0..1; each family score is clamped to 0..1.
- Preserve the current result text, accessible labels, mobile layout, and reduced-motion behavior.
- Validate through the documented HTTP runtime, not file://.

## File Map

- index.html — change the questionnaire progress host to a determinate progress element.
- app.js:73-78 — assign questionnaire progress through HTMLProgressElement.value.
- results-ui.js:12-14,41-50 — normalize family scores and emit progress markup instead of an inline CSS custom property.
- styles.css:45,50-51,118-119 — style both progress elements using external CSS.
- tests/results-ui.test.js:26-61 — assert CSP-safe family markup.
- tests/ui-structure.test.js:8-29,148-154 — assert the progress element and value-based update.

---

### Task 1: Add failing CSP-safety and progress-contract tests

**Files:**
- Modify: tests/results-ui.test.js:26-61
- Modify: tests/ui-structure.test.js:8-29,148-154

**Interfaces:**
- Results.renderLiveResult(...) returns a family progress element with max="1" and a numeric value, with no inline style attribute.
- index.html contains id="progress-bar" as a progress element with max="1".
- app.js updates progress-bar.value, not progress-bar.style.setProperty(...).

- [ ] Step 1: Update the live-result test.

Keep the existing score and evidence assertions, then require:

```js
assert.match(html, /<progress class="family-progress" max="1" value="0\.8">/);
assert.doesNotMatch(html, /\sstyle=/);
assert.doesNotMatch(html, /--family-score/);
```

Replace the old assertion that allows --family-score:0.8.

- [ ] Step 2: Update the page-structure test.

Require the questionnaire host to contain:

```js
assert.match(html, /<progress id="progress-bar" max="1" value="0"><\/progress>/);
```

Keep the surrounding progress text and questionnaire assertions unchanged.

- [ ] Step 3: Replace the old progress implementation assertions.

Rename the test to state that progress uses a native value without inline styles, then require:

```js
assert.match(app, /const progressBar = \$\('progress-bar'\);/);
assert.match(app, /progressBar\.value = total \? ordinal \/ total : 0;/);
assert.doesNotMatch(app, /progress-bar'\)\.style\.setProperty/);
assert.doesNotMatch(app, /progress-bar'\)\.style\./);
```

Also assert that styles.css contains selectors for .family-progress and the questionnaire progress element.

- [ ] Step 4: Run the focused tests and confirm they fail against the old implementation.

Run:

```powershell
& "C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests/results-ui.test.js tests/ui-structure.test.js
```

Expected result: failures identify the old inline family style, the old div progress host, and the old style.setProperty implementation.

---

### Task 2: Replace runtime inline-style paths with native progress values

**Files:**
- Modify: index.html:23
- Modify: app.js:73-78
- Modify: results-ui.js:12-14,41-50

**Interfaces:**
- updateProgress() computes the same ordinal / total ratio and writes it to progressBar.value.
- renderFamily() emits determinate progress markup with max="1" and a bounded numeric value.
- renderLiveResult() keeps all existing score text, evidence details, source links, ranking, and importance-derived values unchanged.

- [ ] Step 1: Change the questionnaire progress markup.

Replace the current generic progress child with:

```html
<div class="progress-track" aria-hidden="true"><progress id="progress-bar" max="1" value="0"></progress></div>
```

- [ ] Step 2: Update updateProgress() without changing its ratio.

Keep the current total, ordinal, and text calculations, then use:

```js
const progressBar = $('progress-bar');
progressBar.value = total ? ordinal / total : 0;
```

Do not set style, cssText, or a CSS custom property from JavaScript.

- [ ] Step 3: Add a bounded score helper in results-ui.js.

Keep pct() for display text and add:

```js
function ratio(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
}
```

This protects the renderer from invalid values without changing scoring.

- [ ] Step 4: Render family scores as progress values.

In renderFamily(), calculate score = ratio(family.score) and replace the inline-styled span with:

```js
<progress class="family-progress" max="1" value="${score}">${pct(score)}</progress>
```

Keep the surrounding family-bar, aria-label, heading score, coverage text, and evidence unchanged.

- [ ] Step 5: Run the focused tests and confirm they pass.

Run the Task 1 Node command. Expected result: all results-ui and ui-structure tests pass.

---

### Task 3: Recreate the existing visual treatment in external CSS

**Files:**
- Modify: styles.css:45,50-51,118-119

**Interfaces:**
- The questionnaire track remains 5px high with the existing track background and accent fill.
- Family bars remain 9px high with the existing family-track background and accent fill.
- No CSS rule requires a runtime custom property or inline style attribute.

- [ ] Step 1: Style the questionnaire progress element.

Replace the .progress-track > div rule with external CSS for .progress-track > progress, including display:block, width:100%, height:100%, border:0, and appearance:none. Add Chromium and Firefox progress pseudo-element selectors so the track uses var(--track) and the filled value uses var(--accent).

Keep reduced-motion behavior covered by the existing prefers-reduced-motion rule.

- [ ] Step 2: Style .family-progress consistently.

Replace .family-bar span with .family-progress and corresponding Chromium and Firefox pseudo-element rules. Keep .family-bar dimensions, margin, and colors unchanged.

- [ ] Step 3: Check mobile behavior.

Verify that the existing max-width:620px layout does not introduce overflow or an unwanted native minimum size. Add only a targeted CSS adjustment if needed.

- [ ] Step 4: Run focused tests and whitespace validation.

```powershell
& "C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests/results-ui.test.js tests/ui-structure.test.js
git diff --check
```

Expected result: tests pass and git diff --check reports no whitespace errors.

---

### Task 4: Verify the artifact and browser behavior under CSP

**Files:**
- Verify: cloudflare/_headers
- Verify: generated Cloudflare artifact from tools/build_cloudflare_site.js
- Verify: index.html, app.js, results-ui.js, styles.css

**Interfaces:**
- The strict header remains style-src 'self'.
- The public artifact contains the updated runtime and no inline style path.
- Clicking the importance control still updates state, persists it, and rerenders results.

- [ ] Step 1: Run the complete JavaScript suite.

```powershell
& "C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test tests/*.test.js
```

Expected result: all Node tests pass.

- [ ] Step 2: Run the documented data and release checks.

```powershell
python tests/bundle.test.py
python tests/sync_position_matrix.test.py
& "C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" tools/release-gate-report.js --check
```

Expected result: no data or release-gate regressions and no canonical JSON changes.

- [ ] Step 3: Build an isolated Cloudflare artifact.

```powershell
& "C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" tools/build_cloudflare_site.js --output-dir "$env:TEMP\kalpi-csp-check"
```

Inspect the copied index.html, app.js, and results-ui.js. Confirm the artifact has the new progress markup, no style=" runtime markup, and no progress style.setProperty usage. Confirm _headers still contains style-src 'self'.

- [ ] Step 4: Perform an HTTP browser smoke test.

Using the project HTTP server or the Cloudflare preview, verify at desktop and narrow-mobile widths:

1. The top progress indicator changes after answering a question.
2. The importance control changes from ☆ Важно to ★ Важно, survives reload, and does not alter the answer.
3. Results render with visible family bars and unchanged score and coverage text.
4. The browser console contains no CSP inline-style violations after answering and toggling importance.
5. The unrelated extension warning is tested separately in a clean or incognito window and is not attributed to Kalpi.

- [ ] Step 5: Review the final diff.

```powershell
git diff --stat
git diff --check
git status --short
```

Confirm that only the planned HTML, JavaScript, CSS, and test files changed. Do not commit generated dist output unless the repository workflow explicitly requires it.

## Self-Review Checklist

- CSP remains strict and unchanged.
- Both known runtime inline-style paths are removed.
- Importance state and scoring code are untouched.
- Tests no longer require CSS custom properties emitted through style="...".
- Native progress values remain bounded and readable at desktop and mobile widths.
- Browser verification checks the actual CSP-bearing artifact or preview, not only the local server without security headers.
