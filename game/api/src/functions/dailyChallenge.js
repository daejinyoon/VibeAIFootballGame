import { app } from '@azure/functions';
import { EntraAuthError, requireEntraCaller } from '../auth/entra.js';
import {
  buildDailyChallengeLeaderboard,
  compareDailyChallengeResults,
  DailyChallengeDomainError,
  getDailyChallenge,
  validateDailyChallengeScore,
} from '../dailyChallenge/dailyChallengeDomain.js';
import {
  PvpConcurrencyError,
  PvpError,
  PvpStorageError,
  normalizeDisplayName,
} from '../pvp/pvpDomain.js';
import { createPvpRepository } from '../storage/pvpCosmos.js';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_CAS_ATTEMPTS = 3;
const RESULT_BODY_FIELDS = new Set(['challengeId', 'displayName', 'homeGoals', 'awayGoals']);

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function readJsonBody(request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new PvpError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new PvpError(400, 'INVALID_JSON', 'The request body must be valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => !RESULT_BODY_FIELDS.has(key))) {
    throw new PvpError(400, 'INVALID_BODY', 'The request body contains invalid fields.');
  }
  return body;
}

function errorResponse(error) {
  if (error instanceof EntraAuthError || error instanceof PvpError
      || error instanceof DailyChallengeDomainError) {
    return jsonResponse(error.status, { code: error.code, message: error.message });
  }
  if (error instanceof PvpConcurrencyError) {
    return jsonResponse(409, {
      code: 'DAILY_RESULT_CHANGED',
      message: 'The daily result changed while it was being saved. Please retry.',
    });
  }
  if (error instanceof PvpStorageError || error?.status === 503) {
    return jsonResponse(503, {
      code: 'DAILY_CHALLENGE_STORAGE_UNAVAILABLE',
      message: 'Daily challenge storage is unavailable. Please retry.',
    });
  }
  return jsonResponse(500, {
    code: 'DAILY_CHALLENGE_REQUEST_FAILED',
    message: 'The daily challenge request could not be completed.',
  });
}

function publicRecord(record, rank) {
  const score = validateDailyChallengeScore(record);
  return {
    rank,
    displayName: record.displayName,
    homeGoals: score.homeGoals,
    awayGoals: score.awayGoals,
    outcome: score.outcome,
    goalDifference: score.goalDifference,
  };
}

function rankForRecord(record, records) {
  const score = validateDailyChallengeScore(record);
  const recordsAhead = records.reduce((count, candidate) => {
    try {
      return compareDailyChallengeResults(validateDailyChallengeScore(candidate), score) < 0
        ? count + 1
        : count;
    } catch {
      return count;
    }
  }, 0);
  return recordsAhead + 1;
}

function bestExistingResultIsHigher(existing, candidate) {
  try {
    return compareDailyChallengeResults(
      validateDailyChallengeScore(candidate),
      validateDailyChallengeScore(existing),
    ) >= 0;
  } catch {
    return false;
  }
}

async function saveBestResult(repository, record) {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
    const existing = await repository.getDailyChallengeRecord(
      record.tenantId,
      record.challengeDate,
      record.objectId,
    );
    if (!existing?.document) {
      try {
        const created = await repository.createDailyChallengeRecord(record);
        return created.document ?? record;
      } catch (error) {
        if (!(error instanceof PvpConcurrencyError) || attempt === MAX_CAS_ATTEMPTS - 1) throw error;
        continue;
      }
    }

    if (bestExistingResultIsHigher(existing.document, record)) return existing.document;
    try {
      const replaced = await repository.replaceDailyChallengeRecord(record, existing.etag);
      return replaced.document ?? record;
    } catch (error) {
      if (!(error instanceof PvpConcurrencyError) || attempt === MAX_CAS_ATTEMPTS - 1) throw error;
    }
  }
  throw new PvpConcurrencyError();
}

export function createDailyChallengeHandler({
  authenticate = requireEntraCaller,
  repository = createPvpRepository(),
  now = () => new Date(),
} = {}) {
  async function execute(request, action) {
    try {
      const account = await authenticate(request);
      return await action(account);
    } catch (error) {
      return errorResponse(error);
    }
  }

  async function currentTime() {
    const value = await now();
    const instant = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(instant.getTime())) {
      throw new DailyChallengeDomainError(400, 'INVALID_DATE', 'A valid challenge date is required.');
    }
    return instant;
  }

  async function getDailyChallengeResponse(request) {
    return execute(request, async (account) => {
      const instant = await currentTime();
      const challenge = getDailyChallenge(instant);
      const [myResult, records] = await Promise.all([
        repository.getDailyChallengeRecord(account.tenantId, challenge.date, account.objectId),
        repository.listDailyChallengeRecords(account.tenantId, challenge.date),
      ]);
      const myRecord = myResult?.document
        ? publicRecord(myResult.document, rankForRecord(myResult.document, records))
        : null;
      return jsonResponse(200, {
        challenge,
        myRecord,
        records: buildDailyChallengeLeaderboard(records),
      });
    });
  }

  async function submitResult(request) {
    return execute(request, async (account) => {
      const body = await readJsonBody(request);
      if (typeof body.challengeId !== 'string' || !body.challengeId.trim()) {
        throw new PvpError(400, 'INVALID_BODY', 'A challenge ID is required.');
      }
      const displayName = normalizeDisplayName(body.displayName);
      const score = validateDailyChallengeScore(body);
      const instant = await currentTime();
      const challenge = getDailyChallenge(instant);
      if (body.challengeId !== challenge.challengeId) {
        throw new PvpError(409, 'CHALLENGE_CHANGED', 'The daily challenge has changed. Refresh and try again.');
      }

      const record = {
        id: `daily:${challenge.date}:${account.objectId}`,
        tenantId: account.tenantId,
        kind: 'dailyChallengeResult',
        challengeDate: challenge.date,
        objectId: account.objectId,
        displayName,
        ...score,
        recordedAt: instant.toISOString(),
      };
      const savedRecord = await saveBestResult(repository, record);
      const queriedRecords = await repository.listDailyChallengeRecords(account.tenantId, challenge.date);
      const records = [
        ...queriedRecords.filter((candidate) => candidate.id !== savedRecord.id),
        savedRecord,
      ];
      return jsonResponse(200, {
        record: publicRecord(savedRecord, rankForRecord(savedRecord, records)),
        records: buildDailyChallengeLeaderboard(records),
      });
    });
  }

  return {
    getDailyChallenge: getDailyChallengeResponse,
    submitResult,
  };
}

const handlers = createDailyChallengeHandler();
app.http('dailyChallenge', {
  route: 'daily-challenge',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: handlers.getDailyChallenge,
});
app.http('dailyChallengeResult', {
  route: 'daily-challenge/results',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: handlers.submitResult,
});
