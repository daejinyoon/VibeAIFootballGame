import assert from 'node:assert/strict';
import test from 'node:test';
import { BALL_RADIUS, FIELD, GOAL_CROSSBAR_HEIGHT, KICKOFF_CIRCLE_RADIUS, PLAYER_BODY_WIDTH, SHOT_ARC_FULL_DISTANCE, SHOT_ARC_START_DISTANCE, SHOT_ASSIST_DISTANCE, SHOT_ASSIST_MAX, getAiTuning } from './constants.js';
import { createInitialGameState as createGameState, getBaseFormationPositions } from './createInitialGameState.js';
import { applySkill } from './skills.js';
import { applyTornadoContacts, stepGame } from './stepGame.js';

const frame = ({ moveX = 0, moveY = 0, down = [], pressed = [], released = [] } = {}) => ({
  moveX,
  moveY,
  down: new Set(down),
  pressed: new Set(pressed),
  released: new Set(released),
});

const createInitialGameState = (options) => {
  const state = createGameState(options);
  state.kickoffLocked = false;
  state.kickoffTakerId = null;
  state.hasMatchClockStarted = true;
  const opposingForward = state.players.find((player) => player.id === 'away-fw');
  opposingForward.x = FIELD.width / 2;
  opposingForward.y = FIELD.height / 2;
  return state;
};

const prepareLooseBallState = (state, overrides = {}) => {
  state.possessionTeam = 'away';
  Object.assign(state.ball, {
    ownerId: null,
    x: 400,
    y: 270,
    vx: 0,
    vy: 0,
    height: 0,
    verticalVelocity: 0,
    flightKind: 'ground',
    flightTarget: null,
    passTarget: null,
    passReceiverId: null,
    passTeam: null,
    skillId: null,
    ...overrides,
  });
  for (const player of state.players) {
    player.aiTarget = { x: player.x, y: player.y };
    player.aiRetargetSeconds = 10;
  }
  return state;
};

test('the opening clock stays stopped until the opening taker kicks and starts opponent skill grace', () => {
  const state = createGameState({
    teamSkillDeck: [{ skillId: 'eagleShot', level: 1 }],
    opponentSkillDeck: [{ skillId: 'eulryongta', level: 1 }],
  });

  stepGame(state, frame(), 0.05);
  stepGame(state, frame({ moveX: 1 }), 0.05);
  assert.equal(state.remainingSeconds, 60);
  assert.equal(state.hasMatchClockStarted, false);

  const kickoffEvents = stepGame(state, frame({ pressed: ['s'] }), 0.05);
  assert.equal(state.hasMatchClockStarted, true);
  assert.equal(state.remainingSeconds, 60, 'the kick frame is not charged');
  assert.equal(state.aiSkillGraceSecondsRemaining, 3);
  assert.ok(kickoffEvents.some((event) => event.type === 'pass'));

  const homeSkillEvents = stepGame(state, frame({ pressed: ['f'] }), 0.05);
  assert.ok(homeSkillEvents.some((event) => event.type === 'skillUsed' && event.team === 'home'));
  assert.ok(!homeSkillEvents.some((event) => event.type === 'skillUsed' && event.team === 'away'));
  assert.equal(state.remainingSeconds, 59.95);
  let awayEvents = [];
  for (let index = 0; index < 58; index += 1) {
    awayEvents = stepGame(state, frame(), 0.05);
    assert.ok(!awayEvents.some((event) => event.type === 'skillUsed' && event.team === 'away'));
  }
  assert.ok(state.aiSkillGraceSecondsRemaining > 0);
  awayEvents = stepGame(state, frame(), 0.05);
  assert.ok(awayEvents.some((event) => event.type === 'skillUsed' && event.team === 'away'));

  const shotState = createGameState();
  const shotEvents = stepGame(shotState, frame({ pressed: ['d'] }), 0.05);
  assert.ok(shotEvents.some((event) => event.type === 'shot'));
  assert.equal(shotState.aiSkillGraceSecondsRemaining, 3);
});

test('goal pause does not consume opponent skill grace before a post-goal kickoff', () => {
  const state = createGameState({
    teamSkillDeck: [{ skillId: 'eagleShot', level: 1 }],
    opponentSkillDeck: [{ skillId: 'eulryongta', level: 1 }],
  });
  state.hasMatchClockStarted = true;
  state.phase = 'goalPause';
  state.phaseSeconds = 0.1;
  state.pendingKickoffTeam = 'away';
  state.aiSkillGraceSecondsRemaining = 1.25;

  stepGame(state, frame(), 0.05);
  assert.equal(state.aiSkillGraceSecondsRemaining, 1.25);
  const kickoffEvents = stepGame(state, frame(), 0.05);
  assert.ok(kickoffEvents.some((event) => event.type === 'kickoff' && event.team === 'away'));
  assert.equal(state.aiSkillGraceSecondsRemaining, 3);
  const awayCarrier = state.players.find((player) => player.id === 'away-fw');
  awayCarrier.x = 850;
  state.ball.x = 833;
  state.aiShotCooldownSeconds = 10;
  for (const player of state.players.filter((candidate) => candidate.team === 'home' && candidate.role !== 'goalkeeper')) {
    player.x = 1100;
  }

  let awayEvents = [];
  for (let index = 0; index < 59; index += 1) {
    awayEvents = stepGame(state, frame(), 0.05);
    assert.ok(!awayEvents.some((event) => event.type === 'skillUsed' && event.team === 'away'));
  }
  assert.ok(state.aiSkillGraceSecondsRemaining > 0);
  const homeTarget = state.players.find((player) => player.id === 'home-def-1');
  homeTarget.x = awayCarrier.x - 70;
  homeTarget.y = awayCarrier.y;
  awayEvents = stepGame(state, frame(), 0.05);
  assert.ok(awayEvents.some((event) => event.type === 'skillUsed' && event.team === 'away'));
});

test('Vacuum Cleaner moves the live ball along an accelerating spiral path and completes at 0.7 seconds', () => {
  const state = createInitialGameState();
  const user = state.players.find((player) => player.id === 'home-def-1');
  Object.assign(user, { x: 100, y: 300, facingX: 1, facingY: 0 });
  Object.assign(state.ball, { ownerId: null, x: 900, y: 300, vx: 0, vy: 0, height: 0 });
  state.controlledPlayerId = user.id;
  state.possessionTeam = null;
  state.phase = 'playing';
  assert.equal(applySkill(state, { team: 'home', sourcePlayerId: user.id, skillId: 'vacuumCleaner', level: 1 }).ok, true);

  for (let index = 0; index < 4; index += 1) stepGame(state, frame(), 0.05);
  const firstX = state.ball.x;
  assert.ok(firstX < 900 && firstX > user.x, 'the ball travels visibly without teleporting to the user');
  assert.ok(Math.abs(state.vacuumEffect.elapsedSeconds - 0.2) < 1e-9);

  for (let index = 0; index < 4; index += 1) stepGame(state, frame(), 0.05);
  const secondX = state.ball.x;
  assert.ok(secondX < firstX, 'the ball keeps moving toward the user');
  assert.ok(firstX - secondX > 900 - firstX, 'ease-in acceleration increases travel over equal time steps');

  for (let index = 0; index < 6; index += 1) stepGame(state, frame(), 0.05);
  assert.equal(state.vacuumEffect ?? null, null);
  assert.equal(state.ball.ownerId, user.id);
  const finalUser = state.players.find((player) => player.id === user.id);
  assert.deepEqual({ x: state.ball.x, y: state.ball.y }, {
    x: finalUser.x + finalUser.facingX * 17,
    y: finalUser.y + finalUser.facingY * 17,
  });
  assert.ok(!state.skillEffects.some((effect) => effect.skillId === 'vacuumCleaner'));
});

test('only the opening kickoff taker can start the clock, and later kickoffs preserve the started clock', () => {
  const state = createGameState();
  state.controlledPlayerId = 'home-def-1';
  state.ball.ownerId = 'home-def-1';
  state.possessionTeam = 'home';
  state.players.find((player) => player.id === 'home-def-1').x -= 30;
  state.ball.x -= 30;

  stepGame(state, frame({ pressed: ['s'] }), 0.05);
  assert.equal(state.hasMatchClockStarted, false);
  assert.equal(state.remainingSeconds, 60);

  state.controlledPlayerId = 'home-fw';
  state.ball.ownerId = 'home-fw';
  stepGame(state, frame({ pressed: ['a'] }), 0.05);
  assert.equal(state.hasMatchClockStarted, true);

  const beforeGoalRestart = state.remainingSeconds;
  state.score = { home: 1, away: 0 };
  state.phase = 'goalPause';
  state.phaseSeconds = 0.01;
  state.pendingKickoffTeam = 'away';
  stepGame(state, frame(), 0.05);
  assert.equal(state.hasMatchClockStarted, true);
  assert.ok(state.remainingSeconds < beforeGoalRestart);
});

test('both teams wait for the opening kickoff to start the clock before using skills', () => {
  const homeState = createGameState({ teamSkillDeck: [{ skillId: 'eagleShot', level: 1 }] });
  const homeBeforeKickoff = stepGame(homeState, frame({ pressed: ['f'] }), 0.05);
  assert.equal(homeBeforeKickoff.some((event) => event.type === 'skillUsed'), false);
  assert.equal(homeState.eagleVolley, null);
  assert.equal(homeState.remainingSeconds, 60);

  homeState.hasMatchClockStarted = true;
  const homeAfterKickoff = stepGame(homeState, frame({ pressed: ['f'] }), 0.05);
  assert.ok(homeAfterKickoff.some((event) => event.type === 'skillUsed' && event.team === 'home' && event.skillId === 'eagleShot'));
  assert.ok(homeState.eagleVolley);

  const awayState = createGameState({ opponentSkillDeck: [{ skillId: 'eulryongta', level: 1 }] });
  awayState.kickoffLocked = false;
  awayState.kickoffTakerId = null;
  awayState.ball.ownerId = 'away-fw';
  awayState.possessionTeam = 'away';
  const awayCaster = awayState.players.find((player) => player.id === 'away-fw');
  const homeTarget = awayState.players.find((player) => player.id === 'home-mid-1');
  Object.assign(awayCaster, { x: 600, y: 270, facingX: -1, facingY: 0 });
  Object.assign(homeTarget, { x: 550, y: 270 });

  const awayBeforeKickoff = stepGame(awayState, frame(), 0.05);
  assert.equal(awayBeforeKickoff.some((event) => event.type === 'skillUsed'), false);
  assert.equal(homeTarget.knockdownSeconds, 0);
  assert.equal(awayState.remainingSeconds, 60);

  awayState.hasMatchClockStarted = true;
  const awayAfterKickoff = stepGame(awayState, frame(), 0.05);
  assert.ok(awayAfterKickoff.some((event) => event.type === 'skillUsed' && event.team === 'away' && event.skillId === 'eulryongta'));
  assert.ok(homeTarget.knockdownSeconds > 0);
});

test('home and away goalkeepers use team skills after kickoff without bypassing the clock gate', () => {
  const homeState = createGameState({ teamSkillDeck: [{ skillId: 'eagleShot', level: 1 }] });
  const homeKeeper = homeState.players.find((player) => player.id === 'home-gk');
  homeState.controlledPlayerId = homeKeeper.id;
  assert.ok(!stepGame(homeState, frame({ pressed: ['f'] }), 0.05)
    .some((event) => event.type === 'skillUsed'));
  assert.equal(homeState.eagleVolley, null);

  homeState.hasMatchClockStarted = true;
  homeState.ball.ownerId = homeKeeper.id;
  homeState.possessionTeam = 'home';
  const homeEvents = stepGame(homeState, frame({ pressed: ['f'] }), 0.01);
  assert.ok(homeEvents.some((event) => event.type === 'skillUsed' && event.team === 'home'
    && event.skillId === 'eagleShot' && event.playerId === homeKeeper.id));
  assert.equal(homeState.skillCooldownRemaining.home.eagleShot, 10);

  const awayState = createGameState({ opponentSkillDeck: [{ skillId: 'eulryongta', level: 1 }] });
  awayState.kickoffLocked = false;
  awayState.kickoffTakerId = null;
  const awayKeeper = awayState.players.find((player) => player.id === 'away-gk');
  const homeTarget = awayState.players.find((player) => player.id === 'home-mid-1');
  Object.assign(awayKeeper, { x: 900, y: 270, facingX: -1, facingY: 0 });
  Object.assign(homeTarget, { x: 840, y: 270 });
  awayState.ball.ownerId = awayKeeper.id;
  awayState.ball.x = awayKeeper.x;
  awayState.ball.y = awayKeeper.y;
  awayState.possessionTeam = 'away';
  assert.ok(!stepGame(awayState, frame(), 0.01).some((event) => event.type === 'skillUsed'));
  assert.equal(homeTarget.knockdownSeconds, 0);

  awayState.hasMatchClockStarted = true;
  const awayEvents = stepGame(awayState, frame(), 0.01);
  assert.ok(awayEvents.some((event) => event.type === 'skillUsed' && event.team === 'away'
    && event.skillId === 'eulryongta' && event.playerId === awayKeeper.id));
  assert.equal(awayState.skillCooldownRemaining.away.eulryongta, 10);
  assert.equal(homeTarget.knockdownSeconds, 5);
});

test('rapid F presses cannot activate a second skill during the team global cooldown', () => {
  const state = createInitialGameState({ teamSkillDeck: [
    { skillId: 'eagleShot', level: 1 }, { skillId: 'tornadoShot', level: 1 },
  ] });
  const striker = state.players.find((player) => player.id === 'home-fw');
  state.controlledPlayerId = striker.id;
  state.ball.ownerId = striker.id;
  state.ball.x = striker.x;
  state.ball.y = striker.y;
  state.possessionTeam = 'home';

  const firstEvents = stepGame(state, frame({ pressed: ['f'] }), 0.01);
  assert.ok(firstEvents.some((event) => event.type === 'skillUsed' && event.skillId === 'eagleShot'));
  assert.equal(state.teamSkillGlobalCooldownRemaining.home, 3);
  assert.equal(state.skillQueueIndex.home, 1);

  const rapidEvents = stepGame(state, frame({ pressed: ['f'] }), 0.05);
  assert.equal(rapidEvents.some((event) => event.type === 'skillUsed'), false);
  assert.ok(state.teamSkillGlobalCooldownRemaining.home > 2.94 && state.teamSkillGlobalCooldownRemaining.home < 2.96);
  assert.equal(state.skillQueueIndex.home, 1);
  assert.equal(state.skillCooldownRemaining.home.tornadoShot, 0);
});

test('Tornado path contact lifts both teams and keepers once while skipping the caster and missed players', () => {
  const state = createInitialGameState();
  state.players.forEach((player, index) => Object.assign(player, { x: 400 + index * 45, y: 450 }));
  Object.assign(state.players.find((player) => player.id === 'home-fw'), { x: 100, y: 200 });
  Object.assign(state.players.find((player) => player.id === 'home-mid-1'), { x: 145, y: 225 });
  Object.assign(state.players.find((player) => player.id === 'away-def-1'), { x: 150, y: 236 });
  Object.assign(state.players.find((player) => player.id === 'home-gk'), { x: 155, y: 220 });
  Object.assign(state.players.find((player) => player.id === 'away-gk'), { x: 155, y: 210 });
  Object.assign(state.players.find((player) => player.id === 'home-def-1'), { x: 150, y: 239 });
  Object.assign(state.players.find((player) => player.id === 'away-mid-1'), { x: 160, y: 200, dismissed: true });
  state.tornadoShotEffect = {
    team: 'home', sourcePlayerId: 'home-fw', level: 1, pathWidth: 2 * PLAYER_BODY_WIDTH,
    hitPlayerIds: [], elapsedSeconds: 0, durationSeconds: 5,
  };

  const events = applyTornadoContacts(state, { x: 100, y: 200 }, { x: 200, y: 200 });
  assert.deepEqual(new Set(events.map((event) => event.playerId)), new Set(['home-mid-1', 'away-def-1', 'home-gk', 'away-gk']));
  assert.ok(events.every((event) => event.type === 'tornadoLift' && event.durationSeconds === 5));
  for (const playerId of ['home-mid-1', 'away-def-1', 'home-gk', 'away-gk']) {
    assert.equal(state.players.find((player) => player.id === playerId).airborneSecondsRemaining, 5);
  }
  assert.equal(state.players.find((player) => player.id === 'home-fw').airborneSecondsRemaining, 0);
  assert.equal(state.players.find((player) => player.id === 'home-def-1').airborneSecondsRemaining, 0);

  const hitTeammate = state.players.find((player) => player.id === 'home-mid-1');
  hitTeammate.airborneSecondsRemaining = 2;
  const repeated = applyTornadoContacts(state, { x: 100, y: 200 }, { x: 200, y: 200 });
  assert.equal(repeated.length, 0);
  assert.equal(hitTeammate.airborneSecondsRemaining, 2, 'recontact does not refresh the lift timer');
});

