import assert from 'node:assert/strict';
import test from 'node:test';
import { createDailyChallengeHandler } from './dailyChallenge.js';
import { getDailyChallenge } from '../dailyChallenge/dailyChallengeDomain.js';
import { EntraAuthError } from '../auth/entra.js';
import {
  DailyChallengeConcurrencyError,
  DailyChallengeStorageError,
} from '../storage/dailyChallengeCosmos.js';

const fixedNow = new Date('2026-11-03T12:00:00.000Z');
const host = { tenantId: 'tenant-a', objectId: 'account-a' };
const other = { tenantId: 'tenant-a', objectId: 'account-b' };
const otherTenant = { tenantId: 'tenant-b', objectId: 'account-a' };

function makeRepository() {
  const records = new Map();
  let etagNumber = 0;
  const keyFor = (tenantId, challengeDate, objectId) => `${tenantId}:${challengeDate}:${objectId}`;
  const attachEtag = (record) => ({ ...record, _etag: String(++etagNumber) });
  return {
    records,
    async getDailyChallengeRecord(tenantId, challengeDate, objectId) {
      const document = records.get(keyFor(tenantId, challengeDate, objectId)) ?? null;
      return { document, etag: document?._etag ?? null };
    },
    async listDailyChallengeRecords(tenantId, challengeDate) {
      return [...records.values()].filter((record) => record.tenantId === tenantId
        && record.kind === 'dailyChallengeResult'
        && record.challengeDate === challengeDate);
    },
    async createDailyChallengeRecord(record) {
      const key = keyFor(record.tenantId, record.challengeDate, record.objectId);
      if (records.has(key)) throw new DailyChallengeConcurrencyError();
      const document = attachEtag(record);
      records.set(key, document);
      return { document, etag: document._etag };
    },
    async replaceDailyChallengeRecord(record, etag) {
      const key = keyFor(record.tenantId, record.challengeDate, record.objectId);
      const existing = records.get(key);
      if (!existing || existing._etag !== etag) throw new DailyChallengeConcurrencyError();
      const document = attachEtag(record);
      records.set(key, document);
      return { document, etag: document._etag };
    },
  };
}

function setup({ repository = makeRepository(), authenticate, now = () => fixedNow } = {}) {
  const activeAuthenticate = authenticate ?? (async (request) => request.account);
  const handler = createDailyChallengeHandler({
    authenticate: activeAuthenticate,
    repository,
    now,
  });
  const invoke = async (name, { method = 'GET', account = host, body, rawBody } = {}) => {
    const request = new Request('https://local.test/api/daily-challenge', {
      method,
      ...(body !== undefined || rawBody !== undefined ? {
        headers: { 'Content-Type': 'application/json' },
        body: rawBody ?? JSON.stringify(body),
      } : {}),
    });
    request.account = account;
    return handler[name](request);
  };
  return { handler, invoke, repository };
}

function savedRecord({ account, date = '2026-11-03', displayName, homeGoals, awayGoals }) {
  const outcome = homeGoals > awayGoals ? 'win' : homeGoals === awayGoals ? 'draw' : 'loss';
  return {
    id: `daily:${date}:${account.objectId}`,
    tenantId: account.tenantId,
    kind: 'dailyChallengeResult',
    challengeDate: date,
    objectId: account.objectId,
    displayName,
    homeGoals,
    awayGoals,
    outcome,
    goalDifference: homeGoals - awayGoals,
    recordedAt: '2026-11-03T11:00:00.000Z',
  };
}

async function json(response) {
  return response.json();
}

test('authentication happens before request bodies are parsed and responses disable caching', async () => {
  const handler = createDailyChallengeHandler({
    authenticate: async () => { throw new EntraAuthError(401, 'AUTH_REQUIRED', 'Sign in.'); },
    repository: {},
    now: () => fixedNow,
  });
  const response = await handler.submitResult(new Request('https://local.test', {
    method: 'POST',
    body: '{',
  }));
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await json(response), { code: 'AUTH_REQUIRED', message: 'Sign in.' });
});

