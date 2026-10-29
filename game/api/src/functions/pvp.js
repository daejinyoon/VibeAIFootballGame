import { app } from '@azure/functions';
import { EntraAuthError, requireEntraCaller } from '../auth/entra.js';
import {
  PvpConcurrencyError,
  PvpError,
  PvpRoomCollisionError,
  PvpStorageError,
  buildConfirmedMatch,
  buildForfeitMatch,
  buildLeaderboard,
  generateRoomCode,
  normalizeDisplayName,
  normalizeRoomCode,
  publicMatch,
  publicRoom,
  validateSkillIds,
} from '../pvp/pvpDomain.js';
import { createPvpRepository } from '../storage/pvpCosmos.js';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_CAS_ATTEMPTS = 3;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function readJsonBody(request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new PvpError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new PvpError(400, 'INVALID_JSON', 'The request body must be valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new PvpError(400, 'INVALID_BODY', 'The request body must be a JSON object.');
  }
  return body;
}

function errorResponse(error) {
  if (error instanceof EntraAuthError || error instanceof PvpError) {
    return jsonResponse(error.status, { code: error.code, message: error.message });
  }
  if (error instanceof PvpConcurrencyError || error instanceof PvpRoomCollisionError) {
    return jsonResponse(409, { code: 'ROOM_CHANGED', message: 'The room changed. Refresh and try again.' });
  }
  if (error instanceof PvpStorageError || error?.status === 503) {
    return jsonResponse(503, { code: 'PVP_STORAGE_UNAVAILABLE', message: 'PvP storage is unavailable. Please retry.' });
  }
  return jsonResponse(500, { code: 'PVP_REQUEST_FAILED', message: 'The PvP request could not be completed.' });
}

function assertMember(room, account) {
  if (room.hostObjectId !== account.objectId && room.guestObjectId !== account.objectId) {
    throw new PvpError(403, 'ROOM_MEMBERSHIP_REQUIRED', 'You are not a member of this room.');
  }
}

function assertHost(room, account) {
  assertMember(room, account);
  if (room.hostObjectId !== account.objectId) {
    throw new PvpError(403, 'HOST_REQUIRED', 'Only the room host can perform this action.');
  }
}

function currentVote(room, isHost) {
  return isHost ? room.hostResultVote : room.guestResultVote;
}

function sameScore(left, right) {
  return left?.homeGoals === right?.homeGoals && left?.awayGoals === right?.awayGoals;
}

function validateScore(body) {
  for (const key of ['homeGoals', 'awayGoals']) {
    if (!Number.isInteger(body[key]) || body[key] < 0 || body[key] > 99) {
      throw new PvpError(400, 'INVALID_SCORE', 'Scores must be integers from 0 to 99.');
    }
  }
  return { homeGoals: body.homeGoals, awayGoals: body.awayGoals };
}

