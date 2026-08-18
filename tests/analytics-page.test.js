const test = require('node:test');
const assert = require('node:assert/strict');
const Page = require('../analytics-page.js');

test('analytics page renderers expose gate, matrix, provenance and review queue', () => {
  const payload = {
    gate: { passed: true, failures: [], metrics: { summary: { knownCells: 1, totalCells: 2 }, byParty: {}, byQuestion: {}, byFamily: {} } },
    research: {
      cells: [{ party: { id: 'p', name_ru: 'Партия' }, question: { id: 'q', short_title_ru: 'Вопрос' }, familyId: 'family', position: { status: 'mixed', confidence: 0.6, value: 1, entity_scope: 'LEADER', evidence: ['s'] }, evidence: [{ id: 's', title: 'Источник' }] }],
      statusCounts: { known: 0, mixed: 1, historical: 0, insufficient_data: 0 },
      scopeCounts: { LEADER: 1 },
      sourceVerificationCounts: { candidate_unverified: 1 },
      sourceTypeCounts: { reputable_reporting: 1 },
      unusedSources: [],
      reviewQueue: [],
    },
  };
  const html = [
    Page.renderAnalytics(payload),
    Page.renderMatrix(payload.research.cells, [payload.research.cells[0].party], [payload.research.cells[0].question]),
    Page.renderDetail(payload.research.cells[0]),
    Page.renderProvenance(payload.research),
    Page.renderReviewQueue(payload.research.reviewQueue),
  ].join('');
  assert.match(html, /analytics-matrix-table/);
  assert.match(html, /analytics-matrix-desktop/);
  assert.match(html, /analytics-matrix-mobile/);
  assert.strictEqual((html.match(/data-cell-key="p\/q"/g) || []).length, 2);
  assert.match(html, /matrix-value-positive/);
  assert.doesNotMatch(html, /Достоверность/);
  assert.doesNotMatch(html, /60%/);
  const visibleText = html.replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(visibleText, /prototype-ranking|usable|confidence|ranking|effective confidence|provenance|candidate_unverified/i);
});

test('matrix cell colors communicate the numeric direction of a position', () => {
  assert.equal(Page.matrixCellClass({ position: { value: -1, status: 'known' } }), 'matrix-value-negative');
  assert.equal(Page.matrixCellClass({ position: { value: 0, status: 'mixed' } }), 'matrix-value-neutral');
  assert.equal(Page.matrixCellClass({ position: { value: 0.5, status: 'historical' } }), 'matrix-value-positive');
  assert.equal(Page.matrixCellClass({ position: { value: null, status: 'insufficient_data' } }), 'matrix-value-missing');
});
