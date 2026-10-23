import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { createInitialGameState } from './createInitialGameState.js';
import {
  MAX_SKILL_COPIES,
  SKILL_IDS,
  SKILLS,
  applyAutomaticRainbowReflect,
  applySkill,
  createSkillCardOffer,
  validateSkillAssignments,
} from './skills.js';
import { stepGame } from './stepGame.js';

test('every named skill maps to its own existing transparent PNG artwork', () => {
  assert.deepEqual(Object.keys(SKILLS), SKILL_IDS);
  const artworks = SKILL_IDS.map((skillId) => SKILLS[skillId].artwork);
  assert.equal(new Set(artworks).size, SKILL_IDS.length);
  for (const artwork of artworks) {
    assert.match(artwork, /^\/images\/skills\/[a-z-]+\.png$/);
    assert.ok(existsSync(new URL(`../../public${artwork}`, import.meta.url)), `${artwork} exists`);
  }
  assert.ok(SKILL_IDS.every((skillId) => SKILLS[skillId].name && SKILLS[skillId].description));
});

test('draft offers contain three different known skills and respect the injected random source', () => {
  const offer = createSkillCardOffer(() => 0.25);
  assert.equal(offer.length, 3);
  assert.equal(new Set(offer).size, 3);
  assert.ok(offer.every((skillId) => SKILL_IDS.includes(skillId)));
  assert.notDeepEqual(offer, createSkillCardOffer(() => 0.8));
});

test('validates empty stacks, copy limits, and excludes non-field player IDs', () => {
  assert.deepEqual(validateSkillAssignments({
    'home-def-1': null,
    'home-mid-1': { skillId: 'eagleShot', copies: 3 },
    'home-fw': { skillId: 'eagleShot', copies: 1 },
  }), { valid: true, errors: [] });
  assert.equal(validateSkillAssignments({ 'home-fw': { skillId: 'eagleShot', copies: MAX_SKILL_COPIES + 1 } }).valid, false);
  assert.deepEqual(validateSkillAssignments({ 'home-gk': { skillId: 'eagleShot', copies: 1 } }).errors[0].reason, 'notFieldPlayer');
});

test('a skill requires its gameplay condition and invalid attempts do not consume uses', () => {
  const state = createInitialGameState({ playerSkillStacks: { 'home-fw': { skillId: 'eagleShot', copies: 2 } } });
  state.ball.ownerId = null;
  assert.equal(applySkill(state, 'home-fw').reason, 'needBall');
  assert.equal(state.players.find((player) => player.id === 'home-fw').skillUsesRemaining, 2);
  state.ball.ownerId = 'home-fw';
  state.possessionTeam = 'home';
  assert.equal(applySkill(state, 'home-fw').ok, true);
  assert.equal(state.players.find((player) => player.id === 'home-fw').skillUsesRemaining, 1);
  assert.deepEqual(state.skillEffects.map(({ id, skillId, team, sourcePlayerId, targetPlayerId }) => ({ id, skillId, team, sourcePlayerId, targetPlayerId })), [
    { id: 1, skillId: 'eagleShot', team: 'home', sourcePlayerId: 'home-fw', targetPlayerId: null },
  ]);
  assert.equal(state.skillGauge, undefined);
});

test('a player can use a stacked skill only its remaining number of times', () => {
  const state = createInitialGameState({ playerSkillStacks: { 'home-def-1': { skillId: 'powerTackle', copies: 3 } } });
  const player = state.players.find((candidate) => candidate.id === 'home-def-1');
  state.ball.ownerId = 'away-fw';
  state.possessionTeam = 'away';
  for (const remaining of [2, 1, 0]) {
    assert.equal(applySkill(state, player.id).ok, true);
    assert.equal(player.skillUsesRemaining, remaining);
  }
  assert.equal(applySkill(state, player.id).reason, 'noUsesRemaining');
  assert.equal(player.skillUsesRemaining, 0);
});

test('new matches start with an empty transient skill-effect list and fresh stable IDs', () => {
  const state = createInitialGameState();
  assert.deepEqual(state.skillEffects, []);
  assert.equal(state.skillCutIn, null);
  assert.equal(state.nextSkillEffectId, 1);
});

