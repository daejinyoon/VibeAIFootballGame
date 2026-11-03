import assert from 'node:assert/strict';
import test from 'node:test';
import { createDailyChallengeMatchState, DAILY_CHALLENGE_SKILL_IDS } from './dailyChallengeMatchState.js';
import { getTeamBranding } from './teamBranding.js';

const validChallenge = Object.freeze({
  date: '2026-11-03',
  challengeId: '2026-11-03:2',
  regulationSeconds: 40,
  aiStage: 4,
  skillIds: DAILY_CHALLENGE_SKILL_IDS,
});

test('creates the shared fixed skill deck at level one for both teams using challenge settings', () => {
  const customization = { logoId: 'apple', paletteId: 'crimson-ivory' };
  const state = createDailyChallengeMatchState(validChallenge, customization, {
    mode: 'specific', ceremonyId: 'rko',
  });

  assert.equal(state.stage, 4);
  assert.equal(state.remainingSeconds, 40);
  assert.deepEqual(state.teamBranding, getTeamBranding(4, customization));
  assert.equal(state.goalCelebrationId, 'rko');
  assert.deepEqual(state.teamSkillDecks.home, [
    { skillId: 'eagleShot', level: 1 },
    { skillId: 'tornadoShot', level: 1 },
    { skillId: 'eulryongta', level: 1 },
  ]);
  assert.deepEqual(state.teamSkillDecks.away, state.teamSkillDecks.home);
  assert.deepEqual(state.teamSkillUsesRemaining, {
    home: { eagleShot: 1, tornadoShot: 1, eulryongta: 1 },
    away: { eagleShot: 1, tornadoShot: 1, eulryongta: 1 },
  });
});

test('rejects missing, malformed, and out-of-range challenge payloads', () => {
  const invalidChallenges = [
    null,
    {},
    { ...validChallenge, challengeId: '' },
    { ...validChallenge, challengeId: 42 },
    { ...validChallenge, regulationSeconds: 29 },
    { ...validChallenge, regulationSeconds: 46 },
    { ...validChallenge, aiStage: 1 },
    { ...validChallenge, aiStage: 6 },
    { ...validChallenge, skillIds: ['eagleShot', 'eulryongta', 'tornadoShot'] },
    { ...validChallenge, skillIds: ['eagleShot', 'tornadoShot'] },
    { ...validChallenge, skillIds: ['eagleShot', 'tornadoShot', 'eulryongta', 'vacuumCleaner'] },
  ];
  for (const challenge of invalidChallenges) {
    assert.equal(createDailyChallengeMatchState(challenge), null);
  }
});