test('Tornado contact handles missing hit history, invalid positions, and a missing source safely', () => {
  const state = createInitialGameState();
  state.players.forEach((player, index) => Object.assign(player, { x: 400 + index * 45, y: 450 }));
  const source = state.players.find((player) => player.id === 'home-fw');
  const target = state.players.find((player) => player.id === 'away-def-1');
  Object.assign(source, { x: 100, y: 200 });
  Object.assign(target, { x: 150, y: 200 });
  state.tornadoShotEffect = { team: 'home', sourcePlayerId: source.id, level: 1, pathWidth: 48 };

  assert.deepEqual(applyTornadoContacts(state, { x: Number.NaN, y: 200 }, { x: 200, y: 200 }), []);
  const events = applyTornadoContacts(state, { x: 100, y: 200 }, { x: 200, y: 200 });
  assert.equal(events.length, 1);
  assert.deepEqual(state.tornadoShotEffect.hitPlayerIds, [target.id]);

  state.players = state.players.filter((player) => player.id !== source.id);
  assert.deepEqual(applyTornadoContacts(state, { x: 100, y: 200 }, { x: 200, y: 200 }), []);
  assert.equal(state.tornadoShotEffect, null);
});

test('Tornado integration samples a fast ball segment and lifts contacted players', () => {
  const state = createInitialGameState();
  const source = state.players.find((player) => player.id === 'home-fw');
  const target = state.players.find((player) => player.id === 'home-mid-1');
  Object.assign(source, { x: 200, y: 270, facingX: 1, facingY: 0 });
  Object.assign(target, { x: 232, y: 270, knockdownSeconds: 1, motionAction: 'knockdown' });
  state.controlledPlayerId = source.id;
  state.ball.ownerId = source.id;
  state.ball.x = source.x;
  state.ball.y = source.y;
  state.possessionTeam = 'home';
  assert.equal(applySkill(state, { team: 'home', sourcePlayerId: source.id, skillId: 'tornadoShot', level: 1 }).ok, true);

  const hitEvents = stepGame(state, frame(), 0.05);
  assert.ok(hitEvents.some((event) => event.type === 'tornadoLift' && event.playerId === target.id));
  assert.equal(target.airborneSecondsRemaining, 5);

});

test('World Split is ignored when sanitizing a new match skill deck', () => {
  const state = createInitialGameState({ teamSkillDeck: [{ skillId: 'powerTackle', level: 1 }] });
  const source = state.players.find((player) => player.id === state.controlledPlayerId);
  const events = stepGame(state, frame({ pressed: ['f'] }), 0.05);

  assert.equal(events.some((event) => event.type === 'skillUsed'), false);
  assert.deepEqual(state.teamSkillDecks.home, []);
  assert.equal(Object.hasOwn(state, 'powerBarriers'), false);
  assert.equal(Object.hasOwn(source, 'worldSplitSlideSecondsRemaining'), false);
});

test('ordinary tackles keep their standard range and transfer possession', () => {
  const state = createInitialGameState();
  const tackler = state.players.find((player) => player.id === 'home-fw');
  const ballCarrier = state.players.find((player) => player.id === 'away-fw');
  Object.assign(tackler, { x: 200, y: 270 });
  Object.assign(ballCarrier, { x: 226, y: 270 });
  state.possessionTeam = 'away';
  state.ball.ownerId = ballCarrier.id;
  state.ball.x = ballCarrier.x;
  state.ball.y = ballCarrier.y;

  const events = stepGame(state, frame({ pressed: ['a'] }), 0.01);

  assert.ok(events.some((event) => event.type === 'tackle' && event.playerId === tackler.id));
  assert.equal(state.ball.ownerId, tackler.id);
  assert.equal(state.possessionTeam, 'home');
  assert.equal(ballCarrier.knockdownSeconds > 0, true);
  assert.equal(tackler.motionAction, 'tackle');
});

test('kickoff circle keeps non-kickers outside until the ball moves clear', () => {
  const state = createGameState();
  const center = { x: FIELD.width / 2, y: FIELD.height / 2 };
  const awayForward = state.players.find((player) => player.id === 'away-fw');
  awayForward.x = center.x + 40;
  awayForward.y = center.y;

  stepGame(state, frame(), 0.05);

  assert.ok(Math.hypot(awayForward.x - center.x, awayForward.y - center.y) >= KICKOFF_CIRCLE_RADIUS);
  assert.equal(state.kickoffLocked, true);

  stepGame(state, frame({ moveX: 1 }), 0.05);

  assert.equal(state.kickoffLocked, false);
  assert.equal(state.kickoffTakerId, null);
});

test('post-goal kickoff assigns only the conceding team taker to the center circle', () => {
  const state = createGameState();
  state.score = { home: 1, away: 0 };
  state.phase = 'goalPause';
  state.phaseSeconds = 0.01;
  state.pendingKickoffTeam = 'away';

  stepGame(state, frame(), 0.05);

  const center = { x: FIELD.width / 2, y: FIELD.height / 2 };
  const inside = state.players.filter((player) => Math.hypot(player.x - center.x, player.y - center.y) < KICKOFF_CIRCLE_RADIUS);
  assert.equal(state.kickoffLocked, true);
  assert.equal(state.kickoffTakerId, 'away-fw');
  assert.deepEqual(inside.map((player) => player.id), ['away-fw']);
  assert.equal(state.ball.ownerId, 'away-fw');
  assert.deepEqual(state.score, { home: 1, away: 0 });
});

test('home kickoff after conceding selects the forward until the kickoff pass reaches its receiver', () => {
  const state = createGameState();
  state.score = { home: 0, away: 1 };
  state.phase = 'goalPause';
  state.phaseSeconds = 0.01;
  state.pendingKickoffTeam = 'home';
  state.controlledPlayerId = 'home-def-1';

  stepGame(state, frame(), 0.05);
  assert.equal(state.kickoffTakerId, 'home-fw');
  assert.equal(state.controlledPlayerId, 'home-fw');

  stepGame(state, frame(), 0.05);
  assert.equal(state.controlledPlayerId, 'home-fw', 'control stays on the taker before the pass');

  const receiver = state.players.find((player) => player.id === 'home-mid-1');
  Object.assign(receiver, { x: 620, y: 270 });
  stepGame(state, frame({ pressed: ['s'] }), 0.05);
  assert.equal(state.controlledPlayerId, state.ball.passReceiverId);
  assert.equal(state.controlledPlayerId, receiver.id);
});

test('away kickoff preserves the currently controlled home player', () => {
  const state = createGameState();
  state.phase = 'goalPause';
  state.phaseSeconds = 0.01;
  state.pendingKickoffTeam = 'away';
  state.controlledPlayerId = 'home-mid-1';

  stepGame(state, frame(), 0.05);

  assert.equal(state.kickoffTakerId, 'away-fw');
  assert.equal(state.controlledPlayerId, 'home-mid-1');
});

test('moves the selected player at the intended speed and normalizes diagonals', () => {
  const state = createInitialGameState();
  const player = state.players.find((candidate) => candidate.id === 'home-fw');
  const start = { x: player.x, y: player.y };

  stepGame(state, frame({ moveX: 1, moveY: -1 }), 0.05);

  assert.ok(player.x > start.x);
  assert.ok(player.y < start.y);
  assert.ok(Math.abs(Math.hypot(player.vx, player.vy) - 176) < 0.001);
  assert.equal(state.ball.x, player.x + player.facingX * 17);
});

test('E sprint raises controlled movement speed, drains stamina, and recovers when released', () => {
  const state = createInitialGameState();
  const player = state.players.find((candidate) => candidate.id === 'home-fw');
  state.players.filter((candidate) => candidate.team === 'away')
    .forEach((candidate, index) => Object.assign(candidate, { x: 900, y: 30 + index * 80 }));

  stepGame(state, frame({ moveX: 1, down: ['e'] }), 0.05);

  assert.equal(player.sprinting, true);
  assert.ok(Math.abs(Math.hypot(player.vx, player.vy) - 176 * 1.35) < 0.001);
  assert.ok(Math.abs(player.sprintStamina - 98.4) < 0.001);

  stepGame(state, frame({ moveX: 1 }), 0.05);

  assert.equal(player.sprinting, false);
  assert.ok(Math.abs(Math.hypot(player.vx, player.vy) - 176) < 0.001);
  assert.ok(Math.abs(player.sprintStamina - 99.6) < 0.001);
});

test('field AI sprints toward distant tactical targets while goalkeepers recover stamina', () => {
  const state = createInitialGameState();
  const midfielder = state.players.find((player) => player.id === 'home-mid-1');
  const goalkeeper = state.players.find((player) => player.id === 'home-gk');

  stepGame(state, frame(), 0.05);

  assert.equal(midfielder.sprinting, true);
  assert.ok(Math.hypot(midfielder.vx, midfielder.vy) > 136);
  assert.equal(goalkeeper.sprinting, false);
  assert.equal(goalkeeper.sprintStamina, 100);
});

test('player state has no jump fields and Space input does not move a player vertically', () => {
  const state = createInitialGameState();
  const player = state.players.find((candidate) => candidate.id === 'home-fw');
  const startX = player.x;
  const startY = player.y;

  stepGame(state, frame({ pressed: ['Space'] }), 0.05);
  assert.equal(player.x, startX);
  assert.equal(player.y, startY);
  assert.ok(state.players.every((candidate) => !('jumpHeight' in candidate)
    && !('jumpVelocity' in candidate) && !('jumpCooldownSeconds' in candidate)));
});

test('home support AI is deterministic and keeps targets inside the pitch', () => {
  const first = createInitialGameState();
  const second = structuredClone(first);

  for (let index = 0; index < 40; index += 1) {
    stepGame(first, frame(), 0.05);
    stepGame(second, frame(), 0.05);
  }

  assert.equal(first.aiRandomSeed, second.aiRandomSeed);
  assert.deepEqual(first.players, second.players);
  assert.ok(first.players.filter((player) => player.team === 'home'
    && player.role !== 'goalkeeper'
    && player.id !== first.controlledPlayerId
    && player.id !== first.ball.ownerId)
    .every((player) => player.aiTarget.x >= 0 && player.aiTarget.x <= FIELD.width
      && player.aiTarget.y >= 0 && player.aiTarget.y <= FIELD.height));
});

test('home support players retarget deterministically into short outlet and forward run lanes', () => {
  const state = createInitialGameState();
  const teammate = state.players.find((player) => player.id === 'home-def-1');

  stepGame(state, frame(), 0.05);
  const firstTarget = { ...teammate.aiTarget };
  teammate.aiRetargetSeconds = 0;
  state.players.find((player) => player.id === 'home-fw').x += 100;
  stepGame(state, frame(), 0.05);

  assert.notDeepEqual(teammate.aiTarget, firstTarget);
  assert.equal(state.aiRandomSeed, 0x6d2b79f5);
  assert.ok(teammate.aiTarget.x > 0 && teammate.aiTarget.x <= FIELD.width);
  assert.ok(teammate.aiTarget.x >= 0 && teammate.aiTarget.x <= FIELD.width);
  assert.ok(teammate.aiTarget.y >= 0 && teammate.aiTarget.y <= FIELD.height);
});

test('home support targets form two deterministic diagonal passing lanes', () => {
  const state = createInitialGameState();
  const carrier = state.players.find((player) => player.id === 'home-fw');
  Object.assign(carrier, { x: 400, y: 16 });

  stepGame(state, frame(), 0.05);

  const support = state.players.filter((player) => player.team === 'home'
    && player.role !== 'goalkeeper' && player.id !== carrier.id);
  assert.equal(support.length, 2);
  const [shortOutlet, forwardOutlet] = support.sort((a, b) => Math.hypot(a.aiTarget.x - carrier.x, a.aiTarget.y - carrier.y)
    - Math.hypot(b.aiTarget.x - carrier.x, b.aiTarget.y - carrier.y) || a.id.localeCompare(b.id));
  assert.ok(shortOutlet.aiTarget.x > carrier.x);
  assert.ok(forwardOutlet.aiTarget.x > shortOutlet.aiTarget.x);
  assert.ok(Math.abs(shortOutlet.aiTarget.y - forwardOutlet.aiTarget.y) >= 90);
  assert.ok(support.every((player) => player.aiTarget.x >= 0 && player.aiTarget.x <= FIELD.width
    && player.aiTarget.y >= 0 && player.aiTarget.y <= FIELD.height));
});

test('role support movement excludes the controlled player and goalkeeper while defense recovers', () => {
  const state = createInitialGameState();
  const controlled = state.players.find((player) => player.id === 'home-fw');
  const goalkeeper = state.players.find((player) => player.id === 'home-gk');
  const awayPlayer = state.players.find((player) => player.id === 'away-def-1');
  const goalkeeperStart = { x: goalkeeper.x, y: goalkeeper.y };
  const awayStart = { x: awayPlayer.x, y: awayPlayer.y };
  const teammate = state.players.find((player) => player.id === 'home-def-1');
  const teammateStart = { x: teammate.x, y: teammate.y };

  stepGame(state, frame({ moveX: 1 }), 0.05);

  assert.equal(controlled.x, 488.8);
  assert.deepEqual({ x: goalkeeper.x, y: goalkeeper.y }, goalkeeperStart);
  assert.notDeepEqual({ x: awayPlayer.x, y: awayPlayer.y }, awayStart);
  assert.notDeepEqual({ x: teammate.x, y: teammate.y }, teammateStart);
});

test('stunned home support players do not move toward their targets', () => {
  const state = createInitialGameState();
  const teammate = state.players.find((player) => player.id === 'home-def-1');
  teammate.stunnedSeconds = 1;
  const start = { x: teammate.x, y: teammate.y };

  stepGame(state, frame(), 0.05);

  assert.deepEqual({ x: teammate.x, y: teammate.y }, start);
  assert.equal(teammate.stunnedSeconds, 0.95);
});

test('A sends a lob pass and launches the ball into the air', () => {
  const state = createInitialGameState();
  const events = stepGame(state, frame({ moveY: -1, pressed: ['a'] }), 0.05);

  assert.equal(state.controlledPlayerId, 'home-def-1');
  assert.equal(state.ball.ownerId, null);
  assert.equal(state.ball.flightKind, 'lob');
  assert.ok(state.ball.height > 0);
  assert.ok(state.ball.verticalVelocity > 0);
  assert.ok(state.ball.vx < 0);
  assert.ok(events.some((event) => event.type === 'pass' && event.action === 'lobPass'));
  const passer = state.players.find((player) => player.id === 'home-fw');
  assert.equal(passer.motionAction, 'pass');
  assert.ok(passer.motionTimerSeconds > 0);
});

test('A without possession tackles the nearby carrier instead of passing or shooting', () => {
  const state = createInitialGameState();
  state.possessionTeam = 'away';
  state.ball.ownerId = 'away-fw';
  state.controlledPlayerId = 'home-fw';

  const events = stepGame(state, frame({ pressed: ['a'] }), 0.05);
  assert.ok(!events.some((event) => event.team === 'home' && ['pass', 'shot'].includes(event.type)));
  assert.ok(events.some((event) => event.type === 'tackle' && event.team === 'home'));
  assert.equal(state.possessionTeam, 'home');
  assert.equal(state.ball.ownerId, state.controlledPlayerId);
});

test('a forward lob from a wide lane is classified as a cross', () => {
  const state = createInitialGameState();
  const passer = state.players.find((candidate) => candidate.id === 'home-fw');
  const receiver = state.players.find((candidate) => candidate.id === 'home-mid-1');
  passer.x = 400;
  passer.y = 90;
  receiver.x = 560;
  receiver.y = 100;
  state.ball.ownerId = passer.id;
  state.controlledPlayerId = passer.id;
  state.possessionTeam = 'home';
  stepGame(state, frame({ moveX: 1, down: ['a'], pressed: ['a'] }), 0.05);
  stepGame(state, frame({ moveX: 1, released: ['a'] }), 0.05);

  assert.equal(state.ball.flightKind, 'cross');
  assert.ok(state.ball.verticalVelocity > 0);
  stepGame(state, frame(), 0.05);
  assert.ok(state.ball.height > 0);
});

