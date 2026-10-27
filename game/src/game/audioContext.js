let audioContext = null;

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
