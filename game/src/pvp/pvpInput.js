import { GAME_KEYS } from '../game/createInputController.js';

const AXES = new Set([-1, 0, 1]);

function validAxis(value) {
  return Number.isInteger(value) && AXES.has(value);
}

function validKeySet(value) {
  if (!(value instanceof Set) && !Array.isArray(value)) return null;
  const keys = [...value];
  if (keys.length > GAME_KEYS.size || new Set(keys).size !== keys.length
      || !keys.every((key) => typeof key === 'string' && GAME_KEYS.has(key))) return null;
  return keys.sort();
}

export function serializeInputFrame(frame, sequence) {
  if (!Number.isSafeInteger(sequence) || sequence < 0
      || !frame || typeof frame !== 'object'
      || !validAxis(frame.moveX) || !validAxis(frame.moveY)) return null;
  const down = validKeySet(frame.down);
  const pressed = validKeySet(frame.pressed);
  const released = validKeySet(frame.released);
  if (!down || !pressed || !released) return null;
  return { type: 'input', sequence, frame: { moveX: frame.moveX, moveY: frame.moveY, down, pressed, released } };
}

export function deserializeInputFrame(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message)
      || Object.keys(message).some((key) => !['type', 'sequence', 'frame'].includes(key))
      || message.type !== 'input' || !Number.isSafeInteger(message.sequence) || message.sequence < 0) return null;
  const frame = message.frame;
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)
      || Object.keys(frame).some((key) => !['moveX', 'moveY', 'down', 'pressed', 'released'].includes(key))
      || !validAxis(frame.moveX) || !validAxis(frame.moveY)) return null;
  const down = validKeySet(frame.down);
  const pressed = validKeySet(frame.pressed);
  const released = validKeySet(frame.released);
  if (!down || !pressed || !released) return null;
  return {
    type: 'input',
    sequence: message.sequence,
    frame: { moveX: frame.moveX, moveY: frame.moveY, down: new Set(down), pressed: new Set(pressed), released: new Set(released) },
  };
}

function neutralFrame() {
  return { moveX: 0, moveY: 0, down: new Set(), pressed: new Set(), released: new Set() };
}

export function createPvpInputBuffer() {
  let lastSequence = -1;
  let held = neutralFrame();
  const pendingPressed = new Set();
  const pendingReleased = new Set();

  return {
    push(message) {
      const decoded = deserializeInputFrame(message);
      if (!decoded || decoded.sequence <= lastSequence) return false;
      lastSequence = decoded.sequence;
      held = {
        moveX: decoded.frame.moveX,
        moveY: decoded.frame.moveY,
        down: decoded.frame.down,
        pressed: new Set(),
        released: new Set(),
      };
      for (const key of decoded.frame.pressed) pendingPressed.add(key);
      for (const key of decoded.frame.released) pendingReleased.add(key);
      return true;
    },
    readFrame() {
      const frame = {
        moveX: held.moveX,
        moveY: held.moveY,
        down: new Set(held.down),
        pressed: new Set(pendingPressed),
        released: new Set(pendingReleased),
      };
      pendingPressed.clear();
      pendingReleased.clear();
      return frame;
    },
    reset() {
      lastSequence = -1;
      held = neutralFrame();
      pendingPressed.clear();
      pendingReleased.clear();
    },
  };
}
