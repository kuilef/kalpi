const test = require('node:test');
const assert = require('node:assert/strict');
const Page = require('../analytics-page.js');

test('analytics page renderers expose gate, matrix, provenance and review queue', () => {
  const payload = {
    gate: { passed: true, failures: [], metrics: { summary: { knownCells: 1, totalCells: 2, averageConfidence: 0.75 }, byParty: {}, byQuestion: {}, byFamily: {} } },
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
    Page.renderProvenance(payload.research),
    Page.renderReviewQueue(payload.research.reviewQueue),
  ].join('');
  assert.match(html, /Release gate пройден/);
  assert.match(html, /analytics-matrix-table/);
  assert.match(html, /Партия/);
  assert.match(html, /candidate_unverified/);
  assert.match(html, /Очередь перепроверки/);
});
