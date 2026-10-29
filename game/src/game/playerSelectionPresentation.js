const SELECTION_PULSE_SECONDS = 0.8;

export function didControlledPlayerChange(previousPlayerId, nextPlayerId) {
  return nextPlayerId != null && nextPlayerId !== previousPlayerId;
}

export function getSelectionPulseScale(elapsedSeconds) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0 || elapsedSeconds >= SELECTION_PULSE_SECONDS) return 1;
  return 1 + 0.35 * Math.sin(Math.PI * elapsedSeconds / SELECTION_PULSE_SECONDS);
}
