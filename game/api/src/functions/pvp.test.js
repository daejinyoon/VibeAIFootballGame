import test from 'node:test';
import assert from 'node:assert/strict';
import { createPvpHandler } from './pvp.js';
import { EntraAuthError } from '../auth/entra.js';
import { PvpConcurrencyError } from '../pvp/pvpDomain.js';

function setup() {
  const rooms = new Map();
  const matches = new Map();
  let etag = 0;
  const repository = {
    createRoom: async (room) => { const item = { document: { ...room }, etag: String(++etag) }; rooms.set(room.code, item); return item; },
    getRoom: async (tenantId, code) => {
      const value = rooms.get(code);
      return value?.document.tenantId === tenantId ? value : { document: null, etag: null };
    },
    replaceRoom: async (room, expected) => {
      const current = rooms.get(room.code);
      if (current.etag !== expected) throw new PvpConcurrencyError();
      const value = { document: { ...room }, etag: String(++etag) };
      rooms.set(room.code, value);
      return value;
    },
    getMatch: async (tenantId, code) => ({ document: matches.get(code)?.tenantId === tenantId ? matches.get(code) : null }),
    createMatchOnce: async (match) => { if (!matches.has(match.roomCode)) matches.set(match.roomCode, match); return { document: matches.get(match.roomCode) }; },
    listMatches: async (tenantId) => [...matches.values()].filter((match) => match.tenantId === tenantId),
  };
  const auth = async (request) => request.account;
  const handler = createPvpHandler({ authenticate: auth, repository, now: () => '2026-10-29T00:00:00.000Z', makeCode: () => 'ABC234' });
  const request = (method, account, body, code = 'ABC234') => new Request('https://local.test/', {
    method,
    ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const invoke = async (name, method, account, body, code = 'ABC234') => {
    const req = request(method, account, body, code);
    req.account = account;
    Object.defineProperty(req, 'params', { value: code ? { code } : {} });
    return handler[name](req);
  };
  return { handler, invoke, rooms, matches, request };
}

const host = { tenantId: 'tenant', objectId: 'host' };
const guest = { tenantId: 'tenant', objectId: 'guest' };
const outsider = { tenantId: 'tenant', objectId: 'outside' };
const loadout = ['eagleShot', 'tornadoShot', 'eulryongta'];

test('authentication happens before malformed request body is parsed and responses disable caching', async () => {
  const repository = {};
  const handler = createPvpHandler({ authenticate: async () => { throw new EntraAuthError(401, 'AUTH_REQUIRED', 'Sign in.'); }, repository });
  const request = new Request('https://local.test', { method: 'POST', body: '{' });
  const response = await handler.createRoom(request);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('room can be created, joined, readied, started, and mutually confirmed exactly once', async () => {
  const { invoke, matches } = setup();
  const created = await invoke('createRoom', 'POST', host, { displayName: 'Host' });
  assert.equal(created.status, 201);
  const room = await created.json();
  assert.equal(room.room.code, 'ABC234');
  assert.equal('hostObjectId' in room.room, false);
  const joinResponse = await invoke('joinRoom', 'POST', guest, { displayName: 'Guest' });
  assert.equal(joinResponse.status, 200, await joinResponse.text());
  for (const account of [host, guest]) {
    assert.equal((await invoke('setLoadout', 'PUT', account, { skillIds: loadout })).status, 200);
    assert.equal((await invoke('setReady', 'POST', account, { ready: true })).status, 200);
  }
  assert.equal((await invoke('startRoom', 'POST', host)).status, 200);
  assert.equal((await invoke('submitResult', 'POST', host, { homeGoals: 2, awayGoals: 1 })).status, 200);
  const completed = await invoke('submitResult', 'POST', guest, { homeGoals: 2, awayGoals: 1 });
  assert.equal((await completed.json()).status, 'completed');
  assert.equal(matches.size, 1);
  assert.equal((await invoke('submitResult', 'POST', guest, { homeGoals: 2, awayGoals: 1 })).status, 200);
  assert.equal(matches.size, 1);
});

test('outsiders are rejected and mismatched scores create no match document', async () => {
  const { invoke, matches } = setup();
  await invoke('createRoom', 'POST', host, { displayName: 'Host' });
  const outsiderResponse = await invoke('getRoom', 'GET', outsider);
  assert.equal(outsiderResponse.status, 403, await outsiderResponse.text());
  await invoke('joinRoom', 'POST', guest, { displayName: 'Guest' });
  for (const account of [host, guest]) {
    await invoke('setLoadout', 'PUT', account, { skillIds: loadout });
    await invoke('setReady', 'POST', account, { ready: true });
  }
  await invoke('startRoom', 'POST', host);
  await invoke('submitResult', 'POST', host, { homeGoals: 1, awayGoals: 0 });
  const disputed = await invoke('submitResult', 'POST', guest, { homeGoals: 0, awayGoals: 1 });
  assert.equal((await disputed.json()).status, 'disputed');
  assert.equal(matches.size, 0);
});

test('leaderboard is tenant scoped and room cancellation is host only', async () => {
  const { invoke } = setup();
  await invoke('createRoom', 'POST', host, { displayName: 'Host' });
  const guestCancel = await invoke('cancelRoom', 'DELETE', guest);
  assert.equal(guestCancel.status, 403, await guestCancel.text());
  assert.equal((await invoke('cancelRoom', 'DELETE', host)).status, 200);
  const leaderboard = await invoke('leaderboard', 'GET', host);
  assert.deepEqual(await leaderboard.json(), { records: [] });
});
