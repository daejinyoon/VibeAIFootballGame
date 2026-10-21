import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialGameState } from './createInitialGameState.js';
import { drawGameFrame } from './drawGameFrame.js';

function createMockContext() {
  const calls = [];
  const context = {};

  for (const method of ['clearRect', 'fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo', 'arc', 'stroke']) {
    context[method] = (...args) => calls.push({ method, args, fillStyle: context.fillStyle });
  }

  return { context, calls };
}

test('draws the pitch, all players, and ball into the canvas context', () => {
  const state = createInitialGameState();
  const { context, calls } = createMockContext();

  drawGameFrame(context, state);

  assert.ok(calls.some((call) => call.method === 'clearRect' && call.args[2] === 960 && call.args[3] === 540));
  assert.ok(calls.filter((call) => call.method === 'strokeRect').length >= 8);
  assert.ok(calls.filter((call) => call.method === 'fillRect').length >= 30);
  assert.equal(calls.at(-1).method, 'fillRect');
});

test('draws the ball higher when it is in flight', () => {
  const state = createInitialGameState();
  const { context, calls } = createMockContext();
  state.ball.height = 80;

  drawGameFrame(context, state);

  const ballDraw = calls.slice(-2)[0];
  const ballSize = Math.min(16, 8 + state.ball.height * 0.08);
  assert.equal(ballDraw.method, 'fillRect');
  assert.equal(ballDraw.args[1], Math.round(state.ball.y - 80 - ballSize / 2));
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
