# Direct Results and Branch Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show results immediately after the final answer and rename the historical `master` branch to `simple` while promoting the current prototype branch to `master`.

**Architecture:** The questionnaire controller already calculates results through `renderResults()`. The final-answer path will mark the questionnaire complete and call that renderer directly, so no scoring or data behaviour changes. Git branch pointers will be renamed only after the current workspace is committed; `simple` will keep the old `master` commit and its old README.

**Tech Stack:** Static HTML, vanilla JavaScript, Node test runner, Python data-bundle checks, Git.

## Global Constraints

- Keep Russian UI and existing result/recommendation behaviour unchanged.
- Do not delete history or overwrite a branch pointer.
- `simple` must point to the former `master` commit; `master` must point to the current prototype commit.
- Verify the README content through both final branch names.

---

### Task 1: Skip the answer-review screen

**Files:**

- Modify: `app.js:70-210`
- Modify: `index.html:34-42`
- Modify: `tests/ui-structure.test.js:8-52`
- Modify: `README.md`

**Interfaces:**

- Consumes: `State.markCompleted(state)` and `renderResults()`.
- Produces: The final answer selection opens `#results` directly; no `#review` controls exist.

- [ ] **Step 1: Write the failing structure tests**

```js
assert.doesNotMatch(html, /id="review"/);
assert.doesNotMatch(app, /function renderReview\(/);
assert.match(app, /if \(index === questions\(\)\.length - 1\) \{\s*State\.markCompleted\(state\);\s*saveState\(\);\s*renderResults\(\);/);
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `node --test tests/ui-structure.test.js`

Expected: FAIL because the review section and `renderReview()` still exist.

- [ ] **Step 3: Write the minimal implementation**

```js
if (index === questions().length - 1) {
  State.markCompleted(state);
  saveState();
  renderResults();
  return;
}
```

Remove the review section, the review renderer and review button bindings. Change the final navigation label from `Проверить ответы` to `Показать результат`, and update the README behaviour list.

- [ ] **Step 4: Run focused and complete verification**

Run: `node --test tests/*.test.js`, `python tests/bundle.test.py`, and `python tools/build_data_bundle.py --check`.

Expected: every command exits with code 0.

### Task 2: Preserve both lines of development under clear branch names

**Files:**

- No source changes beyond Task 1; Git refs only.

**Interfaces:**

- Consumes: current branch `codex/family-questionnaire-v1`, former `master` branch.
- Produces: `master` at the current prototype commit and `simple` at the former `master` commit.

- [ ] **Step 1: Commit the verified current prototype**

```powershell
git add -A
git commit -m "feat: launch prototype live ranking"
```

- [ ] **Step 2: Rename the historical pointer without checking it out**

```powershell
git branch -m master simple
git branch -m master
```

- [ ] **Step 3: Verify refs and README provenance**

```powershell
git branch -vv
git show simple:README.md
git show master:README.md
git status --short
```

Expected: `simple` has the old methodology README from the former `master`; `master` is checked out at the prototype commit and has the new live-ranking README.
