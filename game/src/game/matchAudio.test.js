import assert from 'node:assert/strict';
import test from 'node:test';
import { playCrowdCheer, prepareMatchAudio } from './matchAudio.js';

test('crowd cheers prepare safely and replay with kickoff/goal volumes', async () => {
  const previousWindow = globalThis.window;
  const calls = { loads: 0, resumes: 0, plays: [], nextPlay: null };
  let audioInstance = null;

  class AudioMock {
    constructor(source) {
      this.src = source;
      this.currentTime = 9;
      this.volume = 1;
      this.preload = '';
      audioInstance = this;
    }
    load() { calls.loads += 1; }
    pause() {}
    play() {
      calls.plays.push({ volume: this.volume, currentTime: this.currentTime });
      const result = calls.nextPlay ?? Promise.resolve();
      calls.nextPlay = null;
      return result;
    }
  }
  class AudioContextMock {
    constructor() { this.state = 'suspended'; }
    resume() { calls.resumes += 1; this.state = 'running'; return Promise.resolve(); }
  }

  try {
    globalThis.window = {};
    assert.equal(await playCrowdCheer('goal'), false);

    globalThis.window = { Audio: AudioMock, AudioContext: AudioContextMock };
    prepareMatchAudio();
    assert.equal(calls.loads, 1);
    assert.equal(calls.resumes, 1);
    assert.equal(audioInstance.src, '/audio/crowd-cheering.mp3');
    assert.equal(audioInstance.preload, 'auto');

    assert.equal(await playCrowdCheer('kickoff'), true);
    assert.equal(await playCrowdCheer('goal'), true);
    assert.deepEqual(calls.plays, [
      { volume: 0.35, currentTime: 0 },
      { volume: 0.9, currentTime: 0 },
    ]);
    assert.equal(await playCrowdCheer('ordinary-frame'), false);

    calls.nextPlay = Promise.reject(new Error('Autoplay blocked'));
    assert.equal(await playCrowdCheer('goal'), false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
