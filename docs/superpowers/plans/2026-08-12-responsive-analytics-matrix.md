# Responsive Analytics Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the analytics heatmap fit desktop and mobile contexts while preserving clickable cells and the existing evidence detail panel.

**Architecture:** Keep `renderMatrix` as the single data-to-markup boundary. It will render a compact desktop table (`party × question`) and a mobile table (`question × party`) inside one host; CSS chooses the orientation at the existing 620px breakpoint. Both tables use the same `data-cell-key`, so the existing click binding continues to resolve the same research cell and render the same detail panel.

**Tech Stack:** Vanilla JavaScript, semantic HTML tables, CSS media queries, Node built-in test runner.

## Global Constraints

- Do not change scoring, data, statuses, evidence, or cell detail semantics.
- Preserve keyboard activation and accessible button labels for every heatmap cell.
- Keep the restrained editorial palette and avoid page-level horizontal overflow.
- Keep existing unrelated working-tree changes untouched.

---

### Task 1: Add renderer and stylesheet regression coverage

**Files:**
- Modify: `tests/analytics-page.test.js`
- Modify: `tests/ui-structure.test.js`

**Interfaces:**
- `Page.renderMatrix(cells, parties, questions)` must return both orientation hooks and preserve each cell's `data-cell-key`.
- `styles.css` must define compact heatmap cells and a mobile orientation switch.

- [x] **Step 1: Write failing tests** for desktop/mobile matrix hooks, cell keys, compact cell styling, and the mobile media rule.
- [x] **Step 2: Run `node --test tests/analytics-page.test.js tests/ui-structure.test.js` and verify the new assertions fail because the hooks/styles do not exist.

### Task 2: Implement the responsive heatmap

**Files:**
- Modify: `analytics-page.js`
- Modify: `styles.css`

**Interfaces:**
- Desktop table keeps the current `party × question` orientation.
- Mobile table uses `question × party` orientation and the same cell key format.

- [x] **Step 1: Update `renderMatrix` to emit named desktop and mobile table wrappers without changing cell data or labels.
- [x] **Step 2: Reduce desktop table cell padding and button footprint while retaining a touch-safe 44px target on mobile.
- [x] **Step 3: Add media rules that hide the desktop table and show the transposed mobile table at widths up to 620px.
- [x] **Step 4: Run the focused tests and verify they pass.

### Task 3: Verify behavior and layout contract

**Files:**
- No additional files.

- [x] **Step 1: Run the full JavaScript test suite with `node --test tests/*.test.js`.
- [x] **Step 2: Run `git diff --check`.
- [x] **Step 3: Inspect the final diff and confirm only the planned analytics renderer, stylesheet, tests, and plan file changed.
