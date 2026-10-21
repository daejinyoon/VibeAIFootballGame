import assert from 'node:assert/strict';
import test from 'node:test';
import { FIELD } from './constants.js';
import { createInitialGameState } from './createInitialGameState.js';

test('creates twelve unique players with the selected 6v6 roles', () => {
  const state = createInitialGameState();

  assert.equal(state.players.length, 12);
  assert.equal(new Set(state.players.map((player) => player.id)).size, 12);

  for (const team of ['home', 'away']) {
    const roster = state.players.filter((player) => player.team === team);
    assert.deepEqual(
      roster.reduce((counts, player) => {
        counts[player.role] = (counts[player.role] ?? 0) + 1;
        return counts;
      }, {}),
      { goalkeeper: 1, defender: 2, midfielder: 2, forward: 1 },
    );
  }
});

test('starts stage one at a home kickoff with a clean score and gauges', () => {
  const state = createInitialGameState();

  assert.equal(state.stage, 1);
  assert.equal(state.phase, 'playing');
  assert.equal(state.remainingSeconds, 60);
  assert.deepEqual(state.score, { home: 0, away: 0 });
  assert.equal(state.ball.ownerId, 'home-fw');
  assert.equal(state.controlledPlayerId, 'home-fw');
  assert.equal(state.possessionTeam, 'home');
  assert.deepEqual(state.skillGauge, { home: 0, away: 0 });
});

test('clamps invalid stage and player coordinates and accepts partial skill data', () => {
  const state = createInitialGameState({
    stage: 9,
    loadout: { 'home-fw': 'eagleShot', 'home-gk': 3 },
    opponentSkillIds: ['vacuumCleaner', null, 'rainbowReflect'],
  });

  assert.equal(state.stage, 1);
  assert.equal(state.players.find((player) => player.id === 'home-fw').skillId, 'eagleShot');
  assert.equal(state.players.find((player) => player.id === 'home-gk').skillId, null);
  assert.equal(state.players.find((player) => player.id === 'away-gk').skillId, 'vacuumCleaner');
  assert.equal(state.players.find((player) => player.id === 'away-def-1').skillId, 'rainbowReflect');
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
