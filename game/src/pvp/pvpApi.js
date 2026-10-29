import { getProfileApiToken } from '../auth/entraAuth.js';

const FALLBACK_ERROR_MESSAGE = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

export class PvpApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'PvpApiError';
    this.status = status;
    this.code = code;
  }
}

function normalizeCode(code) {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

export function createPvpApi({ acquireToken = getProfileApiToken, fetchImpl = fetch } = {}) {
  async function request(path, { method = 'GET', body } = {}) {
    let token;
    try {
      token = await acquireToken();
    } catch {
      throw new PvpApiError(401, 'AUTH_REQUIRED', '회사 계정으로 다시 로그인해 주세요.');
    }
    if (typeof token !== 'string' || !token.trim()) {
      throw new PvpApiError(401, 'AUTH_REQUIRED', '회사 계정으로 다시 로그인해 주세요.');
    }

    let response;
    try {
      response = await fetchImpl(path, {
        method,
        headers: {
          'X-Profile-Access-Token': `Bearer ${token}`,
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        cache: 'no-store',
      });
    } catch {
      throw new PvpApiError(0, 'NETWORK_ERROR', '서버에 연결하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.');
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      if (response.ok) throw new PvpApiError(500, 'INVALID_SERVER_RESPONSE', '서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
    }
    if (!response.ok) {
      throw new PvpApiError(
        response.status,
        typeof payload?.code === 'string' ? payload.code : 'PVP_REQUEST_FAILED',
        typeof payload?.message === 'string' && payload.message.trim() ? payload.message : FALLBACK_ERROR_MESSAGE,
      );
    }
    return payload;
  }

  async function roomRequest(path, method = 'GET', body = undefined) {
    const payload = await request(path, { method, body });
    if (!payload?.room || typeof payload.room !== 'object') {
      throw new PvpApiError(500, 'INVALID_SERVER_RESPONSE', '서버에서 방 정보를 받지 못했습니다.');
    }
    return payload.room;
  }

  return {
    createRoom: (displayName) => roomRequest('/api/pvp/rooms', 'POST', { displayName }),
    getRoom: (code) => roomRequest(`/api/pvp/rooms/${encodeURIComponent(normalizeCode(code))}`),
    joinRoom: (code, displayName) => roomRequest(`/api/pvp/rooms/${encodeURIComponent(normalizeCode(code))}/join`, 'POST', { displayName }),
    saveLoadout: (code, skillIds) => roomRequest(`/api/pvp/rooms/${encodeURIComponent(normalizeCode(code))}/loadout`, 'PUT', { skillIds }),
    setReady: (code, ready) => roomRequest(`/api/pvp/rooms/${encodeURIComponent(normalizeCode(code))}/ready`, 'POST', { ready }),
    startRoom: (code) => roomRequest(`/api/pvp/rooms/${encodeURIComponent(normalizeCode(code))}/start`, 'POST', {}),
    cancelRoom: async (code) => request(`/api/pvp/rooms/${encodeURIComponent(normalizeCode(code))}`, { method: 'DELETE' }),
  };
}
