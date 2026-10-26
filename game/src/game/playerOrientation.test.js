import assert from 'node:assert/strict';
import test from 'node:test';
import { getPlayerFacingYaw } from './playerOrientation.js';

const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} ≈ ${expected}`);

test('falls back to each team forward direction for invalid input', () => {
  closeTo(getPlayerFacingYaw({ team: 'home' }, null), Math.PI / 2);
  closeTo(getPlayerFacingYaw({ team: 'away' }, null), -Math.PI / 2);
  assert.ok(Number.isFinite(getPlayerFacingYaw(null, null)));
});

test('non-carriers face the ball in all four field quadrants', () => {
  const player = { id: 'p', team: 'home', x: 10, y: 10 };
  const cases = [
    [{ x: 20, y: 20 }, Math.PI / 4],
    [{ x: 0, y: 20 }, -Math.PI / 4],
    [{ x: 0, y: 0 }, -3 * Math.PI / 4],
    [{ x: 20, y: 0 }, 3 * Math.PI / 4],
  ];
  for (const [ball, expected] of cases) {
    closeTo(getPlayerFacingYaw(player, { ...ball, ownerId: null }), expected);
  }
});

test('a moving carrier faces its velocity', () => {
  closeTo(getPlayerFacingYaw(
    { id: 'p', team: 'home', vx: 0, vy: -8 },
    { ownerId: 'p', x: 0, y: 0 },
  ), Math.PI);
});

test('a stationary carrier uses its stored facing direction', () => {
  closeTo(getPlayerFacingYaw(
    { id: 'p', team: 'home', vx: 0, vy: 0, facingX: 0, facingY: 1 },
    { ownerId: 'p', x: 0, y: 0 },
  ), 0);
});

test('coincident and invalid coordinates fall back without mutating inputs', () => {
  const player = { id: 'p', team: 'away', x: 5, y: 5 };
  const coincidentBall = { ownerId: null, x: 5, y: 5 };
  closeTo(getPlayerFacingYaw(player, coincidentBall), -Math.PI / 2);
  closeTo(getPlayerFacingYaw(player, { ownerId: null, x: Number.NaN, y: 0 }), -Math.PI / 2);
  assert.deepEqual(player, { id: 'p', team: 'away', x: 5, y: 5 });
  assert.deepEqual(coincidentBall, { ownerId: null, x: 5, y: 5 });
});
