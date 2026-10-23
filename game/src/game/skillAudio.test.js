import test from 'node:test';
import assert from 'node:assert/strict';
import { playEulryongtaImpact, prepareSkillAudio } from './skillAudio.js';

test('Eulryongta audio safely does nothing when Web Audio is unavailable', () => {
  const previousWindow = globalThis.window;
  try {
    globalThis.window = {};
    assert.equal(prepareSkillAudio(), false);
    assert.equal(playEulryongtaImpact(), false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('Eulryongta audio prepares once and schedules a short impact', () => {
  const previousWindow = globalThis.window;
  const calls = { contexts: 0, sources: 0, oscillators: 0, buffers: 0, resumes: 0 };
  class AudioParamMock {
    setValueAtTime() {}
    exponentialRampToValueAtTime() {}
  }
  class AudioNodeMock {
    constructor() { this.gain = new AudioParamMock(); this.frequency = new AudioParamMock(); this.Q = new AudioParamMock(); }
    connect() { return this; }
    start() { calls.sources += 1; }
    stop() {}
  }
  class AudioContextMock {
    constructor() { calls.contexts += 1; this.state = 'suspended'; this.currentTime = 1; this.sampleRate = 1000; this.destination = {}; }
    resume() { calls.resumes += 1; this.state = 'running'; return Promise.resolve(); }
    createBuffer() { calls.buffers += 1; return { getChannelData: () => new Float32Array(100) }; }
    createBufferSource() { return new AudioNodeMock(); }
    createBiquadFilter() { return new AudioNodeMock(); }
    createGain() { return new AudioNodeMock(); }
    createOscillator() { calls.oscillators += 1; return new AudioNodeMock(); }
  }
  try {
    globalThis.window = { AudioContext: AudioContextMock };
    assert.equal(prepareSkillAudio(), true);
    assert.equal(playEulryongtaImpact(), true);
    assert.equal(calls.contexts, 1);
    assert.equal(calls.resumes, 1);
    assert.equal(calls.buffers, 1);
    assert.equal(calls.sources, 2);
    assert.equal(calls.oscillators, 1);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
