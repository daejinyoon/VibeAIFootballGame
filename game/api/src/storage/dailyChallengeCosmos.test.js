import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDailyChallengeRepository,
  DailyChallengeConcurrencyError,
  DailyChallengeStorageError,
} from './dailyChallengeCosmos.js';

function fakeContainer(seed = []) {
  const docs = new Map(seed.map((document) => [`${document.tenantId}:${document.id}`, document]));
  const queries = [];
  let etag = 0;
  return {
    docs,
    queries,
    read: async () => ({ resource: { id: 'profiles' } }),
    items: {
      create: async (document) => {
        const key = `${document.tenantId}:${document.id}`;
        if (docs.has(key)) {
          const error = new Error('conflict');
          error.code = 409;
          throw error;
        }
        const stored = { ...document, _etag: String(++etag) };
        docs.set(key, stored);
        return { resource: stored, etag: stored._etag };
      },
      query: (spec, options) => ({ fetchAll: async () => {
        const parameters = Object.fromEntries(spec.parameters.map(({ name, value }) => [name, value]));
        queries.push({ spec, options });
        return { resources: [...docs.values()].filter((document) => document.tenantId === options.partitionKey
          && document.kind === parameters['@kind']
          && document.challengeDate === parameters['@challengeDate']) };
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
        const existing = docs.get(key);
        if (!existing || existing._etag !== options.accessCondition.condition) {
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

const dailyRecord = {
  id: 'daily:2026-11-03:account-a',
  tenantId: 'tenant-a',
  kind: 'dailyChallengeResult',
  challengeDate: '2026-11-03',
  objectId: 'account-a',
  displayName: 'Player A',
  homeGoals: 2,
  awayGoals: 1,
  outcome: 'win',
  goalDifference: 1,
  recordedAt: '2026-11-03T00:00:00.000Z',
};

test('daily results share profiles container without overwriting profile documents', async () => {
  const profile = { id: 'account-a', tenantId: 'tenant-a', profile: { nickname: 'Player A' }, updatedAt: 'then' };
  const container = fakeContainer([profile]);
  const repository = createDailyChallengeRepository({ container });

  const created = await repository.createDailyChallengeRecord({ ...dailyRecord, _etag: 'untrusted' });
  assert.equal(created.document.id, 'daily:2026-11-03:account-a');
  assert.notEqual(created.document._etag, 'untrusted');
  assert.deepEqual(container.docs.get('tenant-a:account-a'), profile);
  assert.notEqual(container.docs.get('tenant-a:daily:2026-11-03:account-a'), undefined);
  assert.equal((await repository.getDailyChallengeRecord('tenant-a', '2026-11-03', 'account-a')).document.displayName, 'Player A');
});

test('daily leaderboard query is filtered by kind, KST date, and tenant partition', async () => {
  const container = fakeContainer([
    dailyRecord,
    { ...dailyRecord, id: 'daily:2026-11-04:account-b', challengeDate: '2026-11-04', objectId: 'account-b' },
    { ...dailyRecord, tenantId: 'tenant-b', id: 'daily:2026-11-03:account-c', objectId: 'account-c' },
    { ...dailyRecord, id: 'account-d', kind: undefined, objectId: 'account-d' },
  ]);
  const repository = createDailyChallengeRepository({ container });

  assert.deepEqual(await repository.listDailyChallengeRecords('tenant-a', '2026-11-03'), [dailyRecord]);
  assert.equal(container.queries[0].options.partitionKey, 'tenant-a');
  assert.deepEqual(container.queries[0].spec.parameters, [
    { name: '@kind', value: 'dailyChallengeResult' },
    { name: '@challengeDate', value: '2026-11-03' },
  ]);
});

test('daily result create and ETag replacement map conflicts to concurrency errors', async () => {
  const container = fakeContainer();
  const repository = createDailyChallengeRepository({ container });
  const created = await repository.createDailyChallengeRecord(dailyRecord);
  await assert.rejects(repository.createDailyChallengeRecord(dailyRecord), DailyChallengeConcurrencyError);
  const updated = await repository.replaceDailyChallengeRecord({ ...dailyRecord, homeGoals: 3, goalDifference: 2 }, created.etag);
  assert.equal(updated.document.homeGoals, 3);
  await assert.rejects(
    repository.replaceDailyChallengeRecord({ ...dailyRecord, homeGoals: 4, goalDifference: 3 }, created.etag),
    DailyChallengeConcurrencyError,
  );
});

test('missing profiles container and Cosmos settings produce safe daily storage errors', async () => {
  const missingContainer = createDailyChallengeRepository({ container: { read: async () => ({}) } });
  await assert.rejects(missingContainer.listDailyChallengeRecords('tenant-a', '2026-11-03'), DailyChallengeStorageError);
  const missingSettings = createDailyChallengeRepository({ env: {} });
  await assert.rejects(missingSettings.listDailyChallengeRecords('tenant-a', '2026-11-03'), DailyChallengeStorageError);
});
