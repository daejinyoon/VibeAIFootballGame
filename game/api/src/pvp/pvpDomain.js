import { randomBytes as cryptoRandomBytes } from 'node:crypto';
import { PVP_SKILL_IDS } from './skillIds.js';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const MAX_LEADERBOARD_ROWS = 100;

export class PvpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'PvpError';
    this.status = status;
    this.code = code;
  }
}

export class PvpRoomCollisionError extends Error {
  constructor() {
    super('The generated PvP room code already exists.');
    this.name = 'PvpRoomCollisionError';
    this.status = 409;
  }
}

export class PvpConcurrencyError extends Error {
  constructor() {
    super('The PvP room changed while the operation was in progress.');
    this.name = 'PvpConcurrencyError';
    this.status = 409;
  }
}

export class PvpStorageError extends Error {
  constructor(message, cause = undefined) {
    super(message, cause ? { cause } : undefined);
    this.name = 'PvpStorageError';
    this.status = 503;
  }
}

export function normalizeRoomCode(code) {
  if (typeof code !== 'string') {
    throw new PvpError(400, 'INVALID_ROOM_CODE', 'The room code is invalid.');
  }
  const normalized = code.trim().toUpperCase();
  if (!ROOM_CODE_PATTERN.test(normalized)) {
    throw new PvpError(400, 'INVALID_ROOM_CODE', 'The room code is invalid.');
  }
  return normalized;
}

export function normalizeDisplayName(displayName) {
  if (typeof displayName !== 'string') {
    throw new PvpError(400, 'INVALID_DISPLAY_NAME', 'A company account display name is required.');
  }
  const normalized = displayName.trim();
  if (!normalized || normalized.length > 100 || /[\u0000-\u001F\u007F]/u.test(normalized)) {
    throw new PvpError(400, 'INVALID_DISPLAY_NAME', 'The company account display name is invalid.');
  }
  return normalized;
}

export function generateRoomCode(randomBytes = cryptoRandomBytes) {
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length]).join('');
}

export function validateSkillIds(skillIds) {
  if (!Array.isArray(skillIds) || skillIds.length !== 3
      || new Set(skillIds).size !== 3
      || !skillIds.every((skillId) => typeof skillId === 'string' && PVP_SKILL_IDS.includes(skillId))) {
    throw new PvpError(400, 'INVALID_LOADOUT', 'Choose exactly three different PvP skills.');
  }
  return [...skillIds];
}

export function publicRoom(room, viewerObjectId) {
  const isHost = room?.hostObjectId === viewerObjectId;
  const isGuest = room?.guestObjectId === viewerObjectId;
  if (!isHost && !isGuest) {
    throw new PvpError(403, 'ROOM_MEMBERSHIP_REQUIRED', 'You are not a member of this room.');
  }

  return {
    code: room.code,
    status: room.status,
    hostDisplayName: room.hostDisplayName,
    guestDisplayName: room.guestDisplayName ?? null,
    hostSkillIds: Array.isArray(room.hostSkillIds) ? [...room.hostSkillIds] : null,
    guestSkillIds: Array.isArray(room.guestSkillIds) ? [...room.guestSkillIds] : null,
    hostReady: Boolean(room.hostReady),
    guestReady: Boolean(room.guestReady),
    isHost,
  };
}

export function buildConfirmedMatch(room, homeGoals, awayGoals, recordedAt) {
  const common = {
    id: `match:${room.code}`,
    tenantId: room.tenantId,
    kind: 'match',
    roomCode: room.code,
    homeObjectId: room.hostObjectId,
    homeDisplayName: room.hostDisplayName,
    awayObjectId: room.guestObjectId,
    awayDisplayName: room.guestDisplayName,
    homeGoals,
    awayGoals,
    source: 'normal',
    recordedAt,
  };

  if (homeGoals === awayGoals) return { ...common, outcome: 'draw' };
  return { ...common, outcome: homeGoals > awayGoals ? 'homeWin' : 'awayWin' };
}

