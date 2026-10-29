import test from 'node:test';
import assert from 'node:assert/strict';
import { createPvpRealtimeHandler } from './pvpRealtime.js';
import { EntraAuthError } from '../auth/entra.js';
import { PvpConcurrencyError } from '../pvp/pvpDomain.js';

function createFixture(initialRoom = undefined) {
  const room = initialRoom ? structuredClone(initialRoom) : {
    id: 'room:ABC234', tenantId: 'tenant', kind: 'room', code: 'ABC234',
    hostObjectId: 'host', hostDisplayName: 'Host', guestObjectId: 'guest', guestDisplayName: 'Guest',
    status: 'playing', hostSkillIds: ['eagleShot', 'tornadoShot', 'eulryongta'], guestSkillIds: ['eagleShot', 'tornadoShot', 'eulryongta'],
    hostReady: true, guestReady: true, hostResultVote: null, guestResultVote: null, forfeitLoser: null,
  };
  let etag = 1;
  let saves = 0;
  const matches = new Map();
  const sent = [];
  const tokenCalls = [];
  const repository = {
    getRoom: async (tenantId, code) => tenantId === room.tenantId && code === room.code ? { document: structuredClone(room), etag: String(etag) } : { document: null },
    findPlayingRoom: async (tenantId, objectId) => tenantId === room.tenantId
      && (room.hostObjectId === objectId || room.guestObjectId === objectId)
      && ['playing', 'forfeit'].includes(room.status)
      ? { document: structuredClone(room), etag: String(etag) }
      : { document: null, etag: null },
    replaceRoom: async (next, expected) => {
      if (expected !== String(etag)) throw new PvpConcurrencyError();
      Object.assign(room, structuredClone(next));
      etag += 1;
      saves += 1;
      return { document: structuredClone(room), etag: String(etag) };
    },
    createMatchOnce: async (match) => {
      if (!matches.has(match.id)) matches.set(match.id, structuredClone(match));
      return { document: matches.get(match.id), created: matches.get(match.id) === match };
    },
  };
  const serviceClient = {
    getClientAccessToken: async (options) => {
      tokenCalls.push(options);
      return { url: 'wss://example.test/client?access_token=secret' };
    },
    group: (name) => ({ sendToAll: async (message) => sent.push({ group: name, message }) }),
  };
  const handler = createPvpRealtimeHandler({
    authenticate: async (request) => {
      if (request.accountError) throw request.accountError;
      return request.account;
    },
    repository,
    createServiceClient: (connectionString, hubName) => {
      assert.equal(connectionString, 'Endpoint=https://example.test;AccessKey=secret');
      assert.equal(hubName, 'football-pvp');
      return serviceClient;
    },
    now: () => '2026-10-29T12:00:00.000Z',
    env: { WEBPUBSUB_CONNECTION_STRING: 'Endpoint=https://example.test;AccessKey=secret', WEBPUBSUB_HUB_NAME: 'football-pvp' },
  });
  const request = (method = 'POST', body = undefined, account = undefined, code = undefined) => {
    const result = new Request('https://local.test', {
      method,
      ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
    if (account) result.account = account;
    if (code) Object.defineProperty(result, 'params', { value: { code, event: 'pvp-input' } });
    return result;
  };
  const upstreamContext = (userId, eventType = 'user', eventName = 'pvp-input', data = undefined) => ({
    request: { connectionContext: { hub: 'football-pvp', userId, eventType, eventName }, data },
  });
  return { handler, room, matches, sent, tokenCalls, repository, request, upstreamContext, getSaves: () => saves };
}

const host = { tenantId: 'tenant', objectId: 'host' };
const guest = { tenantId: 'tenant', objectId: 'guest' };
const outsider = { tenantId: 'tenant', objectId: 'outside' };
const inputMessage = { type: 'input', sequence: 7, frame: { moveX: 1, moveY: 0, down: ['ArrowRight'], pressed: ['d'], released: [] } };

test('negotiation grants the host only its room publish role and leaves guest without publish roles', async () => {
  const { handler, request, tokenCalls } = createFixture();
  const hostResponse = await handler.negotiate(request('POST', { code: 'abc234' }, host));
  assert.equal(hostResponse.status, 200);
  assert.deepEqual(await hostResponse.json(), { url: 'wss://example.test/client?access_token=secret', role: 'host', group: 'pvp-ABC234' });
  assert.deepEqual(tokenCalls[0], {
    userId: 'tenant:host', groups: ['pvp-ABC234'], roles: ['webpubsub.sendToGroup.pvp-ABC234'],
  });
  const guestResponse = await handler.negotiate(request('POST', { code: 'ABC234' }, guest));
  assert.equal(guestResponse.status, 200);
  assert.deepEqual(tokenCalls[1], { userId: 'tenant:guest', groups: ['pvp-ABC234'] });
});

test('negotiation rejects unauthenticated callers, nonmembers, other tenants, and rooms not playing', async () => {
  const { handler, request, room } = createFixture();
  const unauthenticated = request('POST', { code: 'ABC234' });
  unauthenticated.accountError = new EntraAuthError(401, 'AUTH_REQUIRED', 'Sign in.');
  assert.equal((await handler.negotiate(unauthenticated)).status, 401);
  assert.equal((await handler.negotiate(request('POST', { code: 'ABC234' }, outsider))).status, 403);
  assert.equal((await handler.negotiate(request('POST', { code: 'ABC234' }, { ...host, tenantId: 'other' }))).status, 404);
  room.status = 'cancelled';
  assert.equal((await handler.negotiate(request('POST', { code: 'ABC234' }, host))).status, 409);
});

test('only valid guest input is relayed; snapshots, host input, unknown users, and malformed frames are ignored', async () => {
  const { handler, request, upstreamContext, sent } = createFixture();
  const valid = await handler.upstream(request('POST', undefined, undefined, 'pvp-input'), upstreamContext('tenant:guest', 'user', 'pvp-input', inputMessage));
  assert.equal(valid.status, 200);
  assert.deepEqual(sent, [{ group: 'pvp-ABC234', message: inputMessage }]);
  await handler.upstream(request('POST', undefined, undefined, 'pvp-input'), upstreamContext('tenant:host', 'user', 'pvp-input', inputMessage));
  await handler.upstream(request('POST', undefined, undefined, 'pvp-input'), upstreamContext('other:guest', 'user', 'pvp-input', inputMessage));
  await handler.upstream(request('POST', undefined, undefined, 'pvp-input'), upstreamContext('tenant:guest', 'user', 'snapshot', { type: 'snapshot', sequence: 8, state: {} }));
  await handler.upstream(request('POST', undefined, undefined, 'pvp-input'), upstreamContext('tenant:guest', 'user', 'pvp-input', { ...inputMessage, frame: { ...inputMessage.frame, moveX: 4 } }));
  assert.equal(sent.length, 1);
});

test('disconnect atomically marks a forfeit, records it once, and broadcasts the original loser on retries', async () => {
  const { handler, request, room, matches, sent, upstreamContext, getSaves } = createFixture();
  const disconnectedEvent = () => handler.upstream(request('POST', undefined, undefined, 'disconnected'), upstreamContext('tenant:guest', 'system', 'disconnected'));
  assert.equal((await disconnectedEvent()).status, 200);
  assert.equal(room.status, 'forfeit');
  assert.equal(room.forfeitLoser, 'away');
  assert.equal(matches.size, 1);
  assert.equal([...matches.values()][0].source, 'forfeit');
  assert.equal([...matches.values()][0].awayGoals, null);
  assert.equal(getSaves(), 1);
  await disconnectedEvent();
  assert.equal(matches.size, 1);
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0], { group: 'pvp-ABC234', message: { type: 'forfeit', loser: 'away' } });
});

test('waiting-room disconnect does nothing, and preflight returns the binding response unchanged', async () => {
  const waitingRoom = { id: 'room:ABC234', tenantId: 'tenant', kind: 'room', code: 'ABC234', hostObjectId: 'host', guestObjectId: null, status: 'waiting' };
  const { handler, request, upstreamContext, room, matches, sent, getSaves } = createFixture(waitingRoom);
  const response = new Response('preflight', { status: 202 });
  assert.equal(await handler.upstream(request(), { hasError: true, response }), response);
  await handler.upstream(request(), upstreamContext('tenant:host', 'system', 'disconnected'));
  assert.equal(room.status, 'waiting');
  assert.equal(matches.size, 0);
  assert.equal(sent.length, 0);
  assert.equal(getSaves(), 0);
});
