import { isGameAudioEnabled, subscribeGameAudio } from './audioSettings.js';

let audioContext = null;
let audioOutputContext = null;
let audioOutputNode = null;

function applyAudioOutputEnabled(enabled) {
  if (!audioOutputNode || !audioOutputContext) return;
  try {
    audioOutputNode.gain.setValueAtTime(enabled ? 1 : 0, audioOutputContext.currentTime ?? 0);
  } catch {
    try {
      audioOutputNode.gain.value = enabled ? 1 : 0;
    } catch {
      // Audio output may have been disconnected during context shutdown.
    }
  }
}

subscribeGameAudio(applyAudioOutputEnabled);

export function getAudioContext() {
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

export function prepareAudioContext() {
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

export function getAudioOutputNode(context = getAudioContext()) {
  if (!context) return null;
  if (audioOutputNode && audioOutputContext === context) return audioOutputNode;
  if (typeof context.createGain !== 'function') return context.destination ?? null;

  try {
    audioOutputContext = context;
    audioOutputNode = context.createGain();
    audioOutputNode.gain.setValueAtTime(isGameAudioEnabled() ? 1 : 0, context.currentTime ?? 0);
    audioOutputNode.connect(context.destination);
    return audioOutputNode;
  } catch {
    audioOutputContext = null;
    audioOutputNode = null;
    return context.destination ?? null;
  }
}
