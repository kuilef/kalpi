const test = require('node:test');
const assert = require('node:assert/strict');
const Scoring = require('../scoring.js');

const config = {
  answer_values: [-1, -0.5, 0, 0.5, 1],
  families: [
    {
      id: 'family_a',
      fundamental_questions: ['a1'],
      policy_questions: ['b1', 'b2'],
      fundamental_weight: 0.6,
      policy_weight: 0.4,
      family_weight: 1,
    },
    {
      id: 'family_b',
      fundamental_questions: ['a2'],
      policy_questions: [],
      fundamental_weight: 1,
      policy_weight: 0,
      family_weight: 1,
    },
  ],
};

test('question similarity uses the canonical [-1, +1] distance', () => {
  assert.equal(Scoring.questionSimilarity(-1, -1), 1);
  assert.equal(Scoring.questionSimilarity(-1, 1), 0);
  assert.equal(Scoring.questionSimilarity(0, 1), 0.5);
});

test('confidence shrinks similarity toward uncertainty instead of the political centre', () => {
  assert.equal(Scoring.confidenceAdjustedSimilarity(1, 0.5), 0.75);
  assert.equal(Scoring.confidenceAdjustedSimilarity(0, 0.5), 0.25);
  assert.equal(Scoring.confidenceAdjustedSimilarity(1, 0), 0.5);
});

test('prototype full trust makes every value-bearing position a known full-confidence match', () => {
  const result = Scoring.scoreParty({
    partyId: 'party',
    answers: { a1: -1 },
    positions: [{ party: 'party', question: 'a1', value: -1, confidence: 0.12, status: 'mixed', entity_scope: 'LEADER' }],
    scoringConfig: { ...config, prototype_trust_policy: 'all_value_positions_full_confidence' },
  });

  assert.equal(result.score, 1);
  assert.equal(result.coverage, 1);
  assert.equal(result.families[0].questions[0].effectiveStatus, 'known');
  assert.equal(result.families[0].questions[0].effectiveConfidence, 1);
});

test('recommendation requires broad substantive answers and marks a near tie', () => {
  const policy = {
    ...config,
    result_policy: {
      min_substantive_answers: 2,
      min_answered_families: 2,
      min_party_result_coverage: 0.5,
      near_tie_points: 0.03,
    },
  };
  const recommendation = Scoring.buildRecommendation({
    parties: [{ id: 'first' }, { id: 'second' }, { id: 'thin' }],
    answers: { a1: -1, a2: -1 },
    positions: [
      { party: 'first', question: 'a1', value: -1, confidence: 1, status: 'known' },
      { party: 'first', question: 'a2', value: -1, confidence: 1, status: 'known' },
      { party: 'second', question: 'a1', value: -1, confidence: 1, status: 'known' },
      { party: 'second', question: 'a2', value: -0.95, confidence: 1, status: 'known' },
      { party: 'thin', question: 'a1', value: -1, confidence: 1, status: 'known' },
      { party: 'thin', question: 'a2', value: null, confidence: 0, status: 'insufficient_data' },
    ],
    scoringConfig: policy,
  });

  assert.equal(recommendation.ready, true);
  assert.equal(recommendation.leader.partyId, 'first');
  assert.deepEqual(recommendation.nearTies.map((item) => item.partyId), ['second']);
  assert.equal(recommendation.ranked.find((item) => item.partyId === 'thin').eligible, true);
});

test('a known zero-confidence position remains visible in the debug raw score', () => {
  const result = Scoring.scoreParty({
    partyId: 'party',
    answers: { a1: -1 },
    positions: [{ party: 'party', question: 'a1', value: 1, confidence: 0, status: 'known' }],
    scoringConfig: config,
  });

  assert.equal(result.score, 0.5);
  assert.equal(result.rawScore, 0);
});

