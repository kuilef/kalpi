# Personal Priorities and Evidence Claims Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Let a respondent double the ranking impact of up to three answered questions, and make each displayed party-position evidence entry explain the conclusion and its source.

**Architecture:** core.js receives normalized personal-priority question IDs during party scoring. Ranking uses a base weight of one and multiplier of two; axis calculations retain their present importance_default behaviour. app.js persists priorities alongside answers, inserts a review step before results, and renders a party-position conclusion plus source cards from canonical JSON.

**Tech Stack:** Vanilla JavaScript, HTML5/CSS, Node.js built-in test runner, Python standard-library data-bundle generator.

## Global Constraints

- Work in the existing shared master branch; do not create a worktree.
- Keep 30 questions, the non-adaptive flow and both axis-coverage thresholds unchanged.
- A skipped or unanswered question cannot be a priority.
- Ranking base weight is exactly 1; each of at most three voter priorities has multiplier 2.
- Personal priorities affect ranking agreement and coverage only, never computeUserAxes or computePartyAxes.
- Do not add historical-confidence or time-decay logic.
- Source prose must come from existing reviewed data; do not invent a political assertion.
- Keep Arabic and full Hebrew/English translation of the new copy in the release checklist, not this implementation.

---

### Task 1: Priority-aware ranking core

**Files:**
- Modify: core.js
- Modify: tests/core.test.js

**Interfaces:**
- Produces: KalpiCore.normalizePriorityQuestionIds({ priorityQuestionIds, answers, questions, maxPriorities }) -> string[].
- Extends: KalpiCore.scoreParty({ partyId, answers, questions, positions, priorityQuestionIds }).
- Preserves: computeUserAxes and computePartyAxes signatures and output.

- [ ] **Step 1: Write failing priority-normalization and scoring tests.**

~~~
test('priority scoring counts a selected answered question twice', () => {
  const result = Core.scoreParty({
    partyId: 'p', answers: { q1: 2, q2: -2 }, questions,
    positions: [
      { party: 'p', question: 'q1', value: 2, status: 'known', confidence: 1 },
      { party: 'p', question: 'q2', value: 2, status: 'known', confidence: 1 },
    ], priorityQuestionIds: ['q2']
  });
  assert.equal(result.agreement, 1 / 3);
});

test('priority normalization ignores skipped, unknown, duplicate and fourth IDs', () => {
  assert.deepEqual(Core.normalizePriorityQuestionIds({
    priorityQuestionIds: ['q1', 'q1', 'q2', 'missing', 'q3'],
    answers: { q1: 1, q2: 'skip', q3: -1 },
    questions: [...questions, { id: 'q3', enabled: true }], maxPriorities: 1
  }), ['q1']);
});
~~~

- [ ] **Step 2: Run the focused core test file and verify these tests fail.**

Run: & 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/core.test.js

Expected: FAIL naming normalizePriorityQuestionIds or the changed weighted score.

- [ ] **Step 3: Implement the two core behaviours.**

~~~
function normalizePriorityQuestionIds({ priorityQuestionIds = [], answers, questions, maxPriorities = 3 }) {
  const eligible = new Set((questions || [])
    .filter((q) => q.enabled !== false && isAnswered(answers?.[q.id]))
    .map((q) => q.id));
  return [...new Set(priorityQuestionIds)].filter((id) => eligible.has(id)).slice(0, maxPriorities);
}

const priorities = new Set(normalizePriorityQuestionIds({ priorityQuestionIds, answers, questions }));
const rankingWeight = priorities.has(question.id) ? 2 : 1;
const effectiveWeight = rankingWeight * confidence;
~~~

Use rankingWeight in scoreParty only. Leave importance_default in the axis functions untouched.

- [ ] **Step 4: Run the focused core test file and verify it passes.**

Run: & 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/core.test.js

Expected: PASS with new priority tests and all pre-existing core tests.

- [ ] **Step 5: Commit the independently verified core change.**

~~~
git add core.js tests/core.test.js
git commit -m "feat: weight personal priorities in rankings"
~~~

### Task 2: Persisted priority review before results

**Files:**
- Modify: index.html
- Modify: app.js
- Modify: styles.css
- Modify: tests/ui-structure.test.js

**Interfaces:**
- Consumes: Core.normalizePriorityQuestionIds and Core.scoreParty with priorityQuestionIds.
- Produces: local-storage state { answers, priorityQuestionIds } under the existing key, with migration from legacy answer-only objects.
- Produces: renderPriorityReview() and accessible #priority-review before results.

- [ ] **Step 1: Write failing structural tests for the review step and score wiring.**

