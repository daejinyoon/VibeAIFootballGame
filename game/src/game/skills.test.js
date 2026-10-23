import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { FIELD, PLAYER_BODY_WIDTH } from './constants.js';
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
    assert.match(artwork, /^\/images\/skills\/[a-z-]+\.(png|svg)$/);
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
  assert.equal(state.eagleVolley.level, 1);
  assert.equal(state.ball.scoreValue, undefined);
  assert.equal(state.skillProjectiles.length, 1);
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

test('Eagle Shot launches one, two, or three angled eagles and awards one point per goal', () => {
  for (const level of [1, 2, 3]) {
    const state = createInitialGameState({ teamSkillDeck: teamDeck('eagleShot', level) });
    carrier(state);
    const keeper = state.players.find((player) => player.id === 'away-gk');
    Object.assign(keeper, { x: 900, y: 270 });
    assert.equal(activateNextTeamSkill(state, 'home', 'home-fw').ok, true);
    assert.equal(state.eagleVolley.level, level);
    assert.equal(state.skillProjectiles.length, 1);
    assert.equal(state.skillProjectiles[0].phase, 'ascending');
    assert.equal(state.ball.scoreValue, undefined);
    const launchX = state.skillProjectiles[0].x;
    if (level > 1) assert.equal(new Set(state.eagleVolley.targetYs).size, level);
    stepGame(state, frame(), 0.2);
    assert.equal(state.skillProjectiles[0].x, launchX, 'the ball rises in place before flying forward');
    assert.ok(state.skillProjectiles[0].height > 0 && state.skillProjectiles[0].height < 180);
    const events = [];
    for (let frameIndex = 0; frameIndex < 80 && state.phase === 'playing'; frameIndex += 1) {
      events.push(...stepGame(state, frame(), 0.05));
    }
    assert.equal(state.score.home, level);
    assert.equal(events.filter((event) => event.type === 'goal' && event.skillId === 'eagleShot').length, level);
    assert.ok(events.filter((event) => event.type === 'goal' && event.skillId === 'eagleShot')
      .every((event) => event.points === 1));
    assert.equal(state.phase, 'goalPause');
    assert.equal(state.pendingKickoffTeam, 'away');
    assert.equal(state.eagleVolley, null);
    assert.deepEqual(state.skillProjectiles, []);
    assert.equal(state.ball.flightKind, 'ground');
    assert.equal(state.ball.skillId, undefined);

    let kickoffCount = 0;
    for (let frameIndex = 0; frameIndex < 25; frameIndex += 1) {
      kickoffCount += stepGame(state, frame(), 0.05).filter((event) => event.type === 'kickoff').length;
    }
    assert.equal(kickoffCount, 1);
  }
});

test('Eagle Shot clears a lower wall and is blocked by a wall above its flight height', () => {
  const runShot = (wallHeight) => {
    const state = createInitialGameState({ teamSkillDeck: teamDeck('eagleShot', 1) });
    carrier(state);
    state.powerBarriers.push({ skillId: 'powerTackle', team: 'away', sourcePlayerId: 'away-def-1',
      x: 620, y: 210, facingX: 0, facingY: 1, length: 120, thickness: 28, height: wallHeight, remainingSeconds: 3 });
    activateNextTeamSkill(state, 'home', 'home-fw');
    const events = [];
    for (let frameIndex = 0; frameIndex < 80 && state.phase === 'playing'; frameIndex += 1) {
      events.push(...stepGame(state, frame(), 0.05));
    }
    return { state, events };
  };

  const lowWall = runShot(170);
  assert.equal(lowWall.state.score.home, 1);
  assert.ok(lowWall.events.some((event) => event.type === 'goal' && event.skillId === 'eagleShot'));

  const highWall = runShot(300);
  assert.equal(highWall.state.score.home, 0);
  assert.ok(!highWall.events.some((event) => event.type === 'goal' && event.skillId === 'eagleShot'));
});

