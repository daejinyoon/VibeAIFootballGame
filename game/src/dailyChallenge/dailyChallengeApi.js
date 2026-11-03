import { getProfileApiToken } from '../auth/entraAuth.js';

const SKILL_IDS = Object.freeze(['eagleShot', 'tornadoShot', 'eulryongta']);
const FALLBACK_ERROR_MESSAGE = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
const AUTH_ERROR_MESSAGE = '회사 계정으로 다시 로그인해 주세요.';
const INVALID_RESPONSE_MESSAGE = '서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.';
const INVALID_REQUEST_MESSAGE = '입력한 경기 결과를 확인해 주세요.';

export class DailyChallengeApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'DailyChallengeApiError';
    this.status = status;
    this.code = code;
  }
}

function isDisplayName(value) {
  return typeof value === 'string' && value.trim().length > 0
    && value.trim().length <= 100 && !/[\u0000-\u001F\u007F]/u.test(value.trim());
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isChallenge(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && isValidDate(value.date)
    && typeof value.challengeId === 'string'
    && new RegExp(`^${value.date}:[0-6]$`, 'u').test(value.challengeId)
    && Number.isInteger(value.regulationSeconds) && value.regulationSeconds >= 30 && value.regulationSeconds <= 45
    && Number.isInteger(value.aiStage) && value.aiStage >= 2 && value.aiStage <= 5
    && Array.isArray(value.skillIds) && value.skillIds.length === SKILL_IDS.length
    && value.skillIds.every((skillId, index) => skillId === SKILL_IDS[index]));
}

function isPublicRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || !Number.isInteger(value.rank) || value.rank < 1
      || !isDisplayName(value.displayName)
      || !Number.isInteger(value.homeGoals) || value.homeGoals < 0 || value.homeGoals > 99
      || !Number.isInteger(value.awayGoals) || value.awayGoals < 0 || value.awayGoals > 99
      || !['win', 'draw', 'loss'].includes(value.outcome)
      || !Number.isInteger(value.goalDifference)
      || value.goalDifference !== value.homeGoals - value.awayGoals) return false;
  const expectedOutcome = value.homeGoals > value.awayGoals ? 'win'
    : value.homeGoals === value.awayGoals ? 'draw' : 'loss';
  return value.outcome === expectedOutcome;
}

function toPublicRecord(record) {
  const { rank, displayName, homeGoals, awayGoals, outcome, goalDifference } = record;
  return { rank, displayName: displayName.trim(), homeGoals, awayGoals, outcome, goalDifference };
}

function invalidResponse(message = INVALID_RESPONSE_MESSAGE) {
  return new DailyChallengeApiError(500, 'INVALID_SERVER_RESPONSE', message);
}

function validateLeaderboard(value) {
  if (!Array.isArray(value) || value.length > 100 || !value.every(isPublicRecord)) {
    throw invalidResponse('회사 순위 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  }
  return value.map(toPublicRecord);
}

function normalizeErrorCode(value) {
  if (typeof value !== 'string') return '';
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9_]{1,80}$/u.test(code) ? code : '';
}

function safeServerMessage(value) {
  return typeof value === 'string' && value.trim().length > 0
    && value.trim().length <= 300 && !/[\u0000-\u001F\u007F]/u.test(value.trim())
    ? value.trim()
    : FALLBACK_ERROR_MESSAGE;
}

export function createDailyChallengeApi({ acquireToken = getProfileApiToken, fetchImpl = fetch } = {}) {
  async function request(path, { method = 'GET', body } = {}) {
    let token;
    try {
      token = await acquireToken();
    } catch {
      throw new DailyChallengeApiError(401, 'AUTH_REQUIRED', AUTH_ERROR_MESSAGE);
    }
    if (typeof token !== 'string' || !token.trim()) {
      throw new DailyChallengeApiError(401, 'AUTH_REQUIRED', AUTH_ERROR_MESSAGE);
    }

    let response;
    try {
      response = await fetchImpl(path, {
        method,
        headers: {
          'X-Profile-Access-Token': `Bearer ${token}`,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        cache: 'no-store',
      });
    } catch {
      throw new DailyChallengeApiError(0, 'NETWORK_ERROR', '서버에 연결하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.');
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      if (response.ok) throw invalidResponse();
    }
    if (!response.ok) {
      throw new DailyChallengeApiError(
        response.status,
        normalizeErrorCode(payload?.code) || 'DAILY_CHALLENGE_REQUEST_FAILED',
        safeServerMessage(payload?.message),
      );
    }
    return payload;
  }

  async function getDailyChallenge() {
    const payload = await request('/api/daily-challenge');
    if (!isChallenge(payload?.challenge)
        || !(payload.myRecord === null || isPublicRecord(payload.myRecord))) {
      throw invalidResponse('오늘의 챌린지 응답을 확인할 수 없습니다. 새로고침해 주세요.');
    }
    const records = validateLeaderboard(payload.records);
    return {
      challenge: {
        date: payload.challenge.date,
        challengeId: payload.challenge.challengeId,
        regulationSeconds: payload.challenge.regulationSeconds,
        aiStage: payload.challenge.aiStage,
        skillIds: [...payload.challenge.skillIds],
      },
      myRecord: payload.myRecord === null ? null : toPublicRecord(payload.myRecord),
      records,
    };
  }

  async function submitResult({ challengeId, displayName, homeGoals, awayGoals } = {}) {
    if (typeof challengeId !== 'string' || !challengeId.trim() || challengeId.trim().length > 64) {
      throw new DailyChallengeApiError(400, 'INVALID_CHALLENGE_ID', INVALID_REQUEST_MESSAGE);
    }
    if (!isDisplayName(displayName)) {
      throw new DailyChallengeApiError(400, 'INVALID_DISPLAY_NAME', '회사 계정 표시 이름을 확인해 주세요.');
    }
    if (!Number.isInteger(homeGoals) || homeGoals < 0 || homeGoals > 99
        || !Number.isInteger(awayGoals) || awayGoals < 0 || awayGoals > 99) {
      throw new DailyChallengeApiError(400, 'INVALID_SCORE', INVALID_REQUEST_MESSAGE);
    }

    const payload = await request('/api/daily-challenge/results', {
      method: 'POST',
      body: { challengeId: challengeId.trim(), displayName: displayName.trim(), homeGoals, awayGoals },
    });
    if (!isPublicRecord(payload?.record)) {
      throw invalidResponse('경기 결과 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    }
    const records = validateLeaderboard(payload.records);
    return { record: toPublicRecord(payload.record), records };
  }

  return { getDailyChallenge, submitResult };
}
