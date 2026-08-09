# Kalpi Questionnaire Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone browser prototype that scores questionnaire answers against evidence-backed party positions, computes five political axes, and renders transparent recommendations plus a selectable 2D party map.

**Architecture:** Keep political evidence in canonical JSON files and keep scoring/axis logic in a pure JavaScript core module testable under Node. A generated browser data bundle allows `index.html` to run directly from `file://`; editing canonical JSON requires only regenerating the bundle, never changing application logic. The UI uses plain HTML/CSS/JavaScript and Canvas, with no runtime dependencies or backend.

**Tech Stack:** HTML5, CSS, vanilla JavaScript (UMD/CommonJS-compatible core), Node.js built-in test runner, Python 3 standard library for data-bundle generation.

## Global Constraints

- Five axes only: economy/redistribution; security/territories; religion/state; civil/social rights; institutions/rule of law.
- Missing party positions remain `insufficient_data` and must never be silently converted to neutral `0`.
- Recommendation scoring uses conservative shrinkage: `final_score = agreement * coverage + 0.5 * (1 - coverage)`.
- Party coordinates are derived from question-to-axis mappings; no manual party coordinates.
- The prototype must run by opening `index.html` locally without a backend.
- Political data and provenance must remain externally editable; JavaScript scoring logic must not require edits when research data changes.
- Contextual `COMPONENT_PARTY`/`LEADER` evidence must remain distinguishable from current-party/current-list evidence.

---

### Task 1: Pure scoring and axis core

**Files:**
- Create: `core.js`
- Create: `tests/core.test.js`

**Interfaces:**
- Produces: `KalpiCore.computeAgreement(userValue, partyValue) -> number`
- Produces: `KalpiCore.scoreParty(args) -> {agreement, coverage, finalScore, knownCount, unknownCount, details}`
- Produces: `KalpiCore.computeAxisCoordinate(args) -> {status, value, coverage}`
- Produces: `KalpiCore.computeUserAxes(args) -> object`
- Produces: `KalpiCore.computePartyAxes(args) -> object`
- Produces: `KalpiCore.validateDataset(data) -> string[]`

- [ ] **Step 1: Write failing scoring tests** covering exact match, opposite answers, insufficient-data exclusion, coverage shrinkage, skipped answers, and neutral user answer.
- [ ] **Step 2: Run `node --test tests/core.test.js` and verify the tests fail because `core.js`/exports are absent.**
- [ ] **Step 3: Implement the minimal scoring functions in `core.js`.**
- [ ] **Step 4: Run the test suite and verify scoring tests pass.**
- [ ] **Step 5: Write failing axis tests** for insufficient axis coverage and a newly added position changing a derived coordinate without logic changes.
- [ ] **Step 6: Run tests and verify the new tests fail for missing axis behavior.**
- [ ] **Step 7: Implement axis derivation and configurable minimum axis coverage.**
- [ ] **Step 8: Run tests and verify all axis/scoring tests pass.**
- [ ] **Step 9: Write failing validation tests** for broken IDs, invalid values/confidence, and evidence references.
- [ ] **Step 10: Implement dataset validation and rerun all tests.**

### Task 2: Canonical political data and browser bundle

**Files:**
- Create: `data/axes.json`
- Create: `data/parties.json`
- Create: `data/questions.json`
- Create: `data/positions.json`
- Create: `data/sources.json`
- Create: `tools/build_data_bundle.py`
- Create: `data/default-data.js` (generated)
- Create: `tests/data.test.js`

**Interfaces:**
- Consumes: schemas implied by the approved design and `KalpiCore.validateDataset`.
- Produces: `window.KALPI_DATA = {axes, parties, questions, positions, sources}` in `data/default-data.js`.