test('a reachable field player automatically heads a descending aerial ball', () => {
  const state = createInitialGameState();
  const headerPlayer = state.players.find((candidate) => candidate.id === 'home-fw');
  Object.assign(headerPlayer, { x: 500, y: 250, facingX: 1, facingY: 0 });
  for (const player of state.players) {
    if (player.id !== headerPlayer.id) Object.assign(player, { x: 100, y: player.team === 'home' ? 40 : 500 });
  }
  Object.assign(state.ball, {
    x: 510, y: 250, vx: 0, vy: 0, ownerId: null,
    height: 40, verticalVelocity: -40, flightKind: 'cross', lastTouchTeam: 'away',
  });
  state.possessionTeam = 'away';

  const events = stepGame(state, frame(), 0.01);
  assert.ok(events.some((event) => event.type === 'header' && event.playerId === headerPlayer.id));
  assert.equal(state.ball.flightKind, 'header');
  assert.equal(state.ball.lastTouchTeam, 'home');
  assert.equal(state.ball.ownerId, null);
  assert.ok(state.ball.verticalVelocity > 0);
  assert.equal(state.controlledPlayerId, headerPlayer.id);
  assert.equal(headerPlayer.motionAction, 'header');
});

test('S releases a ground pass and transfers control to the receiver', () => {
  const state = createInitialGameState();
  const events = stepGame(state, frame({ moveY: 1, pressed: ['s'] }), 0.05);

  assert.equal(state.controlledPlayerId, 'home-mid-1');
  assert.equal(state.ball.flightKind, 'ground');
  const receiver = state.players.find((player) => player.id === state.controlledPlayerId);
  assert.equal(state.ball.passReceiverId, receiver.id);
  assert.equal(state.ball.passProtectionSeconds, 0);
  assert.ok(state.ball.passTarget);
  assert.ok(events.some((event) => event.type === 'pass' && event.action === 'groundPass'));

  stepGame(state, frame({ moveY: 1 }), 0.05);
  assert.ok(state.ball.passTarget.y > receiver.y);
  assert.ok(Math.hypot(state.ball.passTarget.x - receiver.x, state.ball.passTarget.y - receiver.y) <= 10.001);
});

test('D shoots immediately in the selected player facing direction', () => {
  const state = createInitialGameState();
  state.players.find((player) => player.id === 'home-fw').facingX = 1;
  const events = stepGame(state, frame({ pressed: ['d'] }), 0.01);

  assert.equal(state.ball.ownerId, null);
  assert.equal(state.ball.flightKind, 'shot');
  assert.ok(state.ball.vx > 0);
  assert.ok(events.some((event) => event.type === 'shot' && event.team === 'home'));
  assert.equal(state.players.find((player) => player.id === 'home-fw').motionAction, 'shot');
});

test('ordinary home shots interpolate speed and arc smoothly from close to long range', () => {
  const shootAtDistance = (distanceToGoal) => {
    const state = createInitialGameState();
    const shooter = state.players.find((player) => player.id === 'home-fw');
    Object.assign(shooter, {
      x: FIELD.width - distanceToGoal - 17,
      y: FIELD.height / 2,
      facingX: 1,
      facingY: 0,
    });
    const events = stepGame(state, frame({ pressed: ['d'] }), 0.01);
    return { speed: Math.hypot(state.ball.vx, state.ball.vy), verticalVelocity: state.ball.verticalVelocity, events };
  };

  const close = shootAtDistance(SHOT_ARC_START_DISTANCE);
  const middle = shootAtDistance((SHOT_ARC_START_DISTANCE + SHOT_ARC_FULL_DISTANCE) / 2);
  const long = shootAtDistance(SHOT_ARC_FULL_DISTANCE);
  const beforeStart = shootAtDistance(SHOT_ARC_START_DISTANCE - 1);
  const afterStart = shootAtDistance(SHOT_ARC_START_DISTANCE + 1);
  const beforeFull = shootAtDistance(SHOT_ARC_FULL_DISTANCE - 1);
  const afterFull = shootAtDistance(SHOT_ARC_FULL_DISTANCE + 1);

  assert.equal(close.speed, 500);
  assert.equal(close.verticalVelocity, 71);
  assert.equal(middle.speed, 460);
  assert.equal(middle.verticalVelocity, 191);
  assert.equal(long.speed, 420);
  assert.equal(long.verticalVelocity, 311);
  assert.ok(Math.abs(beforeStart.speed - afterStart.speed) < 1);
  assert.ok(Math.abs(beforeFull.speed - afterFull.speed) < 1);
  assert.ok(close.events.some((event) => event.type === 'shot'));
});

test('away AI ordinary shots keep their base speed at close range', () => {
  const state = createInitialGameState();
  const shooter = state.players.find((player) => player.id === 'away-fw');
  Object.assign(shooter, { x: 167, y: FIELD.height / 2, facingX: -1, facingY: 0 });
  state.ball.ownerId = shooter.id;
  state.ball.x = shooter.x;
  state.ball.y = shooter.y;
  state.possessionTeam = 'away';

  const events = stepGame(state, frame(), 0.05);

  assert.equal(state.ball.flightKind, 'shot');
  assert.ok(Math.abs(Math.hypot(state.ball.vx, state.ball.vy) - 430) < 0.01);
  assert.ok(Math.abs(state.ball.verticalVelocity - 35) < 0.01);
  assert.ok(events.some((event) => event.type === 'shot' && event.team === 'away'));
});

test('ordinary shot height rises, falls, and returns to ground flight', () => {
  const state = createInitialGameState();
  for (const player of state.players) player.dismissed = true;
  Object.assign(state.ball, {
    ownerId: null, x: 500, y: FIELD.height / 2, vx: 100, vy: 0,
    height: 0, verticalVelocity: 200, flightKind: 'shot', lastTouchTeam: 'home',
  });

  stepGame(state, frame(), 0.05);
  const firstHeight = state.ball.height;
  stepGame(state, frame(), 0.05);
  stepGame(state, frame(), 0.05);
  stepGame(state, frame(), 0.05);
  const peakHeight = state.ball.height;
  stepGame(state, frame(), 0.05);
  const fallingHeight = state.ball.height;
  for (let index = 0; index < 10 && state.ball.flightKind === 'shot'; index += 1) {
    stepGame(state, frame(), 0.05);
  }

  assert.ok(firstHeight > 0);
  assert.ok(peakHeight > firstHeight);
  assert.ok(fallingHeight < peakHeight);
  assert.equal(state.ball.height, 0);
  assert.equal(state.ball.verticalVelocity, 0);
  assert.equal(state.ball.flightKind, 'ground');
});

test('shots score inside the widened goal mouth on either side and high shots restart as goal kicks', () => {
  const crossAtHeight = (team, height, y = FIELD.height / 2) => {
    const state = createInitialGameState();
    for (const player of state.players) {
      player.dismissed = player.id !== (team === 'home' ? 'away-gk' : 'home-gk');
    }
    Object.assign(state.ball, {
      ownerId: null,
      x: team === 'home' ? FIELD.width + BALL_RADIUS - 0.6 : -BALL_RADIUS + 0.6,
      y,
      vx: team === 'home' ? 100 : -100,
      vy: 0,
      height,
      verticalVelocity: 0,
      flightKind: 'shot',
      lastTouchTeam: team,
    });

    const events = stepGame(state, frame(), 0.01);
    return { state, events };
  };

  for (const team of ['home', 'away']) {
    const atUpperEdge = crossAtHeight(team, 0, FIELD.goalTop + BALL_RADIUS);
    assert.ok(atUpperEdge.events.some((event) => event.type === 'goal' && event.team === team));

    const outsideMouth = crossAtHeight(team, 0, FIELD.goalTop + BALL_RADIUS - 0.1);
    assert.ok(!outsideMouth.events.some((event) => event.type === 'goal'));

    const atBar = crossAtHeight(team, GOAL_CROSSBAR_HEIGHT);
    assert.ok(atBar.events.some((event) => event.type === 'goal' && event.team === team));

    const aboveBar = crossAtHeight(team, GOAL_CROSSBAR_HEIGHT + 40);
    assert.ok(!aboveBar.events.some((event) => event.type === 'goal'));
    assert.equal(aboveBar.state.phase, 'goalKick');
    assert.equal(aboveBar.state.restart?.type, 'goalKick');
  }
});

test('shots retain all eight facing directions while correcting only toward the goal mouth', () => {
  const directions = [
    [1, 0], [1, -1], [0, -1], [-1, -1],
    [-1, 0], [-1, 1], [0, 1], [1, 1],
  ];

  for (const [facingX, facingY] of directions) {
    const state = createInitialGameState();
    const shooter = state.players.find((player) => player.id === 'home-fw');
    shooter.facingX = facingX;
    shooter.facingY = facingY;
    stepGame(state, frame({ down: ['d'], pressed: ['d'] }), 0.01);
    stepGame(state, frame({ released: ['d'] }), 0.01);

    assert.equal(Math.sign(state.ball.vx), Math.sign(facingX));
    assert.equal(Math.sign(state.ball.vy), Math.sign(facingY));
  }
});

test('close shots receive stronger goal-mouth correction than long shots', () => {
  const shoot = (x) => {
    const state = createInitialGameState();
    const shooter = state.players.find((player) => player.id === 'home-fw');
    Object.assign(shooter, { x, y: 183, facingX: 1, facingY: 1 });
    const events = stepGame(state, frame({ pressed: ['d'] }), 0.01);
    return { events, state };
  };

  const closeShot = shoot(900);
  const longShot = shoot(700);

  assert.equal(SHOT_ASSIST_DISTANCE, 520);
  assert.equal(SHOT_ASSIST_MAX, 0.88);
  assert.ok(closeShot.events.some((event) => event.type === 'shotOnTarget'));
  assert.ok(!longShot.events.some((event) => event.type === 'shotOnTarget'));
});

test('a shot facing away from the attacking goal receives no correction', () => {
  const state = createInitialGameState();
  const shooter = state.players.find((player) => player.id === 'home-fw');
  shooter.facingX = -1;
  shooter.facingY = 0;

  stepGame(state, frame({ pressed: ['d'] }), 0.01);

  assert.ok(state.ball.vx < 0);
  assert.equal(state.ball.vy, 0);
});

test('a defender can still block a close-range corrected shot', () => {
  const state = createInitialGameState();
  const shooter = state.players.find((player) => player.id === 'home-fw');
  const blocker = state.players.find((player) => player.id === 'away-def-1');
  Object.assign(shooter, { x: 820, y: 180, facingX: 1, facingY: 1 });
  Object.assign(blocker, { x: 862, y: 208, stunnedSeconds: 5 });
  for (const player of state.players) {
    if (![shooter.id, blocker.id, 'away-gk'].includes(player.id)) player.dismissed = true;
  }

  const events = stepGame(state, frame({ pressed: ['d'] }), 0.05);

  assert.equal(state.ball.ownerId, blocker.id);
  assert.equal(state.possessionTeam, 'away');
  assert.ok(events.some((event) => event.type === 'possessionChange' && event.playerId === blocker.id));
});

test('holding D does not charge or increase immediate shot power', () => {
  const state = createInitialGameState();
  const events = stepGame(state, frame({ down: ['d'], pressed: ['d'] }), 0.01);
  const speedAtShot = Math.hypot(state.ball.vx, state.ball.vy);
  assert.ok(events.some((event) => event.type === 'shot'));
  const laterEvents = stepGame(state, frame({ down: ['d'] }), 0.05);
  assert.ok(!laterEvents.some((event) => event.type === 'shot'));
  assert.ok(speedAtShot > 0);
});

test('ground passes are intercepted by the opponent crossing the swept ball path', () => {
  const state = createInitialGameState();
  state.ball.ownerId = null;
  state.possessionTeam = 'home';
  Object.assign(state.ball, {
    x: 400, y: 270, vx: 330, vy: 0, flightKind: 'ground', flightSeconds: 0,
    passTeam: 'home', passTarget: { x: 600, y: 270 }, passProtectionSeconds: 0,
  });
  const interceptor = state.players.find((player) => player.id === 'away-fw');
  Object.assign(interceptor, { x: 408, y: 270 });
  for (const player of state.players.filter((candidate) => candidate.team === 'away' && candidate.id !== interceptor.id && candidate.role !== 'goalkeeper')) {
    Object.assign(player, { x: 900, y: 500 });
  }

  const events = stepGame(state, frame(), 0.05);

  assert.equal(state.ball.ownerId, interceptor.id);
  assert.equal(state.possessionTeam, 'away');
  assert.ok(events.some((event) => event.type === 'passIntercepted' && event.fromTeam === 'home' && event.passKind === 'ground'));
  assert.ok(!events.some((event) => event.type === 'playerKnockedDown'));
  assert.equal(interceptor.knockdownSeconds, 0);
  assert.equal(state.controlledPlayerId, 'home-fw');
});

test('home players intercept away ground passes and become the controlled receiver', () => {
  const state = createInitialGameState();
  state.ball.ownerId = null;
  state.possessionTeam = 'away';
  Object.assign(state.ball, {
    x: 400, y: 270, vx: -330, vy: 0, flightKind: 'ground', flightSeconds: 0,
    passTeam: 'away', passTarget: { x: 200, y: 270 }, passProtectionSeconds: 0,
  });
  const interceptor = state.players.find((player) => player.id === 'home-def-1');
  Object.assign(interceptor, { x: 392, y: 270 });
  for (const player of state.players.filter((candidate) => candidate.team === 'home' && candidate.id !== interceptor.id && candidate.role !== 'goalkeeper')) {
    Object.assign(player, { x: 20, y: 500 });
  }

  const events = stepGame(state, frame(), 0.05);

  assert.equal(state.ball.ownerId, interceptor.id);
  assert.equal(state.possessionTeam, 'home');
  assert.equal(state.controlledPlayerId, interceptor.id);
  assert.ok(events.some((event) => event.type === 'passIntercepted' && event.fromTeam === 'away'));
  assert.ok(!events.some((event) => event.type === 'playerKnockedDown'));
  assert.equal(interceptor.knockdownSeconds, 0);
});

test('ground passes do not intercept players outside the swept lane', () => {
  const state = createInitialGameState();
  state.ball.ownerId = null;
  state.possessionTeam = 'home';
  Object.assign(state.ball, {
    x: 400, y: 270, vx: 330, vy: 0, flightKind: 'ground', flightSeconds: 0,
    passTeam: 'home', passTarget: { x: 600, y: 270 }, passProtectionSeconds: 0,
  });
  const defender = state.players.find((player) => player.id === 'away-fw');
  Object.assign(defender, { x: 408, y: 320 });

  const events = stepGame(state, frame(), 0.05);

  assert.equal(state.ball.ownerId, null);
  assert.ok(!events.some((event) => event.type === 'passIntercepted'));
});

test('ground pass target follows a moving receiver and gives them a reliable first touch', () => {
  const state = createInitialGameState();
  const receiver = state.players.find((player) => player.id === 'home-mid-1');
  for (const player of state.players) {
    if (player.id !== receiver.id) player.dismissed = true;
  }
  Object.assign(receiver, { x: 500, y: 270 });
  state.controlledPlayerId = receiver.id;
  state.possessionTeam = 'home';
  Object.assign(state.ball, {
    ownerId: null, x: 450, y: 270, vx: 330, vy: 0,
    flightKind: 'ground', flightSeconds: 0, passTeam: 'home',
    passReceiverId: receiver.id, passTarget: { x: receiver.x, y: receiver.y },
  });

  stepGame(state, frame({ moveY: 1 }), 0.05);
  assert.ok(state.ball.passTarget.y > receiver.y);

  let events = [];
  for (let index = 0; index < 20 && state.ball.ownerId !== receiver.id; index += 1) {
    events = stepGame(state, frame(), 0.05);
  }

  assert.equal(state.ball.ownerId, receiver.id);
  assert.equal(state.ball.passReceiverId, undefined);
  assert.ok(events.some((event) => event.type === 'pass' && event.completed && event.receiverId === receiver.id));
});

test('a defender can intercept a tracked ground pass along its actual path', () => {
  const state = createInitialGameState();
  const receiver = state.players.find((player) => player.id === 'home-mid-1');
  const interceptor = state.players.find((player) => player.id === 'away-fw');
  Object.assign(receiver, { x: 600, y: 270, aiTarget: { x: 600, y: 270 }, aiRetargetSeconds: 10 });
  Object.assign(interceptor, { x: 408, y: 270, stunnedSeconds: 5 });
  for (const player of state.players) {
    if (player.team === 'away' && player.id !== interceptor.id && player.role !== 'goalkeeper') player.dismissed = true;
  }
  Object.assign(state.ball, {
    ownerId: null, x: 400, y: 270, vx: 330, vy: 0,
    flightKind: 'ground', flightSeconds: 0, passTeam: 'home',
    passReceiverId: receiver.id, passTarget: { x: receiver.x, y: receiver.y },
  });

  const events = stepGame(state, frame(), 0.05);

  assert.equal(state.ball.ownerId, interceptor.id);
  assert.equal(state.ball.passReceiverId, undefined);
  assert.ok(events.some((event) => event.type === 'passIntercepted' && event.fromTeam === 'home'));
});

