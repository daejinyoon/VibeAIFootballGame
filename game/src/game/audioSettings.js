let gameAudioEnabled = true;
const listeners = new Set();

export function isGameAudioEnabled() {
  return gameAudioEnabled;
}

export function setGameAudioEnabled(enabled) {
  const nextEnabled = Boolean(enabled);
  if (nextEnabled === gameAudioEnabled) return gameAudioEnabled;

  gameAudioEnabled = nextEnabled;
  for (const listener of listeners) {
    try {
      listener(gameAudioEnabled);
    } catch {
      // A faulty audio sink must not prevent other outputs from updating.
    }
  }
  return gameAudioEnabled;
}

export function subscribeGameAudio(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  listener(gameAudioEnabled);
  return () => listeners.delete(listener);
}
