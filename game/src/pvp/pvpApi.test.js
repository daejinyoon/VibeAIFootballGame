import test from 'node:test';
import assert from 'node:assert/strict';
import { createPvpApi, PvpApiError } from './pvpApi.js';

function response(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

test('room API uses a fresh Entra token, no-store, JSON bodies, and normalized invite codes', async () => {
  const calls = [];
  let tokenCount = 0;
  const api = createPvpApi({
    acquireToken: async () => `token-${++tokenCount}`,
    fetchImpl: async (path, options) => {
      calls.push({ path, options });
      return response(200, { room: { code: 'ABC234' } });
    },
  });

  await api.createRoom('Company User');
  await api.getRoom(' abc234 ');
  await api.joinRoom('abc234', 'Company User');
  await api.saveLoadout('abc234', ['eagleShot', 'tornadoShot', 'eulryongta']);
  await api.setReady('abc234', true);
  await api.startRoom('abc234');
  await api.cancelRoom('abc234');

  assert.equal(calls.length, 7);
  assert.deepEqual(calls.map(({ options }) => options.headers['X-Profile-Access-Token']), Array.from({ length: 7 }, (_, index) => `Bearer token-${index + 1}`));
  assert.ok(calls.every(({ options }) => options.cache === 'no-store'));
  assert.equal(calls[1].path, '/api/pvp/rooms/ABC234');
  assert.deepEqual(JSON.parse(calls[3].options.body), { skillIds: ['eagleShot', 'tornadoShot', 'eulryongta'] });
  assert.equal(calls[6].options.headers['Content-Type'], undefined);
});

test('API surfaces server errors and does not retry an authentication failure anonymously', async () => {
  const api = createPvpApi({
    acquireToken: async () => 'valid-token',
    fetchImpl: async () => response(401, { code: 'AUTH_REQUIRED', message: 'Sign in again.' }),
  });
  await assert.rejects(api.createRoom('User'), (error) => error instanceof PvpApiError
    && error.status === 401 && error.code === 'AUTH_REQUIRED' && error.message === 'Sign in again.');

  let fetchCalled = false;
  const noTokenApi = createPvpApi({ acquireToken: async () => { throw new Error('expired'); }, fetchImpl: async () => { fetchCalled = true; } });
  await assert.rejects(noTokenApi.getRoom('ABC234'), (error) => error instanceof PvpApiError && error.status === 401);
  assert.equal(fetchCalled, false);
});

test('API gives a safe fallback for non-JSON errors and failed network requests', async () => {
  const nonJsonApi = createPvpApi({ acquireToken: async () => 'token', fetchImpl: async () => new Response('offline', { status: 503 }) });
  await assert.rejects(nonJsonApi.getRoom('ABC234'), (error) => error instanceof PvpApiError
    && error.status === 503 && error.message.includes('다시 시도'));
  const networkApi = createPvpApi({ acquireToken: async () => 'token', fetchImpl: async () => { throw new Error('private network details'); } });
  await assert.rejects(networkApi.getRoom('ABC234'), (error) => error instanceof PvpApiError
    && error.status === 0 && !error.message.includes('private'));
});