- [ ] **Step 1: Write failing data tests** requiring 12 active parties, five axes, at least 25 enabled questions, resolvable party/question/source references, and explicit `insufficient_data` records where positions are unknown.
- [ ] **Step 2: Run `node --test tests/data.test.js` and verify failure because JSON data is absent.**
- [ ] **Step 3: Create the five-axis metadata and party registry.**
- [ ] **Step 4: Add 25–30 diagnostic questions with explicit axis weights.**
- [ ] **Step 5: Add conservative position records based only on previously researched program/ideology/vote evidence; use `insufficient_data` rather than inference.**
- [ ] **Step 6: Add source records with provenance type, URL, date/context, and Russian notes.**
- [ ] **Step 7: Implement `tools/build_data_bundle.py` using only Python stdlib and generate `data/default-data.js`.**
- [ ] **Step 8: Run data tests and core validation; fix any invalid references without inventing political positions.**

### Task 3: Questionnaire and transparent recommendation UI

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `app.js`
- Create: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: `window.KALPI_DATA` and `window.KalpiCore`.
- Produces: questionnaire state in browser memory/localStorage, ranked party result objects, explanation groups.

- [ ] **Step 1: Write failing structural tests** that verify the page contains questionnaire, result, data-inspection, and data-update sections and loads `core.js`, `data/default-data.js`, and `app.js` in that order.
- [ ] **Step 2: Run structural tests and verify failure because UI files do not exist.**
- [ ] **Step 3: Build accessible questionnaire markup and five-point answer controls plus skip.**
- [ ] **Step 4: Implement state handling, progress, answer persistence, reset, and result calculation using `KalpiCore` only.**
- [ ] **Step 5: Render top recommendation, agreement, coverage, unknown count, ranking, and match/disagreement/unknown explanation groups.**
- [ ] **Step 6: Render the transparent per-question party evidence table with source links and contextual-scope badges.**
- [ ] **Step 7: Run structural and core tests.**

### Task 4: Five-axis profile and selectable 2D map

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Consumes: `KalpiCore.computeUserAxes`, `KalpiCore.computePartyAxes`.
- Produces: selectable X/Y axis controls, Canvas scatter plot, omitted-party list, five-axis comparison table.

- [ ] **Step 1: Add failing structural tests** for X/Y axis selectors, map canvas, omitted-party list, and five-axis profile table.
- [ ] **Step 2: Run tests and verify failure.**
- [ ] **Step 3: Add the selectors and Canvas map with user marker, party labels, axis poles, and omission of parties with insufficient data on either selected axis.**
- [ ] **Step 4: Add five-axis user/party comparison table rendering `?` for insufficient coordinates.**
- [ ] **Step 5: Run all tests.**

### Task 5: Research-data replacement workflow

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Create: `README.md`
- Create: `tests/bundle.test.py`

**Interfaces:**
- Produces: local JSON-file import UI that validates a replacement dataset and stores it in localStorage.
- Produces: documented CLI workflow `python tools/build_data_bundle.py` for researchers editing canonical JSON files directly.

- [ ] **Step 1: Write failing Python bundle test** asserting generated bundle data equals canonical JSON contents.
- [ ] **Step 2: Run the test and verify failure before the final generator behavior is complete.**
- [ ] **Step 3: Complete deterministic bundle generation and test it.**
- [ ] **Step 4: Add browser UI for importing updated `axes.json`, `parties.json`, `questions.json`, `positions.json`, and `sources.json`; validate before activation and persist valid imported data.**
- [ ] **Step 5: Add controls to restore bundled default data and export the currently active merged dataset as JSON.**
- [ ] **Step 6: Document both update workflows and the scoring/coverage semantics in `README.md`.**
- [ ] **Step 7: Run Node tests and Python bundle tests.**

### Task 6: Final verification and distributable package

**Files:**
- Create: `kalpi-prototype.zip` outside the project directory.

**Interfaces:**
- Produces: verified standalone artifact and source/data files.

- [ ] **Step 1: Run `node --test tests/*.test.js`.**
- [ ] **Step 2: Run `python -m unittest tests/bundle.test.py`.**
- [ ] **Step 3: Run `python tools/build_data_bundle.py --check` and ensure the committed bundle is current.**
- [ ] **Step 4: Open/inspect the static page using an available local browser/runtime if installed; otherwise perform DOM/static smoke checks and state the limitation.**
- [ ] **Step 5: Search generated project files for placeholders such as `TODO`/`TBD` and remove unintended ones.**
- [ ] **Step 6: Package the project as `/mnt/data/kalpi-prototype.zip`.**
