import { prepareAudioContext } from './audioContext.js';
import { isGameAudioEnabled, subscribeGameAudio } from './audioSettings.js';

let crowdAudio = null;
let crowdAmbienceAudio = null;
const celebrationAudio = new Map();
let unsubscribeGameAudio = null;

const CELEBRATION_AUDIO_PATHS = {
  siuuu: ['/audio/celebrations/siuuu.mp3'],
  takeTheL: ['/audio/celebrations/take-the-l.mp3'],
  slickback: ['/audio/celebrations/slickback-a-pimp-named-slickback.mp3'],
  rko: ['/audio/celebrations/rko.mp3'],
};

function applyAudioEnabled(enabled) {
  if (crowdAudio) crowdAudio.muted = !enabled;
  if (crowdAmbienceAudio) crowdAmbienceAudio.muted = !enabled;
  for (const audios of celebrationAudio.values()) {
    for (const audio of audios) audio.muted = !enabled;
  }
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

function getCelebrationAudios(ceremonyId) {
  const paths = CELEBRATION_AUDIO_PATHS[ceremonyId];
  if (!paths || typeof window === 'undefined' || typeof window.Audio !== 'function') return null;
  if (celebrationAudio.has(ceremonyId)) return celebrationAudio.get(ceremonyId);
  try {
    const audios = paths.map((path) => {
      const audio = new window.Audio(path);
      audio.preload = 'auto';
      audio.muted = !isGameAudioEnabled();
      return audio;
    });
    celebrationAudio.set(ceremonyId, audios);
    subscribeToAudioSettings();
    return audios;
  } catch {
    return null;
  }
}

export function prepareMatchAudio() {
  const audio = getCrowdAudio();
  const ambience = getCrowdAmbienceAudio();
  const ceremonyClips = Object.keys(CELEBRATION_AUDIO_PATHS)
    .flatMap((ceremonyId) => getCelebrationAudios(ceremonyId) ?? []);
  try {
    audio?.load?.();
    ambience?.load?.();
    for (const clip of ceremonyClips) clip?.load?.();
  } catch {
    // Audio is optional; a missing or unsupported file must not interrupt a match.
  }
  prepareAudioContext();
}

export async function playGoalCelebrationAudio(ceremonyId) {
  if (!isGameAudioEnabled()) return false;
  const audios = getCelebrationAudios(ceremonyId);
  if (!audios) return false;
  try {
    await Promise.all(audios.map((audio) => {
      audio.pause?.();
      audio.currentTime = 0;
      audio.muted = false;
      return audio.play();
    }));
    return true;
  } catch {
    return false;
  }
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
