'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const Scoring = require('../scoring.js');
const root = path.resolve(__dirname, '..');
const load = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pole-orientation-before-v4.json'), 'utf8'));
const digest = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const omit = (record, keys) => Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
const negate = (value) => value == null || value === 0 ? value : -value;

test('canonical pole orientation swaps only approved poles and negates only their matrix values', () => {
  const questions = load('questions.json');
  const positions = load('positions.json');
  const candidates = new Set(fixture.candidateQuestionIds);

  assert.equal(digest(questions.filter((question) => !candidates.has(question.id))), fixture.unaffectedQuestionsDigest);
  assert.equal(digest(positions.filter((position) => !candidates.has(position.question))), fixture.unaffectedPositionsDigest);
  for (const questionId of fixture.candidateQuestionIds) {
    const beforeQuestion = fixture.questions[questionId];
    const question = questions.find((item) => item.id === questionId);
    assert.equal(question.left_pole_ru, beforeQuestion.right_pole_ru);
    assert.equal(question.right_pole_ru, beforeQuestion.left_pole_ru);
    assert.equal(digest(omit(question, ['left_pole_ru', 'right_pole_ru'])), beforeQuestion.otherFieldsDigest);

    const rows = positions.filter((position) => position.question === questionId);
    assert.deepEqual(Object.fromEntries(rows.map((position) => [position.party, position.value])), Object.fromEntries(
      Object.entries(fixture.positions[questionId].valuesByParty).map(([party, value]) => [party, negate(value)]),
    ));
    assert.equal(digest(rows.map((position) => omit(position, ['value']))), fixture.positions[questionId].otherFieldsDigest);
  }
});

test('paired pole conversion leaves every similarity and full recommendation result invariant', () => {
  const values = [-1, -0.5, 0, 0.5, 1];
  for (const userValue of values) for (const partyValue of values) {
    assert.equal(Scoring.questionSimilarity(userValue, partyValue), Scoring.questionSimilarity(negate(userValue), negate(partyValue)));
  }

  const questions = load('questions.json');
  const positions = load('positions.json');
  const parties = load('parties.json').filter((party) => party.active !== false);
  const scoringConfig = load('scoring-config.json');
  const candidates = new Set(fixture.candidateQuestionIds);
  const oldPositions = positions.map((position) => candidates.has(position.question)
    ? { ...position, value: fixture.positions[position.question].valuesByParty[position.party] }
    : position);
  const compact = (recommendation) => recommendation.ranked.map((result) => ({
    partyId: result.partyId,
    score: result.score,
    rawScore: result.rawScore,
    coverage: result.coverage,
    eligible: result.eligible,
    nearTie: result.nearTie,
    families: result.families.map((family) => ({ familyId: family.familyId, score: family.score, rawScore: family.rawScore, coverage: family.coverage })),
  }));

  for (const [index, value] of values.entries()) {
    const oldAnswers = Object.fromEntries(questions.map((question, questionIndex) => [question.id, values[(index + questionIndex) % values.length]]));
    oldAnswers.palestinian_state_option = null;
    const newAnswers = Object.fromEntries(Object.entries(oldAnswers).map(([questionId, answer]) => [questionId, candidates.has(questionId) ? negate(answer) : answer]));
    const priorities = ['security_settlement_tradeoff', 'palestinian_state_option', 'gaza_jewish_settlements'];
    const oldRecommendation = Scoring.buildRecommendation({ parties, answers: oldAnswers, positions: oldPositions, priorityQuestionIds: priorities, scoringConfig });
    const newRecommendation = Scoring.buildRecommendation({ parties, answers: newAnswers, positions, priorityQuestionIds: priorities, scoringConfig });
    assert.deepEqual(compact(newRecommendation), compact(oldRecommendation));
  }
});
