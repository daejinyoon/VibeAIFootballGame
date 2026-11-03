const CHALLENGE_TIME_ZONE = 'Asia/Seoul';
const PRESET_COUNT = 7;
const MAX_LEADERBOARD_ROWS = 100;
const DAILY_CHALLENGE_SKILLS = Object.freeze([
  'eagleShot',
  'tornadoShot',
  'eulryongta',
]);

export const DAILY_CHALLENGE_PRESETS = Object.freeze([
  Object.freeze({ regulationSeconds: 45, aiStage: 2 }),
  Object.freeze({ regulationSeconds: 45, aiStage: 3 }),
  Object.freeze({ regulationSeconds: 40, aiStage: 3 }),
  Object.freeze({ regulationSeconds: 40, aiStage: 4 }),
  Object.freeze({ regulationSeconds: 35, aiStage: 4 }),
  Object.freeze({ regulationSeconds: 30, aiStage: 5 }),
  Object.freeze({ regulationSeconds: 35, aiStage: 5 }),
]);

const outcomeWeight = Object.freeze({ loss: 0, draw: 1, win: 2 });

export class DailyChallengeDomainError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'DailyChallengeDomainError';
    this.status = status;
    this.code = code;
  }
}

function toValidDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new DailyChallengeDomainError(400, 'INVALID_DATE', 'A valid challenge date is required.');
  }
  return date;
}

export function getKstDate(now = new Date()) {
  const date = toValidDate(now);
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: CHALLENGE_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
  } catch {
    throw new DailyChallengeDomainError(400, 'INVALID_DATE', 'A valid challenge date is required.');
  }
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  if (!values.year || !values.month || !values.day) {
    throw new DailyChallengeDomainError(400, 'INVALID_DATE', 'A valid challenge date is required.');
  }
  return `${values.year.padStart(4, '0')}-${values.month}-${values.day}`;
}

function getEpochDay(date) {
  const [year, month, day] = date.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function getDailyChallenge(now = new Date()) {
  const date = getKstDate(now);
  const presetIndex = getEpochDay(date) % PRESET_COUNT;
  const preset = DAILY_CHALLENGE_PRESETS[presetIndex];
  return {
    date,
    challengeId: `${date}:${presetIndex}`,
    regulationSeconds: preset.regulationSeconds,
    aiStage: preset.aiStage,
    skillIds: [...DAILY_CHALLENGE_SKILLS],
  };
}

export function validateDailyChallengeScore(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || !Number.isInteger(value.homeGoals) || value.homeGoals < 0 || value.homeGoals > 99
      || !Number.isInteger(value.awayGoals) || value.awayGoals < 0 || value.awayGoals > 99) {
    throw new DailyChallengeDomainError(400, 'INVALID_SCORE', 'Scores must be integers from 0 to 99.');
  }

  const { homeGoals, awayGoals } = value;
  return {
    homeGoals,
    awayGoals,
    outcome: homeGoals > awayGoals ? 'win' : homeGoals === awayGoals ? 'draw' : 'loss',
    goalDifference: homeGoals - awayGoals,
  };
}

export function compareDailyChallengeResults(left, right) {
  const leftWeight = outcomeWeight[left?.outcome];
  const rightWeight = outcomeWeight[right?.outcome];
  if (leftWeight === undefined || rightWeight === undefined
      || !Number.isInteger(left?.goalDifference) || !Number.isInteger(right?.goalDifference)) return 0;
  return rightWeight - leftWeight || right.goalDifference - left.goalDifference;
}

function toLeaderboardEntry(record) {
  if (!record || typeof record !== 'object' || typeof record.displayName !== 'string'
      || !record.displayName.trim()) return null;

  let score;
  try {
    score = validateDailyChallengeScore(record);
  } catch {
    return null;
  }
  if (record.outcome !== score.outcome || record.goalDifference !== score.goalDifference) return null;

  return {
    displayName: record.displayName.trim(),
    homeGoals: score.homeGoals,
    awayGoals: score.awayGoals,
    outcome: score.outcome,
    goalDifference: score.goalDifference,
  };
}

export function buildDailyChallengeLeaderboard(records, limit = MAX_LEADERBOARD_ROWS) {
  const safeLimit = Number.isInteger(limit) && limit > 0
    ? Math.min(limit, MAX_LEADERBOARD_ROWS)
    : MAX_LEADERBOARD_ROWS;
  const entries = (Array.isArray(records) ? records : [])
    .map(toLeaderboardEntry)
    .filter(Boolean)
    .sort((left, right) => compareDailyChallengeResults(left, right)
      || left.displayName.localeCompare(right.displayName, 'ko'))
    .slice(0, safeLimit);

  let previous = null;
  let previousRank = 0;
  return entries.map((entry, index) => {
    const rank = previous && compareDailyChallengeResults(entry, previous) === 0
      ? previousRank
      : index + 1;
    previous = entry;
    previousRank = rank;
    return { rank, ...entry };
  });
}
