import { CosmosClient } from '@azure/cosmos';
import { PvpConcurrencyError, PvpRoomCollisionError, PvpStorageError } from '../pvp/pvpDomain.js';

const DATABASE_ID = 'football';
const CONTAINER_ID = 'pvp';

let cachedConnectionString = '';
let cachedContainer = null;
let cachedClient = null;

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
    throw new PvpStorageError('PvP storage is not configured.');
  }

  if (cachedContainer && cachedConnectionString === connectionString) return cachedContainer;

  try {
    cachedClient?.dispose?.();
    cachedClient = new CosmosClient(connectionString);
    cachedConnectionString = connectionString;
    cachedContainer = cachedClient.database(DATABASE_ID).container(CONTAINER_ID);
    return cachedContainer;
  } catch (error) {
    throw new PvpStorageError('PvP storage configuration is invalid.', error);
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

export function createPvpRepository({ container: injectedContainer, env = process.env } = {}) {
  let containerVerification = null;

  async function resolveContainer() {
    const container = injectedContainer ?? getContainer(env);
    if (!containerVerification && typeof container.read === 'function') {
      containerVerification = Promise.resolve().then(async () => {
        let response;
        try {
          response = await container.read();
        } catch (error) {
          throw new PvpStorageError('The PvP Cosmos container is unavailable.', error);
        }
        if (isNotFound(response) || !response?.resource) {
          throw new PvpStorageError('The PvP Cosmos container is unavailable.');
        }
      });
    }
    if (containerVerification) await containerVerification;
    return container;
  }

  async function readItem(container, id, tenantId) {
    try {
      const response = await container.item(id, tenantId).read();
      if (isNotFound(response)) return { document: null, etag: null };
      return readDocument(response);
    } catch (error) {
      if (isNotFound(error)) return { document: null, etag: null };
      throw new PvpStorageError('PvP storage is unavailable.', error);
    }
  }

  return {
    async createRoom(room) {
      const resolved = await resolveContainer();
      try {
        const response = await resolved.items.create(applicationFields(room));
        return readDocument(response);
      } catch (error) {
        if (isConflict(error)) throw new PvpRoomCollisionError();
        throw new PvpStorageError('The PvP room could not be created.', error);
      }
    },

    async getRoom(tenantId, code) {
      const resolved = await resolveContainer();
      return readItem(resolved, `room:${code}`, tenantId);
    },

    async findPlayingRoom(tenantId, objectId) {
      const resolved = await resolveContainer();
      try {
        const response = await resolved.items.query({
          query: 'SELECT * FROM c WHERE c.kind = @kind AND (c.status = @playing OR c.status = @forfeit) AND (c.hostObjectId = @objectId OR c.guestObjectId = @objectId)',
          parameters: [
            { name: '@kind', value: 'room' },
            { name: '@playing', value: 'playing' },
            { name: '@forfeit', value: 'forfeit' },
            { name: '@objectId', value: objectId },
          ],
        }, { partitionKey: tenantId }).fetchAll();
        const document = response.resources?.[0] ?? null;
        return document ? { document, etag: document._etag ?? null } : { document: null, etag: null };
      } catch (error) {
        throw new PvpStorageError('PvP storage is unavailable.', error);
      }
    },

    async replaceRoom(room, etag) {
      const resolved = await resolveContainer();
      try {
        const response = await resolved.item(room.id, room.tenantId).replace(applicationFields(room), {
          accessCondition: { type: 'IfMatch', condition: etag },
        });
        return readDocument(response);
      } catch (error) {
        if (isConflict(error) || isPreconditionFailed(error)) throw new PvpConcurrencyError();
        throw new PvpStorageError('The PvP room could not be updated.', error);
      }
    },

    async getMatch(tenantId, code) {
      const resolved = await resolveContainer();
      return readItem(resolved, `match:${code}`, tenantId);
    },

    async createMatchOnce(match) {
      const resolved = await resolveContainer();
      try {
        const response = await resolved.items.create(applicationFields(match));
        return { ...readDocument(response), created: true };
      } catch (error) {
        if (isConflict(error)) {
          const existing = await readItem(resolved, match.id, match.tenantId);
          if (existing.document) return { ...existing, created: false };
        }
        throw new PvpStorageError('The PvP result could not be recorded.', error);
      }
    },

    async listMatches(tenantId) {
      const resolved = await resolveContainer();
      try {
        const response = await resolved.items.query({
          query: 'SELECT * FROM c WHERE c.kind = @kind',
          parameters: [{ name: '@kind', value: 'match' }],
        }, { partitionKey: tenantId }).fetchAll();
        return response.resources ?? [];
      } catch (error) {
        throw new PvpStorageError('The PvP leaderboard could not be loaded.', error);
      }
    },
  };
}
