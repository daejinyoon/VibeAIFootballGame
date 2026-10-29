import test from 'node:test';
import assert from 'node:assert/strict';
import { createPvpRepository } from './pvpCosmos.js';
import { PvpConcurrencyError, PvpRoomCollisionError, PvpStorageError } from '../pvp/pvpDomain.js';

function fakeContainer() {
  const docs = new Map();
  let etag = 0;
  return {
    docs,
    read: async () => ({ resource: { id: 'pvp' } }),
    items: {
      create: async (doc) => {
        const key = `${doc.tenantId}:${doc.id}`;
        if (docs.has(key)) {
          const error = new Error('conflict');
          error.code = 409;
          throw error;
        }
        const stored = { ...doc, _etag: String(++etag) };
        docs.set(key, stored);
        return { resource: stored, etag: stored._etag };
      },
      query: (spec, options) => ({ fetchAll: async () => ({ resources: [...docs.values()].filter((doc) => doc.tenantId === options.partitionKey && doc.kind === spec.parameters[0].value) }) }),
    },
    item: (id, tenantId) => ({
      read: async () => {
        const document = docs.get(`${tenantId}:${id}`);
        if (!document) {
          const error = new Error('missing');
          error.code = 404;
          throw error;
        }
        return { resource: document, etag: document._etag };
      },
      replace: async (next, options) => {
        const key = `${tenantId}:${id}`;
        const current = docs.get(key);
        if (!current || current._etag !== options.accessCondition.condition) {
          const error = new Error('stale');
          error.code = 412;
          throw error;
        }
        const stored = { ...next, _etag: String(++etag) };
        docs.set(key, stored);
        return { resource: stored, etag: stored._etag };
      },
    }),
  };
}

test('repository creates and reads partition-scoped documents and strips system fields', async () => {
  const container = fakeContainer();
  const repo = createPvpRepository({ container });
  const created = await repo.createRoom({ id: 'room:ABC234', tenantId: 't', kind: 'room', _etag: 'bad' });
  assert.notEqual(created.document._etag, 'bad');
  assert.equal(container.docs.get('t:room:ABC234')._etag, created.document._etag);
  assert.equal((await repo.getRoom('t', 'ABC234')).document.id, 'room:ABC234');
  assert.equal((await repo.getRoom('other', 'ABC234')).document, null);
});

test('repository maps duplicate, stale ETag, and missing-container failures', async () => {
  const container = fakeContainer();
  const repo = createPvpRepository({ container });
  const room = { id: 'room:ABC234', tenantId: 't', kind: 'room' };
  const created = await repo.createRoom(room);
  await assert.rejects(repo.createRoom(room), PvpRoomCollisionError);
  await assert.rejects(repo.replaceRoom({ ...room, status: 'ready' }, 'stale'), PvpConcurrencyError);
  const missing = createPvpRepository({ container: { read: async () => ({}) } });
  await assert.rejects(missing.getRoom('t', 'ABC234'), PvpStorageError);
  assert.equal(created.etag, '1');
});

test('match creation is idempotent and leaderboard query is tenant partitioned', async () => {
  const container = fakeContainer();
  const repo = createPvpRepository({ container });
  const match = { id: 'match:ABC234', tenantId: 't', kind: 'match', homeObjectId: 'h', awayObjectId: 'g' };
  assert.equal((await repo.createMatchOnce(match)).created, true);
  assert.equal((await repo.createMatchOnce(match)).created, false);
  assert.equal((await repo.listMatches('t')).length, 1);
  assert.equal((await repo.listMatches('other')).length, 0);
});
