import { prepareAudioContext } from './audioContext.js';

let crowdAudio = null;

function getCrowdAudio() {
  if (typeof window === 'undefined' || typeof window.Audio !== 'function') return null;
  if (crowdAudio) return crowdAudio;
  try {
    crowdAudio = new window.Audio('/audio/crowd-cheering.mp3');
    crowdAudio.preload = 'auto';
    return crowdAudio;
  } catch {
    return null;
  }
}

export function prepareMatchAudio() {
  const audio = getCrowdAudio();
  try {
    audio?.load?.();
  } catch {
    // Audio is optional; a missing or unsupported file must not interrupt a match.
  }
  prepareAudioContext();
}

export async function playCrowdCheer(eventType) {
  if (!['kickoff', 'goal'].includes(eventType)) return false;
  const audio = getCrowdAudio();
  if (!audio) return false;
  try {
    audio.pause?.();
    audio.currentTime = 0;
    audio.volume = eventType === 'goal' ? 0.9 : 0.35;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}