test('a missing ground-pass receiver falls back to ordinary loose-ball movement', () => {
  const state = createInitialGameState();
  const receiver = state.players.find((player) => player.id === 'home-mid-1');
  receiver.dismissed = true;
  Object.assign(state.ball, {
    ownerId: null, x: 400, y: 270, vx: 100, vy: 0,
    flightKind: 'ground', passTeam: 'home', passReceiverId: receiver.id,
    passTarget: { x: 700, y: 270 },
  });

  stepGame(state, frame(), 0.05);

  assert.equal(state.ball.passReceiverId, undefined);
  assert.equal(state.ball.passTarget, undefined);
  assert.ok(state.ball.x > 400 && state.ball.x < 410);
});

test('an opponent can collect a ground pass at its endpoint without pass immunity', () => {
  const state = createInitialGameState();
  state.ball.ownerId = null;
  state.possessionTeam = 'home';
  Object.assign(state.ball, {
    x: 500, y: 270, vx: 0, vy: 0, flightKind: 'ground', flightSeconds: 1,
    passTeam: 'home', passTarget: null, passProtectionSeconds: 0.001,
  });
  const opponent = state.players.find((player) => player.id === 'away-fw');
  Object.assign(opponent, { x: 500, y: 270 });

  stepGame(state, frame(), 0.01);

  assert.equal(state.ball.ownerId, opponent.id);
  assert.equal(state.possessionTeam, 'away');
});

test('the nearest campaign AI from each team runs toward an unowned ground ball once', () => {
  const state = createInitialGameState();
  const controlled = state.players.find((player) => player.id === 'home-fw');
  const homeChaser = state.players.find((player) => player.id === 'home-mid-1');
  const homeTeammate = state.players.find((player) => player.id === 'home-def-1');
  const awayChaser = state.players.find((player) => player.id === 'away-fw');
  const awayTeammate = state.players.find((player) => player.id === 'away-mid-1');
  Object.assign(controlled, { x: 700, y: 270 });
  Object.assign(homeChaser, { x: 360, y: 270 });
  Object.assign(homeTeammate, { x: 200, y: 200 });
  Object.assign(awayChaser, { x: 450, y: 270 });
  Object.assign(awayTeammate, { x: 800, y: 400 });
  prepareLooseBallState(state);
  const homeTeammateStart = { x: homeTeammate.x, y: homeTeammate.y };
  const awayTeammateStart = { x: awayTeammate.x, y: awayTeammate.y };
  const homeChaserStart = { x: homeChaser.x, y: homeChaser.y };
  const awayChaserStart = { x: awayChaser.x, y: awayChaser.y };

  stepGame(state, frame(), 0.05);

  assert.deepEqual(homeChaser.aiTarget, { x: 400, y: 270 });
  assert.deepEqual(awayChaser.aiTarget, { x: 400, y: 270 });
  assert.ok(Math.abs((homeChaser.x - homeChaserStart.x) - 6.8) < 1e-9);
  assert.ok(Math.abs((awayChaser.x - awayChaserStart.x) + 6.8) < 1e-9);
  assert.ok(Math.hypot(homeChaser.x - homeChaserStart.x, homeChaser.y - homeChaserStart.y) <= 136 * 0.05 + 1e-9);
  assert.ok(Math.hypot(awayChaser.x - awayChaserStart.x, awayChaser.y - awayChaserStart.y) <= 136 * 0.05 + 1e-9);
  assert.deepEqual({ x: homeTeammate.x, y: homeTeammate.y }, homeTeammateStart);
  assert.deepEqual({ x: awayTeammate.x, y: awayTeammate.y }, awayTeammateStart);
  assert.equal(state.ball.ownerId, null);
  assert.equal(state.possessionTeam, 'away');
});

test('the controlled home player keeps input while its nearest AI teammate chases', () => {
  const state = createInitialGameState();
  const controlled = state.players.find((player) => player.id === 'home-fw');
  const homeChaser = state.players.find((player) => player.id === 'home-mid-1');
  const homeDefender = state.players.find((player) => player.id === 'home-def-1');
  Object.assign(controlled, { x: 401, y: 270 });
  Object.assign(homeChaser, { x: 450, y: 270 });
  Object.assign(homeDefender, { x: 520, y: 270 });
  state.controlledPlayerId = controlled.id;
  prepareLooseBallState(state);

  stepGame(state, frame({ moveX: 1 }), 0.05);

  assert.equal(controlled.x, 409.8);
  assert.deepEqual(homeChaser.aiTarget, { x: 400, y: 270 });
  assert.equal(homeChaser.x, 443.2);
});

test('aerial loose-ball chasers aim at the predicted landing point or declared flight target', () => {
  const state = createInitialGameState();
  const homeChaser = state.players.find((player) => player.id === 'home-mid-1');
  const awayChaser = state.players.find((player) => player.id === 'away-fw');
  Object.assign(state.players.find((player) => player.id === 'home-fw'), { x: 850, y: 480 });
  Object.assign(homeChaser, { x: 250, y: 250 });
  Object.assign(awayChaser, { x: 380, y: 250 });
  prepareLooseBallState(state, {
    x: 300,
    y: 250,
    vx: 100,
    vy: 20,
    height: 40,
    verticalVelocity: 0,
    flightKind: 'lob',
  });
  const landingSeconds = Math.sqrt(2 * 900 * 40) / 900;
  const projectedLanding = { x: 300 + 100 * landingSeconds, y: 250 + 20 * landingSeconds };

  stepGame(state, frame(), 0.05);

  assert.ok(Math.abs(homeChaser.aiTarget.x - projectedLanding.x) < 0.001);
  assert.ok(Math.abs(homeChaser.aiTarget.y - projectedLanding.y) < 0.001);
  assert.deepEqual(awayChaser.aiTarget, projectedLanding);
  assert.ok(Math.hypot(homeChaser.x - 250, homeChaser.y - 250) <= 136 * 0.05);
  assert.ok(Math.hypot(awayChaser.x - 380, awayChaser.y - 250) <= 136 * 0.05);

  const targetState = createInitialGameState();
  const targetChaser = targetState.players.find((player) => player.id === 'away-fw');
  Object.assign(targetState.players.find((player) => player.id === 'home-fw'), { x: 850, y: 480 });
  Object.assign(targetChaser, { x: 570, y: 100 });
  prepareLooseBallState(targetState, {
    x: 300,
    y: 250,
    vx: 100,
    vy: 20,
    height: 40,
    verticalVelocity: 0,
    flightKind: 'lob',
    flightTarget: { x: 600, y: 100 },
  });

  stepGame(targetState, frame(), 0.05);

  assert.deepEqual(targetChaser.aiTarget, { x: 600, y: 100 });
});

test('goalkeepers contest loose balls only near their own goal', () => {
  const nearGoalState = createInitialGameState();
  const nearGoalkeeper = nearGoalState.players.find((player) => player.id === 'home-gk');
  const nearGoalDefender = nearGoalState.players.find((player) => player.id === 'home-def-1');
  Object.assign(nearGoalkeeper, { x: 50, y: 270 });
  Object.assign(nearGoalDefender, { x: 350, y: 270 });
  Object.assign(nearGoalState.players.find((player) => player.id === 'home-fw'), { x: 700, y: 400 });
  prepareLooseBallState(nearGoalState, { x: 170, y: 270 });

  stepGame(nearGoalState, frame(), 0.05);

  assert.deepEqual(nearGoalkeeper.aiTarget, { x: 170, y: 270 });
  assert.equal(nearGoalkeeper.x, 56.8);

  const outsideGoalState = createInitialGameState();
  const outsideGoalkeeper = outsideGoalState.players.find((player) => player.id === 'home-gk');
  const outsideGoalDefender = outsideGoalState.players.find((player) => player.id === 'home-def-1');
  Object.assign(outsideGoalkeeper, { x: 50, y: 270 });
  Object.assign(outsideGoalDefender, { x: 250, y: 270 });
  Object.assign(outsideGoalState.players.find((player) => player.id === 'home-fw'), { x: 800, y: 400 });
  prepareLooseBallState(outsideGoalState, { x: 200, y: 270 });

  stepGame(outsideGoalState, frame(), 0.05);

  assert.deepEqual(outsideGoalDefender.aiTarget, { x: 200, y: 270 });
  assert.notDeepEqual(outsideGoalkeeper.aiTarget, { x: 200, y: 270 });
  assert.equal(outsideGoalDefender.x, 243.2);
});

test('loose-ball chaser selection skips unavailable players and breaks distance ties deterministically', () => {
  const tieState = createInitialGameState();
  const expectedChaser = tieState.players.find((player) => player.id === 'away-def-1');
  for (const player of tieState.players.filter((candidate) => candidate.team === 'away' && candidate.role !== 'goalkeeper')) {
    Object.assign(player, { x: 350, y: 270 });
  }
  prepareLooseBallState(tieState);

  stepGame(tieState, frame(), 0.05);

  assert.deepEqual(expectedChaser.aiTarget, { x: 400, y: 270 });
  assert.equal(expectedChaser.x, 356.8);
  for (const player of tieState.players.filter((candidate) => candidate.team === 'away'
      && candidate.id !== expectedChaser.id && candidate.role !== 'goalkeeper')) {
    assert.notDeepEqual(player.aiTarget, { x: 400, y: 270 });
  }

  const filteredState = createInitialGameState();
  const dismissed = filteredState.players.find((player) => player.id === 'away-def-1');
  const knockedDown = filteredState.players.find((player) => player.id === 'away-mid-1');
  const stunned = filteredState.players.find((player) => player.id === 'away-fw');
  const airborne = stunned;
  dismissed.dismissed = true;
  knockedDown.knockdownSeconds = 2;
  stunned.stunnedSeconds = 2;
  airborne.airborneSecondsRemaining = 2;
  Object.assign(filteredState.players.find((player) => player.id === 'home-fw'), { x: 700, y: 400 });
  prepareLooseBallState(filteredState);
  const unavailableTargets = [dismissed, knockedDown, stunned, airborne].map((player) => ({ ...player.aiTarget }));

  stepGame(filteredState, frame(), 0.05);

  assert.deepEqual(dismissed.aiTarget, unavailableTargets[0]);
  assert.deepEqual(knockedDown.aiTarget, unavailableTargets[1]);
  assert.deepEqual(stunned.aiTarget, unavailableTargets[2]);
  assert.deepEqual(airborne.aiTarget, unavailableTargets[3]);
});

test('targeted passes, skill shots, invalid aerial projections, and PvP do not start loose-ball chases', () => {
  const excludedScenarios = [
    {
      name: 'targeted ground pass',
      ball: { passTeam: 'home', passReceiverId: 'home-mid-1', passTarget: { x: 650, y: 270 } },
    },
    {
      name: 'targeted aerial pass',
      ball: { flightKind: 'lob', height: 40, passTeam: 'home', flightTarget: { x: 650, y: 270 } },
    },
    {
      name: 'skill shot',
      ball: { flightKind: 'skill-shot', skillId: 'tornadoShot', height: 40, vx: 100, vy: 0 },
    },
    {
      name: 'invalid aerial projection',
      ball: { flightKind: 'lob', height: 40, verticalVelocity: 0, vx: Number.NaN, vy: 0 },
    },
  ];

  for (const scenario of excludedScenarios) {
    const state = createInitialGameState();
    const homeSupport = state.players.find((player) => player.id === 'home-mid-1');
    const awaySupport = state.players.find((player) => player.id === 'away-mid-1');
    prepareLooseBallState(state, {
      x: 400,
      y: 270,
      vx: 0,
      vy: 0,
      ...scenario.ball,
    });
    const homeTargetBefore = { ...homeSupport.aiTarget };
    const awayTargetBefore = { ...awaySupport.aiTarget };

    stepGame(state, frame(), 0.01);

    assert.deepEqual(homeSupport.aiTarget, homeTargetBefore, scenario.name);
    assert.deepEqual(awaySupport.aiTarget, awayTargetBefore, scenario.name);
  }

  const ownedState = createInitialGameState();
  const homeSupport = ownedState.players.find((player) => player.id === 'home-mid-1');
  const awaySupport = ownedState.players.find((player) => player.id === 'away-mid-1');
  prepareLooseBallState(ownedState, { ownerId: 'away-fw' });
  ownedState.aiShotCooldownSeconds = 10;
  stepGame(ownedState, frame(), 0.01);
  assert.notDeepEqual(homeSupport.aiTarget, { x: 400, y: 270 }, 'owned ball, home AI');
  assert.notDeepEqual(awaySupport.aiTarget, { x: 400, y: 270 }, 'owned ball, away AI');

  const pvpState = createInitialGameState();
  const pvpHomeSupport = pvpState.players.find((player) => player.id === 'home-mid-1');
  const pvpAwaySupport = pvpState.players.find((player) => player.id === 'away-mid-1');
  prepareLooseBallState(pvpState);
  const pvpHomeTargetBefore = { ...pvpHomeSupport.aiTarget };
  const pvpAwayTargetBefore = { ...pvpAwaySupport.aiTarget };
  stepGame(pvpState, { home: frame(), away: frame() }, 0.01, { controlledTeams: ['home', 'away'] });
  assert.deepEqual(pvpHomeSupport.aiTarget, pvpHomeTargetBefore, 'PvP home support');
  assert.deepEqual(pvpAwaySupport.aiTarget, pvpAwayTargetBefore, 'PvP away support');
});

test('a keeper catches an ordinary shot and starts a timed goal kick', () => {
  const state = createInitialGameState();
  state.possessionTeam = 'away';
  for (const [index, player] of state.players.entries()) {
    Object.assign(player, { x: 300 + index * 20, y: 70 + index * 30, vx: 12, vy: -4, aiTarget: 'scattered', aiRetargetSeconds: 4 });
  }
  Object.assign(state.players.find((player) => player.id === 'home-gk'), { x: 55, y: 270 });
  const dismissed = state.players.find((player) => player.id === 'away-mid-1');
  Object.assign(dismissed, { dismissed: true, x: 420, y: 420, sprintStamina: 37 });
  const preservedPlayer = state.players.find((player) => player.id === 'home-mid-1');
  preservedPlayer.sprintStamina = 61;
  Object.assign(state.ball, {
    ownerId: null, x: 55, y: 270, vx: -30, vy: 0,
    height: 10, verticalVelocity: 80, flightKind: 'shot', lastTouchTeam: 'away',
  });

  const events = stepGame(state, frame(), 0.01);

  assert.equal(state.phase, 'goalKick');
  assert.equal(state.ball.ownerId, 'home-gk');
  assert.ok(events.some((event) => event.type === 'keeperCatch'));
  assert.ok(!events.some((event) => event.type === 'playerKnockedDown'));
  assert.equal(state.players.find((player) => player.id === 'home-gk').knockdownSeconds, 0);
  assert.equal(state.players.find((player) => player.id === 'home-gk').keeperAction, 'diveRight');
  for (const player of state.players.filter((entry) => !entry.dismissed)) {
    if (player.id === 'home-gk') {
      assert.deepEqual({ x: player.x, y: player.y }, { x: 70, y: FIELD.height / 2 });
    } else if (player.team === 'home' && player.role !== 'goalkeeper') {
      assert.equal(typeof player.aiTarget.x, 'number');
      assert.equal(typeof player.aiTarget.y, 'number');
    } else {
      assert.notDeepEqual({ x: player.x, y: player.y }, getBaseFormationPositions().get(player.id));
    }
    assert.ok(player.x >= 0 && player.x <= FIELD.width);
    assert.ok(player.y >= 0 && player.y <= FIELD.height);
  }
  assert.deepEqual({ x: dismissed.x, y: dismissed.y }, { x: 420, y: 420 });
  assert.equal(dismissed.dismissed, true);
  assert.ok(dismissed.sprintStamina >= 37 && dismissed.sprintStamina < 38);
  assert.ok(preservedPlayer.sprintStamina >= 61 && preservedPlayer.sprintStamina < 62);
  let kickEvents = [];
  for (let i = 0; i < 24 && !kickEvents.some((event) => event.type === 'goalKick'); i += 1) {
    kickEvents = stepGame(state, frame(), 0.05);
  }
  assert.equal(state.phase, 'playing');
  assert.equal(state.ball.ownerId, null);
  assert.ok(state.ball.vx > 0);
  assert.ok(kickEvents.some((event) => event.type === 'goalKick'));
  assert.equal(state.players.find((player) => player.id === 'home-gk').keeperAction, 'goalKick');
  assert.equal(state.players.find((player) => player.id === 'home-gk').motionAction, 'goalKick');
});

