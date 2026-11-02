export const GOAL_CELEBRATION_IDS = Object.freeze([
  'siuuu',
  'moonwalk',
  'takeTheL',
  'slickback',
  'rko',
]);

export const GOAL_CELEBRATION_DURATION_SECONDS = 5;

export const GOAL_CELEBRATION_OPTIONS = Object.freeze([
  Object.freeze({ id: 'siuuu', label: 'SIUUU' }),
  Object.freeze({ id: 'moonwalk', label: '문워크' }),
  Object.freeze({ id: 'takeTheL', label: 'L을 가져가' }),
  Object.freeze({ id: 'slickback', label: '슬릭백' }),
  Object.freeze({ id: 'rko', label: 'RKO' }),
]);

export const DEFAULT_GOAL_CELEBRATION_SETTINGS = Object.freeze({
  mode: 'random',
  ceremonyId: null,
});

export function normalizeGoalCelebrationSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_GOAL_CELEBRATION_SETTINGS };
  }

  if (value.mode === 'random') {
    return { mode: 'random', ceremonyId: null };
  }

  if (value.mode === 'specific' && GOAL_CELEBRATION_IDS.includes(value.ceremonyId)) {
    return { mode: 'specific', ceremonyId: value.ceremonyId };
  }

  return { ...DEFAULT_GOAL_CELEBRATION_SETTINGS };
}

export function selectGoalCelebrationId(value, random = Math.random) {
  const settings = normalizeGoalCelebrationSettings(value);
  if (settings.mode === 'specific') return settings.ceremonyId;

  const sample = Number(random());
  const boundedSample = Number.isFinite(sample)
    ? Math.min(0.999999, Math.max(0, sample))
    : 0;
  return GOAL_CELEBRATION_IDS[Math.floor(boundedSample * GOAL_CELEBRATION_IDS.length)];
}

export function assignRkoRoles(participantIds, random = Math.random) {
  if (!Array.isArray(participantIds) || participantIds.length !== 3
      || new Set(participantIds).size !== 3
      || participantIds.some((id) => typeof id !== 'string' || !id)) return null;

  const shuffled = [...participantIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const sample = Number(random());
    const boundedSample = Number.isFinite(sample)
      ? Math.min(0.999999, Math.max(0, sample))
      : 0;
    const swapIndex = Math.floor(boundedSample * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return {
    targetId: shuffled[0],
    strikerId: shuffled[1],
    finisherId: shuffled[2],
  };
}
