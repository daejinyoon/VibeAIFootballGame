let audioContext = null;

function getAudioContext() {
  if (audioContext) return audioContext;
  if (typeof window === 'undefined') return null;
  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextConstructor) return null;
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

