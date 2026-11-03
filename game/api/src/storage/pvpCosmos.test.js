import test from 'node:test';
import assert from 'node:assert/strict';
import { createPvpRepository } from './pvpCosmos.js';
import { PvpConcurrencyError, PvpRoomCollisionError, PvpStorageError } from '../pvp/pvpDomain.js';

function fakeContainer() {
  const docs = new Map();
  const queries = [];
  let etag = 0;
  return {
    docs,
    queries,
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
      query: (spec, options) => ({ fetchAll: async () => {
        const parameters = Object.fromEntries(spec.parameters.map(({ name, value }) => [name, value]));
        const call = { spec, options };
        queries.push(call);
        return { resources: [...docs.values()].filter((doc) => doc.tenantId === options.partitionKey
          && doc.kind === parameters['@kind']
          && (parameters['@challengeDate'] === undefined || doc.challengeDate === parameters['@challengeDate'])) };
      } }),
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

test('daily results are keyed by tenant, date, and account and queried within one tenant and date', async () => {
  const container = fakeContainer();
  const repo = createPvpRepository({ container });
  const record = {
    id: 'daily:2026-11-03:account-a', tenantId: 'tenant-a', kind: 'dailyChallengeResult',
    challengeDate: '2026-11-03', objectId: 'account-a', displayName: 'Player A',
    homeGoals: 2, awayGoals: 1, outcome: 'win', goalDifference: 1, recordedAt: '2026-11-03T00:00:00.000Z',
  };
  await repo.createDailyChallengeRecord(record);
  await repo.createDailyChallengeRecord({ ...record, id: 'daily:2026-11-04:account-b', objectId: 'account-b', challengeDate: '2026-11-04' });
  await repo.createDailyChallengeRecord({ ...record, id: 'daily:2026-11-03:account-c', tenantId: 'tenant-b', objectId: 'account-c' });

  const found = await repo.getDailyChallengeRecord('tenant-a', '2026-11-03', 'account-a');
  assert.equal(found.document.displayName, 'Player A');
  assert.ok(found.etag);
  assert.equal((await repo.getDailyChallengeRecord('tenant-b', '2026-11-03', 'account-a')).document, null);
  assert.deepEqual((await repo.listDailyChallengeRecords('tenant-a', '2026-11-03')).map(({ objectId }) => objectId), ['account-a']);
  assert.equal(container.queries.at(-1).options.partitionKey, 'tenant-a');
  assert.deepEqual(container.queries.at(-1).spec.parameters, [
    { name: '@kind', value: 'dailyChallengeResult' },
    { name: '@challengeDate', value: '2026-11-03' },
  ]);
});

test('daily result creates reject duplicate keys and ETag updates reject stale versions', async () => {
  const container = fakeContainer();
  const repo = createPvpRepository({ container });
  const record = {
    id: 'daily:2026-11-03:account-a', tenantId: 'tenant-a', kind: 'dailyChallengeResult',
    challengeDate: '2026-11-03', objectId: 'account-a', displayName: 'Player A',
    homeGoals: 1, awayGoals: 0, outcome: 'win', goalDifference: 1, recordedAt: '2026-11-03T00:00:00.000Z',
  };
  const created = await repo.createDailyChallengeRecord(record);
  await assert.rejects(repo.createDailyChallengeRecord(record), PvpConcurrencyError);
  const updated = await repo.replaceDailyChallengeRecord({ ...record, homeGoals: 2, goalDifference: 2 }, created.etag);
  assert.equal(updated.document.homeGoals, 2);
  await assert.rejects(
    repo.replaceDailyChallengeRecord({ ...record, homeGoals: 3, goalDifference: 3 }, created.etag),
    PvpConcurrencyError,
  );
});
