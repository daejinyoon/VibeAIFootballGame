import { getAudioContext, getAudioOutputNode, prepareAudioContext } from './audioContext.js';

const BEAT_SECONDS = 0.5;
const PHRASE_SECONDS = 8;
const LOOKAHEAD_SECONDS = 1;
const STOP_FADE_SECONDS = 0.6;
const MASTER_VOLUME = 0.12;

const FANFARE_PHRASE = [
  { midi: [60, 64, 67, 72], beats: 2 }, { midi: [79], beats: 1 }, { midi: [84], beats: 1 },
  { midi: [62, 65, 69, 74], beats: 2 }, { midi: [81], beats: 1 }, { midi: [86], beats: 1 },
  { midi: [55, 59, 62, 67], beats: 2 }, { midi: [79], beats: 1 }, { midi: [83], beats: 1 },
  { midi: [60, 64, 67, 72], beats: 2 }, { midi: [76], beats: 1 }, { midi: [84], beats: 1 },
];

let menuSession = null;

function disconnectNode(node) {
  try {
    node?.disconnect?.();
  } catch {
    // A node may already have been disconnected by its ended callback.
  }
}

function scheduleNote(session, midi, isLead, startTime, durationSeconds) {
  const { context } = session;
  let oscillator;
  let noteGain;
  let scheduledNode;
  try {
    oscillator = context.createOscillator();
    noteGain = context.createGain();
    const endTime = startTime + durationSeconds;
    const attackEnd = Math.min(endTime, startTime + 0.03);
    const releaseStart = Math.max(attackEnd, endTime - 0.12);
    const frequency = 440 * (2 ** ((midi - 69) / 12));
    oscillator.type = isLead ? 'sawtooth' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, startTime);
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(isLead ? 0.2 : 0.09, attackEnd);
    noteGain.gain.setValueAtTime(isLead ? 0.2 : 0.09, releaseStart);
    noteGain.gain.linearRampToValueAtTime(0, endTime);
    oscillator.connect(noteGain).connect(session.masterGain);

    scheduledNode = { oscillator, noteGain };
    session.nodes.add(scheduledNode);
    oscillator.onended = () => {
      disconnectNode(oscillator);
      disconnectNode(noteGain);
      session.nodes.delete(scheduledNode);
    };
    oscillator.start(startTime);
    oscillator.stop(endTime + 0.005);
  } catch {
    if (scheduledNode) session.nodes.delete(scheduledNode);
    try {
      oscillator?.stop(context.currentTime);
    } catch {
      // The oscillator may not have started yet.
    }
    disconnectNode(oscillator);
    disconnectNode(noteGain);
  }
}

function schedulePhrase(session, phraseStart) {
  let cursor = phraseStart;
  for (const chord of FANFARE_PHRASE) {
    const durationSeconds = chord.beats * BEAT_SECONDS;
    const leadNote = Math.max(...chord.midi);
    for (const midi of chord.midi) {
      scheduleNote(session, midi, midi === leadNote, cursor, durationSeconds);
    }
    cursor += durationSeconds;
  }
}

function scheduleNextPhrase(session) {
  if (!session.active || menuSession !== session) return;
  const { context } = session;
  const minimumStart = context.currentTime + 0.05;
  while (session.nextPhraseStart < minimumStart) session.nextPhraseStart += PHRASE_SECONDS;
  schedulePhrase(session, session.nextPhraseStart);
  session.nextPhraseStart += PHRASE_SECONDS;

  const delay = Math.max(50,
    (session.nextPhraseStart - context.currentTime - LOOKAHEAD_SECONDS) * 1000);
  session.timer = window.setTimeout(() => {
    session.timer = null;
    scheduleNextPhrase(session);
  }, delay);
}

function clearSession(session) {
  for (const { oscillator, noteGain } of session.nodes) {
    disconnectNode(oscillator);
    disconnectNode(noteGain);
  }
  session.nodes.clear();
  disconnectNode(session.masterGain);
  session.masterGain = null;
  session.cleanupTimer = null;
}

export function startMenuMusic() {
  if (typeof window === 'undefined') return false;
  if (menuSession?.active) {
    prepareAudioContext();
    return true;
  }

  const context = getAudioContext();
  if (!context) return false;
  prepareAudioContext();

  let masterGain;
  try {
    masterGain = context.createGain();
    masterGain.gain.setValueAtTime(MASTER_VOLUME, context.currentTime);
    masterGain.connect(getAudioOutputNode(context));
  } catch {
    disconnectNode(masterGain);
    return false;
  }

  const session = {
    active: true,
    context,
    masterGain,
    nodes: new Set(),
    timer: null,
    cleanupTimer: null,
    nextPhraseStart: context.currentTime + 0.05,
  };
  menuSession = session;
  scheduleNextPhrase(session);
  return true;
}

export function stopMenuMusic() {
  const session = menuSession;
  if (!session?.active) return;
  session.active = false;
  menuSession = null;
  if (session.timer !== null) window.clearTimeout(session.timer);
  session.timer = null;

  const now = session.context.currentTime;
  try {
    const gain = session.masterGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0, now + STOP_FADE_SECONDS);
  } catch {
    // Stop the scheduled notes below even if a browser rejects gain automation.
  }
  for (const { oscillator } of session.nodes) {
    try {
      oscillator.stop(now + STOP_FADE_SECONDS);
    } catch {
      // A note may already have ended naturally.
    }
  }

  session.cleanupTimer = window.setTimeout(() => clearSession(session), STOP_FADE_SECONDS * 1000 + 50);
}
