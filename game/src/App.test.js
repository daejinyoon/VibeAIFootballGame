import test from 'node:test';
import assert from 'node:assert/strict';
import { canStartPvpRoom, isPvpLoadoutSaved, shouldPollPvpRoom } from './pvp/pvpLobbyState.js';
import { createForfeitPvpResult, createNormalPvpResult, createPvpMatchState, getConfirmationStatus } from './pvp/pvpMatchFlow.js';
import { canEnterDailyChallenge, getDailyChallengeTerminalResult } from './dailyChallenge/dailyChallengeFlow.js';

const room = {
  code: 'ABC234', status: 'ready', isHost: true,
  hostReady: true, guestReady: true,
  hostSkillIds: ['eagleShot', 'tornadoShot', 'eulryongta'],
  guestSkillIds: ['vacuumCleaner', 'tornadoShot', 'eulryongta'],
};

test('start is available only to the host after both valid loadouts and ready flags', () => {
  assert.equal(canStartPvpRoom(room), true);
  assert.equal(canStartPvpRoom({ ...room, isHost: false }), false);
  assert.equal(canStartPvpRoom({ ...room, guestReady: false }), false);
  assert.equal(canStartPvpRoom({ ...room, hostSkillIds: ['eagleShot', 'eagleShot', 'eulryongta'] }), false);
});

test('room polling is limited to the visible lobby while a room waits or is ready', () => {
  assert.equal(shouldPollPvpRoom('pvpLobby', room), true);
  assert.equal(shouldPollPvpRoom('start', room), false);
  assert.equal(shouldPollPvpRoom('pvpLobby', { ...room, status: 'playing' }), false);
  assert.equal(shouldPollPvpRoom('pvpLobby', { ...room, status: 'cancelled' }), false);
});

test('ready requires the exact ordered loadout to have been saved', () => {
  assert.equal(isPvpLoadoutSaved(room.hostSkillIds, room.hostSkillIds), true);
  assert.equal(isPvpLoadoutSaved([...room.hostSkillIds].reverse(), room.hostSkillIds), false);
  assert.equal(isPvpLoadoutSaved(['eagleShot', 'eagleShot', 'eulryongta'], room.hostSkillIds), false);
});

test('PvP match setup fixes stage, ordered skill decks, and team branding independent of campaign data', () => {
  const initialState = createPvpMatchState({
    code: 'ABC234', status: 'playing', isHost: true,
    hostSkillIds: ['eagleShot', 'tornadoShot', 'eulryongta'],
    guestSkillIds: ['vacuumCleaner', 'tornadoShot', 'eagleShot'],
  });
  assert.equal(initialState.stage, 1);
  assert.deepEqual(initialState.teamSkillDecks.home.map(({ skillId }) => skillId), ['eagleShot', 'tornadoShot', 'eulryongta']);
  assert.deepEqual(initialState.teamSkillDecks.away.map(({ skillId }) => skillId), ['vacuumCleaner', 'tornadoShot', 'eagleShot']);
  assert.equal(createPvpMatchState({ ...room, status: 'waiting' }), null);
});

test('PvP results use team-relative outcomes, never fabricate a forfeit score, and map confirmation states', () => {
  assert.deepEqual(createNormalPvpResult({ home: 4, away: 1 }, 'away'), {
    kind: 'normal', homeGoals: 4, awayGoals: 1, localOutcome: 'loss',
  });
  assert.deepEqual(createNormalPvpResult({ home: 2, away: 2 }, 'home').localOutcome, 'draw');
  assert.deepEqual(createForfeitPvpResult('away', 'home'), { kind: 'forfeit', loser: 'away', localOutcome: 'win' });
  assert.deepEqual(['awaitingResults', 'completed', 'disputed', 'forfeit'].map(getConfirmationStatus), [
    'awaitingOpponent', 'recorded', 'disputed', 'recorded',
  ]);
});

test('daily challenge is company-only and terminal results contain no campaign profile data', () => {
  assert.equal(canEnterDailyChallenge(true), false);
  assert.equal(canEnterDailyChallenge(false), true);
  const dailyResult = getDailyChallengeTerminalResult([{ type: 'matchWon', score: { home: 3, away: 1 } }]);
  assert.deepEqual(dailyResult, {
    homeGoals: 3, awayGoals: 1, outcome: 'win', goalDifference: 2,
  });
  assert.equal(Object.hasOwn(dailyResult, 'campaignSave'), false);
  assert.equal(Object.hasOwn(dailyResult, 'bestRecord'), false);
});
