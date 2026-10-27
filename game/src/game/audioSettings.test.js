import assert from 'node:assert/strict';
import test from 'node:test';
import { isGameAudioEnabled, setGameAudioEnabled, subscribeGameAudio } from './audioSettings.js';

test('audio settings default to enabled and notify subscribers only when the value changes', () => {
  const previous = isGameAudioEnabled();
  const received = [];
  const unsubscribe = subscribeGameAudio((enabled) => received.push(enabled));

  try {
    assert.equal(received[0], true);
    assert.equal(setGameAudioEnabled(false), false);
    assert.equal(setGameAudioEnabled(false), false);
    assert.equal(setGameAudioEnabled(true), true);
    assert.deepEqual(received, [true, false, true]);
  } finally {
    unsubscribe();
    setGameAudioEnabled(previous);
  }
});
