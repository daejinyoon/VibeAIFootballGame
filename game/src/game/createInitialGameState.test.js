import assert from 'node:assert/strict';
import test from 'node:test';
import { FIELD } from './constants.js';
import { createInitialGameState } from './createInitialGameState.js';

test('creates eight unique players with three field players and a goalkeeper per team', () => {
  const state = createInitialGameState();
  assert.equal(state.players.length, 8);
  assert.equal(new Set(state.players.map((player) => player.id)).size, 8);
  for (const team of ['home', 'away']) {
    const roster = state.players.filter((player) => player.team === team);
    assert.deepEqual(roster.reduce((counts, player) => {
      counts[player.role] = (counts[player.role] ?? 0) + 1;
      return counts;
    }, {}), { goalkeeper: 1, defender: 1, midfielder: 1, forward: 1 });
  }
});

test('starts stage one at a home kickoff with a clean score and no skill gauges', () => {
  const state = createInitialGameState();
  assert.equal(state.stage, 1);
  assert.equal(state.phase, 'playing');
  assert.equal(state.remainingSeconds, 60);
  assert.deepEqual(state.score, { home: 0, away: 0 });
  assert.equal(state.ball.ownerId, 'home-fw');
  assert.equal(state.controlledPlayerId, 'home-fw');
  assert.equal(state.possessionTeam, 'home');
  assert.equal('skillGauge' in state, false);
  assert.equal(state.aiRandomSeed, 0x6d2b79f5);
  assert.ok(state.players.filter((player) => player.team === 'home')
    .every((player) => player.aiTarget === null && player.aiRetargetSeconds >= 1.2 && player.aiRetargetSeconds <= 1.8));
});

test('clamps stages to one through five and never equips the goalkeeper', () => {
  const state = createInitialGameState({
    stage: 5,
    loadout: { 'home-fw': 'eagleShot', 'home-gk': 'vacuumCleaner' },
    opponentSkillIds: ['vacuumCleaner', 'rainbowReflect'],
    playerSkillStacks: { 'home-mid-1': { skillId: 'eagleShot', copies: 2 }, 'home-gk': { skillId: 'vacuumCleaner', copies: 3 } },
  });
  const invalidStage = createInitialGameState({ stage: 9 });
  const homeForward = state.players.find((player) => player.id === 'home-fw');
  const homeMidfielder = state.players.find((player) => player.id === 'home-mid-1');
  const homeKeeper = state.players.find((player) => player.id === 'home-gk');
  const awayKeeper = state.players.find((player) => player.id === 'away-gk');
  assert.equal(state.stage, 5);
  assert.equal(invalidStage.stage, 1);
  assert.equal(homeForward.skillId, 'eagleShot');
  assert.equal(homeForward.skillUsesRemaining, 1);
  assert.equal(homeMidfielder.skillCopies, 2);
  assert.equal(homeMidfielder.skillUsesRemaining, 2);
  assert.equal(homeKeeper.skillId, null);
  assert.equal(homeKeeper.skillCopies, 0);
  assert.equal(awayKeeper.skillId, null);
  assert.equal(awayKeeper.skillUsesRemaining, 0);
  assert.equal(state.players.find((player) => player.id === 'away-def-1').skillId, 'vacuumCleaner');
  assert.ok(state.players.every((player) => player.x >= 0 && player.x <= FIELD.width));
  assert.ok(state.players.every((player) => player.y >= 0 && player.y <= FIELD.height));
});

test('mirrors the away formation across the middle of the pitch', () => {
  const state = createInitialGameState();
  const home = state.players.filter((player) => player.team === 'home');
  const away = state.players.filter((player) => player.team === 'away');
  home.forEach((player, index) => {
    assert.equal(away[index].x, FIELD.width - player.x);
    assert.equal(away[index].y, player.y);
  });
});
