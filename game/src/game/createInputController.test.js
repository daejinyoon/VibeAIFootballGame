import assert from 'node:assert/strict';
import test from 'node:test';
import { createInputController } from './createInputController.js';

function createFakeWindow() {
  const listeners = new Map();
  return {
    addEventListener(name, listener) {
      const set = listeners.get(name) ?? new Set();
      set.add(listener);
      listeners.set(name, set);
    },
    removeEventListener(name, listener) {
      listeners.get(name)?.delete(listener);
    },
    emit(name, event) {
      for (const listener of listeners.get(name) ?? []) listener(event);
    },
    listenerCount() {
      return [...listeners.values()].reduce((sum, set) => sum + set.size, 0);
    },
  };
}

test('reads held movement keys and one-frame press/release edges', () => {
  const target = createFakeWindow();
  const controller = createInputController(target);
  let prevented = false;
  const event = (key) => ({ key, preventDefault: () => { prevented = true; } });

  target.emit('keydown', event('ArrowRight'));
  target.emit('keydown', event('A'));
  let frame = controller.readFrame();
  assert.equal(frame.moveX, 1);
  assert.ok(frame.down.has('a'));
  assert.ok(frame.pressed.has('a'));
  assert.equal(prevented, true);

  frame = controller.readFrame();
  assert.equal(frame.pressed.size, 0);
  assert.ok(frame.down.has('a'));

  target.emit('keyup', event('A'));
  frame = controller.readFrame();
  assert.ok(frame.released.has('a'));
  assert.ok(!frame.down.has('a'));
  controller.destroy();
});

test('clears held keys on window blur and when disabled', () => {
  const target = createFakeWindow();
  const controller = createInputController(target);
  const event = { key: 'ArrowUp', preventDefault() {} };

  target.emit('keydown', event);
  target.emit('blur', {});
  assert.equal(controller.readFrame().moveY, 0);

  controller.setEnabled(false);
  target.emit('keydown', { ...event, key: 'ArrowDown' });
  assert.equal(controller.readFrame().moveY, 0);
  controller.destroy();
  assert.equal(target.listenerCount(), 0);
});

test('does not cancel browser behavior for unrelated keys', () => {
  const target = createFakeWindow();
  const controller = createInputController(target);
  let prevented = false;
  target.emit('keydown', { key: 'Tab', preventDefault: () => { prevented = true; } });

  assert.equal(prevented, false);
  controller.destroy();
});
