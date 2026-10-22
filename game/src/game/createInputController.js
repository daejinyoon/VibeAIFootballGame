const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'a', 's', 'd', 'f', 'Escape', 'Space',
]);

function normalizeKey(key) {
  if (key === ' ') return 'Space';
  if (key.startsWith('Arrow') || key === 'Escape') return key;
  return key.length === 1 ? key.toLowerCase() : key;
}

function axis(positive, negative) {
  return Number(positive) - Number(negative);
}

/** Track just the keyboard state needed by a focused match screen. */
export function createInputController(targetWindow = typeof window === 'undefined' ? null : window) {
  const down = new Set();
  const pressed = new Set();
  const released = new Set();
  let enabled = true;

  const handleKeyDown = (event) => {
    const key = event.code === 'Space' ? 'Space' : normalizeKey(event.key);
    if (!enabled || !GAME_KEYS.has(key)) return;
    event.preventDefault?.();
    if (!down.has(key)) pressed.add(key);
    down.add(key);
  };

  const handleKeyUp = (event) => {
    const key = event.code === 'Space' ? 'Space' : normalizeKey(event.key);
    if (!enabled || !GAME_KEYS.has(key)) return;
    event.preventDefault?.();
    if (down.delete(key)) released.add(key);
  };

  const clearKeys = () => {
    down.clear();
    pressed.clear();
    released.clear();
  };

  targetWindow?.addEventListener('keydown', handleKeyDown);
  targetWindow?.addEventListener('keyup', handleKeyUp);
  targetWindow?.addEventListener('blur', clearKeys);

  return {
    readFrame() {
      const frame = {
        moveX: axis(down.has('ArrowRight'), down.has('ArrowLeft')),
        moveY: axis(down.has('ArrowDown'), down.has('ArrowUp')),
        down: new Set(down),
        pressed: new Set(pressed),
        released: new Set(released),
      };
      pressed.clear();
      released.clear();
      return frame;
    },
    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      if (!enabled) clearKeys();
    },
    destroy() {
      clearKeys();
      targetWindow?.removeEventListener('keydown', handleKeyDown);
      targetWindow?.removeEventListener('keyup', handleKeyUp);
      targetWindow?.removeEventListener('blur', clearKeys);
    },
  };
}
