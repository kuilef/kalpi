# Personal Question Importance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a respondent mark any answered question as important and give it a transparent 2x weight in ranking and coverage.

**Architecture:** `questionnaire-state.js` owns persisted priority IDs, the questionnaire UI renders the compact heading button, and `app.js` binds its interaction. `scoring.js` applies the doubled weight before family aggregation; axes remain independent.

**Tech Stack:** Browser JavaScript, Node built-in test runner, static CSS.

## Global Constraints

- Russian-first copy: `☆ Важно` and `★ Важно`.
- Unanswered questions cannot be prioritised.
- Do not alter party evidence, the five-axis map, or unrelated user changes.
- Do not commit this experiment.

---

### Task 1: Persist and score priorities

**Files:**
- Modify: `questionnaire-state.js`, `scoring.js`, `data/scoring-config.json`
- Test: `tests/questionnaire-state.test.js`, `tests/scoring.test.js`, `tests/data-v2.test.js`

- [ ] Write failing tests for restoring valid priorities, removing unanswered priorities, and the hand-checked doubled influence in family scoring.
- [ ] Run the focused tests and observe the missing priority state/weight failures.
- [ ] Add normalized `priorityQuestionIds`, a toggle operation, explicit config enablement, and a per-question weight of 2 in ranking family calculations.
- [ ] Run the focused tests and observe them pass.

### Task 2: Render and bind the compact control

**Files:**
- Modify: `questionnaire-ui.js`, `app.js`, `styles.css`
- Test: `tests/questionnaire-ui.test.js`, `tests/ui-structure.test.js`

- [ ] Write failing tests for the semantic pressed button and for app wiring that persists/recalculates without navigation.
- [ ] Run the focused tests and observe feature-missing failures.
- [ ] Render the heading button, bind it only for answered questions, persist the toggle, and recalculate results without focusing or scrolling.
- [ ] Run focused tests and observe them pass.

### Task 3: Verify the experiment

**Files:**
- Modify: generated `data/default-data.js` if the checked bundle requires it

- [ ] Rebuild and freshness-check the generated bundle.
- [ ] Run the full Node suite, Python bundle tests, and `git diff --check`.
- [ ] Inspect the final diff, confirming no commit was created.
