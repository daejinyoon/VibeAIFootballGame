import assert from 'node:assert/strict';
import test from 'node:test';
import { FIELD } from './constants.js';
import { createInitialGameState } from './createInitialGameState.js';
import { drawGameFrame } from './drawGameFrame.js';

function createMockContext() {
  const calls = [];
  const context = {};

  for (const method of ['clearRect', 'fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo', 'arc', 'stroke', 'fill', 'closePath', 'rect', 'clip', 'save', 'restore']) {
    context[method] = (...args) => calls.push({ method, args, fillStyle: context.fillStyle });
  }
  context.fillText = (...args) => calls.push({ method: 'fillText', args, fillStyle: context.fillStyle });

  return { context, calls };
}

test('draws the pitch, all players, and ball into the canvas context', () => {
  const state = createInitialGameState();
  const { context, calls } = createMockContext();

  drawGameFrame(context, state);

  assert.ok(calls.some((call) => call.method === 'clearRect' && call.args[2] === 960 && call.args[3] === 540));
  assert.ok(calls.filter((call) => call.method === 'stroke').length >= 8);
  assert.ok(calls.filter((call) => call.method === 'fillRect').length >= 600);
  assert.ok(calls.some((call) => call.method === 'fillText' && call.args[0] === 'TIME'));
  assert.equal(calls.at(-1).method, 'fillText');
});

test('draws the ball higher when it is in flight', () => {
  const state = createInitialGameState();
  const { context, calls } = createMockContext();
  state.ball.height = 80;

  drawGameFrame(context, state);

  const ballDraw = calls.find((call) => call.method === 'fillRect' && call.fillStyle === '#fff6dc');
  const scale = 0.72 + 0.28 * (state.ball.y / FIELD.height);
  const depth = state.ball.y / FIELD.height;
  const ballSize = Math.min(16, (8 + state.ball.height * scale * 0.08) * scale);
  const projectedY = 92 + depth ** 1.22 * 443;
  assert.equal(ballDraw.method, 'fillRect');
  assert.equal(ballDraw.args[1], Math.round(projectedY - 80 * scale - ballSize / 2));
});

test('does not mutate the supplied game state', () => {
  const state = createInitialGameState();
  const snapshot = structuredClone(state);
  const { context } = createMockContext();

  drawGameFrame(context, state);

  assert.deepEqual(state, snapshot);
});

test('renders the vacuum effect and the player approaching an incoming skill shot', () => {
  const state = createInitialGameState();
  state.vacuumEffect = { playerId: 'home-fw', team: 'home', remainingSeconds: 0.3 };
  state.rainbowReflection = { playerId: 'home-gk', team: 'home', remainingSeconds: 1 };
  const { context, calls } = createMockContext();

  drawGameFrame(context, state);

  assert.ok(calls.some((call) => call.method === 'arc'));
  assert.ok(calls.some((call) => call.method === 'lineTo'));
});

test('requires a canvas context and valid game state', () => {
  assert.throws(() => drawGameFrame(null, createInitialGameState()), TypeError);
  assert.throws(() => drawGameFrame(createMockContext().context, {}), TypeError);
});

test('projects distant players smaller than nearby players and skips dismissed players', () => {
  const state = createInitialGameState();
  state.controlledPlayerId = null;
  const near = state.players.find((player) => player.id === 'home-def-1');
  const far = state.players.find((player) => player.id === 'home-def-2');
  near.x = 300;
  near.y = 490;
  far.x = 600;
  far.y = 50;
  for (const player of state.players) {
    if (player !== near && player !== far) player.dismissed = true;
  }
  const { context, calls } = createMockContext();

  drawGameFrame(context, state);

  const playerBodies = calls.filter((call) => call.method === 'fillRect' && call.fillStyle === '#64a8ff');
  assert.equal(playerBodies.length, 2);
  assert.ok(playerBodies[1].args[2] > playerBodies[0].args[2]);
  assert.ok(playerBodies[1].args[1] > playerBodies[0].args[1]);
});

test('keeps the scoreboard fixed under camera motion and draws deterministically', () => {
  const state = createInitialGameState();
  const snapshot = structuredClone(state);
  const first = createMockContext();
  const second = createMockContext();

  drawGameFrame(first.context, state, { cameraX: -75, cameraY: 28, score: { home: 2, away: 1 }, timeLabel: '42' });
  drawGameFrame(second.context, state, { cameraX: -75, cameraY: 28, score: { home: 2, away: 1 }, timeLabel: '42' });

  assert.deepEqual(first.calls, second.calls);
  assert.ok(first.calls.some((call) => call.method === 'fillText' && call.args[0] === '2' && call.args[1] === 305 && call.args[2] === 69));
  assert.ok(first.calls.some((call) => call.method === 'fillText' && call.args[0] === '42' && call.args[1] === 480));
  assert.deepEqual(state, snapshot);
});
