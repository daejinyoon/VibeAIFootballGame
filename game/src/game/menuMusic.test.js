import assert from 'node:assert/strict';
import test from 'node:test';
import { startMenuMusic, stopMenuMusic } from './menuMusic.js';
import { setGameAudioEnabled } from './audioSettings.js';

test('menu fanfare schedules one exact phrase, remains idempotent, and fades on stop', () => {
  const previousWindow = globalThis.window;
  const calls = { oscillators: [], gains: [], timers: new Map(), clearedTimers: [], nextTimerId: 0, resumes: 0 };

  class AudioParamMock {
    constructor() { this.value = 0; this.events = []; }
    setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
    linearRampToValueAtTime(value, time) { this.value = value; this.events.push(['linear', value, time]); }
    cancelScheduledValues(time) { this.events.push(['cancel', time]); }
  }
  class GainNodeMock {
    constructor() { this.gain = new AudioParamMock(); this.disconnected = false; calls.gains.push(this); }
    connect() { return this; }
    disconnect() { this.disconnected = true; }
  }
  class OscillatorMock {
    constructor() {
      this.frequency = new AudioParamMock();
      this.stopTimes = [];
      this.disconnected = false;
      calls.oscillators.push(this);
    }
    connect() { return this; }
    start(time) { this.startTime = time; }
    stop(time) { this.stopTimes.push(time); }
    disconnect() { this.disconnected = true; }
  }
  class AudioContextMock {
    constructor() { this.state = 'suspended'; this.currentTime = 10; this.destination = {}; }
    resume() { calls.resumes += 1; this.state = 'running'; return Promise.resolve(); }
    createGain() { return new GainNodeMock(); }
    createOscillator() { return new OscillatorMock(); }
  }
  const setTimeoutMock = (callback, delay) => {
    const id = ++calls.nextTimerId;
    calls.timers.set(id, { callback, delay });
    return id;
  };
  const clearTimeoutMock = (id) => {
    calls.clearedTimers.push(id);
    calls.timers.delete(id);
  };

  try {
    globalThis.window = {};
    assert.equal(startMenuMusic(), false);

    globalThis.window = {
      AudioContext: AudioContextMock,
      setTimeout: setTimeoutMock,
      clearTimeout: clearTimeoutMock,
    };
    assert.equal(startMenuMusic(), true);
    const schedulerTimer = [...calls.timers.keys()][0];
    assert.equal(startMenuMusic(), true);
    assert.equal(calls.resumes, 1);
    assert.equal(calls.gains.length, 26);
    assert.equal(calls.oscillators.length, 24);
    assert.equal(calls.timers.size, 1);
    assert.ok(calls.oscillators.some((oscillator) => oscillator.type === 'sawtooth'));
    assert.ok(calls.oscillators.some((oscillator) => oscillator.type === 'triangle'));
    const sharedOutput = calls.gains[1];
    setGameAudioEnabled(false);
    assert.equal(sharedOutput.gain.value, 0);
    setGameAudioEnabled(true);
    assert.equal(sharedOutput.gain.value, 1);
    assert.ok(Math.abs(calls.oscillators[0].frequency.events[0][1] - 261.6256) < 0.01);
    assert.equal(calls.oscillators[0].startTime, 10.05);
    assert.ok(Math.abs(calls.oscillators[0].stopTimes[0] - 11.055) < 1e-9);
    assert.ok(Math.abs(Math.max(...calls.oscillators.map((oscillator) => oscillator.startTime)) - 17.55) < 1e-9);

    const masterGain = calls.gains[0];
    stopMenuMusic();
    assert.deepEqual(calls.clearedTimers, [schedulerTimer]);
    assert.ok(masterGain.gain.events.some((event) => event[0] === 'linear'
      && event[1] === 0 && event[2] === 10.6));
    assert.ok(calls.oscillators.every((oscillator) => oscillator.stopTimes.at(-1) === 10.6));
    const nodeCount = calls.oscillators.length;
    stopMenuMusic();
    assert.equal(calls.oscillators.length, nodeCount);

    assert.equal(startMenuMusic(), true);
    assert.equal(calls.gains.length, 51);
    assert.equal(calls.oscillators.length, 48);
    stopMenuMusic();
    for (const { callback } of [...calls.timers.values()]) callback();
    assert.ok(masterGain.disconnected);
  } finally {
    stopMenuMusic();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
