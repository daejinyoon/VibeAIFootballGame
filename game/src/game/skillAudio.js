let audioContext = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  if (audioContext instanceof AudioContextConstructor) return audioContext;
  audioContext = null;
  try {
    audioContext = new AudioContextConstructor();
    return audioContext;
  } catch {
    return null;
  }
}
/** Create/resume audio from the skill key gesture before the simulation event fires. */
export function prepareSkillAudio() {
  const context = getAudioContext();
  if (!context || context.state === 'running') return Boolean(context);
  try {
    const resume = context.resume?.();
    resume?.catch?.(() => {});
    return true;
  } catch {
    return false;
  }
}

/** A short, game-like palm impact made locally with Web Audio (no downloaded asset). */
export function playEulryongtaImpact() {
  const context = getAudioContext();
  if (!context) return false;
  try {
    if (context.state !== 'running') {
      const resume = context.resume?.();
      resume?.catch?.(() => {});
    }
    const startAt = context.currentTime + 0.005;
    const duration = 0.085;
    const frames = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) {
      const envelope = 1 - index / frames;
      samples[index] = (Math.random() * 2 - 1) * envelope * envelope;
    }

    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, startAt);
    filter.Q.setValueAtTime(0.8, startAt);
    noiseGain.gain.setValueAtTime(0.0001, startAt);
    noiseGain.gain.exponentialRampToValueAtTime(0.34, startAt + 0.006);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    noise.connect(filter).connect(noiseGain).connect(context.destination);
    noise.start(startAt);
    noise.stop(startAt + duration);

    const body = context.createOscillator();
    const bodyGain = context.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(145, startAt);
    body.frequency.exponentialRampToValueAtTime(62, startAt + 0.075);
    bodyGain.gain.setValueAtTime(0.0001, startAt);
    bodyGain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.09);
    body.connect(bodyGain).connect(context.destination);
    body.start(startAt);
    body.stop(startAt + 0.095);
    return true;
  } catch {
    return false;
  }
}

function disconnectWhenEnded(node) {
  if (node) node.onended = () => { try { node.disconnect?.(); } catch { /* silent cleanup */ } };
}

function scheduleTone(context, { startAt, duration, fromHz, toHz, type = 'sine', volume = 0.16, delay = 0 }) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = startAt + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(fromHz, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.025, duration * 0.18));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  disconnectWhenEnded(oscillator);
  disconnectWhenEnded(gain);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.005);
}

function scheduleNoise(context, { startAt, duration, fromHz, toHz, type = 'bandpass', volume = 0.1 }) {
  const frames = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < frames; index += 1) {
    const fadeIn = Math.min(1, index / Math.max(1, context.sampleRate * 0.015));
    const fadeOut = 1 - index / frames;
    samples[index] = (Math.random() * 2 - 1) * fadeIn * fadeOut * 0.75;
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = type;
  filter.frequency.setValueAtTime(fromHz, startAt);
  filter.frequency.exponentialRampToValueAtTime(Math.max(1, toHz), startAt + duration);
  filter.Q.setValueAtTime(0.8, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + Math.min(0.025, duration * 0.15));
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  source.connect(filter).connect(gain).connect(context.destination);
  disconnectWhenEnded(source);
  disconnectWhenEnded(filter);
  disconnectWhenEnded(gain);
  source.start(startAt);
  source.stop(startAt + duration + 0.005);
}

/** Play one bounded, locally synthesized sound for an accepted skill event. */
export function playSkillAudio(skillId) {
  if (skillId === 'eulryongta') return playEulryongtaImpact();
  if (!['eagleShot', 'tornadoShot', 'powerTackle', 'vacuumCleaner', 'rainbowReflect'].includes(skillId)) return false;
  const context = getAudioContext();
  if (!context) return false;
  try {
    if (context.state !== 'running') {
      const resume = context.resume?.();
      resume?.catch?.(() => {});
    }
    const startAt = context.currentTime + 0.008;
    if (skillId === 'eagleShot') {
      scheduleTone(context, { startAt, duration: 0.52, fromHz: 270, toHz: 1180, type: 'triangle', volume: 0.18 });
      scheduleTone(context, { startAt, delay: 0.06, duration: 0.38, fromHz: 530, toHz: 1560, type: 'sine', volume: 0.08 });
    } else if (skillId === 'tornadoShot') {
      scheduleNoise(context, { startAt, duration: 0.82, fromHz: 850, toHz: 120, type: 'bandpass', volume: 0.13 });
      scheduleTone(context, { startAt, duration: 0.78, fromHz: 145, toHz: 62, type: 'sawtooth', volume: 0.09 });
    } else if (skillId === 'powerTackle') {
      scheduleNoise(context, { startAt, duration: 0.24, fromHz: 1250, toHz: 150, type: 'lowpass', volume: 0.2 });
      scheduleTone(context, { startAt, duration: 0.34, fromHz: 112, toHz: 42, type: 'sawtooth', volume: 0.16 });
    } else if (skillId === 'vacuumCleaner') {
      scheduleNoise(context, { startAt, duration: 0.72, fromHz: 760, toHz: 95, type: 'lowpass', volume: 0.12 });
      scheduleTone(context, { startAt, duration: 0.68, fromHz: 620, toHz: 105, type: 'sine', volume: 0.085 });
    } else {
      [392, 523, 659, 784, 1046].forEach((frequency, index) => {
        scheduleTone(context, { startAt, delay: index * 0.055, duration: 0.3, fromHz: frequency, toHz: frequency * 1.08, type: 'sine', volume: 0.07 });
      });
    }
    return true;
  } catch {
    return false;
  }
}