test('PvP keeper catches keep legacy goal-kick lanes and close opponent positions', () => {
  const state = createInitialGameState();
  state.possessionTeam = 'away';
  const keeper = state.players.find((player) => player.id === 'home-gk');
  const closeOpponent = state.players.find((player) => player.id === 'away-def-1');
  Object.assign(keeper, { x: 55, y: 270 });
  Object.assign(closeOpponent, { x: 70, y: 270, knockdownSeconds: 5 });
  Object.assign(state.ball, {
    ownerId: null,
    x: 55,
    y: 270,
    vx: -30,
    vy: 0,
    height: 10,
    verticalVelocity: 80,
    flightKind: 'shot',
    lastTouchTeam: 'away',
  });

  const events = stepGame(state, { home: frame(), away: frame() }, 0.01, { controlledTeams: ['home', 'away'] });

  assert.equal(state.phase, 'goalKick');
  assert.ok(events.some((event) => event.type === 'keeperCatch'));
  assert.ok(Math.hypot(closeOpponent.x - keeper.x, closeOpponent.y - keeper.y) < 120);
  const receivers = state.players.filter((player) => player.team === 'home' && player.role !== 'goalkeeper')
    .sort((a, b) => a.role.localeCompare(b.role) || a.id.localeCompare(b.id));
  const laneX = [0.70, 0.60, 0.60];
  const laneY = [FIELD.height / 2, FIELD.height / 2 - FIELD.height * 0.19, FIELD.height / 2 + FIELD.height * 0.19];
  for (const [index, receiver] of receivers.entries()) {
    assert.equal(receiver.aiTarget.x, FIELD.width * laneX[index]);
    assert.equal(receiver.aiTarget.y, laneY[index]);
  }
});

test('goal-line goal kicks move receiving teammates toward mirrored lanes without teleporting players', () => {
  const basePositions = getBaseFormationPositions();
  for (const scenario of [
    { x: FIELD.width + BALL_RADIUS + 1, lastTouchTeam: 'home', team: 'away', keeperId: 'away-gk' },
    { x: -BALL_RADIUS - 1, lastTouchTeam: 'away', team: 'home', keeperId: 'home-gk' },
  ]) {
    const state = createInitialGameState();
    for (const [index, player] of state.players.entries()) {
      Object.assign(player, { x: 320 + index * 13, y: 80 + index * 21, vx: -8, vy: 6, aiTarget: 'old', aiRetargetSeconds: 3 });
    }
    const keeperX = scenario.team === 'home' ? 70 : FIELD.width - 70;
    const opposingTeam = scenario.team === 'home' ? 'away' : 'home';
    const closeOpponent = state.players.find((player) => player.team === opposingTeam && player.role !== 'goalkeeper');
    const distantOpponent = state.players.find((player) => player.team === opposingTeam
      && player.role === 'midfielder');
    Object.assign(closeOpponent, { x: keeperX, y: FIELD.height / 2, vx: -8, vy: 6 });
    Object.assign(distantOpponent, {
      x: keeperX + (scenario.team === 'home' ? 160 : -160),
      y: FIELD.height / 2,
      vx: 7,
      vy: 8,
      knockdownSeconds: 5,
    });
    const distantOpponentBefore = {
      x: distantOpponent.x,
      y: distantOpponent.y,
      vx: distantOpponent.vx,
      vy: distantOpponent.vy,
    };
    Object.assign(state.ball, {
      ownerId: null,
      x: scenario.x,
      y: 400,
      vx: 0,
      vy: 0,
      lastTouchTeam: scenario.lastTouchTeam,
    });

    const events = stepGame(state, frame(), 0.01);

    assert.ok(events.some((event) => event.type === 'goalKick' && event.team === scenario.team));
    assert.equal(state.ball.ownerId, scenario.keeperId);
    for (const player of state.players) {
      if (player.id === scenario.keeperId) {
        assert.deepEqual({ x: player.x, y: player.y }, {
          x: scenario.team === 'home' ? 70 : FIELD.width - 70,
          y: FIELD.height / 2,
        });
        assert.equal(player.keeperAction, 'goalKickPrepare');
        assert.equal(player.keeperActionSeconds, 0.35);
      } else if (player.team === scenario.team && player.role !== 'goalkeeper' && !player.dismissed) {
        assert.equal(typeof player.aiTarget?.x, 'number');
        assert.equal(typeof player.aiTarget?.y, 'number');
        assert.notDeepEqual({ x: player.x, y: player.y }, player.aiTarget);
        assert.ok(player.x >= 0 && player.x <= FIELD.width && player.y >= 0 && player.y <= FIELD.height);
      } else {
        assert.ok(player.x >= 0 && player.x <= FIELD.width && player.y >= 0 && player.y <= FIELD.height);
      }
    }
    const receivingPlayers = state.players.filter((player) => player.team === scenario.team
      && player.role !== 'goalkeeper' && !player.dismissed)
      .sort((a, b) => a.role.localeCompare(b.role) || a.id.localeCompare(b.id));
    const goalkeeperForTarget = state.players.find((player) => player.id === scenario.keeperId);
    const targetDistances = [140, 250, 250];
    const lateralOffset = Math.sqrt(250 ** 2 - 230 ** 2);
    const direction = scenario.team === 'home' ? 1 : -1;
    for (const [index, player] of receivingPlayers.entries()) {
      assert.ok(Math.abs(Math.hypot(player.aiTarget.x - goalkeeperForTarget.x, player.aiTarget.y - goalkeeperForTarget.y)
        - targetDistances[index]) < 0.01);
      const expectedTarget = index === 0
        ? { x: goalkeeperForTarget.x + direction * 140, y: goalkeeperForTarget.y }
        : {
          x: goalkeeperForTarget.x + direction * 230,
          y: goalkeeperForTarget.y + (index === 1 ? -lateralOffset : lateralOffset),
        };
      assert.ok(Math.abs(player.aiTarget.x - expectedTarget.x) < 0.01);
      assert.ok(Math.abs(player.aiTarget.y - expectedTarget.y) < 0.01);
      assert.equal(player.aiRetargetSeconds, 0);
    }
    assert.ok(Math.hypot(closeOpponent.x - goalkeeperForTarget.x, closeOpponent.y - goalkeeperForTarget.y) >= 120);
    assert.equal(closeOpponent.vx, 0);
    assert.equal(closeOpponent.vy, 0);
    assert.deepEqual({
      x: distantOpponent.x,
      y: distantOpponent.y,
      vx: distantOpponent.vx,
      vy: distantOpponent.vy,
    }, distantOpponentBefore);

    const firstReceiver = receivingPlayers[0];
    const initialDistance = Math.hypot(firstReceiver.aiTarget.x - firstReceiver.x, firstReceiver.aiTarget.y - firstReceiver.y);
    stepGame(state, frame(), 0.05);
    assert.ok(Math.hypot(firstReceiver.aiTarget.x - firstReceiver.x, firstReceiver.aiTarget.y - firstReceiver.y) < initialDistance);

    let restartEvents = [];
    if (scenario.team === 'away') {
      for (let index = 0; index < 10 && state.restart; index += 1) {
        restartEvents = stepGame(state, frame(), 0.05);
      }
    } else {
      restartEvents = stepGame(state, frame({ pressed: ['a'] }), 0.05);
      assert.equal(state.restart.queuedAction, 'longKick');
      assert.ok(!restartEvents.some((event) => event.type === 'restartTaken'));
      for (let index = 0; index < 10 && state.restart; index += 1) {
        restartEvents = stepGame(state, frame(), 0.05);
      }
    }
    assert.equal(state.restart, null);
    assert.ok(restartEvents.some((event) => event.type === 'restartTaken' && event.team === scenario.team));
    const keeper = state.players.find((player) => player.id === scenario.keeperId);
    assert.equal(keeper.keeperAction, 'goalKick');
    assert.equal(keeper.motionAction, 'goalKick');
  }
});

test('PvP goal kicks keep the legacy lanes and do not reposition close opponents', () => {
  const state = createInitialGameState();
  const closeOpponent = state.players.find((player) => player.id === 'home-def-1');
  closeOpponent.x = FIELD.width - 70;
  closeOpponent.y = FIELD.height / 2;
  closeOpponent.knockdownSeconds = 5;
  Object.assign(state.ball, {
    ownerId: null,
    x: FIELD.width + BALL_RADIUS + 1,
    y: 400,
    vx: 0,
    vy: 0,
    lastTouchTeam: 'home',
  });

  stepGame(state, { home: frame(), away: frame() }, 0.01, { controlledTeams: ['home', 'away'] });

  const keeper = state.players.find((player) => player.id === 'away-gk');
  const closeDistance = Math.hypot(closeOpponent.x - keeper.x, closeOpponent.y - keeper.y);
  assert.ok(closeDistance < 120);
  const receivers = state.players.filter((player) => player.team === 'away' && player.role !== 'goalkeeper')
    .sort((a, b) => a.role.localeCompare(b.role) || a.id.localeCompare(b.id));
  const laneX = [0.30, 0.40, 0.40];
  const laneY = [FIELD.height / 2, FIELD.height / 2 - FIELD.height * 0.19, FIELD.height / 2 + FIELD.height * 0.19];
  for (const [index, receiver] of receivers.entries()) {
    assert.equal(receiver.aiTarget.x, FIELD.width * laneX[index]);
    assert.equal(receiver.aiTarget.y, laneY[index]);
  }
});

test('a campaign keeper recovering the ball with Vacuum Cleaner prepares the new goal-kick lanes', () => {
  const state = createInitialGameState();
  const keeper = state.players.find((player) => player.id === 'home-gk');
  const closeOpponent = state.players.find((player) => player.id === 'away-def-1');
  Object.assign(closeOpponent, { x: keeper.x, y: keeper.y, vx: 4, vy: -3 });
  state.ball.ownerId = null;
  state.ball.x = keeper.x;
  state.ball.y = keeper.y;
  state.vacuumEffect = {
    playerId: keeper.id,
    startPosition: { x: keeper.x, y: keeper.y },
    durationSeconds: 0.7,
    elapsedSeconds: 0.69,
    remainingSeconds: 0.01,
  };

  stepGame(state, frame(), 0.02);

  assert.equal(state.phase, 'goalKick');
  assert.equal(state.ball.ownerId, keeper.id);
  const receivers = state.players.filter((player) => player.team === 'home' && player.role !== 'goalkeeper')
    .sort((a, b) => a.role.localeCompare(b.role) || a.id.localeCompare(b.id));
  assert.equal(Math.hypot(receivers[0].aiTarget.x - keeper.x, receivers[0].aiTarget.y - keeper.y), 140);
  assert.ok(Math.abs(Math.hypot(receivers[1].aiTarget.x - keeper.x, receivers[1].aiTarget.y - keeper.y) - 250) < 0.01);
  assert.ok(Math.abs(Math.hypot(receivers[2].aiTarget.x - keeper.x, receivers[2].aiTarget.y - keeper.y) - 250) < 0.01);
  assert.ok(Math.hypot(closeOpponent.x - keeper.x, closeOpponent.y - keeper.y) >= 120);
});

test('a goal restarts from the center for the conceding team', () => {
  const state = createInitialGameState();
  Object.assign(state.ball, { ownerId: null, x: FIELD.width - 1, y: 270, vx: 500, vy: 0, flightKind: 'shot', lastTouchTeam: 'home' });

  const events = stepGame(state, frame(), 0.05);

  assert.deepEqual(state.score, { home: 1, away: 0 });
  assert.equal(state.phase, 'goalPause');
  assert.ok(events.some((event) => event.type === 'goal' && event.team === 'home'));
  for (let i = 0; i < 20; i += 1) stepGame(state, frame(), 0.05);
  assert.equal(state.phase, 'playing');
  assert.equal(state.possessionTeam, 'away');
  assert.equal(state.ball.ownerId, 'away-fw');
  assert.deepEqual(state.score, { home: 1, away: 0 });
});

test('a goal kickoff preserves team deck, activation order, caster record, and skill cooldowns', () => {
  const state = createInitialGameState({ teamSkillDeck: [{ skillId: 'eagleShot', level: 2 }] });
  state.skillQueueIndex.home = 1;
  state.skillCooldownRemaining.home.eagleShot = 4;
  state.teamSkillGlobalCooldownRemaining = { home: 2.25, away: 1.25 };
  state.lastSkillCasterByTeam.home = 'home-fw';
  state.phase = 'goalPause';
  state.phaseSeconds = 0.01;
  state.pendingKickoffTeam = 'away';

  stepGame(state, frame(), 0.05);

  assert.deepEqual(state.teamSkillDecks.home, [{ skillId: 'eagleShot', level: 2 }]);
  assert.equal(state.skillQueueIndex.home, 1);
  assert.ok(state.skillCooldownRemaining.home.eagleShot > 3.9 && state.skillCooldownRemaining.home.eagleShot < 4);
  assert.ok(state.teamSkillGlobalCooldownRemaining.home > 2.19 && state.teamSkillGlobalCooldownRemaining.home < 2.21);
  assert.ok(state.teamSkillGlobalCooldownRemaining.away > 1.19 && state.teamSkillGlobalCooldownRemaining.away < 1.21);
  assert.equal(state.lastSkillCasterByTeam.home, 'home-fw');
  assert.deepEqual(state.skillEffects, []);
});

test('touchline exits stop at the correct spot for a throw-in to the team that did not touch last', () => {
  const cases = [
    { y: -BALL_RADIUS - 1, lastTouchTeam: 'home', restartTeam: 'away', restartY: 8 },
    { y: FIELD.height + BALL_RADIUS + 1, lastTouchTeam: 'away', restartTeam: 'home', restartY: FIELD.height - 8 },
  ];

  for (const scenario of cases) {
    const state = createInitialGameState({ stage: 2 });
    state.remainingSeconds = 37;
    state.score = { home: 2, away: 1 };
    Object.assign(state.ball, {
      ownerId: null,
      x: 420,
      y: scenario.y,
      vx: 0,
      vy: 0,
      lastTouchTeam: scenario.lastTouchTeam,
    });

    const events = stepGame(state, frame(), 0.01);
    const restart = events.find((event) => event.type === 'throwIn');
    const thrower = state.players.find((player) => player.id === restart?.playerId);

    assert.equal(restart?.team, scenario.restartTeam);
    assert.ok(thrower);
    assert.equal(thrower.x, 420);
    assert.equal(state.phase, 'throwIn');
    assert.deepEqual(state.restart.spot, { x: 420, y: scenario.y < 0 ? 0 : FIELD.height });
    assert.equal(thrower.y, scenario.restartY);
    assert.deepEqual(state.score, { home: 2, away: 1 });
    assert.equal(state.stage, 2);
    assert.ok(state.remainingSeconds < 37 && state.remainingSeconds > 36.9);
  }
});

test('goal-line exits award goal kicks or corners based on the last touch', () => {
  const cases = [
    { x: FIELD.width + BALL_RADIUS + 1, y: 400, lastTouchTeam: 'home', restart: 'goalKick', team: 'away', keeper: 'away-gk' },
    { x: -BALL_RADIUS - 1, y: 100, lastTouchTeam: 'away', restart: 'goalKick', team: 'home', keeper: 'home-gk' },
    { x: FIELD.width + BALL_RADIUS + 1, y: FIELD.goalTop - 20, lastTouchTeam: 'away', restart: 'cornerKick', team: 'home' },
    { x: -BALL_RADIUS - 1, y: FIELD.goalBottom + 20, lastTouchTeam: 'home', restart: 'cornerKick', team: 'away' },
  ];

  for (const scenario of cases) {
    const state = createInitialGameState({ stage: 3 });
    state.remainingSeconds = 29;
    state.score = { home: 1, away: 2 };
    Object.assign(state.ball, {
      ownerId: null,
      x: scenario.x,
      y: scenario.y,
      vx: 0,
      vy: 0,
      lastTouchTeam: scenario.lastTouchTeam,
    });

    const events = stepGame(state, frame(), 0.01);
    const restart = events.find((event) => event.type === scenario.restart);

    assert.equal(restart?.team, scenario.team);
    if (scenario.keeper) {
      assert.equal(state.phase, 'goalKick');
      assert.equal(state.ball.ownerId, scenario.keeper);
      assert.equal(restart.playerId, scenario.keeper);
    } else {
      assert.equal(state.phase, 'cornerKick');
      assert.ok(restart.playerId.startsWith(`${scenario.team}-`));
      assert.equal(state.restart.type, 'cornerKick');
      const cornerPlayer = state.players.find((player) => player.id === restart.playerId);
      assert.equal(cornerPlayer.x, scenario.x < 0 ? 18 : FIELD.width - 18);
      assert.equal(cornerPlayer.y, scenario.y > FIELD.height / 2 ? FIELD.height - 18 : 18);
    }
    assert.deepEqual(state.score, { home: 1, away: 2 });
    assert.equal(state.stage, 3);
    assert.ok(state.remainingSeconds < 29 && state.remainingSeconds > 28.9);
  }
});

