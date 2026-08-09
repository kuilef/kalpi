# Visible Question Explanations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render full, neutral, localized explanations beneath every questionnaire question.

**Architecture:** Store Russian explanations beside the existing localized question text in `data/questions.json`; validate them with the canonical data; render them for the Russian locale in `app.js`; regenerate the browser bundle. English and Hebrew translations deliberately remain a later task.

**Tech Stack:** JSON, vanilla JavaScript, CSS, Node.js built-in test runner, Python 3.

## Global Constraints

- Do not change question IDs, ordering, answer values, axis weights, positions or scoring.
- Require `explanation_ru` on every question; do not add English or Hebrew translations in this editorial pass.
- Show the whole explanation below the question and above the answers; do not use hover or a collapsed disclosure.

---

### Task 1: Require and render explanations

**Files:**
- Modify: `tests/data.test.js`
- Modify: `tests/ui-structure.test.js`
- Modify: `data/questions.json`
- Modify: `app.js`
- Modify: `styles.css`

- [ ] Add a failing data test which requires a non-empty `explanation_ru` on every question.
- [ ] Add a failing structure test for `.question-explanation` between the question text and answer controls.
- [ ] Run the focused Node tests and confirm the failures are caused by absent explanations and markup.
- [ ] Add neutral complete explanations for each question in Russian.
- [ ] Render the Russian explanation and add an ordinary subordinate text style without truncation; render no Russian fallback for English or Hebrew.
- [ ] Run focused tests and confirm they pass.

### Task 2: Regenerate and verify the browser data

**Files:**
- Modify: `data/default-data.js` (generated)

- [ ] Regenerate the browser bundle from canonical JSON.
- [ ] Run all Node tests, `python tests/bundle.test.py`, and `python tools/build_data_bundle.py --check`.
