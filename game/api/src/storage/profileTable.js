import { TableClient } from '@azure/data-tables';

const TABLE_NAME = 'footballprofiles';

function createStorageError(message, cause) {
  const error = new Error(message, { cause });
  error.name = 'ProfileStorageError';
  error.status = 503;
  return error;
}

function createClient(env) {
  const connectionString = env.TABLE_STORAGE_CONNECTION_STRING?.trim();
  if (!connectionString) {
    throw createStorageError('Profile storage is not configured.');
  }
  try {
    return TableClient.fromConnectionString(connectionString, TABLE_NAME);
  } catch (error) {
    throw createStorageError('Profile storage configuration is invalid.', error);
  }
}

async function ensureTable(client) {
  try {
    await client.createTable();
  } catch (error) {
    if (error.statusCode !== 409) {
      throw createStorageError('Profile storage is unavailable.', error);
    }
  }
}

function requireAccountKey(account) {
  if (!account || typeof account.tenantId !== 'string' || !account.tenantId
      || typeof account.objectId !== 'string' || !account.objectId) {
    throw createStorageError('The verified account key is unavailable.');
  }
}

export function createProfileTableRepository(clientFactory = createClient) {
  async function getProfile({ tenantId, objectId }, env = process.env) {
    requireAccountKey({ tenantId, objectId });
    const client = clientFactory(env);
    await ensureTable(client);

    let entity;
    try {
      entity = await client.getEntity(tenantId, objectId);
    } catch (error) {
      if (error.statusCode === 404) return null;
      throw createStorageError('Profile storage is unavailable.', error);
    }

    try {
      if (typeof entity.profileJson !== 'string') throw new Error('Missing profile data.');
      return {
        profile: JSON.parse(entity.profileJson),
        updatedAt: typeof entity.updatedAt === 'string' ? entity.updatedAt : null,
      };
    } catch (error) {
      throw createStorageError('The stored profile could not be read.', error);
    }
  }

  async function putProfile({ tenantId, objectId, profile }, env = process.env) {
    requireAccountKey({ tenantId, objectId });
    const client = clientFactory(env);
    await ensureTable(client);

    const savedAt = new Date().toISOString();
    try {
      await client.upsertEntity({
        partitionKey: tenantId,
        rowKey: objectId,
        profileJson: JSON.stringify(profile),
        updatedAt: savedAt,
      }, 'Replace');
    } catch (error) {
      throw createStorageError('Profile storage is unavailable.', error);
    }
    return { savedAt };
  }

  return { getProfile, putProfile };
}

const repository = createProfileTableRepository();
export const getProfile = repository.getProfile;
export const putProfile = repository.putProfile;
