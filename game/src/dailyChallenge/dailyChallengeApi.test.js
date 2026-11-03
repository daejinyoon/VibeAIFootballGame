import assert from 'node:assert/strict';
import test from 'node:test';
import { createDailyChallengeApi, DailyChallengeApiError } from './dailyChallengeApi.js';

const challenge = {
  date: '2026-11-03',
  challengeId: '2026-11-03:2',
  regulationSeconds: 40,
  aiStage: 4,
  skillIds: ['eagleShot', 'tornadoShot', 'eulryongta'],
};

function record(overrides = {}) {
  return {
    rank: 1,
    displayName: '회사 사용자',
    homeGoals: 3,
    awayGoals: 1,
    outcome: 'win',
    goalDifference: 2,
    ...overrides,
  };
}

function response(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

test('fetches validated daily challenge with a fresh token and strips private response fields', async () => {
  const calls = [];
  let tokenNumber = 0;
  const api = createDailyChallengeApi({
    acquireToken: async () => `token-${++tokenNumber}`,
    fetchImpl: async (path, options) => {
      calls.push({ path, options });
      return response(200, {
        challenge: { ...challenge, privateSetting: 'discard' },
        myRecord: { ...record({ rank: 2 }), tenantId: 'private', objectId: 'private' },
        records: [record({ objectId: 'secret', tenantId: 'secret' })],
        debug: 'discard',
      });
    },
  });

  const data = await api.getDailyChallenge();
  assert.equal(tokenNumber, 1);
  assert.equal(calls[0].path, '/api/daily-challenge');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.deepEqual(calls[0].options.headers, { 'X-Profile-Access-Token': 'Bearer token-1' });
  assert.deepEqual(data.challenge, challenge);
  assert.deepEqual(data.myRecord, record({ rank: 2 }));
  assert.deepEqual(data.records, [record()]);
  assert.equal(Object.hasOwn(data.records[0], 'tenantId'), false);
});

test('submits only the agreed score fields with JSON and obtains a fresh token per request', async () => {
  const calls = [];
  let tokenNumber = 0;
  const api = createDailyChallengeApi({
    acquireToken: async () => `token-${++tokenNumber}`,
    fetchImpl: async (path, options) => {
      calls.push({ path, options });
      if (path === '/api/daily-challenge') return response(200, {
        challenge, myRecord: null, records: [],
      });
      return response(200, {
        record: { ...record(), id: 'private', objectId: 'private' },
        records: [record({ recordedAt: 'private' })],
      });
    },
  });

  await api.getDailyChallenge();
  const result = await api.submitResult({
    challengeId: challenge.challengeId,
    displayName: ' 회사 사용자 ',
    homeGoals: 3,
    awayGoals: 1,
    tenantId: 'must-not-send',
    outcome: 'loss',
  });

  assert.equal(tokenNumber, 2);
  assert.equal(calls[1].path, '/api/daily-challenge/results');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].options.cache, 'no-store');
  assert.deepEqual(calls[1].options.headers, {
    'X-Profile-Access-Token': 'Bearer token-2',
    'Content-Type': 'application/json',
  });
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    challengeId: challenge.challengeId,
    displayName: '회사 사용자',
    homeGoals: 3,
    awayGoals: 1,
  });
  assert.deepEqual(result, { record: record(), records: [record()] });
});

test('rejects invalid challenge, leaderboard, and record shapes in successful responses', async () => {
  const invalidChallenges = [
    { ...challenge, date: '2026-02-30', challengeId: '2026-02-30:2' },
    { ...challenge, challengeId: '2026-11-03:8' },
    { ...challenge, regulationSeconds: 29 },
    { ...challenge, aiStage: 1 },
    { ...challenge, skillIds: ['eagleShot', 'eulryongta', 'tornadoShot'] },
  ];
  for (const invalidChallenge of invalidChallenges) {
    const api = createDailyChallengeApi({ acquireToken: async () => 'token', fetchImpl: async () => response(200, {
      challenge: invalidChallenge, myRecord: null, records: [],
    }) });
    await assert.rejects(api.getDailyChallenge(), (error) => error.code === 'INVALID_SERVER_RESPONSE');
  }

  for (const records of [null, [record({ rank: 0 })], [record({ outcome: 'loss' })], [record({ objectId: 'x', rank: 1.5 })]]) {
    const api = createDailyChallengeApi({ acquireToken: async () => 'token', fetchImpl: async () => response(200, {
      challenge, myRecord: null, records,
    }) });
    await assert.rejects(api.getDailyChallenge(), (error) => error.code === 'INVALID_SERVER_RESPONSE');
  }

  const malformedSubmit = createDailyChallengeApi({ acquireToken: async () => 'token', fetchImpl: async () => response(200, {
    record: record({ goalDifference: 8 }), records: [],
  }) });
  await assert.rejects(malformedSubmit.submitResult({
    challengeId: challenge.challengeId, displayName: 'User', homeGoals: 1, awayGoals: 0,
  }), (error) => error.code === 'INVALID_SERVER_RESPONSE');
});

