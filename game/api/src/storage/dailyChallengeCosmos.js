import { CosmosClient } from '@azure/cosmos';

const DATABASE_ID = 'football';
const CONTAINER_ID = 'profiles';

let cachedConnectionString = '';
let cachedClient = null;
let cachedContainer = null;

export class DailyChallengeStorageError extends Error {
  constructor(message, cause = undefined) {
    super(message, cause ? { cause } : undefined);
    this.name = 'DailyChallengeStorageError';
    this.status = 503;
  }
}

export class DailyChallengeConcurrencyError extends Error {
  constructor() {
    super('The daily challenge result changed while the operation was in progress.');
    this.name = 'DailyChallengeConcurrencyError';
    this.status = 409;
  }
}

function isNotFound(error) {
  return error?.code === 404 || error?.statusCode === 404;
}

function isConflict(error) {
  return error?.code === 409 || error?.statusCode === 409;
}

function isPreconditionFailed(error) {
  return error?.code === 412 || error?.statusCode === 412;
}

function getContainer(env = process.env) {
  const connectionString = env.COSMOS_CONNECTION_STRING?.trim();
  if (!connectionString) {
    throw new DailyChallengeStorageError('Daily challenge storage is not configured.');
  }

  if (cachedContainer && cachedConnectionString === connectionString) return cachedContainer;

  try {
    cachedClient?.dispose?.();
    cachedClient = new CosmosClient(connectionString);
    cachedConnectionString = connectionString;
    cachedContainer = cachedClient.database(DATABASE_ID).container(CONTAINER_ID);
    return cachedContainer;
  } catch (error) {
    throw new DailyChallengeStorageError('Daily challenge storage configuration is invalid.', error);
  }
}

function applicationFields(document) {
  const {
    _rid: _ridValue,
    _self: _selfValue,
    _etag: _etagValue,
    _attachments: _attachmentsValue,
    _ts: _timestampValue,
    ...fields
  } = document;
  return fields;
}

function readDocument(response) {
  return { document: response?.resource ?? null, etag: response?.etag ?? response?.resource?._etag ?? null };
}

export function createDailyChallengeRepository({ container: injectedContainer, env = process.env } = {}) {
  let containerVerification = null;

  async function resolveContainer() {
    const container = injectedContainer ?? getContainer(env);
    if (!containerVerification) {
      containerVerification = Promise.resolve().then(async () => {
        let response;
        try {
          response = await container.read();
        } catch (error) {
          throw new DailyChallengeStorageError('The daily challenge container is unavailable.', error);
        }
        if (isNotFound(response) || !response?.resource) {
          throw new DailyChallengeStorageError('The daily challenge container is unavailable.');
        }
      });
    }
    await containerVerification;
    return container;
  }

  async function readItem(container, id, tenantId) {
    try {
      const response = await container.item(id, tenantId).read();
      if (isNotFound(response)) return { document: null, etag: null };
      return readDocument(response);
    } catch (error) {
      if (isNotFound(error)) return { document: null, etag: null };
      throw new DailyChallengeStorageError('Daily challenge storage is unavailable.', error);
    }
  }

  return {
    async getDailyChallengeRecord(tenantId, challengeDate, objectId) {
      const resolved = await resolveContainer();
      return readItem(resolved, `daily:${challengeDate}:${objectId}`, tenantId);
    },

    async listDailyChallengeRecords(tenantId, challengeDate) {
      const resolved = await resolveContainer();
      try {
        const response = await resolved.items.query({
          query: 'SELECT * FROM c WHERE c.kind = @kind AND c.challengeDate = @challengeDate',
          parameters: [
            { name: '@kind', value: 'dailyChallengeResult' },
            { name: '@challengeDate', value: challengeDate },
          ],
        }, { partitionKey: tenantId }).fetchAll();
        return response.resources ?? [];
      } catch (error) {
        throw new DailyChallengeStorageError('The daily challenge leaderboard could not be loaded.', error);
      }
    },

    async createDailyChallengeRecord(record) {
      const resolved = await resolveContainer();
      try {
        const response = await resolved.items.create(applicationFields(record));
        return readDocument(response);
      } catch (error) {
        if (isConflict(error)) throw new DailyChallengeConcurrencyError();
        throw new DailyChallengeStorageError('The daily challenge result could not be created.', error);
      }
    },

    async replaceDailyChallengeRecord(record, etag) {
      const resolved = await resolveContainer();
      try {
        const response = await resolved.item(record.id, record.tenantId).replace(applicationFields(record), {
          accessCondition: { type: 'IfMatch', condition: etag },
        });
        return readDocument(response);
      } catch (error) {
        if (isConflict(error) || isPreconditionFailed(error)) throw new DailyChallengeConcurrencyError();
        throw new DailyChallengeStorageError('The daily challenge result could not be updated.', error);
      }
    },
  };
}
