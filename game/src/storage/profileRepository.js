import { createEmptyProfile, readProfile, STORAGE_KEY, writeProfile } from './localProfile.js';

const OWNER_KEY = 'dex-pixel-football:owner:v1';
const ACCOUNT_CACHE_PREFIX = `${STORAGE_KEY}:`;

export class ProfileSyncError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ProfileSyncError';
    this.status = status;
  }
}

function accountIdentity(account) {
  const tenantId = account?.idTokenClaims?.tid;
  const objectId = account?.idTokenClaims?.oid;
  if (!tenantId || !objectId) throw new ProfileSyncError(401, '로그인 계정을 확인할 수 없습니다. 다시 로그인해 주세요.');
  return { tenantId, objectId };
}

function accountCacheKey({ tenantId, objectId }) {
  return `${ACCOUNT_CACHE_PREFIX}${tenantId}:${objectId}`;
}

function readOwner(storage) {
  const raw = storage.getItem(OWNER_KEY);
  if (!raw) return null;
  try {
    const owner = JSON.parse(raw);
    if (owner?.tenantId && owner?.objectId) return owner;
    throw new Error('Invalid account owner marker');
  } catch {
    throw new ProfileSyncError(0, '이 브라우저의 저장 계정 표시를 읽지 못했습니다. 저장 데이터를 보호하기 위해 동기화를 멈췄습니다.');
  }
}

function normalizeProfile(profile) {
  const values = new Map();
  const adapter = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  return writeProfile(profile, adapter);
}

function cacheProfile(profile, identity, storage, { claimOwner = true } = {}) {
  const normalized = normalizeProfile(profile);
  storage.setItem(accountCacheKey(identity), JSON.stringify(normalized));
  if (claimOwner) storage.setItem(OWNER_KEY, JSON.stringify(identity));
  return normalized;
}

function readAccountCache(identity, storage) {
  const raw = storage.getItem(accountCacheKey(identity));
  if (!raw) return createEmptyProfile();
  try {
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return createEmptyProfile();
  }
}

async function requestProfile(method, profile, acquireToken) {
  let token;
  try {
    token = await acquireToken();
  } catch (error) {
    throw new ProfileSyncError(401, error?.message || '로그인 토큰을 가져오지 못했습니다. 다시 로그인해 주세요.');
  }
  let response;
  try {
    response = await fetch('/api/profile', {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'PUT' ? { body: JSON.stringify({ profile }) } : {}),
      cache: 'no-store',
    });
  } catch {
    throw new ProfileSyncError(0, '클라우드 저장소에 연결할 수 없습니다. 연결을 확인하고 다시 시도해 주세요.');
  }
  if (response.status === 404 && method === 'GET') return null;
  if (!response.ok) {
    const message = response.status === 401
      ? '로그인이 만료되었습니다. 다시 로그인해 주세요.'
      : response.status === 403
        ? '프로필 API 권한이 없습니다. Entra API 권한과 동의 설정을 확인해 주세요.'
        : `클라우드 저장에 실패했습니다 (${response.status}). 잠시 후 다시 시도해 주세요.`;
    throw new ProfileSyncError(response.status, message);
  }
  if (method !== 'GET') return null;
  try {
    const payload = await response.json();
    if (!payload || typeof payload.profile !== 'object' || payload.profile === null) {
      throw new Error('Missing profile payload');
    }
    return payload;
  } catch {
    throw new ProfileSyncError(500, '클라우드 프로필 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  }
}

export function getCachedProfileForAccount(account, storage = window.localStorage) {
  return readAccountCache(accountIdentity(account), storage);
}

export async function loadCloudProfile({ account, acquireToken, storage = window.localStorage }) {
  const identity = accountIdentity(account);
  const owner = readOwner(storage);
  const remote = await requestProfile('GET', null, acquireToken);
  if (remote) {
    return { profile: cacheProfile(remote.profile, identity, storage), synced: true, migrated: false };
  }

  const isFirstAccountOnBrowser = !owner;
  const isSameOwner = owner?.tenantId === identity.tenantId && owner?.objectId === identity.objectId;
  const localProfile = isFirstAccountOnBrowser
    ? readProfile(storage)
    : isSameOwner ? readAccountCache(identity, storage) : createEmptyProfile();
  const profile = normalizeProfile(localProfile);
  await requestProfile('PUT', profile, acquireToken);
  const migrated = isFirstAccountOnBrowser && Boolean(storage.getItem(STORAGE_KEY));
  if (isFirstAccountOnBrowser && migrated) storage.setItem(STORAGE_KEY, JSON.stringify(profile));
  return { profile: cacheProfile(profile, identity, storage), synced: true, migrated };
}

export async function saveCloudProfile({ account, profile, acquireToken, storage = window.localStorage }) {
  const identity = accountIdentity(account);
  const normalized = cacheProfile(profile, identity, storage, { claimOwner: false });
  await requestProfile('PUT', normalized, acquireToken);
  storage.setItem(OWNER_KEY, JSON.stringify(identity));
  return { profile: normalized, synced: true };
}
