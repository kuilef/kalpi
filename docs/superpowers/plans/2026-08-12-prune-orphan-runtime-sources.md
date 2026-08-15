# Prune Orphan Runtime Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep canonical runtime sources limited to records referenced by the final imported position matrix.

**Architecture:** `build_candidate_import` already constructs final positions and sources in memory. After evidence IDs are rewritten for candidate conflicts, filter its source list by the IDs present in final positions. Candidate package files and baseline artifacts remain unchanged.

**Tech Stack:** Python standard library, `unittest`, JSON data bundle generator.

## Global Constraints

- Do not alter party positions, their values, statuses, confidence, explanations, or evidence IDs.
- Do not edit `data/candidates/*` or baseline artifacts.
- Regenerate `data/default-data.js` from canonical JSON.

---

### Task 1: Prune canonical source output

**Files:**

- Modify: `tests/sync_position_matrix.test.py`
- Modify: `tools/sync_position_matrix.py`
- Modify: `data/sources.json`
- Modify: `data/default-data.js` (generated)

**Interfaces:**

- Consumes: the final `positions` list returned by `build_candidate_import`.
- Produces: `result['sources']` containing every and only source ID referenced from those positions.

- [ ] **Step 1: Write the failing test**

```python
result = sync_position_matrix.build_candidate_import(
    parties=[{'id': 'p1', 'active': True}],
    questions=[{'id': 'q1', 'display_order': 1}],
    existing_sources=[{'id': 'used'}, {'id': 'orphan'}],
    packages=[...],
)
self.assertEqual([source['id'] for source in result['sources']], ['used'])
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `python -m unittest tests.sync_position_matrix.test.CandidateImportTests.test_build_candidate_import_prunes_unreferenced_canonical_sources`

- [ ] **Step 3: Implement the smallest post-import filter**

```python
used_evidence_ids = {source_id for position in positions for source_id in position.get('evidence', [])}
sources = [source for source in sources if source['id'] in used_evidence_ids]
```

- [ ] **Step 4: Run focused and full tests, import candidate packages, rebuild the bundle, and check it**

Run: `python -m unittest tests.sync_position_matrix.test`, `python tools/build_data_bundle.py`, and `python tools/build_data_bundle.py --check`.