export function createPvpHandler({
  authenticate = requireEntraCaller,
  repository = createPvpRepository(),
  now = () => new Date().toISOString(),
  makeCode = generateRoomCode,
} = {}) {
  async function execute(request, action) {
    try {
      const account = await authenticate(request);
      return await action(account);
    } catch (error) {
      return errorResponse(error);
    }
  }

  async function loadRoom(code, account, { allowNonMember = false } = {}) {
    const normalizedCode = normalizeRoomCode(code);
    const result = await repository.getRoom(account.tenantId, normalizedCode);
    if (!result?.document) throw new PvpError(404, 'ROOM_NOT_FOUND', 'The room was not found.');
    if (!allowNonMember) assertMember(result.document, account);
    return { ...result, code: normalizedCode };
  }

  async function updateRoom(code, account, mutate, { allowNonMember = false } = {}) {
    for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
      const current = await loadRoom(code, account, { allowNonMember });
      const updated = mutate({ ...current.document }, account);
      updated.updatedAt = now();
      try {
        const saved = await repository.replaceRoom(updated, current.etag);
        return saved.document ?? updated;
      } catch (error) {
        if (!(error instanceof PvpConcurrencyError) || attempt === MAX_CAS_ATTEMPTS - 1) throw error;
      }
    }
    throw new PvpConcurrencyError();
  }

  return {
    createRoom: (request) => execute(request, async (account) => {
      const body = await readJsonBody(request);
      const displayName = normalizeDisplayName(body.displayName);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = normalizeRoomCode(makeCode());
        const room = {
          id: `room:${code}`,
          tenantId: account.tenantId,
          kind: 'room',
          code,
          hostObjectId: account.objectId,
          hostDisplayName: displayName,
          guestObjectId: null,
          guestDisplayName: null,
          status: 'waiting',
          hostSkillIds: null,
          guestSkillIds: null,
          hostReady: false,
          guestReady: false,
          hostResultVote: null,
          guestResultVote: null,
          createdAt: now(),
          updatedAt: now(),
        };
        try {
          const saved = await repository.createRoom(room);
          return jsonResponse(201, { room: publicRoom(saved.document ?? room, account.objectId) });
        } catch (error) {
          if (!(error instanceof PvpRoomCollisionError) || attempt === 4) throw error;
        }
      }
      throw new PvpRoomCollisionError();
    }),

    getRoom: (request) => execute(request, async (account) => {
      const room = await loadRoom(request.params?.code, account);
      return jsonResponse(200, { room: publicRoom(room.document, account.objectId) });
    }),

    joinRoom: (request) => execute(request, async (account) => {
      const body = await readJsonBody(request);
      const displayName = normalizeDisplayName(body.displayName);
      const room = await updateRoom(request.params?.code, account, (current) => {
        if (current.hostObjectId === account.objectId) throw new PvpError(409, 'CANNOT_JOIN_OWN_ROOM', 'The host cannot join their own room.');
        if (current.guestObjectId === account.objectId) return current;
        if (current.status !== 'waiting' || current.guestObjectId) throw new PvpError(409, 'ROOM_NOT_JOINABLE', 'The room is full or no longer accepting players.');
        current.guestObjectId = account.objectId;
        current.guestDisplayName = displayName;
        current.guestSkillIds = null;
        current.guestReady = false;
        return current;
      }, { allowNonMember: true });
      return jsonResponse(200, { room: publicRoom(room, account.objectId) });
    }),

    setLoadout: (request) => execute(request, async (account) => {
      const body = await readJsonBody(request);
      const skillIds = validateSkillIds(body.skillIds);
      const room = await updateRoom(request.params?.code, account, (current) => {
        if (current.status !== 'waiting' && current.status !== 'ready') throw new PvpError(409, 'ROOM_NOT_CONFIGURABLE', 'The room loadout is locked.');
        const isHost = current.hostObjectId === account.objectId;
        const ready = isHost ? current.hostReady : current.guestReady;
        if (ready) throw new PvpError(409, 'PLAYER_ALREADY_READY', 'Set ready to false before changing your loadout.');
        if (isHost) current.hostSkillIds = skillIds;
        else current.guestSkillIds = skillIds;
        current.status = 'waiting';
        return current;
      });
      return jsonResponse(200, { room: publicRoom(room, account.objectId) });
    }),

    setReady: (request) => execute(request, async (account) => {
      const body = await readJsonBody(request);
      if (typeof body.ready !== 'boolean') throw new PvpError(400, 'INVALID_READY_STATE', 'Ready must be a boolean.');
      const room = await updateRoom(request.params?.code, account, (current) => {
        if (current.status !== 'waiting' && current.status !== 'ready') throw new PvpError(409, 'ROOM_NOT_READYABLE', 'The room cannot change ready state.');
        const isHost = current.hostObjectId === account.objectId;
        const skills = isHost ? current.hostSkillIds : current.guestSkillIds;
        if (body.ready && !Array.isArray(skills)) throw new PvpError(409, 'LOADOUT_REQUIRED', 'Choose a loadout before readying up.');
        if (isHost) current.hostReady = body.ready;
        else current.guestReady = body.ready;
        current.status = current.hostReady && current.guestReady ? 'ready' : 'waiting';
        return current;
      });
      return jsonResponse(200, { room: publicRoom(room, account.objectId) });
    }),

    startRoom: (request) => execute(request, async (account) => {
      const room = await updateRoom(request.params?.code, account, (current) => {
        assertHost(current, account);
        if (current.status !== 'ready' || !current.guestObjectId || !current.hostReady || !current.guestReady
          || !current.hostSkillIds || !current.guestSkillIds) {
          throw new PvpError(409, 'ROOM_NOT_READY', 'Both players must be ready with a loadout.');
        }
        current.status = 'playing';
        return current;
      });
      return jsonResponse(200, { room: publicRoom(room, account.objectId) });
    }),

    cancelRoom: (request) => execute(request, async (account) => {
      await updateRoom(request.params?.code, account, (current) => {
        assertHost(current, account);
        if (!['waiting', 'ready'].includes(current.status)) throw new PvpError(409, 'ROOM_CANNOT_CANCEL', 'Only a room before the match can be cancelled.');
        current.status = 'cancelled';
        return current;
      });
      return jsonResponse(200, { cancelled: true });
    }),

    getResult: (request) => execute(request, async (account) => {
      const room = await loadRoom(request.params?.code, account);
      if (!['playing', 'awaitingResults', 'disputed', 'completed', 'forfeit'].includes(room.document.status)) {
        throw new PvpError(409, 'RESULT_NOT_AVAILABLE', 'This room has no match result yet.');
      }
      const savedMatch = (await repository.getMatch(account.tenantId, room.code)).document;
      const status = room.document.status === 'playing' ? 'awaitingResults' : room.document.status;
      return jsonResponse(200, {
        status,
        ...(savedMatch ? { match: publicMatch(savedMatch) } : {}),
      });
    }),

    submitResult: (request) => execute(request, async (account) => {
      const body = await readJsonBody(request);
      const vote = validateScore(body);
      const normalizedCode = normalizeRoomCode(request.params?.code);
      for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
        const current = await loadRoom(normalizedCode, account);
        const room = current.document;
        if (room.status === 'completed') {
          const match = (await repository.getMatch(account.tenantId, normalizedCode)).document;
          return jsonResponse(200, { status: 'completed', ...(match ? { match: publicMatch(match) } : {}) });
        }
        if (room.status !== 'playing' && room.status !== 'awaitingResults' && room.status !== 'disputed') {
          throw new PvpError(409, 'ROOM_NOT_PLAYING', 'The room is not accepting a result.');
        }
        const isHost = room.hostObjectId === account.objectId;
        const priorVote = currentVote(room, isHost);
        if (priorVote && !sameScore(priorVote, vote)) throw new PvpError(409, 'RESULT_ALREADY_SUBMITTED', 'Your submitted result cannot be changed.');
        if (room.status === 'disputed' && priorVote) return jsonResponse(200, { status: 'disputed' });
        const otherVote = currentVote(room, !isHost);
        if (otherVote && sameScore(otherVote, vote)) {
          const match = buildConfirmedMatch(room, vote.homeGoals, vote.awayGoals, now());
          await repository.createMatchOnce(match);
          room.status = 'completed';
          if (isHost) room.hostResultVote = vote;
          else room.guestResultVote = vote;
        } else if (otherVote) {
          room.status = 'disputed';
          if (isHost) room.hostResultVote = vote;
          else room.guestResultVote = vote;
        } else {
          room.status = 'awaitingResults';
          if (isHost) room.hostResultVote = vote;
          else room.guestResultVote = vote;
        }
        room.updatedAt = now();
        try {
          await repository.replaceRoom(room, current.etag);
          const savedMatch = room.status === 'completed' ? (await repository.getMatch(account.tenantId, normalizedCode)).document : null;
          return jsonResponse(200, { status: room.status, ...(savedMatch ? { match: publicMatch(savedMatch) } : {}) });
        } catch (error) {
          if (!(error instanceof PvpConcurrencyError) || attempt === MAX_CAS_ATTEMPTS - 1) throw error;
        }
      }
      throw new PvpConcurrencyError();
    }),

    leaderboard: (request) => execute(request, async (account) => {
      const matches = await repository.listMatches(account.tenantId);
      return jsonResponse(200, { records: buildLeaderboard(matches) });
    }),
  };
}

const handlers = createPvpHandler();
const route = (name, path, methods, handler) => app.http(name, {
  route: path,
  methods,
  authLevel: 'anonymous',
  handler,
});

route('pvpCreateRoom', 'pvp/rooms', ['POST'], handlers.createRoom);
route('pvpGetRoom', 'pvp/rooms/{code}', ['GET'], handlers.getRoom);
route('pvpGetRoomResult', 'pvp/rooms/{code}/result', ['GET'], handlers.getResult);
route('pvpJoinRoom', 'pvp/rooms/{code}/join', ['POST'], handlers.joinRoom);
route('pvpSetLoadout', 'pvp/rooms/{code}/loadout', ['PUT'], handlers.setLoadout);
route('pvpSetReady', 'pvp/rooms/{code}/ready', ['POST'], handlers.setReady);
route('pvpStartRoom', 'pvp/rooms/{code}/start', ['POST'], handlers.startRoom);
route('pvpCancelRoom', 'pvp/rooms/{code}', ['DELETE'], handlers.cancelRoom);
route('pvpSubmitResult', 'pvp/rooms/{code}/result', ['POST'], handlers.submitResult);
route('pvpLeaderboard', 'pvp/leaderboard', ['GET'], handlers.leaderboard);