test('Eagle Shot stays high across the field, then dives into the goal from above', () => {
  const state = createInitialGameState({ teamSkillDeck: teamDeck('eagleShot', 1) });
  carrier(state);
  activateNextTeamSkill(state, 'home', 'home-fw');
  for (let frameIndex = 0; frameIndex < 20 && state.skillProjectiles[0]?.phase === 'ascending'; frameIndex += 1) {
    stepGame(state, frame(), 0.05);
  }
  const projectile = state.skillProjectiles[0];
  const flightStartX = projectile.x;
  const flightGoalX = projectile.flightGoalX;
  while (projectile.flightElapsedSeconds < projectile.flightDurationSeconds * 0.5 && state.eagleVolley) {
    stepGame(state, frame(), 0.05);
  }
  const midpointProgress = (projectile.x - flightStartX) / (flightGoalX - flightStartX);
  assert.ok(Math.abs(midpointProgress - 0.5) < 0.1, `the cycloid curves smoothly across the field (${midpointProgress})`);
  assert.ok(projectile.height > 180, 'the cycloid rises above the launch height before diving');
  for (let frameIndex = 0; frameIndex < 50 && state.skillProjectiles[0]?.height >= 170 && state.eagleVolley; frameIndex += 1) {
    stepGame(state, frame(), 0.05);
  }

  assert.equal(projectile.phase, 'flying');
  assert.ok(projectile.height < 180, 'the eagle loses height on its final approach');
  assert.ok(projectile.height > 0, 'the eagle remains above the ground before entering the goal');
  assert.ok(projectile.x > projectile.flightStartX + (projectile.flightGoalX - projectile.flightStartX) * 0.7,
    'the dive begins on the attacking half near the goal');

  for (let frameIndex = 0; frameIndex < 40 && state.phase === 'playing'; frameIndex += 1) {
    stepGame(state, frame(), 0.05);
  }
  assert.equal(state.score.home, 1);
});

test('Tornado Shot starts a five-second contact path with level-scaled width and no global lift', () => {
  for (const [level, expectedWidth] of [[1, 48], [2, 60], [3, 72]]) {
    const state = createInitialGameState({ teamSkillDeck: teamDeck('tornadoShot', level) });
    carrier(state);
    const result = activateNextTeamSkill(state, 'home', 'home-fw');

    assert.equal(state.tornadoShotEffect.level, level);
    assert.equal(state.tornadoShotEffect.pathWidth, expectedWidth);
    assert.equal(state.tornadoShotEffect.durationSeconds, 5);
    assert.deepEqual(state.tornadoShotEffect.hitPlayerIds, []);
    assert.equal(state.skillEffects.find((effect) => effect.skillId === 'tornadoShot').durationSeconds, 5);
    assert.ok(result.events.some((event) => event.type === 'skillUsed' && event.skillId === 'tornadoShot'));
    assert.ok(!result.events.some((event) => event.type === 'tornadoLift'), 'activation does not lift the whole field');
    assert.ok(state.players.every((player) => (player.airborneSecondsRemaining ?? 0) === 0));
  }
});

