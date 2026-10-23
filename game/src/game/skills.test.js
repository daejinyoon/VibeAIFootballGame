import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { FIELD } from './constants.js';
import { createInitialGameState } from './createInitialGameState.js';
import {
  SKILL_IDS, SKILL_MAX_LEVELS, SKILLS, activateNextTeamSkill,
  applyAutomaticRainbowReflect, applySkill, createSkillCardOffer, validateTeamSkillDeck,
} from './skills.js';
import { stepGame } from './stepGame.js';

const frame = (pressed = []) => ({ moveX: 0, moveY: 0, down: new Set(), pressed: new Set(pressed), released: new Set() });
const teamDeck = (skillId, level = 1) => [{ skillId, level }];
const carrier = (state, playerId = 'home-fw') => {
  state.ball.ownerId = playerId;
  state.possessionTeam = playerId.startsWith('home') ? 'home' : 'away';
  const player = state.players.find((entry) => entry.id === playerId);
  state.ball.x = player.x;
  state.ball.y = player.y;
  return player;
};

test('every named skill maps to its own existing transparent PNG artwork', () => {
  assert.deepEqual(Object.keys(SKILLS), SKILL_IDS);
  const artworks = SKILL_IDS.map((skillId) => SKILLS[skillId].artwork);
  assert.equal(new Set(artworks).size, SKILL_IDS.length);
  for (const artwork of artworks) {
    assert.match(artwork, /^\/images\/skills\/[a-z-]+\.png$/);
    assert.ok(existsSync(new URL(`../../public${artwork}`, import.meta.url)));
  }
});

test('draft offers only include new skills or upgradeable skills below their max level', () => {
  const deck = SKILL_IDS.map((skillId) => ({ skillId, level: SKILL_MAX_LEVELS[skillId] }));
  deck.find((entry) => entry.skillId === 'eagleShot').level = 2;
  assert.deepEqual(createSkillCardOffer(() => 0.2, deck), ['eagleShot']);
  assert.equal(createSkillCardOffer(() => 0.2, SKILL_IDS.map((skillId) => ({ skillId, level: SKILL_MAX_LEVELS[skillId] }))).length, 0);
});

test('validates ordered team decks, duplicate IDs, and level caps', () => {
  assert.deepEqual(validateTeamSkillDeck(teamDeck('eagleShot', 3)), { valid: true, errors: [] });
  assert.equal(validateTeamSkillDeck([{ skillId: 'eagleShot', level: 4 }]).valid, false);
  assert.equal(validateTeamSkillDeck([{ skillId: 'eagleShot', level: 1 }, { skillId: 'eagleShot', level: 2 }]).valid, false);
});

test('F activates the first usable team skill, shares its ten-second cooldown, and wraps in deck order', () => {
  const state = createInitialGameState({ teamSkillDeck: [
    { skillId: 'eagleShot', level: 1 }, { skillId: 'tornadoShot', level: 2 },
  ] });
  const striker = carrier(state);
  const events = stepGame(state, frame(['f']), 0.01);
  assert.ok(events.some((event) => event.type === 'skillUsed' && event.skillId === 'eagleShot'));
  assert.equal(state.ball.scoreValue, 1);
  assert.equal(state.skillCooldownRemaining.home, 10);
  assert.equal(state.skillQueueIndex.home, 1);
  assert.equal(striker.skillUsesRemaining, undefined);
  state.ball.flightKind = 'ground';
  state.ball.ownerId = striker.id;
  state.possessionTeam = 'home';
  assert.equal(activateNextTeamSkill(state, 'home', striker.id).reason, 'cooldown');
  state.skillCooldownRemaining.home = 0;
  const next = activateNextTeamSkill(state, 'home', striker.id);
  assert.equal(next.skillId, 'tornadoShot');
  assert.equal(state.skillQueueIndex.home, 0);
  state.ball.ownerId = striker.id;
  state.possessionTeam = 'home';
  state.skillCooldownRemaining.home = 0;
  assert.equal(activateNextTeamSkill(state, 'home', striker.id).skillId, 'eagleShot', 'the team can reuse its deck after cooldown');
});

test('unavailable ordered skills are skipped without consuming the queue slot on total failure', () => {
  const state = createInitialGameState({ teamSkillDeck: [
    { skillId: 'eagleShot', level: 1 }, { skillId: 'powerTackle', level: 1 },
  ] });
  const user = state.players.find((player) => player.id === 'home-fw');
  state.ball.ownerId = null;
  assert.equal(applySkill(state, { team: 'home', sourcePlayerId: user.id, skillId: 'eagleShot', level: 1 }).reason, 'needBall');
  const activated = activateNextTeamSkill(state, 'home', user.id);
  assert.equal(activated.skillId, 'powerTackle');
  assert.equal(state.skillQueueIndex.home, 0);
  const unavailable = createInitialGameState({ teamSkillDeck: teamDeck('eagleShot') });
  unavailable.ball.ownerId = null;
  assert.equal(activateNextTeamSkill(unavailable, 'home', 'home-fw').ok, false);
  assert.equal(unavailable.skillQueueIndex.home, 0);
});

