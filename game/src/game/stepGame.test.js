import assert from 'node:assert/strict';
import test from 'node:test';
import { FIELD } from './constants.js';
import { createInitialGameState } from './createInitialGameState.js';
import { stepGame } from './stepGame.js';

const frame = ({ moveX = 0, moveY = 0, down = [], pressed = [], released = [] } = {}) => ({
  moveX,
  moveY,
  down: new Set(down),
  pressed: new Set(pressed),
  released: new Set(released),
});

test('moves the selected player at the intended speed and normalizes diagonals', () => {
  const state = createInitialGameState();
  const player = state.players.find((candidate) => candidate.id === 'home-fw');
  const start = { x: player.x, y: player.y };

  stepGame(state, frame({ moveX: 1, moveY: -1 }), 0.05);

  assert.ok(player.x > start.x);
  assert.ok(player.y < start.y);
  assert.ok(Math.abs(Math.hypot(player.vx, player.vy) - 160) < 0.001);
  assert.equal(state.ball.x, player.x + player.facingX * 17);
});

test('an arrow direction selects the intended teammate for a charged lob pass', () => {
  const state = createInitialGameState();
  stepGame(state, frame({ moveY: -1, down: ['a'], pressed: ['a'] }), 0.05);
  const events = stepGame(state, frame({ moveY: -1, released: ['a'] }), 0.05);

  assert.equal(state.controlledPlayerId, 'home-mid-1');
  assert.equal(state.ball.ownerId, null);
  assert.equal(state.ball.flightKind, 'lob');
  assert.ok(state.ball.vx < 0);
  assert.ok(state.ball.vy < 0);
  assert.ok(events.some((event) => event.type === 'pass' && event.action === 'lobPass'));
});

test('S releases a ground pass and transfers control to the receiver', () => {
  const state = createInitialGameState();
  stepGame(state, frame({ moveY: 1, down: ['s'], pressed: ['s'] }), 0.05);
  const events = stepGame(state, frame({ moveY: 1, released: ['s'] }), 0.05);

  assert.equal(state.controlledPlayerId, 'home-mid-2');
  assert.equal(state.ball.flightKind, 'ground');
  assert.ok(events.some((event) => event.type === 'pass' && event.action === 'groundPass'));
});

test('a charged shot releases toward the opponent goal', () => {
  const state = createInitialGameState();
  stepGame(state, frame({ down: ['d'], pressed: ['d'] }), 0.05);
  const events = stepGame(state, frame({ released: ['d'] }), 0.05);

  assert.equal(state.ball.ownerId, null);
  assert.equal(state.ball.flightKind, 'shot');
  assert.ok(state.ball.vx > 0);
  assert.ok(events.some((event) => event.type === 'shot' && event.team === 'home'));
});

test('a keeper catches an ordinary shot and starts a timed goal kick', () => {
  const state = createInitialGameState();
  state.possessionTeam = 'away';
  Object.assign(state.ball, { ownerId: null, x: 55, y: 270, vx: -30, vy: 0, flightKind: 'shot', lastTouchTeam: 'away' });

  const events = stepGame(state, frame(), 0.01);

  assert.equal(state.phase, 'goalKick');
  assert.equal(state.ball.ownerId, 'home-gk');
  assert.ok(events.some((event) => event.type === 'keeperCatch'));
  let kickEvents = [];
  for (let i = 0; i < 24 && !kickEvents.some((event) => event.type === 'goalKick'); i += 1) {
    kickEvents = stepGame(state, frame(), 0.05);
  }
  assert.equal(state.phase, 'playing');
  assert.equal(state.ball.ownerId, null);
  assert.ok(state.ball.vx > 0);
  assert.ok(kickEvents.some((event) => event.type === 'goalKick'));
});

test('a goal restarts from the center for the conceding team', () => {
  const state = createInitialGameState();
  Object.assign(state.ball, { ownerId: null, x: FIELD.width - 1, y: 270, vx: 100, vy: 0, flightKind: 'shot', lastTouchTeam: 'home' });

  const events = stepGame(state, frame(), 0.05);

  assert.deepEqual(state.score, { home: 1, away: 0 });
  assert.equal(state.phase, 'goalPause');
  assert.ok(events.some((event) => event.type === 'goal' && event.team === 'home'));
  for (let i = 0; i < 20; i += 1) stepGame(state, frame(), 0.05);
  assert.equal(state.phase, 'playing');
  assert.equal(state.possessionTeam, 'away');
  assert.equal(state.ball.ownerId, 'away-fw');
  assert.deepEqual(state.score, { home: 1, away: 0 });
});

