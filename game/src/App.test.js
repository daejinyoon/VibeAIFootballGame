import test from 'node:test';
import assert from 'node:assert/strict';
import { canStartPvpRoom, isPvpLoadoutSaved, shouldPollPvpRoom } from './pvp/pvpLobbyState.js';

const room = {
  code: 'ABC234', status: 'ready', isHost: true,
  hostReady: true, guestReady: true,
  hostSkillIds: ['eagleShot', 'tornadoShot', 'eulryongta'],
  guestSkillIds: ['vacuumCleaner', 'tornadoShot', 'eulryongta'],
};

test('start is available only to the host after both valid loadouts and ready flags', () => {
  assert.equal(canStartPvpRoom(room), true);
  assert.equal(canStartPvpRoom({ ...room, isHost: false }), false);
  assert.equal(canStartPvpRoom({ ...room, guestReady: false }), false);
  assert.equal(canStartPvpRoom({ ...room, hostSkillIds: ['eagleShot', 'eagleShot', 'eulryongta'] }), false);
});

test('room polling is limited to the visible lobby while a room waits or is ready', () => {
  assert.equal(shouldPollPvpRoom('pvpLobby', room), true);
  assert.equal(shouldPollPvpRoom('start', room), false);
  assert.equal(shouldPollPvpRoom('pvpLobby', { ...room, status: 'playing' }), false);
  assert.equal(shouldPollPvpRoom('pvpLobby', { ...room, status: 'cancelled' }), false);
});

test('ready requires the exact ordered loadout to have been saved', () => {
  assert.equal(isPvpLoadoutSaved(room.hostSkillIds, room.hostSkillIds), true);
  assert.equal(isPvpLoadoutSaved([...room.hostSkillIds].reverse(), room.hostSkillIds), false);
  assert.equal(isPvpLoadoutSaved(['eagleShot', 'eagleShot', 'eulryongta'], room.hostSkillIds), false);
});
