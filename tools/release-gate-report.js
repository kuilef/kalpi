#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Analytics = require('../analytics.js');
const Scoring = require('../scoring.js');

const MIRROR_PARTIES = ['likud', 'democrats', 'utj', 'yisrael_beytenu', 'raam', 'hadash_taal'];

function mirrorAnswers(data, partyId) {
  return Object.fromEntries((data.positions || [])
    .filter((position) => position.party === partyId && position.value != null && position.status !== 'insufficient_data')
    .map((position) => [position.question, position.value]));
}

function partyMirrorFixture(data, partyId) {
  const recommendation = Scoring.buildRecommendation({
    parties: data.parties.filter((party) => party.active !== false),
    answers: mirrorAnswers(data, partyId),
    positions: data.positions,
    scoringConfig: data.scoringConfig,
  });
  const matches = [recommendation.leader?.partyId, ...recommendation.nearTies.map((result) => result.partyId)].filter(Boolean);
  return {
    id: `mirror_${partyId}`,
    passed: recommendation.ready && matches.includes(partyId),
    expected: partyId,
    leader: recommendation.leader?.partyId || null,
    nearTies: recommendation.nearTies.map((result) => result.partyId),
    substantiveAnswers: recommendation.substantiveAnswerCount,
    answeredFamilies: recommendation.answeredFamilyIds.length,
  };
}

function boundaryFixtures(data) {
  const allUnknown = Scoring.buildRecommendation({
    parties: data.parties.filter((party) => party.active !== false), answers: {}, positions: data.positions, scoringConfig: data.scoringConfig,
  });
  const firstFamily = data.scoringConfig.families[0];
  const answerIds = [...firstFamily.fundamental_questions, ...firstFamily.policy_questions];
  const singleFamilyAnswers = Object.fromEntries(answerIds.map((questionId) => [questionId, -1]));
  const singleFamily = Scoring.buildRecommendation({
    parties: data.parties.filter((party) => party.active !== false), answers: singleFamilyAnswers, positions: data.positions, scoringConfig: data.scoringConfig,
  });
  const exactTie = Scoring.buildRecommendation({
    parties: [{ id: 'a' }, { id: 'b' }],
    answers: { q: -1 },
    positions: [
      { party: 'a', question: 'q', value: -1, confidence: 1, status: 'known' },
      { party: 'b', question: 'q', value: -1, confidence: 1, status: 'known' },
    ],
    scoringConfig: {
      prototype_trust_policy: 'all_value_positions_full_confidence',
      result_policy: { min_substantive_answers: 1, min_answered_families: 1, min_party_result_coverage: 0.5, near_tie_points: 0.03 },
      families: [{ id: 'f', fundamental_questions: ['q'], policy_questions: [], fundamental_weight: 1, policy_weight: 0, family_weight: 1 }],
    },
  });
  return [
    { id: 'all_unknown', passed: !allUnknown.ready && !allUnknown.leader, detail: allUnknown.reasons.join('; ') },
    { id: 'single_family', passed: !singleFamily.ready && !singleFamily.leader, detail: singleFamily.reasons.join('; ') },
    { id: 'exact_tie', passed: exactTie.leader?.partyId === 'a' && exactTie.nearTies.some((result) => result.partyId === 'b'), detail: `leader ${exactTie.leader?.partyId || 'none'}; near tie ${exactTie.nearTies.map((result) => result.partyId).join(', ') || 'none'}` },
  ];
}

function buildReport(data) {
  const gate = Analytics.computeReleaseGate(data);
  const fixtures = [...MIRROR_PARTIES.map((partyId) => partyMirrorFixture(data, partyId)), ...boundaryFixtures(data)];
  return { gate, fixtures, passed: gate.passed && fixtures.every((fixture) => fixture.passed) };
}

function renderMarkdown(report) {
  const summary = report.gate.metrics.summary;
  return `# Kalpi prototype release-gate report\n\nRelease gate: ${report.passed ? 'PASS' : 'FAIL'}\n\n- Matrix: ${summary.knownCells}/${summary.totalCells} usable (${Math.round(summary.knownCells / summary.totalCells * 100)}%)\n- Gate checks: ${report.gate.passed ? 'PASS' : report.gate.failures.join('; ')}\n\n## Synthetic fixtures\n\n${report.fixtures.map((fixture) => `- ${fixture.passed ? 'PASS' : 'FAIL'} — ${fixture.id}${fixture.expected ? `; expected ${fixture.expected}, leader ${fixture.leader || 'none'}${fixture.nearTies?.length ? `; near tie: ${fixture.nearTies.join(', ')}` : ''}` : fixture.detail ? `; ${fixture.detail}` : ''}`).join('\n')}\n\n## Manual browser check\n\nSee [manual-browser-check.md](manual-browser-check.md) for the four documented profiles and narrow-screen verification.\n`;
}

function loadCanonicalData(root) {
  const read = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
  return { parties: read('parties.json'), questions: read('questions.json'), positions: read('positions.json'), sources: read('sources.json'), scoringConfig: read('scoring-config.json') };
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const report = buildReport(loadCanonicalData(root));
  const markdown = renderMarkdown(report);
  const writeIndex = process.argv.indexOf('--write');
  if (writeIndex >= 0) {
    const target = path.resolve(root, process.argv[writeIndex + 1] || 'docs/release-gate-report.md');
    fs.writeFileSync(target, markdown, 'utf8');
  }
  process.stdout.write(markdown);
  process.exitCode = report.passed ? 0 : 1;
}

module.exports = { buildReport, renderMarkdown, mirrorAnswers };
