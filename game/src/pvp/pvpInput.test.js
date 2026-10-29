import test from 'node:test';
import assert from 'node:assert/strict';
import { createPvpInputBuffer, deserializeInputFrame, serializeInputFrame } from './pvpInput.js';

const frame = (overrides = {}) => ({ moveX: 0, moveY: 0, down: new Set(), pressed: new Set(), released: new Set(), ...overrides });

test('input frames serialize Sets in sorted order and round-trip to Sets', () => {
  const message = serializeInputFrame(frame({ moveX: -1, down: new Set(['e', 'ArrowLeft']), pressed: new Set(['s']) }), 4);
  assert.deepEqual(message, {
    type: 'input', sequence: 4,
    frame: { moveX: -1, moveY: 0, down: ['ArrowLeft', 'e'], pressed: ['s'], released: [] },
  });
  const decoded = deserializeInputFrame(message);
  assert.ok(decoded.frame.down instanceof Set);
  assert.deepEqual([...decoded.frame.down], ['ArrowLeft', 'e']);
});

test('invalid axes, sequence values, and unknown keys are rejected without throwing', () => {
  assert.equal(serializeInputFrame(frame({ moveX: 2 }), 0), null);
  assert.equal(serializeInputFrame(frame(), -1), null);
  assert.equal(serializeInputFrame(frame({ pressed: new Set(['Space']) }), 0), null);
  assert.equal(deserializeInputFrame({ type: 'input', sequence: 1, frame: { ...serializeInputFrame(frame(), 1).frame, released: ['Unknown'] } }), null);
});

test('buffer keeps the newest held state, consumes input edges once, and rejects replayed sequence numbers', () => {
  const buffer = createPvpInputBuffer();
  assert.deepEqual(buffer.readFrame(), frame());
  assert.equal(buffer.push(serializeInputFrame(frame({ moveX: 1, down: new Set(['e']), pressed: new Set(['s']) }), 2)), true);
  assert.equal(buffer.push(serializeInputFrame(frame({ moveX: -1, released: new Set(['e']) }), 2)), false);
  assert.equal(buffer.push({ type: 'input', sequence: 1, frame: {} }), false);
  assert.deepEqual(buffer.readFrame(), frame({ moveX: 1, down: new Set(['e']), pressed: new Set(['s']) }));
  assert.deepEqual(buffer.readFrame(), frame({ moveX: 1, down: new Set(['e']) }));
  assert.equal(buffer.push(serializeInputFrame(frame({ moveY: 1, released: new Set(['e']) }), 3)), true);
  assert.deepEqual(buffer.readFrame(), frame({ moveY: 1, released: new Set(['e']) }));
  buffer.reset();
  assert.equal(buffer.push(serializeInputFrame(frame(), 0)), true);
});