test('a missing last-touch team uses the home-team restart fallback', () => {
  const state = createInitialGameState();
  Object.assign(state.ball, {
    ownerId: null,
    x: FIELD.width + BALL_RADIUS + 1,
    y: 400,
    vx: 0,
    vy: 0,
    lastTouchTeam: null,
  });

  const events = stepGame(state, frame(), 0.01);

  assert.ok(events.some((event) => event.type === 'cornerKick' && event.team === 'home'));
});

test('home restart actions pressed during setup execute once the restart is ready', () => {
  const cases = [
    { type: 'throwIn', playerId: 'home-def-1', key: 's', action: 'throwIn' },
    { type: 'cornerKick', playerId: 'home-def-1', key: 'a', action: 'cornerCross' },
    { type: 'goalKick', playerId: 'home-gk', key: 'a', action: 'longKick' },
    { type: 'goalKick', playerId: 'home-gk', key: 's', action: 'shortPass' },
  ];

  for (const scenario of cases) {
    const state = createInitialGameState();
    const taker = state.players.find((player) => player.id === scenario.playerId);
    state.phase = scenario.type;
    state.restart = {
      type: scenario.type,
      team: 'home',
      takerId: taker.id,
      spot: { x: taker.x, y: taker.y },
      readySeconds: 0.35,
      previousControlledPlayerId: 'home-fw',
    };
    state.controlledPlayerId = taker.id;
    state.ball.ownerId = taker.id;
    state.ball.x = taker.x;
    state.ball.y = taker.y;

    const earlyEvents = stepGame(state, frame({ pressed: [scenario.key] }), 0.05);
    assert.equal(state.restart.queuedAction, scenario.action);
    assert.equal(state.phase, scenario.type);
    assert.equal(earlyEvents.some((event) => event.type === 'restartTaken'), false);

    let readyEvents = [];
    for (let i = 0; i < 10 && state.restart; i += 1) {
      readyEvents = stepGame(state, frame(), 0.05);
    }
    assert.equal(state.restart, null);
    assert.ok(readyEvents.some((event) => event.type === 'restartTaken' && event.restartType === scenario.type));
    if (scenario.type === 'goalKick') {
      const keeper = state.players.find((player) => player.id === scenario.playerId);
      assert.equal(keeper.keeperAction, 'goalKick');
      assert.equal(keeper.motionAction, 'goalKick');
      assert.equal(state.ball.flightKind, scenario.action === 'shortPass' ? 'ground' : 'lob');
      for (let index = 0; index < 11; index += 1) stepGame(state, frame(), 0.05);
      assert.equal(keeper.keeperAction, 'idle');
      assert.equal(keeper.motionAction, 'idle');
    }
  }
});

test('restart input buffer ignores invalid keys and preserves the first valid action', () => {
  const state = createInitialGameState();
  const taker = state.players.find((player) => player.id === 'home-def-1');
  state.phase = 'cornerKick';
  state.restart = {
    type: 'cornerKick',
    team: 'home',
    takerId: taker.id,
    spot: { x: taker.x, y: taker.y },
    readySeconds: 0.35,
  };
  state.controlledPlayerId = taker.id;
  state.ball.ownerId = taker.id;
  state.ball.x = taker.x;
  state.ball.y = taker.y;

  stepGame(state, frame({ pressed: ['d'] }), 0.05);
  assert.equal(state.restart.queuedAction, undefined);
  stepGame(state, frame({ pressed: ['a'] }), 0.05);
  stepGame(state, frame({ pressed: ['s'] }), 0.05);
  let events = [];
  for (let i = 0; i < 10 && state.restart; i += 1) {
    events = stepGame(state, frame(), 0.05);
  }

  assert.ok(events.some((event) => event.type === 'pass' && event.action === 'cornerCross'));
  assert.equal(state.restart, null);
});

test('away restarts remain automatic after their setup delay', () => {
  const state = createInitialGameState();
  const taker = state.players.find((player) => player.id === 'away-def-1');
  state.phase = 'throwIn';
  state.restart = {
    type: 'throwIn',
    team: 'away',
    takerId: taker.id,
    spot: { x: taker.x, y: taker.y },
    readySeconds: 0.35,
  };
  state.ball.ownerId = taker.id;
  state.ball.x = taker.x;
  state.ball.y = taker.y;

  stepGame(state, frame(), 0.05);
  let events = [];
  for (let i = 0; i < 10 && state.restart; i += 1) {
    events = stepGame(state, frame(), 0.05);
  }

  assert.equal(state.restart, null);
  assert.ok(events.some((event) => event.type === 'restartTaken' && event.team === 'away'));
});

test('a golden-goal score immediately finishes the stage', () => {
  const state = createInitialGameState();
  state.phase = 'overtime';
  Object.assign(state.ball, { ownerId: null, x: FIELD.width + 8, y: 270, vx: 100, vy: 0, flightKind: 'shot', lastTouchTeam: 'home' });

  const events = stepGame(state, frame(), 0.05);

  assert.equal(state.phase, 'finished');
  assert.deepEqual(state.score, { home: 1, away: 0 });
  assert.ok(events.some((event) => event.type === 'matchWon'));
});

test('a tied regulation timer enters golden-goal overtime; a leader wins on time', () => {
  const tied = createInitialGameState();
  tied.remainingSeconds = 0.02;
  const overtimeEvents = stepGame(tied, frame(), 0.2);
  assert.equal(tied.phase, 'overtime');
  assert.equal(tied.remainingSeconds, 0);
  assert.equal(tied.overtimeRemainingSeconds, 30);
  assert.ok(overtimeEvents.some((event) => event.type === 'overtime'));

  const leading = createInitialGameState();
  leading.remainingSeconds = 0.02;
  leading.score.home = 1;
  const result = stepGame(leading, frame(), 0.2);
  assert.equal(leading.phase, 'finished');
  assert.ok(result.some((event) => event.type === 'matchWon'));

  const trailing = createInitialGameState();
  trailing.remainingSeconds = 0.02;
  trailing.score.away = 1;
  const loss = stepGame(trailing, frame(), 0.2);
  assert.equal(trailing.phase, 'finished');
  assert.ok(loss.some((event) => event.type === 'matchLost'
    && event.score.home === 0 && event.score.away === 1));
});

test('the active match clock runs during kickoff, goal-kick and set-piece delays', () => {
  for (const phase of ['goalPause', 'goalKick', 'freeKick', 'penaltyKick']) {
    const state = createInitialGameState();
    state.phase = phase;
    state.phaseSeconds = 1;
    state.remainingSeconds = 10;

    stepGame(state, frame(), 0.05);

    assert.equal(state.remainingSeconds, 9.95, `${phase} should consume regulation time`);
  }

  const overtime = createInitialGameState();
  overtime.phase = 'freeKick';
  overtime.phaseSeconds = 1;
  overtime.overtimeRemainingSeconds = 10;
  stepGame(overtime, frame(), 0.05);
  assert.equal(overtime.remainingSeconds, 60);
  assert.equal(overtime.overtimeRemainingSeconds, 9.95);
});

test('regulation expiry during a restart starts overtime without consuming it twice', () => {
  const state = createInitialGameState();
  state.phase = 'goalPause';
  state.phaseSeconds = 0.5;
  state.remainingSeconds = 0.01;

  const events = stepGame(state, frame(), 0.05);

  assert.ok(events.some((event) => event.type === 'overtime'));
  assert.equal(state.phase, 'goalPause');
  assert.equal(state.overtimeRemainingSeconds, 30);
  assert.equal(state.phaseSeconds, 0.45);
});

test('a tied golden-goal expiry emits one draw event and finishes the match', () => {
  const state = createInitialGameState();
  state.phase = 'overtime';
  state.remainingSeconds = 0;
  state.overtimeRemainingSeconds = 0.02;

  const events = stepGame(state, frame(), 0.02);

  assert.equal(state.phase, 'finished');
  assert.equal(state.overtimeRemainingSeconds, 0);
  assert.deepEqual(events, [{ type: 'matchDraw', score: { home: 0, away: 0 } }]);
});

test('the defensive A action can win possession with a short slide tackle', () => {
  const state = createInitialGameState();
  const defender = state.players.find((player) => player.id === 'home-fw');
  const opponent = state.players.find((player) => player.id === 'away-fw');
  defender.x = 470;
  opponent.x = 480;
  opponent.y = defender.y;
  state.ball.ownerId = opponent.id;
  state.ball.x = opponent.x;
  state.ball.y = opponent.y;
  state.possessionTeam = 'away';

  const events = stepGame(state, frame({ pressed: ['a'] }), 0.01);

  assert.equal(state.ball.ownerId, defender.id);
  assert.equal(state.possessionTeam, 'home');
  assert.ok(events.some((event) => event.type === 'tackle'));
  assert.equal(defender.motionAction, 'tackle');
  assert.ok(defender.motionTimerSeconds > 0);
  assert.equal(opponent.knockdownSeconds, 1);
  assert.equal(opponent.motionAction, 'knockdown');
  const knockdown = events.find((event) => event.type === 'playerKnockedDown');
  assert.equal(knockdown.playerId, opponent.id);
  assert.ok(knockdown.direction.x > 0);
});

test('the controlled defender automatically tackles an opponent carrier after closing within range', () => {
  const state = createInitialGameState();
  const defender = state.players.find((player) => player.id === 'home-fw');
  const opponent = state.players.find((player) => player.id === 'away-fw');
  Object.assign(defender, { x: 400, y: 270 });
  Object.assign(opponent, { x: 440, y: 270 });
  state.controlledPlayerId = defender.id;
  state.ball.ownerId = opponent.id;
  state.ball.x = opponent.x;
  state.ball.y = opponent.y;
  state.possessionTeam = 'away';
  state.aiShotCooldownSeconds = 10;
  state.aiControlledCarrierId = opponent.id;

  const events = stepGame(state, frame({ moveX: 1 }), 0.12);

  assert.ok(events.some((event) => event.type === 'tackle' && event.playerId === defender.id));
  assert.equal(state.ball.ownerId, defender.id);
  assert.equal(defender.motionAction, 'tackle');
  assert.equal(defender.aiTackleCooldownSeconds, 1.35);
});

test('automatic close-range tackles respect range, cooldown, and player recovery states', () => {
  const scenarios = [
    { name: 'outside range', distance: 40 },
    { name: 'cooldown', distance: 20, cooldown: 1 },
    { name: 'stunned', distance: 20, stunnedSeconds: 1 },
    { name: 'knocked down', distance: 20, knockdownSeconds: 1 },
    { name: 'recovering', distance: 20, motionAction: 'recover' },
  ];

  for (const scenario of scenarios) {
    const state = createInitialGameState();
    const defender = state.players.find((player) => player.id === 'home-fw');
    const opponent = state.players.find((player) => player.id === 'away-fw');
    Object.assign(defender, {
      x: 500,
      y: 270,
      aiTackleCooldownSeconds: scenario.cooldown ?? 0,
      stunnedSeconds: scenario.stunnedSeconds ?? 0,
      knockdownSeconds: scenario.knockdownSeconds ?? 0,
      motionAction: scenario.motionAction ?? 'idle',
    });
    Object.assign(opponent, { x: 500 + scenario.distance, y: 270, stunnedSeconds: 1 });
    state.controlledPlayerId = defender.id;
    state.ball.ownerId = opponent.id;
    state.ball.x = opponent.x;
    state.ball.y = opponent.y;
    state.possessionTeam = 'away';
    state.aiControlledCarrierId = opponent.id;

    const events = stepGame(state, frame(), 0.01);

    assert.ok(!events.some((event) => event.type === 'tackle' && event.playerId === defender.id), scenario.name);
    assert.equal(defender.aiTackleCooldownSeconds, Math.max(0, (scenario.cooldown ?? 0) - 0.01), scenario.name);
  }
});

test('AI tackles knock down a contacted home field player too', () => {
  const state = createInitialGameState();
  const carrier = state.players.find((player) => player.id === 'home-fw');
  const defender = state.players.find((player) => player.id === 'away-def-1');
  carrier.x = 350; carrier.y = 270; carrier.facingX = -1;
  defender.x = 330; defender.y = 270;
  state.ball.ownerId = carrier.id;
  state.ball.x = 333; state.ball.y = 270;
  state.possessionTeam = 'home';

  const events = stepGame(state, frame(), 0.01);

  assert.equal(state.ball.ownerId, defender.id);
  assert.equal(carrier.knockdownSeconds, 1);
  assert.ok(events.some((event) => event.type === 'playerKnockedDown' && event.team === 'home'));
});

test('away Eulryongta drops its home carrier and a nearby teammate collects the ball', () => {
  const state = createInitialGameState({ opponentSkillDeck: [{ skillId: 'eulryongta', level: 1 }] });
  const carrier = state.players.find((player) => player.id === 'home-fw');
  const teammate = state.players.find((player) => player.id === 'home-def-1');
  const caster = state.players.find((player) => player.id === 'away-fw');
  Object.assign(carrier, { x: 500, y: 270 });
  Object.assign(teammate, { x: 490, y: 280 });
  Object.assign(caster, { x: 600, y: 270, facingX: -1, facingY: 0 });
  state.ball.ownerId = carrier.id;
  state.ball.x = carrier.x;
  state.ball.y = carrier.y;
  state.possessionTeam = 'home';

  const events = stepGame(state, frame(), 0.01);

  assert.ok(events.some((event) => event.type === 'playerKnockedDown' && event.playerId === carrier.id));
  assert.equal(carrier.knockdownSeconds, 5);
  assert.equal(state.controlledPlayerId, teammate.id);
  assert.equal(state.ball.ownerId, teammate.id, 'the eligible teammate recovers the dropped ball');
  assert.equal(state.possessionTeam, 'home');
});

test('Eulryongta switches control to the nearest eligible field player in either possession state', () => {
  for (const possessionTeam of ['home', 'away']) {
    const state = createInitialGameState({ opponentSkillDeck: [{ skillId: 'eulryongta', level: 1 }] });
    const controlled = state.players.find((player) => player.id === 'home-fw');
    const defender = state.players.find((player) => player.id === 'home-def-1');
    const midfielder = state.players.find((player) => player.id === 'home-mid-1');
    const awayCarrier = state.players.find((player) => player.id === 'away-fw');
    Object.assign(controlled, { x: possessionTeam === 'home' ? 500 : 350, y: 270 });
    Object.assign(awayCarrier, { x: possessionTeam === 'home' ? 600 : 400, y: 270, facingX: -1, facingY: 0 });
    if (possessionTeam === 'home') {
      Object.assign(midfielder, { x: 300, y: 270 });
      Object.assign(defender, { x: 310, y: 270 });
      state.ball.ownerId = midfielder.id;
      state.ball.x = midfielder.x + 10;
      state.ball.y = midfielder.y;
      state.possessionTeam = 'home';
    } else {
      Object.assign(defender, { x: 410, y: 260 });
      Object.assign(midfielder, { x: 410, y: 280 });
      state.ball.ownerId = awayCarrier.id;
      state.ball.x = awayCarrier.x;
      state.ball.y = awayCarrier.y;
      state.possessionTeam = 'away';
      state.aiControlledCarrierId = awayCarrier.id;
    }

    const events = stepGame(state, frame(), 0.01);

    assert.ok(events.some((event) => event.type === 'playerKnockedDown' && event.playerId === controlled.id),
      `controlled player is hit while ${possessionTeam} has possession`);
    assert.equal(state.controlledPlayerId, defender.id,
      `nearest eligible field player is selected while ${possessionTeam} has possession`);
    assert.equal(state.possessionTeam, possessionTeam,
      'a different carrier keeps possession when the controlled player is hit');
  }
});