test('family scoring averages policy questions before applying the A/B weights', () => {
  const result = Scoring.scoreParty({
    partyId: 'party',
    answers: { a1: -1, b1: -1, b2: -1 },
    positions: [
      { party: 'party', question: 'a1', value: -1, confidence: 1, status: 'known' },
      { party: 'party', question: 'b1', value: -1, confidence: 1, status: 'known' },
      { party: 'party', question: 'b2', value: 1, confidence: 1, status: 'known' },
    ],
    scoringConfig: config,
  });

  const family = result.families.find((item) => item.familyId === 'family_a');
  assert.equal(family.fundamental.score, 1);
  assert.equal(family.policy.score, 0.5);
  assert.equal(family.score, 0.8);
  assert.equal(result.score, 0.8);
});

test('an important answered question counts twice within its family but does not change family structure', () => {
  const result = Scoring.scoreParty({
    partyId: 'party',
    answers: { a1: -1, b1: -1, b2: -1 },
    priorityQuestionIds: ['b2'],
    positions: [
      { party: 'party', question: 'a1', value: -1, confidence: 1, status: 'known' },
      { party: 'party', question: 'b1', value: -1, confidence: 1, status: 'known' },
      { party: 'party', question: 'b2', value: 1, confidence: 1, status: 'known' },
    ],
    scoringConfig: { ...config, user_importance_enabled: true },
  });

  const family = result.families.find((item) => item.familyId === 'family_a');
  assert.equal(family.policy.score, 1 / 3);
  assert.equal(family.score, 11 / 15);
  assert.equal(result.score, 11 / 15);
});

test('adding policy questions does not increase a family structural weight', () => {
  const onePolicy = Scoring.scoreParty({
    partyId: 'party',
    answers: { a1: -1, b1: -1, a2: -1 },
    positions: [
      { party: 'party', question: 'a1', value: -1, confidence: 1, status: 'known' },
      { party: 'party', question: 'b1', value: -1, confidence: 1, status: 'known' },
      { party: 'party', question: 'a2', value: 1, confidence: 1, status: 'known' },
    ],
    scoringConfig: config,
  });
  const threePolicies = Scoring.scoreParty({
    partyId: 'party',
    answers: { a1: -1, b1: -1, b2: -1, a2: -1 },
    positions: [
      { party: 'party', question: 'a1', value: -1, confidence: 1, status: 'known' },
      { party: 'party', question: 'b1', value: -1, confidence: 1, status: 'known' },
      { party: 'party', question: 'b2', value: -1, confidence: 1, status: 'known' },
      { party: 'party', question: 'a2', value: 1, confidence: 1, status: 'known' },
    ],
    scoringConfig: config,
  });

  assert.equal(onePolicy.score, 0.5);
  assert.equal(threePolicies.score, 0.5);
});

test('user unknown excludes a question while an unknown party position contributes 0.5 and zero coverage', () => {
  const result = Scoring.scoreParty({
    partyId: 'party',
    answers: { a1: -1, b1: null, b2: -1 },
    positions: [
      { party: 'party', question: 'a1', value: -1, confidence: 1, status: 'known' },
      { party: 'party', question: 'b1', value: 1, confidence: 1, status: 'known' },
      { party: 'party', question: 'b2', value: null, confidence: 0, status: 'insufficient_data' },
    ],
    scoringConfig: config,
  });

  const family = result.families.find((item) => item.familyId === 'family_a');
  assert.equal(family.policy.score, 0.5);
  assert.equal(family.policy.coverage, 0);
  assert.equal(family.score, 0.8);
  assert.equal(family.coverage, 0.6);
});

test('ranking resolves equal scores by coverage then canonical party order', () => {
  const ranked = Scoring.rankParties({
    parties: [{ id: 'first' }, { id: 'second' }, { id: 'third' }],
    answers: { a1: -1 },
    positions: [
      { party: 'first', question: 'a1', value: -1, confidence: 0.5, status: 'known' },
      { party: 'second', question: 'a1', value: -1, confidence: 0.5, status: 'known' },
      { party: 'third', question: 'a1', value: -1, confidence: 1, status: 'known' },
    ],
    scoringConfig: config,
  });

  assert.deepEqual(ranked.map((result) => result.partyId), ['third', 'first', 'second']);
});