test('World Split slides the caster along a long, three-second level-scaled ground split', () => {
  const state = createInitialGameState({ teamSkillDeck: teamDeck('powerTackle', 2) });
  const user = state.players.find((player) => player.id === 'home-fw');
  Object.assign(user, { x: 350, y: 270, facingX: 1, facingY: 0 });
  Object.assign(state.players.find((player) => player.id === 'away-fw'), { x: 390, y: 270 });
  const result = applySkill(state, { team: 'home', sourcePlayerId: user.id, skillId: 'powerTackle', level: 2 });
  assert.equal(result.ok, true);
  assert.equal(state.powerBarriers[0].length, 500);
  assert.ok(state.powerBarriers[0].length >= 8 * PLAYER_BODY_WIDTH);
  assert.equal(state.powerBarriers[0].thickness, 20);
  assert.equal(state.powerBarriers[0].wallOffset, 40);
  assert.equal(state.powerBarriers[0].height, 144);
  assert.equal(state.powerBarriers[0].remainingSeconds, 3);
  assert.equal(user.motionAction, 'tackle');
  assert.equal(user.worldSplitSlideSecondsRemaining, 0.95);
  assert.equal(user.worldSplitSlideDirectionX, 1);
  assert.ok(user.vx > 0, 'the caster slides forward along the barrier direction');
  assert.ok(state.players.find((player) => player.id === 'away-fw').knockdownSeconds > 0);
  Object.assign(state.ball, { ownerId: null, x: 420, y: 230, vx: -400, vy: 0, flightKind: 'shot' });
  stepGame(state, frame(), 0.05);
  assert.equal(state.ball.vx, 0);
  const crossingPlayer = state.players.find((player) => player.id === 'away-def-1');
  Object.assign(crossingPlayer, { x: 450, y: 238, vx: 0, vy: 0 });
  stepGame(state, frame(), 0.05);
  assert.ok(crossingPlayer.y < 256, 'the character remains on the approach side of the wall');
  for (const [level, length] of [[1, 400], [2, 500], [3, 600]]) {
    const levelState = createInitialGameState();
    const source = levelState.players.find((player) => player.id === 'home-fw');
    assert.equal(applySkill(levelState, { team: 'home', sourcePlayerId: source.id, skillId: 'powerTackle', level }).ok, true);
    assert.equal(levelState.powerBarriers[0].length, length);
    assert.equal(levelState.powerBarriers[0].remainingSeconds, 3);
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
  Object.assign(state.ball, { ownerId: null, flightKind: 'skill-shot', skillId: 'tornadoShot', lastTouchTeam: 'away' });
  state.tornadoShotEffect = { team: 'away', sourcePlayerId: 'away-fw', level: 1, pathWidth: 48, hitPlayerIds: [] };
  Object.assign(state.players.find((player) => player.id === 'home-mid-1'), { knockdownSeconds: 9, knockdownFromTeam: 'away' });
  state.players.find((player) => player.id === 'away-mid-1').airborneSecondsRemaining = 4;
  state.players.find((player) => player.id === 'away-mid-1').airborneFromTeam = 'away';
  const event = applyAutomaticRainbowReflect(state, 'home');
  assert.equal(event.skillId, 'rainbowReflect');
  assert.deepEqual(state.skillEffects.map((effect) => [effect.team, effect.cancellationPulse === true]), [['home', false], ['home', true]]);
  assert.deepEqual(state.powerBarriers, []);
  assert.equal(state.tornadoShotEffect, null);
  assert.equal(state.ball.skillId, undefined);
  assert.equal(state.players.find((player) => player.id === 'home-mid-1').knockdownSeconds, 0);
  assert.equal(state.players.find((player) => player.id === 'away-mid-1').airborneSecondsRemaining, 0);
});

test('away AI activates its shared deck and cooldown prevents repeat activation', () => {
  const state = createInitialGameState({ opponentSkillDeck: teamDeck('eagleShot', 2) });
  carrier(state, 'away-fw');
  const events = stepGame(state, frame(), 0.01);
  assert.ok(events.some((event) => event.type === 'skillUsed' && event.team === 'away'));
  assert.equal(state.skillCooldownRemaining.away, 10);
  assert.equal(state.eagleVolley.level, 2);
  assert.equal(state.skillProjectiles.length, 1);
  const nextEvents = stepGame(state, frame(), 0.05);
  assert.ok(!nextEvents.some((event) => event.type === 'skillUsed' && event.team === 'away'));
});

test('match end clears timed skill states and leaves the deck available for a fresh match', () => {
  const state = createInitialGameState({ teamSkillDeck: teamDeck('tornadoShot', 2) });
  state.phase = 'overtime';
  state.hasMatchClockStarted = true;
  state.overtimeRemainingSeconds = 0.01;
  state.skillEffects = [{ id: 1, team: 'home', skillId: 'tornadoShot', sourcePlayerId: 'home-fw', elapsedSeconds: 0, durationSeconds: 6 }];
  state.tornadoShotEffect = { team: 'home', sourcePlayerId: 'home-fw', level: 2, pathWidth: 60, hitPlayerIds: [] };
  state.powerBarriers = [{ team: 'home', sourcePlayerId: 'home-fw', x: 1, y: 1, facingX: 1, facingY: 0, length: 220, thickness: 28, remainingSeconds: 3 }];
  state.players.find((player) => player.id === 'away-fw').airborneSecondsRemaining = 4;
  stepGame(state, frame(), 0.05);
  assert.equal(state.phase, 'finished');
  assert.deepEqual(state.skillEffects, []);
  assert.equal(state.tornadoShotEffect, null);
  assert.deepEqual(state.powerBarriers, []);
  assert.equal(state.players.find((player) => player.id === 'away-fw').airborneSecondsRemaining, 0);
  assert.deepEqual(state.teamSkillDecks.home, teamDeck('tornadoShot', 2));
});
