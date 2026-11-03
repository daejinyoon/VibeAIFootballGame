import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailyChallengeLeaderboard,
  compareDailyChallengeResults,
  DAILY_CHALLENGE_PRESETS,
  DailyChallengeDomainError,
  getDailyChallenge,
  getKstDate,
  normalizeDailyChallengeDisplayName,
  validateDailyChallengeScore,
} from './dailyChallengeDomain.js';

test('derives the challenge date from Korea Standard Time around midnight', () => {
  assert.equal(getKstDate(new Date('2026-01-01T14:59:59.999Z')), '2026-01-01');
  assert.equal(getKstDate(new Date('2026-01-01T15:00:00.000Z')), '2026-01-02');
});

test('rejects invalid dates with a domain error', () => {
  assert.throws(() => getKstDate(new Date('invalid')), (error) => (
    error instanceof DailyChallengeDomainError
      && error.status === 400
      && error.code === 'INVALID_DATE'
  ));
});

test('returns the same challenge for instants representing the same KST date', () => {
  const utc = getDailyChallenge(new Date('2026-04-16T15:00:01.000Z'));
  const korea = getDailyChallenge(new Date('2026-04-17T00:00:01.000+09:00'));
  assert.deepEqual(korea, utc);
  assert.equal(utc.date, '2026-04-17');
});

test('rotates through all seven authored presets and repeats on day eight', () => {
  const start = Date.UTC(2026, 0, 1);
  const challenges = Array.from({ length: 8 }, (_, index) => (
    getDailyChallenge(new Date(start + index * 86_400_000))
  ));
  assert.deepEqual(challenges.slice(0, 7).map(({ regulationSeconds, aiStage }) => ({ regulationSeconds, aiStage })), DAILY_CHALLENGE_PRESETS);
  assert.deepEqual(
    { regulationSeconds: challenges[0].regulationSeconds, aiStage: challenges[0].aiStage },
    { regulationSeconds: challenges[7].regulationSeconds, aiStage: challenges[7].aiStage },
  );
  assert.equal(challenges[7].date, '2026-01-08');
  assert.equal(challenges[0].challengeId.split(':')[0], challenges[0].date);
  assert.deepEqual(challenges[0].skillIds, ['eagleShot', 'tornadoShot', 'eulryongta']);
  challenges[0].skillIds.pop();
  assert.deepEqual(getDailyChallenge(new Date(start)).skillIds, ['eagleShot', 'tornadoShot', 'eulryongta']);
});

test('validates bounded integer scores and derives win, draw, and loss', () => {
  assert.deepEqual(validateDailyChallengeScore({ homeGoals: 2, awayGoals: 1 }), {
    homeGoals: 2, awayGoals: 1, outcome: 'win', goalDifference: 1,
  });
  assert.deepEqual(validateDailyChallengeScore({ homeGoals: 1, awayGoals: 1 }), {
    homeGoals: 1, awayGoals: 1, outcome: 'draw', goalDifference: 0,
  });
  assert.deepEqual(validateDailyChallengeScore({ homeGoals: 0, awayGoals: 3 }), {
    homeGoals: 0, awayGoals: 3, outcome: 'loss', goalDifference: -3,
  });

  for (const value of [
    null,
    [],
    { homeGoals: '2', awayGoals: 1 },
    { homeGoals: 1.5, awayGoals: 1 },
    { homeGoals: -1, awayGoals: 1 },
    { homeGoals: 100, awayGoals: 1 },
    { homeGoals: 1, awayGoals: -1 },
    { homeGoals: 1, awayGoals: 100 },
  ]) {
    assert.throws(() => validateDailyChallengeScore(value), (error) => (
      error instanceof DailyChallengeDomainError
        && error.status === 400
        && error.code === 'INVALID_SCORE'
    ));
  }
});

test('normalizes daily challenge display names without PvP domain dependencies', () => {
  assert.equal(normalizeDailyChallengeDisplayName('  Player A  '), 'Player A');
  for (const displayName of ['', '  ', 'x'.repeat(101), 'Player\nA', null]) {
    assert.throws(() => normalizeDailyChallengeDisplayName(displayName), (error) => (
      error instanceof DailyChallengeDomainError
        && error.status === 400
        && error.code === 'INVALID_DISPLAY_NAME'
    ));
  }
});

test('compares outcomes before goal difference', () => {
  assert.ok(compareDailyChallengeResults(
    { outcome: 'win', goalDifference: 0 },
    { outcome: 'draw', goalDifference: 99 },
  ) < 0);
  assert.ok(compareDailyChallengeResults(
    { outcome: 'draw', goalDifference: 0 },
    { outcome: 'loss', goalDifference: 99 },
  ) < 0);
  assert.ok(compareDailyChallengeResults(
    { outcome: 'win', goalDifference: 3 },
    { outcome: 'win', goalDifference: 1 },
  ) < 0);
  assert.equal(compareDailyChallengeResults(
    { outcome: 'win', goalDifference: 1 },
    { outcome: 'win', goalDifference: 1 },
  ), 0);
});

test('filters malformed rows, shares exact ranks, and omits private fields', () => {
  const records = buildDailyChallengeLeaderboard([
    { objectId: 'z', tenantId: 'tenant', displayName: 'Zeta', homeGoals: 4, awayGoals: 1, outcome: 'win', goalDifference: 3 },
    { objectId: 'a', tenantId: 'tenant', displayName: 'Alpha', homeGoals: 3, awayGoals: 0, outcome: 'win', goalDifference: 3 },
    { objectId: 'b', tenantId: 'tenant', displayName: 'Beta', homeGoals: 2, awayGoals: 1, outcome: 'win', goalDifference: 1 },
    { objectId: 'c', tenantId: 'tenant', displayName: 'Charlie', homeGoals: 1, awayGoals: 1, outcome: 'draw', goalDifference: 0 },
    { objectId: 'd', tenantId: 'tenant', displayName: 'Delta', homeGoals: 0, awayGoals: 1, outcome: 'loss', goalDifference: -1 },
    { objectId: 'bad-score', tenantId: 'tenant', displayName: 'Bad score', homeGoals: -1, awayGoals: 2, outcome: 'loss', goalDifference: -3 },
    { objectId: 'bad-outcome', tenantId: 'tenant', displayName: 'Bad outcome', homeGoals: 2, awayGoals: 1, outcome: 'loss', goalDifference: 1 },
    { objectId: 'blank', tenantId: 'tenant', displayName: '  ', homeGoals: 2, awayGoals: 1, outcome: 'win', goalDifference: 1 },
  ]);

  assert.deepEqual(records.map(({ displayName, rank }) => ({ displayName, rank })), [
    { displayName: 'Alpha', rank: 1 },
    { displayName: 'Zeta', rank: 1 },
    { displayName: 'Beta', rank: 3 },
    { displayName: 'Charlie', rank: 4 },
    { displayName: 'Delta', rank: 5 },
  ]);
  assert.ok(records.every((record) => !('objectId' in record) && !('tenantId' in record)));
});

test('caps leaderboard output at 100 and treats invalid limits as the default', () => {
  const records = Array.from({ length: 105 }, (_, index) => ({
    displayName: `Player ${index}`,
    homeGoals: 1,
    awayGoals: 0,
    outcome: 'win',
    goalDifference: 1,
  }));
  assert.equal(buildDailyChallengeLeaderboard(records).length, 100);
  assert.equal(buildDailyChallengeLeaderboard(records, 2).length, 2);
  assert.equal(buildDailyChallengeLeaderboard(records, 0).length, 100);
  assert.equal(buildDailyChallengeLeaderboard(null).length, 0);
});
