import assert from 'node:assert/strict';
import test from 'node:test';
import { getPlayerEdgeIndicatorPlacement } from './playerSelectionIndicator.js';

const viewport = { ndcZ: 0, behindCamera: false, width: 800, height: 450 };

test('returns null while the player is inside the visible camera frustum', () => {
  assert.equal(getPlayerEdgeIndicatorPlacement({ ...viewport, ndcX: 0.4, ndcY: -0.2 }), null);
});

test('places an off-screen player at the nearest inset edge and points toward it', () => {
  const right = getPlayerEdgeIndicatorPlacement({ ...viewport, ndcX: 2, ndcY: 0 });
  assert.deepEqual(right, { left: 780, top: 225, rotationDeg: 90 });

  const topLeft = getPlayerEdgeIndicatorPlacement({ ...viewport, ndcX: -2, ndcY: 2 });
  assert.ok(topLeft.left >= 20 && topLeft.left <= 780);
  assert.ok(topLeft.top >= 20 && topLeft.top <= 430);
  assert.ok(topLeft.rotationDeg < 0);
});

test('inverts projected direction for targets behind the camera', () => {
  const aheadRight = getPlayerEdgeIndicatorPlacement({ ...viewport, ndcX: 2, ndcY: 0 });
  const behindRight = getPlayerEdgeIndicatorPlacement({ ...viewport, ndcX: 2, ndcY: 0, behindCamera: true });
  assert.equal(aheadRight.left, 780);
  assert.equal(behindRight.left, 20);
  assert.equal(behindRight.rotationDeg, -90);
});

test('clamps inset for narrow viewports and rejects invalid projections', () => {
  const narrow = getPlayerEdgeIndicatorPlacement({
    ndcX: 0, ndcY: 2, ndcZ: 0, behindCamera: false, width: 24, height: 30, inset: 20,
  });
  assert.equal(narrow.left, 12);
  assert.equal(narrow.top, 11);

  assert.equal(getPlayerEdgeIndicatorPlacement({ ...viewport, ndcX: Number.NaN, ndcY: 2 }), null);
  assert.equal(getPlayerEdgeIndicatorPlacement({ ...viewport, ndcX: 2, ndcY: 2, width: 0 }), null);
});