test('F activates the controlled player skill and spends one use only after success', () => {
  const state = createInitialGameState({ playerSkillStacks: { 'home-fw': { skillId: 'eagleShot', copies: 2 } } });
  const events = stepGame(state, { down: new Set(['f']), pressed: new Set(['f']), released: new Set() }, 0.01);
  assert.equal(state.ball.skillId, 'eagleShot');
  assert.equal(state.ball.flightKind, 'skill-shot');
  assert.equal(state.players.find((player) => player.id === 'home-fw').skillUsesRemaining, 1);
  const skillEvent = events.find((event) => event.type === 'skillUsed' && event.skillId === 'eagleShot');
  assert.equal(skillEvent.playerId, 'home-fw');
  assert.deepEqual(state.skillCutIn, {
    playerId: 'home-fw', team: 'home', skillId: 'eagleShot', elapsedSeconds: 0, durationSeconds: 0.72,
  });
  assert.equal(state.skillEffects[0].sourcePlayerId, 'home-fw');
  state.ball.flightKind = 'ground';
  stepGame(state, {}, 0.05);
  assert.equal(state.skillEffects.length, 0, 'shot cue expires when the skill shot ends');

  const activeState = createInitialGameState({ playerSkillStacks: { 'home-fw': { skillId: 'eagleShot', copies: 2 } } });
  activeState.skillCutIn = {
    playerId: 'away-fw', team: 'away', skillId: 'powerTackle', elapsedSeconds: 0.1, durationSeconds: 0.72,
  };
  const activeCue = activeState.skillCutIn;
  const secondEvents = stepGame(activeState, { down: new Set(['f']), pressed: new Set(['f']), released: new Set() }, 0.01);
  assert.ok(secondEvents.some((event) => event.type === 'skillUsed' && event.playerId === 'home-fw'));
  assert.equal(activeState.skillCutIn, activeCue, 'an active cut-in is not replaced by another skill');
});

test('Eagle Shot ignores the ordinary goalkeeper catch', () => {
  const state = createInitialGameState({ opponentSkillStacks: { 'away-fw': { skillId: 'eagleShot', copies: 1 } } });
  state.ball.ownerId = 'away-fw';
  state.possessionTeam = 'away';
  const shot = applySkill(state, 'away-fw');
  assert.equal(shot.ok, true);
  assert.equal(state.players.find((player) => player.id === 'away-fw').skillUsesRemaining, 0);
  Object.assign(state.ball, { x: 55, y: 270, vx: -20, vy: 0 });
  const events = stepGame(state, {}, 0.01);
  assert.equal(state.ball.ownerId, null);
  assert.equal(state.phase, 'playing');
  assert.ok(!events.some((event) => event.type === 'keeperCatch'));
});

test('opponent AI uses an equipped skill once when its conditions are met', () => {
  const state = createInitialGameState({ opponentSkillIds: ['eagleShot'] });
  state.ball.ownerId = 'away-def-1';
  state.possessionTeam = 'away';
  const events = stepGame(state, {}, 0.01);
  assert.equal(state.ball.skillId, 'eagleShot');
  assert.equal(state.players.find((player) => player.id === 'away-def-1').skillUsesRemaining, 0);
  assert.ok(events.some((event) => event.type === 'skillUsed' && event.team === 'away' && event.playerId === 'away-def-1'));
  assert.deepEqual(state.skillCutIn, {
    playerId: 'away-def-1', team: 'away', skillId: 'eagleShot', elapsedSeconds: 0, durationSeconds: 0.72,
  });
  assert.ok(state.skillEffects.some((effect) => effect.team === 'away' && effect.skillId === 'eagleShot'));
});

test('Power Tackle increases slide contact range', () => {
  const state = createInitialGameState({ playerSkillStacks: { 'home-fw': { skillId: 'powerTackle', copies: 1 } } });
  state.ball.ownerId = 'away-fw';
  state.possessionTeam = 'away';
  assert.equal(applySkill(state, 'home-fw').ok, true);
  assert.equal(state.players.find((player) => player.id === 'home-fw').powerTackleSeconds, 4);
  assert.equal(state.skillEffects[0].durationSeconds, 4);
  const player = state.players.find((candidate) => candidate.id === 'home-fw');
  const opponent = state.players.find((candidate) => candidate.id === 'away-fw');
  player.x = 430;
  player.y = 270;
  player.slideSeconds = 0.25;
  opponent.x = 468;
  opponent.y = 270;
  stepGame(state, {}, 0.01);
  assert.equal(state.ball.ownerId, 'home-fw');
  assert.ok(state.skillEffects.some((effect) => effect.skillId === 'powerTackle' && effect.targetPlayerId === opponent.id));
});