test('GET returns the shared current KST challenge, caller record, and tenant/date scoped public ranks', async () => {
  const repository = makeRepository();
  repository.records.set('tenant-a:2026-11-03:account-a', {
    ...savedRecord({ account: host, displayName: 'Current player', homeGoals: 2, awayGoals: 1 }), _etag: '1',
  });
  repository.records.set('tenant-a:2026-11-03:account-b', {
    ...savedRecord({ account: other, displayName: 'Top player', homeGoals: 4, awayGoals: 0 }), _etag: '2',
  });
  repository.records.set('tenant-a:2026-11-02:old-account', {
    ...savedRecord({ account: { tenantId: 'tenant-a', objectId: 'old-account' }, date: '2026-11-02', displayName: 'Yesterday', homeGoals: 9, awayGoals: 0 }), _etag: '3',
  });
  repository.records.set('tenant-b:2026-11-03:account-a', {
    ...savedRecord({ account: otherTenant, displayName: 'Other tenant', homeGoals: 9, awayGoals: 0 }), _etag: '4',
  });
  const { invoke } = setup({ repository });

  const response = await invoke('getDailyChallenge');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const payload = await json(response);
  assert.deepEqual(payload.challenge, getDailyChallenge(fixedNow));
  assert.deepEqual(payload.myRecord, {
    rank: 2,
    displayName: 'Current player',
    homeGoals: 2,
    awayGoals: 1,
    outcome: 'win',
    goalDifference: 1,
  });
  assert.deepEqual(payload.records.map(({ rank, displayName }) => ({ rank, displayName })), [
    { rank: 1, displayName: 'Top player' },
    { rank: 2, displayName: 'Current player' },
  ]);
  assert.ok(payload.records.every((record) => !('objectId' in record) && !('tenantId' in record)));
  assert.ok(!JSON.stringify(payload).includes('Other tenant'));
  assert.ok(!JSON.stringify(payload).includes('Yesterday'));
});

test('POST creates a result and derives all ranking fields server-side', async () => {
  const { invoke, repository } = setup();
  const challenge = getDailyChallenge(fixedNow);
  const response = await invoke('submitResult', {
    method: 'POST',
    body: { challengeId: challenge.challengeId, displayName: ' Player A ', homeGoals: 2, awayGoals: 1 },
  });
  assert.equal(response.status, 200);
  const payload = await json(response);
  assert.deepEqual(payload.record, {
    rank: 1,
    displayName: 'Player A',
    homeGoals: 2,
    awayGoals: 1,
    outcome: 'win',
    goalDifference: 1,
  });
  assert.equal(payload.records.length, 1);
  const stored = repository.records.get(`tenant-a:${challenge.date}:account-a`);
  assert.equal(stored.id, `daily:${challenge.date}:account-a`);
  assert.equal(stored.kind, 'dailyChallengeResult');
  assert.equal(stored.tenantId, host.tenantId);
  assert.equal(stored.objectId, host.objectId);
  assert.equal(stored.recordedAt, fixedNow.toISOString());
});

test('a retry replaces only a strictly better result and preserves an equal or worse best record', async () => {
  const { invoke, repository } = setup();
  const challenge = getDailyChallenge(fixedNow);
  const submit = (homeGoals, awayGoals, displayName = 'Player A') => invoke('submitResult', {
    method: 'POST',
    body: { challengeId: challenge.challengeId, displayName, homeGoals, awayGoals },
  });

  assert.equal((await submit(1, 0)).status, 200);
  assert.equal((await submit(3, 0, 'Updated name')).status, 200);
  const best = repository.records.get(`tenant-a:${challenge.date}:account-a`);
  const originalEtag = best._etag;
  assert.equal(best.homeGoals, 3);
  assert.equal(best.displayName, 'Updated name');

  assert.equal((await submit(2, 1, 'Worse retry')).status, 200);
  assert.equal((await submit(3, 0, 'Tied retry')).status, 200);
  const preserved = repository.records.get(`tenant-a:${challenge.date}:account-a`);
  assert.equal(preserved.homeGoals, 3);
  assert.equal(preserved.displayName, 'Updated name');
  assert.equal(preserved._etag, originalEtag);
});