export function buildForfeitMatch(room, disconnectedObjectId, recordedAt) {
  const disconnectedHost = disconnectedObjectId === room.hostObjectId;
  const disconnectedGuest = disconnectedObjectId === room.guestObjectId;
  if (!disconnectedHost && !disconnectedGuest) {
    throw new PvpError(403, 'ROOM_MEMBERSHIP_REQUIRED', 'The disconnected account is not a room member.');
  }
  if (!room.guestObjectId || !['playing', 'forfeit'].includes(room.status)) {
    throw new PvpError(409, 'ROOM_NOT_PLAYING', 'Only an active PvP room can end by forfeit.');
  }

  return {
    id: `match:${room.code}`,
    tenantId: room.tenantId,
    kind: 'match',
    roomCode: room.code,
    homeObjectId: room.hostObjectId,
    homeDisplayName: room.hostDisplayName,
    awayObjectId: room.guestObjectId,
    awayDisplayName: room.guestDisplayName,
    outcome: disconnectedHost ? 'awayWin' : 'homeWin',
    homeGoals: null,
    awayGoals: null,
    source: 'forfeit',
    recordedAt,
  };
}

export function publicMatch(match) {
  if (!match) return null;
  return {
    outcome: match.outcome,
    homeGoals: Number.isInteger(match.homeGoals) ? match.homeGoals : null,
    awayGoals: Number.isInteger(match.awayGoals) ? match.awayGoals : null,
    source: match.source,
    recordedAt: match.recordedAt,
  };
}

export function buildLeaderboard(matches, limit = MAX_LEADERBOARD_ROWS) {
  const safeLimit = Number.isInteger(limit) ? Math.max(0, Math.min(limit, MAX_LEADERBOARD_ROWS)) : MAX_LEADERBOARD_ROWS;
  const totalsByObjectId = new Map();

  for (const match of matches) {
    if (!match || match.kind !== 'match'
        || typeof match.homeObjectId !== 'string' || typeof match.awayObjectId !== 'string'
        || !['homeWin', 'awayWin', 'draw'].includes(match.outcome)) continue;

    const home = totalsByObjectId.get(match.homeObjectId) ?? {
      displayName: match.homeDisplayName,
      wins: 0,
      losses: 0,
      draws: 0,
      matchesPlayed: 0,
      latestRecordedAt: '',
    };
    const away = totalsByObjectId.get(match.awayObjectId) ?? {
      displayName: match.awayDisplayName,
      wins: 0,
      losses: 0,
      draws: 0,
      matchesPlayed: 0,
      latestRecordedAt: '',
    };

    home.matchesPlayed += 1;
    away.matchesPlayed += 1;
    if (match.outcome === 'draw') {
      home.draws += 1;
      away.draws += 1;
    } else if (match.outcome === 'homeWin') {
      home.wins += 1;
      away.losses += 1;
    } else {
      home.losses += 1;
      away.wins += 1;
    }

    const recordedAt = typeof match.recordedAt === 'string' ? match.recordedAt : '';
    if (recordedAt >= home.latestRecordedAt) {
      home.displayName = match.homeDisplayName;
      home.latestRecordedAt = recordedAt;
    }
    if (recordedAt >= away.latestRecordedAt) {
      away.displayName = match.awayDisplayName;
      away.latestRecordedAt = recordedAt;
    }
    totalsByObjectId.set(match.homeObjectId, home);
    totalsByObjectId.set(match.awayObjectId, away);
  }

  const sorted = [...totalsByObjectId.values()]
    .sort((left, right) => right.wins - left.wins
      || String(left.displayName).localeCompare(String(right.displayName), 'ko'));
  return sorted.slice(0, safeLimit).map((record, index) => ({
    rank: 1 + sorted.filter((candidate) => candidate.wins > record.wins).length,
    displayName: record.displayName,
    wins: record.wins,
    losses: record.losses,
    draws: record.draws,
    matchesPlayed: record.matchesPlayed,
  }));
}