test('Eulryongta knocks down its actual field-player target for one second', () => {
  const state = createInitialGameState({ playerSkillStacks: { 'home-mid-1': { skillId: 'eulryongta', copies: 1 } } });
  const user = state.players.find((player) => player.id === 'home-mid-1');
  const target = state.players.find((player) => player.id === 'away-mid-1');
  const behind = state.players.find((player) => player.id === 'away-gk');
  user.x = 300; user.y = 175; user.facingX = 1; user.facingY = 0;
  target.x = 380; target.y = 175;
  behind.x = 250; behind.y = 175;
  const result = applySkill(state, user.id);
  assert.equal(result.ok, true);
  assert.equal(target.knockdownSeconds, 1);
  assert.equal(target.motionAction, 'knockdown');
  assert.equal(state.skillEffects[0].targetPlayerId, target.id);
  assert.ok(result.events.some((event) => event.type === 'playerKnockedDown' && event.playerId === target.id));
  assert.equal(behind.stunnedSeconds, 0);
});

test('Eulryongta can knock down a goalkeeper only when the skill targets them', () => {
  const state = createInitialGameState({ playerSkillStacks: { 'home-mid-1': { skillId: 'eulryongta', copies: 1 } } });
  const user = state.players.find((player) => player.id === 'home-mid-1');
  const keeper = state.players.find((player) => player.id === 'away-gk');
  user.x = 300; user.y = 175; user.facingX = 1; user.facingY = 0;
  keeper.x = 380; keeper.y = 175;

  const result = applySkill(state, user.id);

  assert.equal(result.ok, true);
  assert.equal(keeper.knockdownSeconds, 1);
  assert.ok(result.events.some((event) => event.type === 'playerKnockedDown' && event.playerId === keeper.id));
});

test('Vacuum Cleaner pulls a nearby loose ball to a field player', () => {
  const state = createInitialGameState({ playerSkillStacks: { 'home-def-1': { skillId: 'vacuumCleaner', copies: 1 } } });
  state.ball.ownerId = null; state.ball.x = 260; state.ball.y = 175;
  assert.equal(applySkill(state, 'home-def-1').ok, true);
  for (let i = 0; i < 12 && state.vacuumEffect; i += 1) stepGame(state, {}, 0.05);
  assert.equal(state.ball.ownerId, 'home-def-1');
  assert.equal(state.possessionTeam, 'home');
  assert.equal(state.skillEffects.length, 0, 'vacuum cue expires with its gameplay pull');
});

test('goalkeepers cannot equip field-player skills', () => {
  const state = createInitialGameState({ playerSkillStacks: { 'home-gk': { skillId: 'vacuumCleaner', copies: 1 } } });
  assert.equal(state.players.find((player) => player.id === 'home-gk').skillId, null);
  assert.equal(applySkill(state, 'home-gk').reason, 'goalkeeperExcluded');
});

test('rainbow reflection consumes one use when the automatic save starts', () => {
  const state = createInitialGameState({ playerSkillStacks: { 'home-def-1': { skillId: 'rainbowReflect', copies: 2 } } });
  Object.assign(state.ball, { ownerId: null, x: 500, y: 270, vx: -500, vy: 0, flightKind: 'skill-shot', skillId: 'eagleShot', lastTouchTeam: 'away' });
  const started = applyAutomaticRainbowReflect(state, 'home', 0.05);
  assert.equal(started.type, 'rainbowStarted');
  assert.equal(state.players.find((player) => player.id === 'home-def-1').skillUsesRemaining, 1);
  assert.equal(state.skillEffects[0].skillId, 'rainbowReflect');
  let reflected = null;
  for (let i = 0; i < 30 && !reflected; i += 1) reflected = applyAutomaticRainbowReflect(state, 'home', 0.05);
  assert.ok(reflected);
  assert.equal(reflected.skillId, 'rainbowReflect');
  assert.ok(state.ball.vx > 0);
  assert.equal(state.ball.lastTouchTeam, 'home');
  assert.equal(state.skillEffects.length, 2, 'reflection start and return each create a cue');
});

test('automatic rainbow reflection never starts a manual skill cut-in', () => {
  const state = createInitialGameState({ playerSkillStacks: { 'home-def-1': { skillId: 'rainbowReflect', copies: 1 } } });
  const reflector = state.players.find((player) => player.id === 'home-def-1');
  Object.assign(reflector, { x: 300, y: 270 });
  Object.assign(state.ball, {
    ownerId: null, x: 310, y: 270, vx: -500, vy: 0,
    flightKind: 'skill-shot', skillId: 'eagleShot', lastTouchTeam: 'away',
  });
  state.rainbowReflection = { playerId: reflector.id, team: 'home', remainingSeconds: 1 };

  const events = stepGame(state, {}, 0.05);

  assert.ok(events.some((event) => event.type === 'skillUsed' && event.automatic && event.playerId === reflector.id));
  assert.equal(state.skillCutIn, null);
});
