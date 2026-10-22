import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialGameState } from './createInitialGameState.js';
import {
  addSkillGauge,
  applyAutomaticRainbowReflect,
  applySkill,
  HOME_PLAYER_IDS,
  SKILL_IDS,
  validateLoadout,
} from './skills.js';
import { stepGame } from './stepGame.js';

const completeLoadout = Object.fromEntries(HOME_PLAYER_IDS.map((id, index) => [id, SKILL_IDS[index]]));

test('validates six unique skills for six players and reports missing or duplicate assignments', () => {
  assert.equal(validateLoadout(completeLoadout).valid, true);

  const missing = { ...completeLoadout };
  delete missing['home-fw'];
  assert.deepEqual(validateLoadout(missing).missingPlayerIds, ['home-fw']);

  const duplicate = { ...completeLoadout, 'home-fw': 'eagleShot' };
  assert.deepEqual(validateLoadout(duplicate).duplicateSkillIds, ['eagleShot']);
  assert.equal(validateLoadout({ ...completeLoadout, 'home-fw': 'unknown' }).valid, false);
});

test('passive and successful-play rewards are team-specific and capped at 100', () => {
  const state = createInitialGameState();
  addSkillGauge(state, 'pass', 'home');
  addSkillGauge(state, 'tackle', 'away');
  addSkillGauge(state, 'time', 'home', 30);

  assert.equal(state.skillGauge.home, 62);
  assert.equal(state.skillGauge.away, 20);
  addSkillGauge(state, 'keeperCatch', 'home');
  addSkillGauge(state, 'shotOnTarget', 'home');
  assert.equal(state.skillGauge.home, 97);
  addSkillGauge(state, 'pass', 'home');
  assert.equal(state.skillGauge.home, 100);
});

test('requires a full gauge and the skill conditions before spending it', () => {
  const state = createInitialGameState({ loadout: { 'home-fw': 'eagleShot' } });
  assert.equal(applySkill(state, 'home-fw').reason, 'gaugeNotFull');
  state.skillGauge.home = 100;
  state.ball.ownerId = null;
  assert.equal(applySkill(state, 'home-fw').reason, 'needBall');
  assert.equal(state.skillGauge.home, 100);
});

test('F activates the controlled player skill and charges the shared gauge on success', () => {
  const state = createInitialGameState({ loadout: { 'home-fw': 'eagleShot' } });
  state.skillGauge.home = 100;

  const events = stepGame(state, {
    down: new Set(['f']),
    pressed: new Set(['f']),
    released: new Set(),
  }, 0.01);

  assert.equal(state.ball.skillId, 'eagleShot');
  assert.equal(state.ball.flightKind, 'skill-shot');
  assert.ok(state.skillGauge.home >= 15);
  assert.ok(events.some((event) => event.type === 'skillUsed' && event.skillId === 'eagleShot'));
});

test('Eagle Shot ignores the ordinary goalkeeper catch', () => {
  const state = createInitialGameState({ opponentSkillStacks: { 'away-fw': { skillId: 'eagleShot', copies: 1 } } });
  state.skillGauge.away = 100;
  state.ball.ownerId = 'away-fw';
  state.possessionTeam = 'away';
  const shot = applySkill(state, 'away-fw');
  assert.equal(shot.ok, true);
  assert.equal(state.ball.skillId, 'eagleShot');

  Object.assign(state.ball, { x: 55, y: 270, vx: -20, vy: 0 });
  const events = stepGame(state, {}, 0.01);
  assert.equal(state.ball.ownerId, null);
  assert.equal(state.phase, 'playing');
  assert.ok(!events.some((event) => event.type === 'keeperCatch'));
});

test('the opponent AI spends its full shared gauge on an equipped attack skill', () => {
  const state = createInitialGameState({ opponentSkillIds: ['eagleShot'] });
  state.skillGauge.away = 100;
  state.ball.ownerId = 'away-def-1';
  state.possessionTeam = 'away';

  const events = stepGame(state, {}, 0.01);

  assert.equal(state.ball.skillId, 'eagleShot');
  assert.ok(state.skillGauge.away < 100);
  assert.ok(events.some((event) => event.type === 'skillUsed' && event.team === 'away'));
});

