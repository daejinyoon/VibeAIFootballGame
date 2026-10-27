import assert from 'node:assert/strict';
import test from 'node:test';
import { playCrowdCheer, prepareMatchAudio, startCrowdAmbience, stopCrowdAmbience } from './matchAudio.js';
import { setGameAudioEnabled } from './audioSettings.js';

test('crowd cheers prepare safely and replay with kickoff/goal volumes', async () => {
  const previousWindow = globalThis.window;
  const calls = { loads: 0, resumes: 0, plays: [], nextPlay: null };
  const audioInstances = [];

  class AudioMock {
    constructor(source) {
      this.src = source;
      this.currentTime = 9;
      this.volume = 1;
      this.preload = '';
      this.paused = true;
      this.muted = false;
      this.loop = false;
      audioInstances.push(this);
    }
    load() { calls.loads += 1; }
    pause() { this.paused = true; }
    play() {
      calls.plays.push({ volume: this.volume, currentTime: this.currentTime });
      this.paused = false;
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
    assert.equal(calls.loads, 2);
    assert.equal(calls.resumes, 1);
    const crowdAudio = audioInstances.find((audio) => audio.src === '/audio/crowd-cheering.mp3');
    const ambienceAudio = audioInstances.find((audio) => audio.src === '/audio/crowd-ambience.mp3');
    assert.equal(crowdAudio.preload, 'auto');
    assert.equal(ambienceAudio.preload, 'auto');
    assert.equal(ambienceAudio.loop, true);
    assert.equal(ambienceAudio.volume, 0.16);

    assert.equal(await startCrowdAmbience(), true);
    assert.equal(calls.plays[0].volume, 0.16);
    assert.equal(ambienceAudio.paused, false);
    stopCrowdAmbience();
    assert.equal(ambienceAudio.paused, true);
    assert.equal(ambienceAudio.currentTime, 0);

    assert.equal(await playCrowdCheer('kickoff'), true);
    assert.equal(await playCrowdCheer('goal'), true);
    assert.deepEqual(calls.plays, [
      { volume: 0.16, currentTime: 0 },
      { volume: 0.35, currentTime: 0 },
      { volume: 0.9, currentTime: 0 },
    ]);
    assert.equal(await playCrowdCheer('ordinary-frame'), false);

    setGameAudioEnabled(false);
    assert.equal(crowdAudio.muted, true);
    assert.equal(ambienceAudio.muted, true);
    assert.equal(await playCrowdCheer('goal'), false);
    setGameAudioEnabled(true);
    assert.equal(crowdAudio.muted, false);
    assert.equal(ambienceAudio.muted, false);

    calls.nextPlay = Promise.reject(new Error('Autoplay blocked'));
    assert.equal(await playCrowdCheer('goal'), false);
  } finally {
    setGameAudioEnabled(true);
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
