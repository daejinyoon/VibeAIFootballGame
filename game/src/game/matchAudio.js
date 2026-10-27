import { prepareAudioContext } from './audioContext.js';
import { isGameAudioEnabled, subscribeGameAudio } from './audioSettings.js';

let crowdAudio = null;
let crowdAmbienceAudio = null;
let unsubscribeGameAudio = null;

function applyAudioEnabled(enabled) {
  if (crowdAudio) crowdAudio.muted = !enabled;
  if (crowdAmbienceAudio) crowdAmbienceAudio.muted = !enabled;
}

function subscribeToAudioSettings() {
  if (!unsubscribeGameAudio) unsubscribeGameAudio = subscribeGameAudio(applyAudioEnabled);
}

function getCrowdAudio() {
  if (typeof window === 'undefined' || typeof window.Audio !== 'function') return null;
  if (crowdAudio) return crowdAudio;
  try {
    crowdAudio = new window.Audio('/audio/crowd-cheering.mp3');
    crowdAudio.preload = 'auto';
    crowdAudio.muted = !isGameAudioEnabled();
    subscribeToAudioSettings();
    return crowdAudio;
  } catch {
    return null;
  }
}

function getCrowdAmbienceAudio() {
  if (typeof window === 'undefined' || typeof window.Audio !== 'function') return null;
  if (crowdAmbienceAudio) return crowdAmbienceAudio;
  try {
    crowdAmbienceAudio = new window.Audio('/audio/crowd-ambience.mp3');
    crowdAmbienceAudio.preload = 'auto';
    crowdAmbienceAudio.loop = true;
    crowdAmbienceAudio.volume = 0.16;
    crowdAmbienceAudio.muted = !isGameAudioEnabled();
    subscribeToAudioSettings();
    return crowdAmbienceAudio;
  } catch {
    return null;
  }
}

export function prepareMatchAudio() {
  const audio = getCrowdAudio();
  const ambience = getCrowdAmbienceAudio();
  try {
    audio?.load?.();
    ambience?.load?.();
  } catch {
    // Audio is optional; a missing or unsupported file must not interrupt a match.
  }
  prepareAudioContext();
}

export async function startCrowdAmbience() {
  const audio = getCrowdAmbienceAudio();
  if (!audio) return false;
  audio.muted = !isGameAudioEnabled();
  if (!audio.paused) return true;
  try {
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

export function stopCrowdAmbience() {
  const audio = crowdAmbienceAudio;
  if (!audio) return;
  try {
    audio?.pause?.();
    if (audio) audio.currentTime = 0;
  } catch {
    // Ambient audio is optional; failure to stop it must not interrupt a match.
  }
}

export async function playCrowdCheer(eventType) {
  if (!isGameAudioEnabled() || !['kickoff', 'goal'].includes(eventType)) return false;
  const audio = getCrowdAudio();
  if (!audio) return false;
  try {
    audio.pause?.();
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = eventType === 'goal' ? 0.9 : 0.35;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}
