# Data Quality Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an on-page data-quality analytics section that quantifies coverage, confidence, provenance, remaining gaps, axis support, and change versus the original pre-research dataset.

**Architecture:** Keep analytics calculations in `core.js` as pure functions. Keep the original dataset as a static `baseline-data.js` bundle, while the active dataset remains replaceable/importable. Render all analytics in the existing page from the active data and optional baseline without hard-coded political coordinates.

**Tech Stack:** Static HTML/CSS/JavaScript, Node built-in test runner, Python bundle script.

## Global Constraints

- No backend or build framework.
- `insufficient_data` is never treated as neutral.
- Party/question IDs and the five-axis model remain data-driven.
- Updated research JSON must change analytics without editing application logic.
- Baseline comparison must remain optional; current analytics still render when no baseline is available.

---

### Task 1: Pure analytics calculations

**Files:**
- Modify: `core.js`
- Modify: `tests/core.test.js`

**Interfaces:**
- Produces: `computeDatasetAnalytics({ data, baselineData, axisCoverageThreshold })`
- Produces summary, per-party, per-question, per-axis, provenance/status distributions, gaps, and baseline delta.

- [ ] Write failing tests for raw coverage, confidence, baseline delta, and axis support.
- [ ] Run tests and verify failure because `computeDatasetAnalytics` does not exist.
- [ ] Implement the pure calculation function.
- [ ] Run tests and verify pass.

### Task 2: Baseline bundle and page structure

**Files:**
- Create: `data/baseline-data.js`
- Modify: `index.html`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- Browser global: `window.KALPI_BASELINE_DATA`
- DOM section: `#data-quality`

- [ ] Write failing UI tests for analytics hosts and baseline script ordering.
- [ ] Verify tests fail.
- [ ] Add analytics markup and baseline bundle.
- [ ] Verify tests pass.

### Task 3: Analytics rendering and interaction

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `README.md`

**Interfaces:**
- Consumes `Core.computeDatasetAnalytics` and optional `window.KALPI_BASELINE_DATA`.
- Heatmap clicks render evidence/detail into `#quality-cell-detail`.

- [ ] Add a structural test ensuring analytics rendering hooks exist.
- [ ] Verify it fails.
- [ ] Render summary metrics, party/question/axis tables, provenance, gap list, and heatmap.
- [ ] Re-render analytics after imported/restored data changes.
- [ ] Document baseline behavior and updating workflow.
- [ ] Run all tests.

### Task 4: Final verification and packaging

**Files:**
- Update: `/mnt/data/kalpi-prototype.zip`

- [ ] Run Node tests.
- [ ] Run Python bundle tests.
- [ ] Run JavaScript syntax checks.
- [ ] Verify data bundle consistency.
- [ ] Rebuild ZIP and list included analytics files.