test('Eagle Shot stores level score and bypasses a keeper save', () => {
  const state = createInitialGameState({ teamSkillDeck: teamDeck('eagleShot', 3) });
  carrier(state);
  assert.equal(activateNextTeamSkill(state, 'home', 'home-fw').ok, true);
  assert.equal(state.ball.scoreValue, 3);
  Object.assign(state.ball, { x: FIELD.width - 2, y: 270, vx: 650, vy: 0 });
  const events = stepGame(state, frame(), 0.05);
  assert.equal(state.score.home, 3);
  assert.equal(events.find((event) => event.type === 'goal')?.points, 3);
  assert.equal(state.phase, 'goalPause');
});

test('Tornado lifts every other player, including both keepers, and expires by level', () => {
  for (const level of [1, 2, 3]) {
    const state = createInitialGameState({ teamSkillDeck: teamDeck('tornadoShot', level) });
    carrier(state);
    activateNextTeamSkill(state, 'home', 'home-fw');
    assert.equal(state.players.find((player) => player.id === 'home-fw').airborneSecondsRemaining ?? 0, 0);
    assert.ok(state.players.filter((player) => player.id !== 'home-fw')
      .every((player) => player.airborneSecondsRemaining === 4 + level));
  }
  const state = createInitialGameState({ teamSkillDeck: teamDeck('tornadoShot', 3) });
  carrier(state);
  activateNextTeamSkill(state, 'home', 'home-fw');
  const keeper = state.players.find((player) => player.id === 'away-gk');
  const keeperPosition = { x: keeper.x, y: keeper.y };
  stepGame(state, frame(), 0.05);
  assert.deepEqual({ x: keeper.x, y: keeper.y }, keeperPosition);
  assert.equal(keeper.airborneSecondsRemaining, 6.95);
});

test('Power Tackle creates a level-timed solid barrier and launches intersecting players', () => {
  const state = createInitialGameState({ teamSkillDeck: teamDeck('powerTackle', 2) });
  const user = state.players.find((player) => player.id === 'home-fw');
  Object.assign(user, { x: 350, y: 270, facingX: 1, facingY: 0 });
  Object.assign(state.players.find((player) => player.id === 'away-fw'), { x: 390, y: 270 });
  const result = applySkill(state, { team: 'home', sourcePlayerId: user.id, skillId: 'powerTackle', level: 2 });
  assert.equal(result.ok, true);
  assert.equal(state.powerBarriers[0].length, 220);
  assert.equal(state.powerBarriers[0].thickness, 28);
  assert.equal(state.powerBarriers[0].remainingSeconds, 4);
  assert.ok(state.players.find((player) => player.id === 'away-fw').knockdownSeconds > 0);
  Object.assign(state.ball, { ownerId: null, x: 420, y: 270, vx: -400, vy: 0, flightKind: 'shot' });
  stepGame(state, frame(), 0.05);
  assert.equal(state.ball.vx, 0);
  const crossingPlayer = state.players.find((player) => player.id === 'away-def-1');
  Object.assign(crossingPlayer, { x: 450, y: 238, vx: 0, vy: 0 });
  stepGame(state, frame(), 0.05);
  assert.ok(crossingPlayer.y < 256, 'the character remains on the approach side of the wall');
  for (const level of [1, 2, 3]) {
    const levelState = createInitialGameState();
    const source = levelState.players.find((player) => player.id === 'home-fw');
    assert.equal(applySkill(levelState, { team: 'home', sourcePlayerId: source.id, skillId: 'powerTackle', level }).ok, true);
    assert.equal(levelState.powerBarriers[0].remainingSeconds, 2 + level);
  }
});

test('Eulryongta targets up to level count in front for ten seconds and fails without targets', () => {
  const state = createInitialGameState();
  const user = state.players.find((player) => player.id === 'home-mid-1');
  Object.assign(user, { x: 300, y: 175, facingX: 1, facingY: 0 });
  Object.assign(state.players.find((player) => player.id === 'away-def-1'), { x: 340, y: 175 });
  Object.assign(state.players.find((player) => player.id === 'away-mid-1'), { x: 360, y: 175 });
  Object.assign(state.players.find((player) => player.id === 'away-fw'), { x: 380, y: 175 });
  const result = applySkill(state, { team: 'home', sourcePlayerId: user.id, skillId: 'eulryongta', level: 2 });
  assert.equal(result.events.filter((event) => event.type === 'playerKnockedDown').length, 2);
  assert.ok(state.players.filter((player) => player.team === 'away').filter((player) => player.knockdownSeconds > 0)
    .every((player) => player.knockdownSeconds === 10));
  const empty = createInitialGameState();
  for (const target of empty.players.filter((player) => player.team === 'away')) Object.assign(target, { x: 950, y: 10 });
  const noTarget = applySkill(empty, { team: 'home', sourcePlayerId: 'home-fw', skillId: 'eulryongta', level: 1 });
  assert.equal(noTarget.reason, 'noTargetInFront');
});

