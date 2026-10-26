import test from 'node:test';
import assert from 'node:assert/strict';
import { playEulryongtaImpact, playSkillAudio, prepareSkillAudio } from './skillAudio.js';

test('Eulryongta audio safely does nothing when Web Audio is unavailable', () => {
  const previousWindow = globalThis.window;
  try {
    globalThis.window = {};
    assert.equal(prepareSkillAudio(), false);
    assert.equal(playEulryongtaImpact(), false);
    assert.equal(playSkillAudio('eagleShot'), false);
    assert.equal(playSkillAudio('unknown'), false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('each supported skill schedules a distinct bounded Web Audio cue', () => {
  const previousWindow = globalThis.window;
  const calls = { oscillators: [], buffers: 0, stops: [] };
  class AudioParamMock {
    constructor(owner, field) { this.owner = owner; this.field = field; }
    setValueAtTime(value) { this.owner[this.field].push(value); }
    exponentialRampToValueAtTime(value) { this.owner[this.field].push(value); }
  }
  class AudioNodeMock {
    constructor(kind) {
      this.kind = kind;
      this.frequencyValues = [];
      this.gainValues = [];
      this.frequency = new AudioParamMock(this, 'frequencyValues');
      this.gain = new AudioParamMock(this, 'gainValues');
      this.Q = new AudioParamMock(this, 'qValues');
      this.qValues = [];
    }
    connect() { return this; }
    disconnect() {}
    start() {}
    stop(time) { calls.stops.push(time); }
  }
  class AudioContextMock {
    constructor() { this.state = 'running'; this.currentTime = 1; this.sampleRate = 1000; this.destination = {}; }
    resume() { return Promise.resolve(); }
    createBuffer() { calls.buffers += 1; return { getChannelData: () => new Float32Array(1000) }; }
    createBufferSource() { return new AudioNodeMock('buffer'); }
    createBiquadFilter() { return new AudioNodeMock('filter'); }
    createGain() { return new AudioNodeMock('gain'); }
    createOscillator() {
      const oscillator = new AudioNodeMock('oscillator');
      calls.oscillators.push(oscillator);
      return oscillator;
    }
  }
  try {
    globalThis.window = { AudioContext: AudioContextMock };
    const skills = ['eagleShot', 'tornadoShot', 'eulryongta', 'vacuumCleaner'];
    for (const skillId of skills) assert.equal(playSkillAudio(skillId), true);
    assert.equal(playSkillAudio('unsupported'), false);
    assert.ok(calls.oscillators.length >= skills.length);
    assert.ok(calls.buffers >= 2);
    assert.ok(calls.stops.every((time) => time <= 2.21));
    const toneSignatures = new Set(calls.oscillators.map((node) => `${node.type}:${node.frequencyValues.join(',')}`));
    assert.ok(toneSignatures.size >= 5);
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