~~~
test('questionnaire includes a priority review before results', () => {
  const html = read('index.html');
  assert.match(html, /id=["']priority-review["']/);
  assert.match(html, /id=["']confirm-priorities["']/);
  assert.ok(html.indexOf('id="priority-review"') < html.indexOf('id="results"'));
});

test('app persists selected priorities and passes them to ranking only', () => {
  const app = read('app.js');
  assert.match(app, /priorityQuestionIds/);
  assert.match(app, /Core\.scoreParty\(\{[^}]*priorityQuestionIds/s);
  assert.doesNotMatch(app, /computeUserAxes\(\{[^}]*priorityQuestionIds/s);
});
~~~

- [ ] **Step 2: Run UI-structure tests and verify they fail.**

Run: & 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/ui-structure.test.js

Expected: FAIL naming priority-review or priorityQuestionIds.

- [ ] **Step 3: Add review markup, state migration, interaction and localized copy.**

~~~
const stored = loadQuestionnaireState();
let answers = stored.answers;
let priorityQuestionIds = stored.priorityQuestionIds;

function saveQuestionnaireState() {
  localStorage.setItem(ANSWER_KEY, JSON.stringify({ answers, priorityQuestionIds }));
}
~~~

The first press of #calculate-results validates at least one substantive answer, renders and reveals the review step, and focuses it. Render only substantive answered questions as checkboxes; disable unchecked boxes once three are selected. #confirm-priorities normalizes, saves and calls renderResults(). Reset clears answers and priorities. State a count of applied priorities in the result card. Add visible checkbox, focus and compact mobile styles; do not use a modal.

- [ ] **Step 4: Run UI-structure tests and verify they pass.**

Run: & 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/ui-structure.test.js

Expected: PASS with the new structural checks and all pre-existing UI checks.

- [ ] **Step 5: Commit the independently verified review step.**

~~~
git add index.html app.js styles.css tests/ui-structure.test.js
git commit -m "feat: add personal-priority review"
~~~

### Task 3: Evidence conclusion and source cards

**Files:**
- Modify: app.js
- Modify: styles.css
- Modify: tests/ui-structure.test.js

**Interfaces:**
- Consumes: existing position value/status/scope/evidence list and source title, url, date, source_type and notes_ru.
- Produces: renderEvidenceCards(position), escaped source cards and a no-evidence state.
- Preserves: source URLs, status labels and insufficient_data semantics.

- [ ] **Step 1: Write a failing structural test for an explicit position conclusion and source cards.**

~~~
test('evidence detail renders a position conclusion and source cards', () => {
  const app = read('app.js');
  assert.match(app, /function renderEvidenceCards\s*\(/);
  assert.match(app, /evidence-conclusion/);
  assert.match(app, /evidence-source-card/);
  assert.match(app, /notes_ru/);
});
~~~

- [ ] **Step 2: Run UI-structure tests and verify the new test fails.**

Run: & 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/ui-structure.test.js

Expected: FAIL naming renderEvidenceCards.

- [ ] **Step 3: Implement a transparent conclusion and evidence cards without inventing claims.**

~~~
function renderEvidenceCards(position) {
  const sources = (position?.evidence || []).map(sourceById).filter(Boolean);
  if (!sources.length) return '<p class="hint">Нет привязанного источника.</p>';
  return sources.map((source) => '<article class="evidence-source-card">...</article>').join('');
}
~~~

In renderQualityCellDetail, show a labelled .evidence-conclusion containing the party, answer direction, position status and scope, then append cards. Label source prose as “Контекст источника”, not as a quotation or newly verified fact. Each card shows source title/link, date, type and existing notes_ru. This makes conclusion, source and limitations inspectable without inventing a political assertion.

- [ ] **Step 4: Add evidence-card CSS and run UI-structure tests to verify they pass.**

Run: & 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/ui-structure.test.js

Expected: PASS with the source-card test and all pre-existing UI checks.

- [ ] **Step 5: Commit the independently verified evidence presentation.**

~~~
git add app.js styles.css tests/ui-structure.test.js
git commit -m "feat: explain party position evidence"
~~~

### Task 4: Integrated validation and release notes

**Files:**
- Modify: README.md
- Test: tests/core.test.js
- Test: tests/ui-structure.test.js
- Test: tests/bundle.test.py

**Interfaces:**
- Documents: priorities are optional, capped at three, double only party-ranking weight, and do not alter axes.

- [ ] **Step 1: Add the exact priority and evidence-card behaviour to README.md.**

~~~
### Personal priorities

After answering, a respondent may select up to three answered questions as priorities. Each contributes twice the normal ranking weight; this changes party agreement and coverage but never the five-axis map.
~~~

- [ ] **Step 2: Run all JavaScript tests.**

Run: & 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/*.test.js

Expected: PASS with zero failures.

- [ ] **Step 3: Run bundle integrity and freshness verification.**

Run: python tests/bundle.test.py; python tools/build_data_bundle.py --check

Expected: two passing Python tests and “data bundle is current”.

- [ ] **Step 4: Run whitespace and working-tree checks.**

Run: git diff --check; git status --short

Expected: no whitespace errors; only intended project changes before committing.

- [ ] **Step 5: Commit documentation and integration verification changes.**

~~~
git add README.md data/default-data.js
git commit -m "docs: explain personal priority scoring"
~~~