test('Eulryongta handoff skips the goalkeeper and incapacitated teammates and breaks distance ties by id', () => {
  const state = createInitialGameState({ opponentSkillDeck: [{ skillId: 'eulryongta', level: 1 }] });
  const controlled = state.players.find((player) => player.id === 'home-fw');
  const defender = state.players.find((player) => player.id === 'home-def-1');
  const midfielder = state.players.find((player) => player.id === 'home-mid-1');
  const goalkeeper = state.players.find((player) => player.id === 'home-gk');
  const awayCarrier = state.players.find((player) => player.id === 'away-fw');
  Object.assign(controlled, { x: 350, y: 270 });
  Object.assign(awayCarrier, { x: 400, y: 270, facingX: -1, facingY: 0 });
  Object.assign(defender, { x: 410, y: 260 });
  Object.assign(midfielder, { x: 410, y: 280 });
  Object.assign(goalkeeper, { x: 405, y: 270 });
  state.ball.ownerId = awayCarrier.id;
  state.ball.x = awayCarrier.x;
  state.ball.y = awayCarrier.y;
  state.possessionTeam = 'away';
  state.aiControlledCarrierId = awayCarrier.id;

  stepGame(state, frame(), 0.01);

  assert.equal(controlled.knockdownSeconds, 5);
  assert.equal(state.controlledPlayerId, defender.id, 'home-def-1 wins an equal-distance tie by id');

  const noEligible = createInitialGameState({ opponentSkillDeck: [{ skillId: 'eulryongta', level: 1 }] });
  const hitPlayer = noEligible.players.find((player) => player.id === 'home-fw');
  const disabledDefender = noEligible.players.find((player) => player.id === 'home-def-1');
  const recoveringMidfielder = noEligible.players.find((player) => player.id === 'home-mid-1');
  const keeper = noEligible.players.find((player) => player.id === 'home-gk');
  const carrier = noEligible.players.find((player) => player.id === 'away-fw');
  Object.assign(hitPlayer, { x: 350, y: 270 });
  Object.assign(carrier, { x: 400, y: 270, facingX: -1, facingY: 0 });
  Object.assign(disabledDefender, { x: 401, y: 270, knockdownSeconds: 1, motionAction: 'knockdown' });
  Object.assign(recoveringMidfielder, { x: 420, y: 280, knockdownSeconds: 0.005, motionAction: 'knockdown' });
  Object.assign(keeper, { x: 405, y: 270 });
  noEligible.ball.ownerId = carrier.id;
  noEligible.ball.x = carrier.x;
  noEligible.ball.y = carrier.y;
  noEligible.possessionTeam = 'away';
  noEligible.aiControlledCarrierId = carrier.id;

  stepGame(noEligible, frame(), 0.01);

  assert.equal(hitPlayer.knockdownSeconds, 5);
  assert.equal(noEligible.controlledPlayerId, null, 'the goalkeeper is not used when all field players are unavailable');
});

test('knockdown freezes direct input and AI movement until the one-second recovery completes', () => {
  const state = createInitialGameState();
  const controlled = state.players.find((player) => player.id === state.controlledPlayerId);
  const aiCarrier = state.players.find((player) => player.id === 'away-fw');
  controlled.knockdownSeconds = 0.1;
  controlled.motionAction = 'knockdown';
  controlled.knockdownDirectionX = -1;
  aiCarrier.knockdownSeconds = 0.1;
  aiCarrier.motionAction = 'knockdown';
  state.ball.ownerId = aiCarrier.id;
  state.ball.x = aiCarrier.x;
  state.ball.y = aiCarrier.y;
  state.possessionTeam = 'away';
  state.aiControlledCarrierId = aiCarrier.id;
  const controlledStart = { x: controlled.x, y: controlled.y };
  const aiStart = { x: aiCarrier.x, y: aiCarrier.y };

  stepGame(state, frame({ moveX: 1, pressed: ['f', 'd', 's'] }), 0.05);
  assert.deepEqual({ x: controlled.x, y: controlled.y }, controlledStart);
  assert.deepEqual({ x: aiCarrier.x, y: aiCarrier.y }, aiStart);
  assert.equal(controlled.motionAction, 'knockdown');
  assert.equal(controlled.knockdownSeconds, 0.05);
  assert.equal(state.controlledPlayerId, controlled.id);

  stepGame(state, frame({ moveX: 1 }), 0.05);
  assert.deepEqual({ x: controlled.x, y: controlled.y }, controlledStart);
  assert.equal(controlled.motionAction, 'recover');
  assert.equal(controlled.knockdownSeconds, 0);
  assert.notEqual(controlled.knockdownDirectionX, 0);

  stepGame(state, frame({ moveX: 1 }), 0.05);
  assert.ok(controlled.x > controlledStart.x);
  assert.equal(controlled.motionAction, 'run');
  assert.equal(controlled.knockdownDirectionX, 0);
});

test('knockdown timer respects the simulation delta clamp', () => {
  const state = createInitialGameState();
  const player = state.players.find((candidate) => candidate.id === 'home-fw');
  player.knockdownSeconds = 1;
  player.motionAction = 'knockdown';

  stepGame(state, frame(), 5);

  assert.equal(player.knockdownSeconds, 0.95);
});

test('a rear slide tackle steals the ball without issuing a card or stopping play', () => {
  const state = createInitialGameState();
  const tackler = state.players.find((player) => player.id === 'home-fw');
  const ballCarrier = state.players.find((player) => player.id === 'away-fw');
  tackler.x = 514;
  tackler.y = 270;
  ballCarrier.x = 500;
  ballCarrier.y = 270;
  ballCarrier.knockdownSeconds = 0;
  ballCarrier.motionAction = 'idle';
  ballCarrier.facingX = -1;
  state.controlledPlayerId = tackler.id;
  state.possessionTeam = 'away';
  state.ball.ownerId = ballCarrier.id;
  state.ball.x = 483;
  state.ball.y = 270;

  const first = stepGame(state, frame({ pressed: ['a'] }), 0.01);
  assert.ok(first.some((event) => event.type === 'tackle'));
  assert.ok(first.some((event) => event.type === 'playerKnockedDown'));
  assert.ok(!first.some((event) => ['foul', 'yellowCard', 'redCard', 'playerDismissed', 'freeKick', 'penaltyKick'].includes(event.type)));
  assert.equal(state.ball.ownerId, tackler.id);
  assert.equal(state.possessionTeam, 'home');
  assert.equal(state.phase, 'playing');
  assert.equal(tackler.dismissed, false);
});

test('an ordinary tackle steals the ball inside the penalty area without a card or penalty restart', () => {
  const state = createInitialGameState();
  const tackler = state.players.find((player) => player.id === 'home-fw');
  const ballCarrier = state.players.find((player) => player.id === 'away-fw');
  tackler.x = 114;
  tackler.y = 270;
  ballCarrier.x = 100;
  ballCarrier.y = 270;
  ballCarrier.facingX = -1;
  state.controlledPlayerId = tackler.id;
  state.possessionTeam = 'away';
  state.ball.ownerId = ballCarrier.id;
  state.ball.x = 83;
  state.ball.y = 270;

  const tackleEvents = stepGame(state, frame({ pressed: ['a'] }), 0.01);
  assert.ok(tackleEvents.some((event) => event.type === 'tackle'));
  assert.ok(!tackleEvents.some((event) => ['foul', 'yellowCard', 'redCard', 'playerDismissed', 'penaltyKick'].includes(event.type)));
  assert.equal(state.ball.ownerId, tackler.id);
  assert.equal(state.possessionTeam, 'home');
  assert.equal(state.phase, 'playing');
  assert.equal(tackler.dismissed, false);
});

test('away defenders can steal the ball without cards and dismissed keepers cannot catch shots', () => {
  const state = createInitialGameState();
  const attacker = state.players.find((player) => player.id === 'home-fw');
  attacker.x = 420;
  attacker.y = 270;
  attacker.facingX = 1;
  state.ball.ownerId = attacker.id;
  state.ball.x = 437;
  state.ball.y = 270;
  state.possessionTeam = 'home';
  state.players.filter((player) => player.team === 'away').forEach((player, index) => {
    player.x = 20 + index * 45;
    player.y = 20;
  });
  const defender = state.players.find((player) => player.id === 'away-def-1');
  defender.x = 398;
  defender.y = 270;

  const tackleEvents = stepGame(state, frame(), 0.01);
  assert.ok(tackleEvents.some((event) => event.type === 'tackle' && event.team === 'away'));
  assert.ok(!tackleEvents.some((event) => ['foul', 'yellowCard', 'redCard', 'playerDismissed'].includes(event.type)));
  assert.equal(state.ball.ownerId, defender.id);
  assert.equal(state.possessionTeam, 'away');

  const keeperState = createInitialGameState();
  const keeper = keeperState.players.find((player) => player.id === 'home-gk');
  keeper.dismissed = true;
  Object.assign(keeperState.ball, { ownerId: null, x: 55, y: 270, vx: -30, vy: 0, flightKind: 'shot', lastTouchTeam: 'away' });
  const keeperEvents = stepGame(keeperState, frame(), 0.01);
  assert.ok(!keeperEvents.some((event) => event.type === 'keeperCatch'));
  assert.equal(keeperState.phase, 'playing');

  keeperState.phase = 'playing';
  keeperState.possessionTeam = 'away';
  keeperState.ball.ownerId = 'away-fw';
  keeperState.controlledPlayerId = keeper.id;
  keeperState.players.filter((player) => player.team === 'home' && player.id !== 'home-def-1')
    .forEach((player) => { player.dismissed = true; });
  stepGame(keeperState, frame({ pressed: ['s'] }), 0.01);
  assert.equal(keeperState.controlledPlayerId, 'home-def-1');
  assert.equal(keeperState.players.filter((player) => player.team === 'home' && !player.dismissed).length, 1);
});

test('defensive S switches through the four home players, including the goalkeeper', () => {
  const state = createInitialGameState();
  state.possessionTeam = 'away';
  state.ball.ownerId = 'away-fw';

  stepGame(state, frame({ pressed: ['s'] }), 0.01);

  assert.equal(state.controlledPlayerId, 'home-gk');
});

test('away possession selects the nearest eligible defender once and preserves manual S selection', () => {
  const state = createInitialGameState();
  const carrier = state.players.find((player) => player.id === 'away-fw');
  Object.assign(carrier, { x: 850, y: 270 });
  state.ball.ownerId = carrier.id;
  state.ball.x = carrier.x;
  state.ball.y = carrier.y;
  state.possessionTeam = 'away';
  Object.assign(state.players.find((player) => player.id === 'home-def-1'), {
    x: 800, y: 270, knockdownSeconds: 1, motionAction: 'knockdown',
  });
  Object.assign(state.players.find((player) => player.id === 'home-mid-1'), { x: 700, y: 270 });
  Object.assign(state.players.find((player) => player.id === 'home-fw'), { x: 300, y: 270 });

  stepGame(state, frame(), 0.01);
  assert.equal(state.controlledPlayerId, 'home-mid-1');

  stepGame(state, frame({ pressed: ['s'] }), 0.01);
  assert.equal(state.controlledPlayerId, 'home-fw');
  stepGame(state, frame(), 0.01);
  assert.equal(state.controlledPlayerId, 'home-fw');

  const nextCarrier = state.players.find((player) => player.id === 'away-mid-1');
  Object.assign(nextCarrier, { x: 280, y: 270 });
  state.ball.ownerId = nextCarrier.id;
  state.ball.x = nextCarrier.x;
  state.ball.y = nextCarrier.y;
  stepGame(state, frame(), 0.01);
  assert.equal(state.controlledPlayerId, 'home-fw');
});

test('keeper tracks the goal mouth, steps out for a clear close one-on-one, then recovers', () => {
  const state = createInitialGameState();
  const keeper = state.players.find((player) => player.id === 'home-gk');
  const carrier = state.players.find((player) => player.id === 'away-fw');
  Object.assign(carrier, { x: 140, y: 300 });
  for (const player of state.players.filter((candidate) => candidate.team === 'home' && candidate.role !== 'goalkeeper')) {
    Object.assign(player, { x: 420, y: 450 });
  }
  state.ball.ownerId = carrier.id;
  state.ball.x = carrier.x;
  state.ball.y = carrier.y;
  state.possessionTeam = 'away';
  state.aiShotCooldownSeconds = 100;

  stepGame(state, frame(), 0.05);
  assert.equal(keeper.aiTarget.x, 112);
  assert.equal(keeper.aiTarget.y, 300);
  assert.ok(keeper.x > 55 && keeper.x <= 180);

  const blocker = state.players.find((player) => player.id === 'home-mid-1');
  Object.assign(blocker, { x: 70, y: 300 });
  stepGame(state, frame(), 0.05);
  assert.equal(keeper.aiTarget.x, 48);

  Object.assign(carrier, { x: 420, y: 300 });
  state.ball.x = carrier.x;
  stepGame(state, frame(), 0.05);
  assert.equal(keeper.aiTarget.x, 48);
  assert.ok(keeper.x < 60);

  Object.assign(carrier, { x: 500, y: 0 });
  state.ball.x = carrier.x;
  state.ball.y = carrier.y;
  stepGame(state, frame(), 0.05);
  assert.equal(keeper.aiTarget.y, FIELD.goalTop + 14);

  Object.assign(carrier, { x: 500, y: FIELD.height });
  state.ball.x = carrier.x;
  state.ball.y = carrier.y;
  stepGame(state, frame(), 0.05);
  assert.equal(keeper.aiTarget.y, FIELD.goalBottom - 14);
});

test('defensive D pressure moves the selected player toward the opponent carrier', () => {
  const state = createInitialGameState();
  const controlled = state.players.find((player) => player.id === 'home-fw');
  const opponent = state.players.find((player) => player.id === 'away-fw');
  controlled.x = 200;
  controlled.y = opponent.y;
  opponent.x = 700;
  state.possessionTeam = 'away';
  state.ball.ownerId = opponent.id;
  state.aiControlledCarrierId = opponent.id;

  stepGame(state, frame({ down: ['d'] }), 0.05);

  assert.ok(controlled.x > 200);
});

test('the away AI advances toward the home goal and takes a shot in range', () => {
  const state = createInitialGameState();
  const opponent = state.players.find((player) => player.id === 'away-fw');
  state.players.find((player) => player.id === 'home-gk').dismissed = true;
  opponent.x = 100;
  opponent.y = FIELD.height / 2 - 40;
  state.ball.ownerId = opponent.id;
  state.ball.x = opponent.x;
  state.ball.y = opponent.y;
  state.possessionTeam = 'away';

  const events = stepGame(state, frame(), 0.05);

  assert.equal(state.ball.ownerId, null);
  assert.equal(state.ball.flightKind, 'shot');
  assert.ok(state.ball.vx < 0);
  assert.ok(events.some((event) => event.type === 'shot' && event.team === 'away'));
});

test('the away AI chooses an open ground pass to a forward teammate', () => {
  const state = createInitialGameState({ stage: 2 });
  const carrier = state.players.find((player) => player.id === 'away-fw');
  Object.assign(carrier, { x: 800, y: 270, facingX: -1, facingY: 0 });
  Object.assign(state.ball, { ownerId: carrier.id, x: carrier.x, y: carrier.y });
  state.possessionTeam = 'away';
  for (const player of state.players.filter((candidate) => candidate.team === 'away' && candidate.id !== carrier.id && candidate.role !== 'goalkeeper')) {
    player.aiTarget = { x: player.x, y: player.y };
    player.aiRetargetSeconds = 10;
  }
  for (const player of state.players.filter((candidate) => candidate.team === 'home' && candidate.role !== 'goalkeeper')) {
    Object.assign(player, { x: 180, y: player.id === 'home-def-1' ? 20 : 500 });
  }

  const events = stepGame(state, frame(), 0.05);

  assert.equal(state.ball.ownerId, null);
  assert.equal(state.ball.flightKind, 'ground');
  assert.ok(state.ball.passTarget);
  assert.ok(events.some((event) => event.type === 'pass' && event.team === 'away' && event.action === 'groundPass'));
});

test('the away AI chooses a cross when a defender closes its only ground lane', () => {
  const state = createInitialGameState({ stage: 2 });
  const carrier = state.players.find((player) => player.id === 'away-fw');
  const receiver = state.players.find((player) => player.id === 'away-mid-1');
  Object.assign(carrier, { x: 800, y: 270, facingX: -1, facingY: 0 });
  Object.assign(receiver, { x: 650, y: 100 });
  receiver.aiTarget = { x: receiver.x, y: receiver.y };
  receiver.aiRetargetSeconds = 10;
  state.players.find((player) => player.id === 'away-def-1').dismissed = true;
  Object.assign(state.ball, { ownerId: carrier.id, x: carrier.x, y: carrier.y });
  state.possessionTeam = 'away';
  const blocker = state.players.find((player) => player.id === 'home-fw');
  Object.assign(blocker, { x: 730, y: 210 });
  for (const player of state.players.filter((candidate) => candidate.team === 'home' && candidate.id !== blocker.id && candidate.role !== 'goalkeeper')) {
    Object.assign(player, { x: 180, y: player.id === 'home-def-1' ? 20 : 500 });
  }

  const events = stepGame(state, frame(), 0.05);

  assert.equal(state.ball.flightKind, 'cross');
  assert.ok(events.some((event) => event.type === 'pass' && event.team === 'away' && event.action === 'lobPass'));
});