test('Power Tackle lasts four seconds and increases slide contact range', () => {
  const state = createInitialGameState({ loadout: { 'home-fw': 'powerTackle' } });
  state.skillGauge.home = 100;
  state.ball.ownerId = 'away-fw';
  state.possessionTeam = 'away';
  const result = applySkill(state, 'home-fw');
  assert.equal(result.ok, true);
  assert.equal(state.players.find((player) => player.id === 'home-fw').powerTackleSeconds, 4);

  const player = state.players.find((candidate) => candidate.id === 'home-fw');
  const opponent = state.players.find((candidate) => candidate.id === 'away-fw');
  player.x = 430;
  player.y = 270;
  player.slideSeconds = 0.25;
  opponent.x = 468;
  opponent.y = 270;
  stepGame(state, { pressed: new Set(), down: new Set(), released: new Set() }, 0.01);

  assert.equal(state.ball.ownerId, 'home-fw');
});

test('Eulryongta stuns the nearest opponent in front for two seconds', () => {
  const state = createInitialGameState({ loadout: { 'home-mid-1': 'eulryongta' } });
  state.skillGauge.home = 100;
  const user = state.players.find((player) => player.id === 'home-mid-1');
  const target = state.players.find((player) => player.id === 'away-mid-1');
  const behind = state.players.find((player) => player.id === 'away-gk');
  user.x = 300;
  user.y = 175;
  user.facingX = 1;
  user.facingY = 0;
  target.x = 380;
  target.y = 175;
  behind.x = 250;
  behind.y = 175;

  const result = applySkill(state, user.id);

  assert.equal(result.ok, true);
  assert.equal(target.stunnedSeconds, 2);
  assert.equal(behind.stunnedSeconds, 0);
});

test('Vacuum Cleaner pulls a nearby loose ball to a field player', () => {
  const state = createInitialGameState({ loadout: { 'home-def-1': 'vacuumCleaner' } });
  state.skillGauge.home = 100;
  state.ball.ownerId = null;
  state.ball.x = 260;
  state.ball.y = 175;

  assert.equal(applySkill(state, 'home-def-1').ok, true);
  for (let i = 0; i < 12 && state.vacuumEffect; i += 1) stepGame(state, {}, 0.05);

  assert.equal(state.ball.ownerId, 'home-def-1');
  assert.equal(state.possessionTeam, 'home');
});

test('goalkeepers cannot equip field-player skills', () => {
  const state = createInitialGameState({ loadout: { 'home-gk': 'vacuumCleaner' } });
  state.skillGauge.home = 100;
  state.ball.ownerId = null;
  state.ball.x = 70;
  state.ball.y = 270;

  assert.equal(applySkill(state, 'home-gk').reason, 'noSkillEquipped');
  assert.equal(state.ball.ownerId, null);
});

test('a completed pass charges the passing team once and charging fills each team gauge', () => {
  const state = createInitialGameState();
  state.ball.ownerId = null;
  state.ball.x = 370;
  state.ball.y = 350;
  state.ball.passTeam = 'home';
  state.possessionTeam = 'home';

  const events = stepGame(state, {}, 0.05);

  assert.equal(state.ball.ownerId, 'home-mid-1');
  assert.ok(events.some((event) => event.type === 'pass' && event.completed));
  assert.ok(state.skillGauge.home >= 12);
  assert.ok(state.skillGauge.away > 0);
});

test('Rainbow Reflection runs to an incoming opponent skill shot and sends it back', () => {
  const state = createInitialGameState({ loadout: { 'home-def-1': 'rainbowReflect' } });
  state.skillGauge.home = 100;
  Object.assign(state.ball, {
    ownerId: null,
    x: 500,
    y: 270,
    vx: -500,
    vy: 0,
    flightKind: 'skill-shot',
    skillId: 'eagleShot',
    lastTouchTeam: 'away',
  });

  const started = applyAutomaticRainbowReflect(state, 'home', 0.05);
  assert.equal(started.type, 'rainbowStarted');
  assert.equal(state.skillGauge.home, 0);
  let reflected = null;
  for (let i = 0; i < 30 && !reflected; i += 1) {
    reflected = applyAutomaticRainbowReflect(state, 'home', 0.05);
  }

  assert.ok(reflected);
  assert.equal(reflected.skillId, 'rainbowReflect');
  assert.ok(state.ball.vx > 0);
  assert.equal(state.ball.lastTouchTeam, 'home');
});