test('Vacuum Cleaner immediately claims the ball from anywhere on the field', () => {
  const state = createInitialGameState();
  const user = state.players.find((player) => player.id === 'home-def-1');
  Object.assign(state.ball, { ownerId: null, x: FIELD.width, y: FIELD.height, vx: 240, vy: 100, height: 30, skillId: 'eagleShot', scoreValue: 3 });
  const result = applySkill(state, { team: 'home', sourcePlayerId: user.id, skillId: 'vacuumCleaner', level: 1 });
  assert.equal(result.ok, true);
  assert.equal(state.ball.ownerId, user.id);
  assert.deepEqual({ x: state.ball.x, y: state.ball.y, vx: state.ball.vx, vy: state.ball.vy }, { x: user.x, y: user.y, vx: 0, vy: 0 });
  assert.equal(state.ball.scoreValue, undefined);
});

test('Rainbow Reflect passively cancels opposing global effects and keeps own effects', () => {
  const state = createInitialGameState({ teamSkillDeck: teamDeck('rainbowReflect'), opponentSkillDeck: teamDeck('powerTackle') });
  state.skillEffects = [
    { id: 1, skillId: 'eulryongta', team: 'away', sourcePlayerId: 'away-fw', elapsedSeconds: 0, durationSeconds: 10 },
    { id: 2, skillId: 'powerTackle', team: 'home', sourcePlayerId: 'home-fw', elapsedSeconds: 0, durationSeconds: 3 },
  ];
  state.powerBarriers = [{ team: 'away', sourcePlayerId: 'away-fw', x: 300, y: 200, facingX: 1, facingY: 0, length: 220, thickness: 28, remainingSeconds: 3 }];
  Object.assign(state.players.find((player) => player.id === 'home-mid-1'), { knockdownSeconds: 9, knockdownFromTeam: 'away' });
  state.players.find((player) => player.id === 'away-mid-1').airborneSecondsRemaining = 4;
  state.players.find((player) => player.id === 'away-mid-1').airborneFromTeam = 'away';
  const event = applyAutomaticRainbowReflect(state, 'home');
  assert.equal(event.skillId, 'rainbowReflect');
  assert.deepEqual(state.skillEffects.map((effect) => effect.team), ['home']);
  assert.deepEqual(state.powerBarriers, []);
  assert.equal(state.players.find((player) => player.id === 'home-mid-1').knockdownSeconds, 0);
  assert.equal(state.players.find((player) => player.id === 'away-mid-1').airborneSecondsRemaining, 0);
});

test('away AI activates its shared deck and cooldown prevents repeat activation', () => {
  const state = createInitialGameState({ opponentSkillDeck: teamDeck('eagleShot', 2) });
  carrier(state, 'away-fw');
  const events = stepGame(state, frame(), 0.01);
  assert.ok(events.some((event) => event.type === 'skillUsed' && event.team === 'away'));
  assert.equal(state.skillCooldownRemaining.away, 10);
  assert.equal(state.ball.scoreValue, 2);
  const nextEvents = stepGame(state, frame(), 0.05);
  assert.ok(!nextEvents.some((event) => event.type === 'skillUsed' && event.team === 'away'));
});

test('match end clears timed skill states and leaves the deck available for a fresh match', () => {
  const state = createInitialGameState({ teamSkillDeck: teamDeck('tornadoShot', 2) });
  state.phase = 'overtime';
  state.hasMatchClockStarted = true;
  state.overtimeRemainingSeconds = 0.01;
  state.skillEffects = [{ id: 1, team: 'home', skillId: 'tornadoShot', sourcePlayerId: 'home-fw', elapsedSeconds: 0, durationSeconds: 6 }];
  state.powerBarriers = [{ team: 'home', sourcePlayerId: 'home-fw', x: 1, y: 1, facingX: 1, facingY: 0, length: 220, thickness: 28, remainingSeconds: 3 }];
  state.players.find((player) => player.id === 'away-fw').airborneSecondsRemaining = 4;
  stepGame(state, frame(), 0.05);
  assert.equal(state.phase, 'finished');
  assert.deepEqual(state.skillEffects, []);
  assert.deepEqual(state.powerBarriers, []);
  assert.equal(state.players.find((player) => player.id === 'away-fw').airborneSecondsRemaining, 0);
  assert.deepEqual(state.teamSkillDecks.home, teamDeck('tornadoShot', 2));
});