test('the away AI dribbles toward goal when no field receiver is available', () => {
  const state = createInitialGameState({ stage: 1 });
  const carrier = state.players.find((player) => player.id === 'away-fw');
  const startX = carrier.x = 800;
  state.players.find((player) => player.id === 'away-def-1').dismissed = true;
  state.players.find((player) => player.id === 'away-mid-1').dismissed = true;
  Object.assign(state.ball, { ownerId: carrier.id, x: carrier.x, y: carrier.y });
  state.possessionTeam = 'away';

  const events = stepGame(state, frame(), 0.05);

  assert.ok(carrier.x < startX);
  assert.equal(state.ball.ownerId, carrier.id);
  assert.ok(!events.some((event) => event.type === 'pass' && event.team === 'away'));
});

test('the away AI keeps dribbling instead of taking an off-target close-range shot', () => {
  const state = createInitialGameState({ stage: 1 });
  const carrier = state.players.find((player) => player.id === 'away-fw');
  Object.assign(carrier, { x: 100, y: 400, facingX: -1, facingY: 0 });
  state.players.find((player) => player.id === 'away-def-1').dismissed = true;
  state.players.find((player) => player.id === 'away-mid-1').dismissed = true;
  Object.assign(state.ball, { ownerId: carrier.id, x: carrier.x, y: carrier.y });
  state.possessionTeam = 'away';

  const events = stepGame(state, frame(), 0.05);

  assert.equal(state.ball.ownerId, carrier.id);
  assert.ok(carrier.x < 100 && carrier.y < 400);
  assert.ok(!events.some((event) => event.type === 'shot' && event.team === 'away'));
});

test('the nearest eligible field player automatically heads a reachable descending ball', () => {
  const state = createInitialGameState();
  const controlled = state.players.find((player) => player.id === 'home-fw');
  const nearest = state.players.find((player) => player.id === 'home-def-1');
  const second = state.players.find((player) => player.id === 'home-mid-1');
  Object.assign(controlled, { x: 100, y: 100 });
  Object.assign(nearest, { x: 495, y: 270 });
  Object.assign(second, { x: 520, y: 270 });
  Object.assign(state.ball, {
    ownerId: null, x: 500, y: 270, vx: 0, vy: 0, height: 50, verticalVelocity: -50,
    flightKind: 'lob', passTeam: 'away',
  });
  state.possessionTeam = 'away';
  state.players.filter((player) => player.team === 'away' && player.role !== 'goalkeeper')
    .forEach((player) => Object.assign(player, { x: 850, y: 500 }));

  const events = stepGame(state, frame(), 0.01);

  assert.ok(events.some((event) => event.type === 'header' && event.playerId === nearest.id));
  assert.ok(!events.some((event) => event.type === 'header' && event.playerId === second.id));
  assert.ok(events.some((event) => event.type === 'passIntercepted' && event.fromTeam === 'away' && event.passKind === 'lob'));
  assert.ok(events.some((event) => event.type === 'possessionChange' && event.team === 'home'));
  assert.equal(state.ball.lastHeaderPlayerId, nearest.id);
  assert.equal(state.controlledPlayerId, nearest.id);
});

test('high aerial balls remain in flight and goalkeepers never head them', () => {
  const state = createInitialGameState();
  const nearest = state.players.find((player) => player.id === 'home-def-1');
  const keeper = state.players.find((player) => player.id === 'away-gk');
  Object.assign(nearest, { x: 500, y: 270 });
  Object.assign(keeper, { x: 500, y: 270 });
  Object.assign(state.ball, { ownerId: null, x: 500, y: 270, height: 160, verticalVelocity: -100, flightKind: 'lob' });
  state.possessionTeam = 'away';
  state.players.filter((player) => player.team === 'away' && player.role !== 'goalkeeper')
    .forEach((player) => Object.assign(player, { x: 900, y: 500 }));

  const highBallEvents = stepGame(state, frame(), 0.01);

  assert.ok(!highBallEvents.some((event) => event.type === 'header'));
  assert.equal(state.ball.flightKind, 'lob');

  Object.assign(state.ball, { x: keeper.x, y: keeper.y, height: 40, verticalVelocity: 0 });
  for (const player of state.players) {
    if (player.role !== 'goalkeeper') Object.assign(player, { x: 900, y: 500 });
  }
  const keeperEvents = stepGame(state, frame(), 0.01);
  assert.ok(!keeperEvents.some((event) => event.type === 'header'));
  assert.notEqual(state.ball.lastHeaderPlayerId, keeper.id);
});

test('no field player contacts an aerial ball outside header reach', () => {
  const state = createInitialGameState();
  for (const player of state.players) {
    Object.assign(player, {
      x: player.team === 'home' ? 30 : FIELD.width - 30,
      y: player.role === 'goalkeeper' ? FIELD.height / 2 : player.team === 'home' ? 25 : FIELD.height - 25,
    });
  }
  Object.assign(state.ball, {
    ownerId: null, x: FIELD.width / 2, y: FIELD.height / 2,
    vx: 0, vy: 0, height: 50, verticalVelocity: -50, flightKind: 'lob',
  });

  stepGame(state, frame(), 0.01);

  assert.equal(state.ball.flightKind, 'lob');
  assert.equal(state.ball.lastHeaderPlayerId, undefined);
});

test('the nearest noncontrolled defender presses while teammates cover separate passing lanes', () => {
  const state = createInitialGameState();
  const carrier = state.players.find((player) => player.id === 'away-fw');
  const presser = state.players.find((player) => player.id === 'home-def-1');
  const coverer = state.players.find((player) => player.id === 'home-mid-1');
  const controlled = state.players.find((player) => player.id === 'home-fw');
  Object.assign(carrier, { x: 700, y: 270 });
  Object.assign(presser, { x: 650, y: 270 });
  Object.assign(coverer, { x: 350, y: 350 });
  Object.assign(controlled, { x: 500, y: 300 });
  state.players.find((player) => player.id === 'away-def-1').dismissed = true;
  state.players.find((player) => player.id === 'away-mid-1').dismissed = true;
  Object.assign(state.ball, { ownerId: carrier.id, x: carrier.x, y: carrier.y });
  state.possessionTeam = 'away';
  state.controlledPlayerId = controlled.id;
  state.aiControlledCarrierId = carrier.id;

  stepGame(state, frame({ moveY: 1 }), 0.05);

  assert.ok(presser.x > 650);
  assert.equal(controlled.y, 308.8);
  assert.ok(coverer.aiTarget);
  assert.notDeepEqual(coverer.aiTarget, { x: carrier.x, y: carrier.y });
});

test('AI difficulty tuning rises steadily from stage one through the boss', () => {
  const tuning = [1, 2, 3, 4, 5].map((stage) => getAiTuning(stage));
  assert.ok(tuning.every((entry, index) => index === 0
    || (entry.teammateSupportRadius > tuning[index - 1].teammateSupportRadius
      && entry.pressingDistance > tuning[index - 1].pressingDistance
      && entry.thinkIntervalSeconds < tuning[index - 1].thinkIntervalSeconds)));
});

test('stage-one tuning increases campaign opponent pressure without changing home or PvP tuning', () => {
  assert.deepEqual(getAiTuning(1), {
    thinkIntervalSeconds: 1,
    teammateSupportRadius: 125,
    pressingDistance: 95,
  });
  assert.deepEqual(getAiTuning(1, { team: 'away' }), {
    thinkIntervalSeconds: 0.94,
    teammateSupportRadius: 125,
    pressingDistance: 104,
  });
  assert.deepEqual(getAiTuning(1, { team: 'home' }), getAiTuning(1));
  assert.deepEqual(getAiTuning(1, { team: 'away', pvpMode: true }), getAiTuning(1));
  for (const stage of [2, 3, 4, 5]) {
    assert.deepEqual(getAiTuning(stage, { team: 'away' }), getAiTuning(stage));
  }

  const homeState = createInitialGameState();
  const homeSupporter = homeState.players.find((player) => player.id === 'home-mid-1');
  homeState.ball.ownerId = 'home-fw';
  homeState.possessionTeam = 'home';
  homeSupporter.aiTarget = null;
  homeSupporter.aiRetargetSeconds = 0;
  stepGame(homeState, frame(), 0.05);
  assert.equal(homeSupporter.aiRetargetSeconds, 1);

  const awayState = createInitialGameState();
  const awaySupporter = awayState.players.find((player) => player.id === 'away-mid-1');
  awayState.ball.ownerId = 'away-fw';
  awayState.possessionTeam = 'away';
  awayState.aiShotCooldownSeconds = 10;
  awaySupporter.aiTarget = null;
  awaySupporter.aiRetargetSeconds = 0;
  stepGame(awayState, frame(), 0.05);
  assert.equal(awaySupporter.aiRetargetSeconds, 0.94);

  const pvpState = createInitialGameState();
  const pvpAwaySupporter = pvpState.players.find((player) => player.id === 'away-mid-1');
  pvpAwaySupporter.aiTarget = null;
  pvpAwaySupporter.aiRetargetSeconds = 0;
  stepGame(pvpState, { home: frame(), away: frame() }, 0.05, { controlledTeams: ['home', 'away'] });
  assert.equal(pvpAwaySupporter.aiRetargetSeconds, 1);
});

test('stage-one campaign opponents press from the adjusted 104-unit distance', () => {
  const state = createInitialGameState();
  const carrier = state.players.find((player) => player.id === 'home-fw');
  const presser = state.players.find((player) => player.id === 'away-def-1');
  Object.assign(carrier, { x: 400, y: 270 });
  Object.assign(presser, { x: 500, y: 270 });
  for (const player of state.players.filter((candidate) => candidate.team === 'away'
      && candidate.role !== 'goalkeeper' && candidate.id !== presser.id)) {
    Object.assign(player, { x: 850, y: 40 });
  }
  state.ball.ownerId = carrier.id;
  state.ball.x = carrier.x;
  state.ball.y = carrier.y;
  state.possessionTeam = 'home';
  state.aiPressingPlayerId = null;
  state.aiObservedCarrierId = null;

  stepGame(state, frame(), 0.05);

  assert.equal(state.aiPressingPlayerId, presser.id);
  assert.ok(presser.x < 500);
});

test('the stage-five boss presses from farther away than a regular opponent', () => {
  const makeState = (stage) => {
    const state = createInitialGameState({ stage });
    const homeCarrier = state.players.find((player) => player.id === 'home-fw');
    const closestDefender = state.players.find((player) => player.id === 'away-fw');
    Object.assign(homeCarrier, { x: 400, y: 270 });
    Object.assign(closestDefender, { x: 550, y: 270 });
    for (const player of state.players.filter((candidate) => candidate.team === 'away' && candidate.id !== closestDefender.id)) {
      Object.assign(player, { x: 900, y: 30 });
    }
    state.ball.ownerId = homeCarrier.id;
    state.possessionTeam = 'home';
    return { state, closestDefender };
  };
  const regular = makeState(1);
  const boss = makeState(5);
  const regularStart = regular.closestDefender.x;
  const bossStart = boss.closestDefender.x;

  stepGame(regular.state, frame(), 0.05);
  stepGame(boss.state, frame(), 0.05);

  assert.equal(regular.closestDefender.x, regularStart);
  assert.ok(boss.closestDefender.x < bossStart);
});

test('the stage-five boss sends attacking support farther around its ball carrier', () => {
  const makeState = (stage) => {
    const state = createInitialGameState({ stage });
    const carrier = state.players.find((player) => player.id === 'away-fw');
    const supporter = state.players.find((player) => player.id === 'away-mid-1');
    Object.assign(carrier, { x: 500, y: 270 });
    Object.assign(supporter, { x: 500, y: 270 });
    state.ball.ownerId = carrier.id;
    state.possessionTeam = 'away';
    return { state, supporter };
  };
  const regular = makeState(1);
  const boss = makeState(5);

  stepGame(regular.state, frame(), 0.05);
  stepGame(boss.state, frame(), 0.05);

  assert.ok(Math.abs(boss.supporter.y - 270) > Math.abs(regular.supporter.y - 270));
});

test('the nearest away defender presses while remaining defenders cover separate receivers', () => {
  const state = createInitialGameState({ stage: 3 });
  const carrier = state.players.find((player) => player.id === 'home-fw');
  const presser = state.players.find((player) => player.id === 'away-fw');
  const coverOne = state.players.find((player) => player.id === 'away-def-1');
  const coverTwo = state.players.find((player) => player.id === 'away-mid-1');
  Object.assign(carrier, { x: 400, y: 270 });
  Object.assign(presser, { x: 470, y: 270 });
  Object.assign(coverOne, { x: 850, y: 100 });
  Object.assign(coverTwo, { x: 850, y: 440 });
  Object.assign(state.ball, { ownerId: carrier.id, x: carrier.x, y: carrier.y });
  state.possessionTeam = 'home';

  stepGame(state, frame(), 0.05);

  assert.ok(presser.x < 470);
  assert.equal(state.aiPressingPlayerId, presser.id);
  assert.ok(coverOne.aiTarget && coverTwo.aiTarget);
  assert.notDeepEqual(coverOne.aiTarget, coverTwo.aiTarget);
  assert.ok(Math.abs(coverOne.aiTarget.y - coverTwo.aiTarget.y) >= 70);
  const initialPresserId = state.aiPressingPlayerId;
  const initialMarks = { ...state.aiMarkingAssignments };
  stepGame(state, frame(), 0.05);
  assert.equal(state.aiPressingPlayerId, initialPresserId);
  assert.deepEqual(state.aiMarkingAssignments, initialMarks);
  assert.equal(new Set(Object.values(state.aiMarkingAssignments)).size, Object.keys(state.aiMarkingAssignments).length);
  assert.ok([coverOne.aiTarget, coverTwo.aiTarget].every((target) => target.x >= 0 && target.x <= FIELD.width
    && target.y >= 0 && target.y <= FIELD.height));
});

test('the stable presser is reassigned when the ball carrier changes', () => {
  const state = createInitialGameState({ stage: 3 });
  const firstCarrier = state.players.find((player) => player.id === 'home-fw');
  const nextCarrier = state.players.find((player) => player.id === 'home-mid-1');
  Object.assign(firstCarrier, { x: 400, y: 270 });
  Object.assign(nextCarrier, { x: 550, y: 270 });
  Object.assign(state.players.find((player) => player.id === 'away-fw'), { x: 360, y: 270 });
  Object.assign(state.players.find((player) => player.id === 'away-def-1'), { x: 500, y: 270 });
  Object.assign(state.players.find((player) => player.id === 'away-mid-1'), { x: 800, y: 150 });
  Object.assign(state.ball, { ownerId: firstCarrier.id, x: firstCarrier.x, y: firstCarrier.y });
  state.possessionTeam = 'home';
  stepGame(state, frame(), 0.05);
  const firstPresserId = state.aiPressingPlayerId;

  Object.assign(state.ball, { ownerId: nextCarrier.id, x: nextCarrier.x, y: nextCarrier.y });
  stepGame(state, frame(), 0.05);

  assert.notEqual(state.aiPressingPlayerId, firstPresserId);
  assert.equal(state.aiPressingPlayerId, 'away-def-1');
});

test('the stage-five boss makes attack decisions sooner than a regular opponent', () => {
  const makeState = (stage) => {
    const state = createInitialGameState({ stage });
    const striker = state.players.find((player) => player.id === 'away-fw');
    Object.assign(striker, { x: 100, y: 270 });
    state.players.find((player) => player.id === 'away-def-1').dismissed = true;
    state.players.find((player) => player.id === 'away-mid-1').dismissed = true;
    state.aiShotCooldownSeconds = getAiTuning(stage).thinkIntervalSeconds;
    state.ball.ownerId = striker.id;
    state.ball.x = striker.x;
    state.ball.y = striker.y;
    state.possessionTeam = 'away';
    return { state, striker };
  };
  const regular = makeState(1);
  const boss = makeState(5);

  let regularShotDuringWindow = false;
  let bossShotDuringWindow = false;
  for (let index = 0; index < 10; index += 1) {
    regular.state.ball.ownerId = regular.striker.id;
    boss.state.ball.ownerId = boss.striker.id;
    regularShotDuringWindow ||= stepGame(regular.state, frame(), 0.05).some((event) => event.type === 'shot');
    bossShotDuringWindow ||= stepGame(boss.state, frame(), 0.05).some((event) => event.type === 'shot');
  }

  assert.equal(regularShotDuringWindow, false);
  assert.equal(bossShotDuringWindow, true);
});

test('clamps frame time and ignores a finished game', () => {
  const state = createInitialGameState();
  const player = state.players.find((candidate) => candidate.id === 'home-fw');
  const startX = player.x;
  stepGame(state, frame({ moveX: 1 }), 1);
  assert.ok(Math.abs(player.x - startX) <= 8.81);

  state.phase = 'finished';
  const frozenX = player.x;
  assert.deepEqual(stepGame(state, frame({ moveX: 1 }), 0.05), []);
  assert.equal(player.x, frozenX);
});