test('rejects invalid local scores and display names before requesting a token or sending a request', async () => {
  let tokenCalls = 0;
  let fetchCalls = 0;
  const api = createDailyChallengeApi({
    acquireToken: async () => { tokenCalls += 1; return 'token'; },
    fetchImpl: async () => { fetchCalls += 1; return response(200, {}); },
  });
  const valid = { challengeId: challenge.challengeId, displayName: 'User', homeGoals: 1, awayGoals: 0 };
  for (const patch of [
    { challengeId: '' }, { displayName: ' ' }, { displayName: 'x'.repeat(101) },
    { displayName: 'bad\nname' }, { homeGoals: -1 }, { homeGoals: 100 }, { homeGoals: 1.5 }, { awayGoals: NaN },
  ]) {
    await assert.rejects(api.submitResult({ ...valid, ...patch }), (error) => error instanceof DailyChallengeApiError && error.status === 400);
  }
  assert.equal(tokenCalls, 0);
  assert.equal(fetchCalls, 0);
});

test('maps token failures to a stable auth error and never sends an anonymous retry', async () => {
  let fetchCalls = 0;
  for (const acquireToken of [async () => { throw new Error('private token detail'); }, async () => '  ']) {
    const api = createDailyChallengeApi({ acquireToken, fetchImpl: async () => { fetchCalls += 1; } });
    await assert.rejects(api.getDailyChallenge(), (error) => error instanceof DailyChallengeApiError
      && error.status === 401 && error.code === 'AUTH_REQUIRED' && !error.message.includes('private'));
  }
  assert.equal(fetchCalls, 0);
});

test('preserves server auth and challenge-change errors, with safe fallbacks for bad error bodies', async () => {
  for (const [status, body, code, message] of [
    [401, { code: 'AUTH_REQUIRED', message: 'Please sign in.' }, 'AUTH_REQUIRED', 'Please sign in.'],
    [409, { code: 'CHALLENGE_CHANGED', message: 'Refresh the challenge.' }, 'CHALLENGE_CHANGED', 'Refresh the challenge.'],
    [503, { code: 'DAILY_CHALLENGE_STORAGE_UNAVAILABLE', message: 'Retry later.' }, 'DAILY_CHALLENGE_STORAGE_UNAVAILABLE', 'Retry later.'],
    [503, { code: 'bad code', message: 'x'.repeat(400) }, 'DAILY_CHALLENGE_REQUEST_FAILED', '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'],
  ]) {
    const api = createDailyChallengeApi({ acquireToken: async () => 'token', fetchImpl: async () => response(status, body) });
    await assert.rejects(api.getDailyChallenge(), (error) => error instanceof DailyChallengeApiError
      && error.status === status && error.code === code && error.message === message);
  }

  const nonJsonApi = createDailyChallengeApi({
    acquireToken: async () => 'token',
    fetchImpl: async () => new Response('offline', { status: 503 }),
  });
  await assert.rejects(nonJsonApi.getDailyChallenge(), (error) => error.status === 503
    && error.code === 'DAILY_CHALLENGE_REQUEST_FAILED' && error.message.includes('다시 시도'));
});

test('maps network errors and malformed JSON success bodies to safe stable errors', async () => {
  const networkApi = createDailyChallengeApi({
    acquireToken: async () => 'token',
    fetchImpl: async () => { throw new Error('private network detail'); },
  });
  await assert.rejects(networkApi.getDailyChallenge(), (error) => error instanceof DailyChallengeApiError
    && error.status === 0 && error.code === 'NETWORK_ERROR' && !error.message.includes('private'));

  const invalidJsonApi = createDailyChallengeApi({
    acquireToken: async () => 'token',
    fetchImpl: async () => new Response('not json', { status: 200 }),
  });
  await assert.rejects(invalidJsonApi.getDailyChallenge(), (error) => error.status === 500
    && error.code === 'INVALID_SERVER_RESPONSE');
});
