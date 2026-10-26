import { CosmosClient } from '@azure/cosmos';

const DATABASE_ID = 'football';
const CONTAINER_ID = 'profiles';

let cachedConnectionString = '';
let cachedContainer = null;

function storageDiagnostic(cause) {
  if (!cause) return undefined;
  const reason = typeof cause.code === 'string' || typeof cause.code === 'number'
    ? String(cause.code)
    : typeof cause.name === 'string' ? cause.name : 'unknown';
  const statusCode = Number.isInteger(cause.statusCode) ? cause.statusCode : undefined;
  const substatus = Number.isInteger(cause.substatus) ? cause.substatus : undefined;
  return {
    reason,
    ...(statusCode !== undefined ? { statusCode } : {}),
    ...(substatus !== undefined ? { substatus } : {}),
  };
}

function createStorageError(message, cause, diagnostic = undefined) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.name = 'ProfileStorageError';
  error.status = 503;
  error.diagnostic = diagnostic ?? storageDiagnostic(cause);
  return error;
}

function getContainer(env = process.env) {
  const connectionString = env.COSMOS_CONNECTION_STRING?.trim();
  if (!connectionString) {
    throw createStorageError('Profile storage is not configured.', undefined, {
      reason: 'COSMOS_CONNECTION_STRING_MISSING',
    });
  }

  if (cachedContainer && cachedConnectionString === connectionString) {
    return cachedContainer;
  }

  try {
    const client = new CosmosClient(connectionString);
    cachedConnectionString = connectionString;
    cachedContainer = client.database(DATABASE_ID).container(CONTAINER_ID);
    return cachedContainer;
  } catch (error) {
    throw createStorageError('Profile storage configuration is invalid.', error);
  }
}

function requireAccountKey({ tenantId, objectId } = {}) {
  if (typeof tenantId !== 'string' || !tenantId.trim()
      || typeof objectId !== 'string' || !objectId.trim()) {
    throw createStorageError('The verified account key is unavailable.', undefined, {
      reason: 'VERIFIED_ACCOUNT_KEY_MISSING',
    });
  }
}

function isNotFound(error) {
  return error?.code === 404 || error?.statusCode === 404;
}

export async function getProfile({ tenantId, objectId }, env = process.env) {
  requireAccountKey({ tenantId, objectId });
  const container = getContainer(env);

  let response;
  try {
    response = await container.item(objectId, tenantId).read();
  } catch (error) {
    if (isNotFound(error)) return null;
    throw createStorageError('Profile storage is unavailable.', error);
  }

  const document = response.resource;
  if (!document || typeof document.profile !== 'object' || document.profile === null) {
    throw createStorageError('The stored profile could not be read.', undefined, {
      reason: 'STORED_PROFILE_INVALID',
    });
  }

  return {
    profile: document.profile,
    updatedAt: typeof document.updatedAt === 'string' ? document.updatedAt : null,
  };
}

export async function putProfile({ tenantId, objectId, profile }, env = process.env) {
  requireAccountKey({ tenantId, objectId });
  const container = getContainer(env);
  const savedAt = new Date().toISOString();

  try {
    await container.items.upsert({
      id: objectId,
      tenantId,
      profile,
      updatedAt: savedAt,
    });
  } catch (error) {
    throw createStorageError('Profile storage is unavailable.', error);
  }

  return { savedAt };
}