test('a golden-goal score immediately finishes the stage', () => {
  const state = createInitialGameState();
  state.phase = 'overtime';
  Object.assign(state.ball, { ownerId: null, x: FIELD.width - 1, y: 270, vx: 100, vy: 0, flightKind: 'shot', lastTouchTeam: 'home' });

  const events = stepGame(state, frame(), 0.05);

  assert.equal(state.phase, 'finished');
  assert.deepEqual(state.score, { home: 1, away: 0 });
  assert.ok(events.some((event) => event.type === 'matchWon'));
});

test('a tied regulation timer enters golden-goal overtime; a leader wins on time', () => {
  const tied = createInitialGameState();
  tied.remainingSeconds = 0.02;
  const overtimeEvents = stepGame(tied, frame(), 0.2);
  assert.equal(tied.phase, 'overtime');
  assert.equal(tied.remainingSeconds, 0);
  assert.ok(overtimeEvents.some((event) => event.type === 'overtime'));

  const leading = createInitialGameState();
  leading.remainingSeconds = 0.02;
  leading.score.home = 1;
  const result = stepGame(leading, frame(), 0.2);
  assert.equal(leading.phase, 'finished');
  assert.ok(result.some((event) => event.type === 'matchWon'));
});

test('the defensive A action can win possession with a short slide tackle', () => {
  const state = createInitialGameState();
  const defender = state.players.find((player) => player.id === 'home-fw');
  const opponent = state.players.find((player) => player.id === 'away-fw');
  defender.x = 470;
  opponent.x = 480;
  opponent.y = defender.y;
  state.ball.ownerId = opponent.id;
  state.ball.x = opponent.x;
  state.ball.y = opponent.y;
  state.possessionTeam = 'away';

  const events = stepGame(state, frame({ pressed: ['a'] }), 0.01);

  assert.equal(state.ball.ownerId, defender.id);
  assert.equal(state.possessionTeam, 'home');
  assert.ok(events.some((event) => event.type === 'tackle'));
});

test('defensive S switches through the six home players, including the goalkeeper', () => {
  const state = createInitialGameState();
  state.possessionTeam = 'away';
  state.ball.ownerId = 'away-fw';

  stepGame(state, frame({ pressed: ['s'] }), 0.01);

  assert.equal(state.controlledPlayerId, 'home-gk');
});

test('defensive D pressure moves the selected player toward the opponent carrier', () => {
  const state = createInitialGameState();
  const controlled = state.players.find((player) => player.id === 'home-fw');
  const opponent = state.players.find((player) => player.id === 'away-fw');
  controlled.x = 200;
  controlled.y = opponent.y;
  opponent.x = 700;
  state.possessionTeam = 'away';
  state.ball.ownerId = opponent.id;

  stepGame(state, frame({ down: ['d'] }), 0.05);

  assert.ok(controlled.x > 200);
});

test('the away AI advances toward the home goal and takes a shot in range', () => {
  const state = createInitialGameState();
  const opponent = state.players.find((player) => player.id === 'away-fw');
  opponent.x = 100;
  opponent.y = FIELD.height / 2 - 40;
  state.ball.ownerId = opponent.id;
  state.ball.x = opponent.x;
  state.ball.y = opponent.y;
  state.possessionTeam = 'away';

  const events = stepGame(state, frame(), 0.05);

  assert.equal(state.ball.ownerId, null);
  assert.equal(state.ball.flightKind, 'shot');
  assert.ok(state.ball.vx < 0);
  assert.ok(events.some((event) => event.type === 'shot' && event.team === 'away'));
});

test('clamps frame time and ignores a finished game', () => {
  const state = createInitialGameState();
  const player = state.players.find((candidate) => candidate.id === 'home-fw');
  const startX = player.x;
  stepGame(state, frame({ moveX: 1 }), 1);
  assert.ok(Math.abs(player.x - startX) <= 8.01);

  state.phase = 'finished';
  const frozenX = player.x;
  assert.deepEqual(stepGame(state, frame({ moveX: 1 }), 0.05), []);
  assert.equal(player.x, frozenX);
});
