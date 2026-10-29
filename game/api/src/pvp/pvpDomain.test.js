import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PvpError,
  buildConfirmedMatch,
  buildForfeitMatch,
  buildLeaderboard,
  generateRoomCode,
  normalizeRoomCode,
  publicRoom,
  validateSkillIds,
} from './pvpDomain.js';
import { SKILL_IDS } from '../../../src/game/skills.js';

test('room codes are six allowed uppercase characters and normalize user input', () => {
  assert.equal(generateRoomCode(() => Uint8Array.from([0, 1, 2, 3, 4, 5])).length, 6);
  assert.equal(normalizeRoomCode(' abc234 '), 'ABC234');
  assert.throws(() => normalizeRoomCode('O0IL12'), PvpError);
});

test('loadout requires three unique known skills', () => {
  assert.deepEqual(validateSkillIds(SKILL_IDS.slice(0, 3)), SKILL_IDS.slice(0, 3));
  assert.throws(() => validateSkillIds(SKILL_IDS.slice(0, 2)), PvpError);
  assert.throws(() => validateSkillIds([SKILL_IDS[0], SKILL_IDS[0], SKILL_IDS[1]]), PvpError);
});

test('public room hides tenant and account identifiers and rejects nonmembers', () => {
  const room = { code: 'ABC234', status: 'waiting', tenantId: 'tenant', hostObjectId: 'host', hostDisplayName: 'Host' };
  const result = publicRoom(room, 'host');
  assert.equal(result.isHost, true);
  assert.equal('tenantId' in result, false);
  assert.equal('hostObjectId' in result, false);
  assert.throws(() => publicRoom(room, 'stranger'), (error) => error instanceof PvpError && error.status === 403);
});

test('normal and forfeit matches have deterministic outcomes', () => {
  const room = { code: 'ABC234', tenantId: 't', hostObjectId: 'h', hostDisplayName: 'Host', guestObjectId: 'g', guestDisplayName: 'Guest', status: 'playing' };
  assert.equal(buildConfirmedMatch(room, 2, 1, 'now').outcome, 'homeWin');
  assert.equal(buildConfirmedMatch(room, 1, 1, 'now').outcome, 'draw');
  assert.equal(buildForfeitMatch(room, 'g', 'now').outcome, 'homeWin');
});

test('leaderboard counts records once and shares equal-win rank', () => {
  const rows = buildLeaderboard([
    { kind: 'match', homeObjectId: 'a', awayObjectId: 'b', homeDisplayName: 'Alpha', awayDisplayName: 'Beta', outcome: 'homeWin', recordedAt: '2026-01-01' },
    { kind: 'match', homeObjectId: 'a', awayObjectId: 'c', homeDisplayName: 'Alpha', awayDisplayName: 'Gamma', outcome: 'awayWin', recordedAt: '2026-01-02' },
    { kind: 'match', homeObjectId: 'c', awayObjectId: 'b', homeDisplayName: 'Gamma', awayDisplayName: 'Beta', outcome: 'awayWin', recordedAt: '2026-01-03' },
  ]);
  assert.deepEqual(rows.map(({ displayName, rank, wins }) => ({ displayName, rank, wins })), [
    { displayName: 'Alpha', rank: 1, wins: 1 },
    { displayName: 'Beta', rank: 1, wins: 1 },
    { displayName: 'Gamma', rank: 1, wins: 1 },
  ]);
});
