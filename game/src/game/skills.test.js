import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { FIELD, WORLD_SPLIT_HEIGHT, WORLD_SPLIT_LENGTHS, WORLD_SPLIT_SLIDE_SECONDS, WORLD_SPLIT_SLIDE_SPEED } from './constants.js';
import { createInitialGameState } from './createInitialGameState.js';
import {
  SKILL_IDS, SKILL_MAX_LEVELS, SKILLS, activateNextTeamSkill,
  applySkill, createSkillCardOffer, spawnNextEagleProjectile,
  validateTeamSkillInventory, validateTeamSkillLoadout,
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

test('validates owned inventory levels and the unique three-skill equipment subset', () => {
  const inventory = ['eagleShot', 'tornadoShot', 'powerTackle', 'eulryongta']
    .map((skillId) => ({ skillId, level: 1 }));
  assert.deepEqual(validateTeamSkillInventory(teamDeck('eagleShot', 3)), { valid: true, errors: [] });
  assert.equal(validateTeamSkillInventory([{ skillId: 'eagleShot', level: 4 }]).valid, false);
  assert.equal(validateTeamSkillInventory([{ skillId: 'eagleShot', level: 1 }, { skillId: 'eagleShot', level: 2 }]).valid, false);
  assert.equal(validateTeamSkillLoadout(inventory, ['eagleShot', 'tornadoShot', 'powerTackle']).valid, true);
  assert.equal(validateTeamSkillLoadout(inventory, ['eagleShot', 'tornadoShot', 'powerTackle', 'eulryongta']).valid, false);
  assert.equal(validateTeamSkillLoadout(inventory, ['eagleShot', 'eagleShot']).valid, false);
  assert.equal(validateTeamSkillLoadout(inventory, ['rainbowReflect']).valid, false);
});

test('F activates skills in order with independent ten-second cooldowns', () => {
  const state = createInitialGameState({ teamSkillDeck: [
    { skillId: 'eagleShot', level: 1 }, { skillId: 'tornadoShot', level: 2 },
  ] });
  state.hasMatchClockStarted = true;
  const striker = carrier(state);
  const events = stepGame(state, frame(['f']), 0.01);
  assert.ok(events.some((event) => event.type === 'skillUsed' && event.skillId === 'eagleShot'));
  assert.equal(state.eagleVolley.level, 1);
  assert.equal(state.ball.scoreValue, undefined);
  assert.equal(state.skillProjectiles.length, 1);
  assert.equal(state.skillCooldownRemaining.home.eagleShot, 10);
  assert.equal(state.skillCooldownRemaining.home.tornadoShot, 0);
  assert.equal(state.skillQueueIndex.home, 1);
  assert.equal(striker.skillUsesRemaining, undefined);
  state.ball.flightKind = 'ground';
  state.ball.ownerId = striker.id;
  state.possessionTeam = 'home';
  const next = activateNextTeamSkill(state, 'home', striker.id);
  assert.equal(next.skillId, 'tornadoShot');
  assert.equal(state.skillCooldownRemaining.home.eagleShot, 10);
  assert.equal(state.skillCooldownRemaining.home.tornadoShot, 10);
  assert.equal(state.skillQueueIndex.home, 0);
  state.ball.ownerId = striker.id;
  state.possessionTeam = 'home';
  assert.equal(activateNextTeamSkill(state, 'home', striker.id).reason, 'noUsableSkill');
  assert.equal(state.skillQueueIndex.home, 0, 'a failed full pass leaves the queue in place');
  assert.equal(state.skillCooldownRemaining.home.eagleShot, 10);
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

test('a cooling-down skill is skipped while a later equipped skill remains usable', () => {
  const state = createInitialGameState({ teamSkillDeck: [
    { skillId: 'eagleShot', level: 1 }, { skillId: 'tornadoShot', level: 1 },
  ] });
  const striker = carrier(state);
  state.skillCooldownRemaining.home.eagleShot = 7;
  const attempt = activateNextTeamSkill(state, 'home', striker.id);
  assert.equal(attempt.skillId, 'tornadoShot');
  assert.equal(state.skillCooldownRemaining.home.eagleShot, 7);
  assert.equal(state.skillCooldownRemaining.home.tornadoShot, 10);
  assert.equal(state.skillQueueIndex.home, 0);
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

test('away Eagle Shot is the 180-degree field-center rotation of the home cycloid', () => {
  const homeState = createInitialGameState();
  const awayState = createInitialGameState();
  const homeLaunch = { x: 220, y: 160 };
  const homeSource = homeState.players.find((player) => player.id === 'home-fw');
  const awaySource = awayState.players.find((player) => player.id === 'away-fw');
  Object.assign(homeSource, { ...homeLaunch, facingX: 1, facingY: 0 });
  Object.assign(awaySource, { x: FIELD.width - homeLaunch.x, y: FIELD.height - homeLaunch.y, facingX: -1, facingY: 0 });
  carrier(homeState, homeSource.id);
  carrier(awayState, awaySource.id);
  homeState.hasMatchClockStarted = true;
  awayState.hasMatchClockStarted = true;

  assert.equal(applySkill(homeState, { team: 'home', sourcePlayerId: homeSource.id, skillId: 'eagleShot', level: 2 }).ok, true);
  assert.equal(applySkill(awayState, { team: 'away', sourcePlayerId: awaySource.id, skillId: 'eagleShot', level: 2 }).ok, true);
  assert.equal(homeState.eagleVolley.targetYs.length, 2);
  assert.equal(awayState.eagleVolley.targetYs.length, 2);
  for (let index = 0; index < 2; index += 1) {
    assert.equal(awayState.eagleVolley.targetYs[index], FIELD.height - homeState.eagleVolley.targetYs[index]);
  }
  homeState.eagleVolley.nextLaunchSeconds = 100;
  awayState.eagleVolley.nextLaunchSeconds = 100;
  spawnNextEagleProjectile(homeState);
  spawnNextEagleProjectile(awayState);

  for (let frameIndex = 0; frameIndex < 14; frameIndex += 1) {
    stepGame(homeState, frame(), 0.05);
    stepGame(awayState, frame(), 0.05);
  }
  assert.equal(homeState.skillProjectiles.length, awayState.skillProjectiles.length);
  for (let index = 0; index < homeState.skillProjectiles.length; index += 1) {
    const homeProjectile = homeState.skillProjectiles[index];
    const awayProjectile = awayState.skillProjectiles[index];
    assert.ok(Math.abs(homeProjectile.x + awayProjectile.x - FIELD.width) < 1e-8);
    assert.ok(Math.abs(homeProjectile.y + awayProjectile.y - FIELD.height) < 1e-8);
    assert.ok(Math.abs(homeProjectile.height - awayProjectile.height) < 1e-8);
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

test('Eagle Shot cruises early, then glides down toward goal', () => {
  const state = createInitialGameState({ teamSkillDeck: teamDeck('eagleShot', 1) });
  carrier(state);
  activateNextTeamSkill(state, 'home', 'home-fw');
  for (let frameIndex = 0; frameIndex < 20 && state.skillProjectiles[0]?.phase === 'ascending'; frameIndex += 1) {
    stepGame(state, frame(), 0.05);
  }
  const projectile = state.skillProjectiles[0];
  const flightStartX = projectile.x;
  const flightGoalX = projectile.flightGoalX;
  while (projectile.flightElapsedSeconds < projectile.flightDurationSeconds * 0.25 && state.eagleVolley) {
    stepGame(state, frame(), 0.05);
  }
  const earlyHeight = projectile.height;
  assert.ok(earlyHeight >= 179, 'the eagle cruises at height through the early flight');
  while (projectile.flightElapsedSeconds < projectile.flightDurationSeconds * 0.5 && state.eagleVolley) {
    stepGame(state, frame(), 0.05);
  }
  const midpointProgress = (projectile.x - flightStartX) / (flightGoalX - flightStartX);
  assert.ok(Math.abs(midpointProgress - 0.5) < 0.1, `the cycloid curves smoothly across the field (${midpointProgress})`);
  const midpointHeight = projectile.height;
  assert.ok(midpointHeight < earlyHeight && midpointHeight > 140,
    'the eagle starts a gradual descent after its early cruise');
  while (projectile.flightElapsedSeconds < projectile.flightDurationSeconds * 0.75 && state.eagleVolley) {
    stepGame(state, frame(), 0.05);
  }

  assert.equal(projectile.phase, 'flying');
  assert.ok(projectile.height < midpointHeight && projectile.height > 0,
    'the eagle continues a smooth descent during its final approach');
  assert.ok(projectile.x > projectile.flightStartX + (projectile.flightGoalX - projectile.flightStartX) * 0.7,
    'the landing glide reaches the attacking half near the goal');

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

test('World Split slides about 90 units and scales its visible barrier with campaign stage', () => {
  const state = createInitialGameState({ stage: 2, teamSkillDeck: teamDeck('powerTackle', 2) });
  const user = state.players.find((player) => player.id === 'home-fw');
  Object.assign(user, { x: 350, y: 270, facingX: 1, facingY: 0 });
  Object.assign(state.players.find((player) => player.id === 'away-fw'), { x: 390, y: 270 });
  const result = applySkill(state, { team: 'home', sourcePlayerId: user.id, skillId: 'powerTackle', level: 2 });
  assert.equal(result.ok, true);
  assert.equal(state.powerBarriers[0].length, 100);
  assert.equal(state.powerBarriers[0].thickness, 20);
  assert.equal(state.powerBarriers[0].wallOffset, 40);
  assert.equal(state.powerBarriers[0].height, 90);
  assert.equal(state.powerBarriers[0].remainingSeconds, 3);
  assert.equal(user.motionAction, 'tackle');
  assert.equal(user.worldSplitSlideSecondsRemaining, WORLD_SPLIT_SLIDE_SECONDS);
  assert.equal(user.worldSplitSlideDirectionX, 1);
  assert.equal(user.vx, WORLD_SPLIT_SLIDE_SPEED, 'the caster slides forward along the barrier direction');
  assert.equal(WORLD_SPLIT_SLIDE_SPEED * WORLD_SPLIT_SLIDE_SECONDS, 90.25);
  assert.ok(state.players.find((player) => player.id === 'away-fw').knockdownSeconds > 0);
  Object.assign(state.ball, { ownerId: null, x: 420, y: 230, vx: -400, vy: 0, flightKind: 'shot' });
  stepGame(state, frame(), 0.05);
  assert.equal(state.ball.vx, 0);
  const crossingPlayer = state.players.find((player) => player.id === 'away-def-1');
  Object.assign(crossingPlayer, { x: 450, y: 238, vx: 0, vy: 0 });
  stepGame(state, frame(), 0.05);
  assert.ok(crossingPlayer.y < 256, 'the character remains on the approach side of the wall');
  for (const [stage, length] of WORLD_SPLIT_LENGTHS.entries()) {
    for (const level of [1, 3]) {
      const stageState = createInitialGameState({ stage: stage + 1 });
      const source = stageState.players.find((player) => player.id === 'home-fw');
      assert.equal(applySkill(stageState, { team: 'home', sourcePlayerId: source.id, skillId: 'powerTackle', level }).ok, true);
      assert.equal(stageState.powerBarriers[0].length, length);
      assert.equal(stageState.powerBarriers[0].height, WORLD_SPLIT_HEIGHT);
      assert.equal(stageState.powerBarriers[0].remainingSeconds, 3);
    }
  }
});

test('Eulryongta targets the nearest 1/2/3 opponents in front for five seconds, including keepers', () => {
  for (const level of [1, 2, 3]) {
    const state = createInitialGameState();
    const user = state.players.find((player) => player.id === 'home-mid-1');
    Object.assign(user, { x: 300, y: 175, facingX: 1, facingY: 0 });
    Object.assign(state.players.find((player) => player.id === 'away-gk'), { x: 330, y: 175 });
    Object.assign(state.players.find((player) => player.id === 'away-def-1'), { x: 340, y: 175 });
    Object.assign(state.players.find((player) => player.id === 'away-mid-1'), { x: 360, y: 175 });
    Object.assign(state.players.find((player) => player.id === 'away-fw'), { x: 380, y: 175 });
    const result = applySkill(state, { team: 'home', sourcePlayerId: user.id, skillId: 'eulryongta', level });
    const knocked = result.events.filter((event) => event.type === 'playerKnockedDown');
    assert.equal(knocked.length, level);
    assert.equal(knocked[0].playerId, 'away-gk', 'the nearest opposing goalkeeper is eligible');
    assert.ok(knocked.every((event) => event.durationSeconds === 5));
    assert.ok(knocked.every((event) => {
      const target = state.players.find((player) => player.id === event.playerId);
      return target.knockdownSeconds === 5 && target.statusDurationSeconds.knockdown === 5;
    }));
    assert.equal(user.knockdownSeconds, 0, 'the caster is excluded');
  }
  const empty = createInitialGameState();
  for (const target of empty.players.filter((player) => player.team === 'away')) Object.assign(target, { x: 950, y: 10 });
  const noTarget = applySkill(empty, { team: 'home', sourcePlayerId: 'home-fw', skillId: 'eulryongta', level: 1 });
  assert.equal(noTarget.reason, 'noTargetInFront');
});

test('Eulryongta releases an owned ball at its knocked-down carrier as a clean loose ball', () => {
  const state = createInitialGameState();
  const user = state.players.find((player) => player.id === 'home-mid-1');
  const target = state.players.find((player) => player.id === 'away-fw');
  Object.assign(user, { x: 300, y: 175, facingX: 1, facingY: 0 });
  Object.assign(target, { x: 350, y: 175 });
  carrier(state, target.id);
  Object.assign(state.ball, {
    vx: 240, vy: -80, height: 24, verticalVelocity: 180,
    flightKind: 'ground', flightSeconds: 0.25, flightDurationSeconds: 0.5,
    passProtectionSeconds: 0.4, passTeam: 'away', passReceiverId: 'away-mid-1',
    passTarget: { x: 500, y: 175 }, flightTarget: { x: 600, y: 175 },
    skillId: 'eagleShot', skillLevel: 2, scoreValue: 3,
  });

  const result = applySkill(state, { team: 'home', sourcePlayerId: user.id, skillId: 'eulryongta', level: 1 });

  assert.equal(result.ok, true);
  assert.equal(target.knockdownSeconds, 5);
  assert.equal(state.ball.ownerId, null);
  assert.deepEqual({ x: state.ball.x, y: state.ball.y }, { x: target.x, y: target.y });
  assert.deepEqual({ vx: state.ball.vx, vy: state.ball.vy, height: state.ball.height,
    verticalVelocity: state.ball.verticalVelocity, flightKind: state.ball.flightKind,
    flightSeconds: state.ball.flightSeconds, passProtectionSeconds: state.ball.passProtectionSeconds },
  { vx: 0, vy: 0, height: 0, verticalVelocity: 0, flightKind: 'ground', flightSeconds: 0, passProtectionSeconds: 0 });
  assert.equal(state.ball.lastTouchTeam, 'away');
  assert.equal(state.possessionTeam, null);
  for (const field of ['flightDurationSeconds', 'passTeam', 'passReceiverId', 'passTarget',
    'flightTarget', 'skillId', 'skillLevel', 'scoreValue']) {
    assert.equal(Object.hasOwn(state.ball, field), false, `${field} is cleared when the ball is dropped`);
  }
});

test('Vacuum Cleaner captures the starting ball position for a continuous pull', () => {
  const state = createInitialGameState();
  const user = state.players.find((player) => player.id === 'home-def-1');
  state.powerBarriers.push({ team: 'away', sourcePlayerId: 'away-fw', x: 300, y: 200,
    facingX: 1, facingY: 0, length: 400, thickness: 20, wallOffset: 40, remainingSeconds: 3 });
  Object.assign(state.ball, { ownerId: null, x: FIELD.width, y: FIELD.height, vx: 240, vy: 100, height: 30, skillId: 'eagleShot', scoreValue: 3 });
  const result = applySkill(state, { team: 'home', sourcePlayerId: user.id, skillId: 'vacuumCleaner', level: 1 });
  assert.equal(result.ok, true);
  assert.equal(state.ball.ownerId, null);
  assert.deepEqual({ x: state.ball.x, y: state.ball.y, vx: state.ball.vx, vy: state.ball.vy }, { x: FIELD.width, y: FIELD.height, vx: 0, vy: 0 });
  assert.deepEqual(state.vacuumEffect, {
    playerId: user.id,
    startPosition: { x: FIELD.width, y: FIELD.height },
    elapsedSeconds: 0,
    durationSeconds: 0.7,
    remainingSeconds: 0.7,
  });
  assert.equal(state.skillEffects.find((effect) => effect.skillId === 'vacuumCleaner').durationSeconds, 0.7);
  assert.equal(state.ball.scoreValue, undefined);
});

test('Rainbow Reflect transfers all active negative statuses to the last opponent caster at their original durations', () => {
  const state = createInitialGameState({ teamSkillDeck: teamDeck('rainbowReflect') });
  const user = state.players.find((player) => player.id === 'home-def-1');
  const distantLastCaster = state.players.find((player) => player.id === 'away-fw');
  Object.assign(distantLastCaster, { x: 940, y: 500 });
  state.lastSkillCasterByTeam.away = distantLastCaster.id;
  Object.assign(user, {
    knockdownSeconds: 4,
    airborneSecondsRemaining: 1.2,
    stunnedSeconds: 0.3,
    knockdownFromTeam: 'away',
    knockdownSourcePlayerId: 'away-mid-1',
    knockdownSkillId: 'powerTackle',
    knockdownDirectionX: -1,
    knockdownDirectionY: 0,
    airborneFromTeam: 'away',
    airborneSourcePlayerId: 'away-fw',
    airborneSkillId: 'tornadoShot',
    stunnedFromTeam: 'away',
    stunnedSourcePlayerId: 'away-fw',
    stunnedSkillId: 'eulryongta',
    statusDurationSeconds: { knockdown: 0.8, airborne: 5, stunned: 2 },
    motionAction: 'knockdown',
  });

  const attempt = activateNextTeamSkill(state, 'home', user.id);
  assert.equal(attempt.ok, true);
  assert.equal(attempt.skillId, 'rainbowReflect');
  const transfer = attempt.events.find((event) => event.type === 'skillStatusTransferred');
  assert.equal(transfer.sourcePlayerId, user.id);
  assert.equal(transfer.targetPlayerId, distantLastCaster.id);
  const transferEffect = state.skillEffects.find((effect) => effect.skillId === 'rainbowReflect');
  assert.equal(transferEffect.targetPlayerId, distantLastCaster.id);
  assert.deepEqual(transferEffect.transferredStatuses, transfer.transferredStatuses);
  assert.deepEqual(transfer.transferredStatuses, [
    { type: 'knockdown', durationSeconds: 0.8 },
    { type: 'airborne', durationSeconds: 5 },
    { type: 'stunned', durationSeconds: 2 },
  ]);
  assert.deepEqual([user.knockdownSeconds, user.airborneSecondsRemaining, user.stunnedSeconds], [0, 0, 0]);
  assert.deepEqual([distantLastCaster.knockdownSeconds, distantLastCaster.airborneSecondsRemaining, distantLastCaster.stunnedSeconds], [0.8, 5, 2]);
  assert.equal(distantLastCaster.knockdownDirectionX, -1);
  assert.equal(distantLastCaster.knockdownSourcePlayerId, 'away-mid-1');
  assert.equal(state.skillCooldownRemaining.home.rainbowReflect, 10);
  assert.equal(state.lastSkillCasterByTeam.away, distantLastCaster.id, 'Rainbow does not replace the opposing caster record');
  assert.equal(state.lastSkillCasterByTeam.home, user.id);
});

test('Rainbow Reflect uses the five-second fallback for Eulryongta knockdown without duration metadata', () => {
  const state = createInitialGameState({ teamSkillDeck: teamDeck('rainbowReflect') });
  const user = state.players.find((player) => player.id === 'home-def-1');
  const target = state.players.find((player) => player.id === 'away-fw');
  Object.assign(user, {
    knockdownSeconds: 4,
    knockdownFromTeam: 'away',
    knockdownSourcePlayerId: 'away-mid-1',
    knockdownSkillId: 'eulryongta',
    knockdownDirectionX: -1,
    knockdownDirectionY: 0,
    motionAction: 'knockdown',
  });
  delete user.statusDurationSeconds;
  state.lastSkillCasterByTeam.away = target.id;

  const attempt = activateNextTeamSkill(state, 'home', user.id);
  const transfer = attempt.events.find((event) => event.type === 'skillStatusTransferred');
  assert.deepEqual(transfer.transferredStatuses, [{ type: 'knockdown', durationSeconds: 5 }]);
  assert.equal(target.knockdownSeconds, 5);
  assert.equal(target.statusDurationSeconds.knockdown, 5);
});

test('failed Rainbow activation preserves statuses, queue, cooldowns, and caster state', () => {
  for (const failure of ['noStatus', 'noCaster', 'dismissedCaster']) {
    const state = createInitialGameState({ teamSkillDeck: teamDeck('rainbowReflect') });
    const user = state.players.find((player) => player.id === 'home-def-1');
    const target = state.players.find((player) => player.id === 'away-fw');
    Object.assign(user, { airborneSecondsRemaining: 1.4, statusDurationSeconds: { airborne: 5 } });
    if (failure === 'noStatus') Object.assign(user, { airborneSecondsRemaining: 0, statusDurationSeconds: {} });
    if (failure === 'dismissedCaster') {
      state.lastSkillCasterByTeam.away = target.id;
      target.dismissed = true;
    }
    const beforeUser = structuredClone(user);
    const beforeQueue = state.skillQueueIndex.home;
    const beforeLastCasters = structuredClone(state.lastSkillCasterByTeam);
    const attempt = activateNextTeamSkill(state, 'home', user.id);
    assert.equal(attempt.ok, false, failure);
    assert.deepEqual(user, beforeUser, `${failure}: source status stays intact`);
    assert.equal(state.skillQueueIndex.home, beforeQueue, `${failure}: queue stays in place`);
    assert.equal(state.skillCooldownRemaining.home.rainbowReflect, 0, `${failure}: cooldown is not consumed`);
    assert.deepEqual(state.lastSkillCasterByTeam, beforeLastCasters, `${failure}: caster records stay intact`);
  }
});

test('Rainbow Reflect has no automatic effect and away AI can activate it from its ordered deck', () => {
  const passiveCheck = createInitialGameState({ teamSkillDeck: teamDeck('rainbowReflect') });
  passiveCheck.lastSkillCasterByTeam.away = 'away-fw';
  passiveCheck.ball.flightKind = 'skill-shot';
  passiveCheck.ball.skillId = 'tornadoShot';
  passiveCheck.ball.lastTouchTeam = 'away';
  const passiveEvents = stepGame(passiveCheck, frame(), 0.01);
  assert.ok(!passiveEvents.some((event) => event.type === 'skillReflected'));
  assert.equal(passiveCheck.ball.lastTouchTeam, 'away');

  const aiState = createInitialGameState({ opponentSkillDeck: teamDeck('rainbowReflect') });
  aiState.hasMatchClockStarted = true;
  const awayCarrier = carrier(aiState, 'away-fw');
  const homeLastCaster = aiState.players.find((player) => player.id === 'home-fw');
  aiState.lastSkillCasterByTeam.home = homeLastCaster.id;
  Object.assign(awayCarrier, { stunnedSeconds: 0.4, statusDurationSeconds: { stunned: 2 } });
  const aiEvents = stepGame(aiState, frame(), 0.01);
  assert.ok(aiEvents.some((event) => event.type === 'skillUsed' && event.skillId === 'rainbowReflect' && event.team === 'away'));
  assert.equal(awayCarrier.stunnedSeconds, 0);
  assert.equal(homeLastCaster.stunnedSeconds, 2);
  assert.equal(aiState.skillCooldownRemaining.away.rainbowReflect, 10);
});

test('F activates Rainbow Reflect to clear the controlled player even while knocked down', () => {
  const state = createInitialGameState({ teamSkillDeck: teamDeck('rainbowReflect') });
  state.hasMatchClockStarted = true;
  const user = state.players.find((player) => player.id === 'home-def-1');
  const opponentCaster = state.players.find((player) => player.id === 'away-fw');
  state.controlledPlayerId = user.id;
  state.lastSkillCasterByTeam.away = opponentCaster.id;
  Object.assign(user, {
    knockdownSeconds: 4,
    knockdownDirectionX: -1,
    knockdownDirectionY: 0,
    statusDurationSeconds: { knockdown: 10 },
    motionAction: 'knockdown',
  });
  const events = stepGame(state, frame(['f']), 0.01);
  assert.ok(events.some((event) => event.type === 'skillUsed' && event.skillId === 'rainbowReflect'));
  assert.equal(user.knockdownSeconds, 0);
  assert.equal(opponentCaster.knockdownSeconds, 10);
  assert.equal(state.skillCooldownRemaining.home.rainbowReflect, 10);
});
test('away AI activates its ordered deck and respects each skill cooldown', () => {
  const state = createInitialGameState({ opponentSkillDeck: teamDeck('eagleShot', 2) });
  state.hasMatchClockStarted = true;
  carrier(state, 'away-fw');
  const events = stepGame(state, frame(), 0.01);
  assert.ok(events.some((event) => event.type === 'skillUsed' && event.team === 'away'));
  assert.equal(state.skillCooldownRemaining.away.eagleShot, 10);
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
