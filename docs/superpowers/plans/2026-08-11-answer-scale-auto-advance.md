# Answer Scale Auto-Advance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each response control easy to read across the questionnaire width and advance to the next question immediately after choosing an answer.

**Architecture:** Keep the current JSON and scoring contracts unchanged. `questionnaire-ui.js` will render visible numeric labels for the five scale choices and the unknown choice; `app.js` will route every radio change through one shared advance function. CSS controls only the responsive full-width layout.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node built-in test runner.

## Global Constraints

- Preserve `null` as the explicit unknown answer and preserve absent answers as unanswered.
- A click or keyboard selection of `0` through `5` advances immediately; the last answer opens review.
- Do not change questionnaire data, scoring, families, or the `data_not_ready` gate.

---

### Task 1: Render numbered, full-width response controls

**Files:**
- Modify: `questionnaire-ui.js`
- Modify: `styles.css`
- Test: `tests/questionnaire-ui.test.js`

- [ ] **Step 1: Write the failing test**

```js
assert.match(html, /class="choice-number">1<\/span>/);
assert.match(html, /class="unknown-number">0<\/span>/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/questionnaire-ui.test.js`

- [ ] **Step 3: Write minimal implementation**

Render `1`–`5` beside the scale dots and `0` inside the unknown label. Remove the scale `max-width` and make the unknown label span the row.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/questionnaire-ui.test.js`

### Task 2: Advance after a selected response

**Files:**
- Modify: `app.js`
- Test: `tests/ui-structure.test.js`

- [ ] **Step 1: Write the failing test**

```js
assert.match(app, /function advanceAfterAnswer\(\)/);
assert.match(app, /if \(index === questions\(\)\.length - 1\) renderReview\(\)/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ui-structure.test.js`

- [ ] **Step 3: Write minimal implementation**

Save the selected value, then call `advanceAfterAnswer()` from the radio `change` handler. It selects the next question or opens review on the final question.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/ui-structure.test.js`

### Task 3: Verify the interaction

**Files:**
- No production files

- [ ] **Step 1: Run the full checks**

Run: `node --test tests/*.test.js`, `python tests/bundle.test.py`, `python tools/build_data_bundle.py --check`, and `git diff --check`.

- [ ] **Step 2: Browser-check a mouse selection, a digit-key selection, final-question review, and 390 px width.**

