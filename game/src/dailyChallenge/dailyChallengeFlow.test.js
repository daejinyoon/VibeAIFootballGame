import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canEnterDailyChallenge,
  canRetryDailyChallengeSubmission,
  getDailyChallengeTerminalResult,
  isFirstDailyChallengeTerminal,
  isDailyChallengeChangedError,
} from './dailyChallengeFlow.js';

test('company daily challenge entry is disabled in local development mode', () => {
  assert.equal(canEnterDailyChallenge(false), true);
  assert.equal(canEnterDailyChallenge(undefined), true);
  assert.equal(canEnterDailyChallenge(true), false);
});

test('maps one match terminal event into its bounded score and outcome without converting draws', () => {
  assert.deepEqual(getDailyChallengeTerminalResult([
    { type: 'goal', score: { home: 2, away: 1 } },
    { type: 'matchDraw', score: { home: 3, away: 3 } },
    { type: 'matchWon', score: { home: 4, away: 2 } },
  ]), { homeGoals: 3, awayGoals: 3, outcome: 'draw', goalDifference: 0 });
  assert.deepEqual(getDailyChallengeTerminalResult([{ type: 'matchLost', score: { home: 1, away: 2 } }]), {
    homeGoals: 1, awayGoals: 2, outcome: 'loss', goalDifference: -1,
  });
  assert.deepEqual(getDailyChallengeTerminalResult([{ type: 'matchWon', score: { home: 2, away: 0 } }]), {
    homeGoals: 2, awayGoals: 0, outcome: 'win', goalDifference: 2,
  });
});

test('ignores nonterminal and inconsistent terminal events', () => {
  assert.equal(getDailyChallengeTerminalResult([{ type: 'goal', score: { home: 1, away: 0 } }]), null);
  assert.equal(getDailyChallengeTerminalResult([{ type: 'matchWon', score: { home: 1, away: 1 } }]), null);
  assert.equal(getDailyChallengeTerminalResult([{ type: 'matchLost', score: { home: 4, away: 2 } }]), null);
  assert.equal(getDailyChallengeTerminalResult([{ type: 'matchDraw', score: { home: 100, away: 100 } }]), null);
  assert.equal(getDailyChallengeTerminalResult(null), null);
});

test('identifies day-change conflicts separately from retryable save failures', () => {
  assert.equal(isDailyChallengeChangedError({ status: 409, code: 'CHALLENGE_CHANGED' }), true);
  assert.equal(isDailyChallengeChangedError({ status: 409, code: 'DAILY_RESULT_CHANGED' }), false);
  assert.equal(canRetryDailyChallengeSubmission({ status: 0, code: 'NETWORK_ERROR' }), true);
  assert.equal(canRetryDailyChallengeSubmission({ status: 503, code: 'DAILY_CHALLENGE_STORAGE_UNAVAILABLE' }), true);
  assert.equal(canRetryDailyChallengeSubmission({ status: 401, code: 'AUTH_REQUIRED' }), false);
});

test('allows only one terminal submission per match instance', () => {
  assert.equal(isFirstDailyChallengeTerminal(null, 1), true);
  assert.equal(isFirstDailyChallengeTerminal(1, 1), false);
  assert.equal(isFirstDailyChallengeTerminal(1, 2), true);
  assert.equal(isFirstDailyChallengeTerminal(null, 0), false);
});