test('POST rejects stale challenge IDs, invalid scores, names, oversized bodies, and untrusted fields', async () => {
  const { invoke, repository } = setup();
  const challengeId = getDailyChallenge(fixedNow).challengeId;
  const cases = [
    { body: { challengeId: '2026-11-02:0', displayName: 'Player', homeGoals: 1, awayGoals: 0 }, status: 409, code: 'CHALLENGE_CHANGED' },
    { body: { challengeId, displayName: 'Player', homeGoals: -1, awayGoals: 0 }, status: 400, code: 'INVALID_SCORE' },
    { body: { challengeId, displayName: '', homeGoals: 1, awayGoals: 0 }, status: 400, code: 'INVALID_DISPLAY_NAME' },
    { body: { challengeId, displayName: 'Player', homeGoals: 1, awayGoals: 0, objectId: 'forged' }, status: 400, code: 'INVALID_BODY' },
    { body: { challengeId, displayName: 'Player', homeGoals: 1, awayGoals: 0, outcome: 'win' }, status: 400, code: 'INVALID_BODY' },
  ];
  for (const { body, status, code } of cases) {
    const response = await invoke('submitResult', { method: 'POST', body });
    assert.equal(response.status, status);
    assert.equal((await json(response)).code, code);
  }

  const invalidJson = await invoke('submitResult', { method: 'POST', rawBody: '{' });
  assert.equal(invalidJson.status, 400);
  assert.equal((await json(invalidJson)).code, 'INVALID_JSON');

  const oversized = await invoke('submitResult', { method: 'POST', rawBody: 'x'.repeat(8 * 1024 + 1) });
  assert.equal(oversized.status, 413);
  assert.equal((await json(oversized)).code, 'PAYLOAD_TOO_LARGE');
  assert.equal(repository.records.size, 0);
});

test('a concurrent create conflict rereads and preserves a better competing score', async () => {
  const repository = makeRepository();
  let createAttempts = 0;
  const createDailyChallengeRecord = repository.createDailyChallengeRecord.bind(repository);
  repository.createDailyChallengeRecord = async (record) => {
    createAttempts += 1;
    if (createAttempts === 1) {
      await createDailyChallengeRecord(savedRecord({ account: host, displayName: 'Other name', homeGoals: 3, awayGoals: 0 }));
      throw new DailyChallengeConcurrencyError();
    }
    return createDailyChallengeRecord(record);
  };
  const { invoke } = setup({ repository });
  const challenge = getDailyChallenge(fixedNow);
  const response = await invoke('submitResult', {
    method: 'POST',
    body: { challengeId: challenge.challengeId, displayName: 'Player A', homeGoals: 2, awayGoals: 1 },
  });
  assert.equal(response.status, 200);
  assert.equal((await json(response)).record.homeGoals, 3);
  assert.equal(createAttempts, 1);
});

test('exhausted concurrency retries return a safe conflict response', async () => {
  const repository = makeRepository();
  repository.createDailyChallengeRecord = async () => { throw new DailyChallengeConcurrencyError(); };
  const { invoke } = setup({ repository });
  const challenge = getDailyChallenge(fixedNow);
  const response = await invoke('submitResult', {
    method: 'POST',
    body: { challengeId: challenge.challengeId, displayName: 'Player A', homeGoals: 1, awayGoals: 0 },
  });
  assert.equal(response.status, 409);
  assert.deepEqual(await json(response), {
    code: 'DAILY_RESULT_CHANGED',
    message: 'The daily result changed while it was being saved. Please retry.',
  });
});

test('storage failures return a generic 503 without exposing Cosmos errors', async () => {
  const repository = makeRepository();
  repository.listDailyChallengeRecords = async () => {
    throw new DailyChallengeStorageError('private connection string details');
  };
  const { invoke } = setup({ repository });
  const response = await invoke('getDailyChallenge');
  assert.equal(response.status, 503);
  const body = await response.text();
  assert.ok(body.includes('DAILY_CHALLENGE_STORAGE_UNAVAILABLE'));
  assert.ok(!body.includes('private connection string details'));
});
