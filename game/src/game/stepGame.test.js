import assert from 'node:assert/strict';
import test from 'node:test';
import { FIELD, KICKOFF_CIRCLE_RADIUS, SHOT_ASSIST_DISTANCE, SHOT_ASSIST_MAX, getAiTuning } from './constants.js';
import { createInitialGameState as createGameState } from './createInitialGameState.js';
import { stepGame } from './stepGame.js';

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

test('the opening clock stays stopped until the opening taker actually kicks the ball', () => {
  const state = createGameState();

  stepGame(state, frame(), 0.05);
  stepGame(state, frame({ moveX: 1 }), 0.05);
  assert.equal(state.remainingSeconds, 60);
  assert.equal(state.hasMatchClockStarted, false);

  stepGame(state, frame({ pressed: ['s'] }), 0.05);
  assert.equal(state.hasMatchClockStarted, true);
  assert.equal(state.remainingSeconds, 60, 'the kick frame is not charged');

  stepGame(state, frame(), 0.05);
  assert.equal(state.remainingSeconds, 59.95);
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

test('moves the selected player at the intended speed and normalizes diagonals', () => {
  const state = createInitialGameState();
  const player = state.players.find((candidate) => candidate.id === 'home-fw');
  const start = { x: player.x, y: player.y };

  stepGame(state, frame({ moveX: 1, moveY: -1 }), 0.05);

  assert.ok(player.x > start.x);
  assert.ok(player.y < start.y);
  assert.ok(Math.abs(Math.hypot(player.vx, player.vy) - 160) < 0.001);
  assert.equal(state.ball.x, player.x + player.facingX * 17);
});

test('Space makes a field player jump and goalkeepers stay grounded', () => {
  const state = createInitialGameState();
  const player = state.players.find((candidate) => candidate.id === 'home-fw');

  stepGame(state, frame({ pressed: ['Space'] }), 0.05);
  assert.ok(player.jumpHeight > 0);
  assert.ok(player.jumpHeight <= 70);
  assert.ok(state.players.filter((candidate) => candidate.id !== player.id)
    .every((candidate) => candidate.jumpHeight === 0 && candidate.jumpVelocity === 0));

  for (let index = 0; index < 30; index += 1) stepGame(state, frame(), 0.05);
  assert.equal(player.jumpHeight, 0);
  assert.equal(player.jumpVelocity, 0);
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

  assert.equal(controlled.x, 488);
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

test('A sends a lob pass immediately without making any player jump', () => {
  const state = createInitialGameState();
  const events = stepGame(state, frame({ moveY: -1, pressed: ['a'] }), 0.05);

  assert.equal(state.controlledPlayerId, 'home-def-1');
  assert.equal(state.ball.ownerId, null);
  assert.equal(state.ball.flightKind, 'lob');
  assert.ok(state.ball.height > 0);
  assert.ok(state.ball.verticalVelocity > 0);
  assert.ok(state.ball.vx < 0);
  assert.ok(events.some((event) => event.type === 'pass' && event.action === 'lobPass'));
  assert.ok(state.players.every((player) => player.jumpVelocity === 0 && player.jumpHeight === 0));
});

test('A without possession does not trigger a jump', () => {
  const state = createInitialGameState();
  state.possessionTeam = 'away';
  state.ball.ownerId = 'away-fw';
  state.controlledPlayerId = 'home-fw';

  stepGame(state, frame({ pressed: ['a'] }), 0.05);

  assert.ok(state.players.every((player) => player.jumpVelocity === 0 && player.jumpHeight === 0));
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

test('a jumping field player heads a reachable airborne ball', () => {
  const state = createInitialGameState();
  const jumper = state.players.find((candidate) => candidate.id === 'home-fw');
  Object.assign(jumper, { x: 500, y: 250, jumpHeight: 45, jumpVelocity: 0, facingX: 1, facingY: 0 });
  for (const player of state.players) {
    if (player.id !== jumper.id) Object.assign(player, { x: 100, y: player.team === 'home' ? 40 : 500 });
  }
  Object.assign(state.ball, {
    x: 510, y: 250, vx: 0, vy: 0, ownerId: null,
    height: 40, verticalVelocity: -40, flightKind: 'cross', lastTouchTeam: 'away',
  });
  state.possessionTeam = 'away';

  const events = stepGame(state, frame(), 0.01);
  assert.ok(events.some((event) => event.type === 'header' && event.playerId === jumper.id));
  assert.equal(state.ball.flightKind, 'header');
  assert.equal(state.ball.lastTouchTeam, 'home');
  assert.equal(state.ball.ownerId, null);
  assert.ok(state.ball.verticalVelocity > 0);
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

test('a charged shot follows the selected player facing direction', () => {
  const state = createInitialGameState();
  state.players.find((player) => player.id === 'home-fw').facingX = 1;
  stepGame(state, frame({ down: ['d'], pressed: ['d'] }), 0.05);
  const events = stepGame(state, frame({ released: ['d'] }), 0.05);

  assert.equal(state.ball.ownerId, null);
  assert.equal(state.ball.flightKind, 'shot');
  assert.ok(state.ball.vx > 0);
  assert.ok(events.some((event) => event.type === 'shot' && event.team === 'home'));
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

test('shot power ranges from 55 percent on a quick release to 100 percent after one second', () => {
  const quick = createInitialGameState();
  stepGame(quick, frame({ down: ['d'], pressed: ['d'] }), 0.05);
  stepGame(quick, frame({ released: ['d'] }), 0.01);

  const full = createInitialGameState();
  for (let index = 0; index < 20; index += 1) {
    stepGame(full, frame({ down: ['d'], pressed: index === 0 ? ['d'] : [] }), 0.05);
  }
  stepGame(full, frame({ released: ['d'] }), 0.01);

  assert.ok(Math.hypot(quick.ball.vx, quick.ball.vy) < Math.hypot(full.ball.vx, full.ball.vy));
  assert.ok(Math.abs(Math.hypot(quick.ball.vx, quick.ball.vy) / Math.hypot(full.ball.vx, full.ball.vy) - 0.55) < 0.04);
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

test('a keeper catches an ordinary shot and starts a timed goal kick', () => {
  const state = createInitialGameState();
  state.possessionTeam = 'away';
  Object.assign(state.ball, { ownerId: null, x: 55, y: 270, vx: -30, vy: 0, flightKind: 'shot', lastTouchTeam: 'away' });

  const events = stepGame(state, frame(), 0.01);

  assert.equal(state.phase, 'goalKick');
  assert.equal(state.ball.ownerId, 'home-gk');
  assert.ok(events.some((event) => event.type === 'keeperCatch'));
  assert.ok(!events.some((event) => event.type === 'playerKnockedDown'));
  assert.equal(state.players.find((player) => player.id === 'home-gk').knockdownSeconds, 0);
  let kickEvents = [];
  for (let i = 0; i < 24 && !kickEvents.some((event) => event.type === 'goalKick'); i += 1) {
    kickEvents = stepGame(state, frame(), 0.05);
  }
  assert.equal(state.phase, 'playing');
  assert.equal(state.ball.ownerId, null);
  assert.ok(state.ball.vx > 0);
  assert.ok(kickEvents.some((event) => event.type === 'goalKick'));
});

test('a goal restarts from the center for the conceding team', () => {
  const state = createInitialGameState();
  Object.assign(state.ball, { ownerId: null, x: FIELD.width - 1, y: 270, vx: 100, vy: 0, flightKind: 'shot', lastTouchTeam: 'home' });

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

test('a goal kickoff preserves the remaining uses for this match', () => {
  const state = createInitialGameState({ playerSkillStacks: { 'home-fw': { skillId: 'eagleShot', copies: 3 } } });
  const forward = state.players.find((player) => player.id === 'home-fw');
  forward.skillUsesRemaining = 1;
  state.phase = 'goalPause';
  state.phaseSeconds = 0.01;
  state.pendingKickoffTeam = 'away';

  stepGame(state, frame(), 0.05);

  const resetForward = state.players.find((player) => player.id === 'home-fw');
  assert.equal(resetForward.skillCopies, 3);
  assert.equal(resetForward.skillUsesRemaining, 1);
});

test('touchline exits restart with an automatic throw-in for the team that did not touch last', () => {
  const cases = [
    { y: -1, lastTouchTeam: 'home', restartTeam: 'away', restartY: 0 },
    { y: FIELD.height + 1, lastTouchTeam: 'away', restartTeam: 'home', restartY: FIELD.height },
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
    assert.equal(thrower.y, scenario.restartY);
    assert.deepEqual(state.score, { home: 2, away: 1 });
    assert.equal(state.stage, 2);
    assert.ok(state.remainingSeconds < 37 && state.remainingSeconds > 36.9);
  }
});

test('goal-line exits award goal kicks or corners based on the last touch', () => {
  const cases = [
    { x: FIELD.width + 1, y: 400, lastTouchTeam: 'home', restart: 'goalKick', team: 'away', keeper: 'away-gk' },
    { x: -1, y: 100, lastTouchTeam: 'away', restart: 'goalKick', team: 'home', keeper: 'home-gk' },
    { x: FIELD.width + 1, y: FIELD.goalTop - 1, lastTouchTeam: 'away', restart: 'cornerKick', team: 'home' },
    { x: -1, y: FIELD.goalBottom + 1, lastTouchTeam: 'home', restart: 'cornerKick', team: 'away' },
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
      assert.equal(state.phase, 'playing');
      assert.ok(restart.playerId.startsWith(`${scenario.team}-`));
      assert.ok(restart.receiverId);
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
    x: FIELD.width + 1,
    y: 400,
    vx: 0,
    vy: 0,
    lastTouchTeam: null,
  });

  const events = stepGame(state, frame(), 0.01);

  assert.ok(events.some((event) => event.type === 'cornerKick' && event.team === 'home'));
});

test('a golden-goal score immediately finishes the stage', () => {
  const state = createInitialGameState();
  state.phase = 'overtime';
  Object.assign(state.ball, { ownerId: null, x: FIELD.width - 1, y: 270, vx: 100, vy: 0, flightKind: 'shot', lastTouchTeam: 'home' });

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
  assert.equal(opponent.knockdownSeconds, 1);
  assert.equal(opponent.motionAction, 'knockdown');
  const knockdown = events.find((event) => event.type === 'playerKnockedDown');
  assert.equal(knockdown.playerId, opponent.id);
  assert.ok(knockdown.direction.x > 0);
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

test('a rear slide tackle gives a yellow, then a red card and switches control after dismissal', () => {
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
  assert.ok(first.some((event) => event.type === 'foul'));
  assert.ok(first.some((event) => event.type === 'yellowCard'));
  assert.equal(tackler.foulCount, 1);
  assert.equal(tackler.card, 'yellow');
  assert.equal(state.phase, 'freeKick');
  assert.equal(state.possessionTeam, 'away');

  state.phase = 'playing';
  state.ball.ownerId = ballCarrier.id;
  state.ball.x = 483;
  state.ball.y = 270;
  state.possessionTeam = 'away';
  tackler.x = 514;
  tackler.y = 270;
  ballCarrier.x = 500;
  ballCarrier.y = 270;
  ballCarrier.knockdownSeconds = 0;
  ballCarrier.motionAction = 'idle';
  const second = stepGame(state, frame({ pressed: ['a'] }), 0.01);

  assert.ok(second.some((event) => event.type === 'redCard'));
  assert.ok(second.some((event) => event.type === 'playerDismissed'));
  assert.equal(tackler.foulCount, 2);
  assert.equal(tackler.dismissed, true);
  assert.notEqual(state.controlledPlayerId, tackler.id);
  assert.equal(state.players.filter((player) => player.team === 'home' && !player.dismissed).length, 3);
});

test('a foul in the defending penalty area awards a penalty and power tackle is protected', () => {
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

  const penaltyEvents = stepGame(state, frame({ pressed: ['a'] }), 0.01);
  assert.ok(penaltyEvents.some((event) => event.type === 'penaltyKick'));
  assert.equal(state.phase, 'penaltyKick');

  const protectedState = createInitialGameState();
  const protectedTackler = protectedState.players.find((player) => player.id === 'home-fw');
  const protectedCarrier = protectedState.players.find((player) => player.id === 'away-fw');
  protectedTackler.x = 514;
  protectedTackler.y = 270;
  protectedTackler.powerTackleSeconds = 2;
  protectedCarrier.x = 500;
  protectedCarrier.y = 270;
  protectedCarrier.facingX = -1;
  protectedState.possessionTeam = 'away';
  protectedState.ball.ownerId = protectedCarrier.id;
  protectedState.ball.x = 483;
  protectedState.ball.y = 270;

  const protectedEvents = stepGame(protectedState, frame({ pressed: ['a'] }), 0.01);
  assert.ok(protectedEvents.some((event) => event.type === 'tackle'));
  assert.ok(!protectedEvents.some((event) => event.type === 'foul'));
  assert.equal(protectedTackler.foulCount, 0);
});

test('away defenders receive the same foul rules and dismissed keepers cannot catch shots', () => {
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

  const foulEvents = stepGame(state, frame(), 0.01);
  assert.ok(foulEvents.some((event) => event.type === 'foul' && event.team === 'away'));
  assert.ok(foulEvents.some((event) => event.type === 'yellowCard' && event.team === 'away'));
  assert.equal(defender.foulCount, 1);

  const keeperState = createInitialGameState();
  const keeper = keeperState.players.find((player) => player.id === 'home-gk');
  keeper.dismissed = true;
  keeper.card = 'red';
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

test('defensive D pressure moves the selected player toward the opponent carrier', () => {
  const state = createInitialGameState();
  const controlled = state.players.find((player) => player.id === 'home-fw');
  const opponent = state.players.find((player) => player.id === 'away-fw');
  controlled.x = 200;
  controlled.y = opponent.y;
  opponent.x = 700;
  state.possessionTeam = 'away';
  state.ball.ownerId = opponent.id;

  stepGame(state, frame({ down: ['d'] }), 0.05);

  assert.ok(controlled.x > 200);
});

test('the away AI advances toward the home goal and takes a shot in range', () => {
  const state = createInitialGameState();
  const opponent = state.players.find((player) => player.id === 'away-fw');
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

test('only the nearest eligible AI jumps toward a reachable descending ball', () => {
  const state = createInitialGameState();
  const controlled = state.players.find((player) => player.id === 'home-fw');
  const nearest = state.players.find((player) => player.id === 'home-def-1');
  const second = state.players.find((player) => player.id === 'home-mid-1');
  Object.assign(controlled, { x: 100, y: 100 });
  Object.assign(nearest, { x: 495, y: 270, jumpCooldownSeconds: 0 });
  Object.assign(second, { x: 520, y: 270, jumpCooldownSeconds: 0 });
  Object.assign(state.ball, {
    ownerId: null, x: 500, y: 270, vx: 0, vy: 0, height: 50, verticalVelocity: -50,
    flightKind: 'lob', passTeam: 'away',
  });
  state.possessionTeam = 'away';
  state.players.filter((player) => player.team === 'away' && player.role !== 'goalkeeper')
    .forEach((player) => Object.assign(player, { x: 850, y: 500, jumpCooldownSeconds: 0 }));

  const events = stepGame(state, frame(), 0.01);

  assert.ok(nearest.jumpVelocity > 0);
  assert.equal(second.jumpVelocity, 0);
  assert.ok(events.some((event) => event.type === 'header' && event.playerId === nearest.id));
  assert.ok(events.some((event) => event.type === 'passIntercepted' && event.fromTeam === 'away' && event.passKind === 'lob'));
});

test('AI waits for high balls and never auto-jumps goalkeepers', () => {
  const state = createInitialGameState();
  const nearest = state.players.find((player) => player.id === 'home-def-1');
  const keeper = state.players.find((player) => player.id === 'away-gk');
  Object.assign(nearest, { x: 500, y: 270, jumpCooldownSeconds: 0 });
  Object.assign(keeper, { x: 500, y: 270, jumpCooldownSeconds: 0 });
  Object.assign(state.ball, { ownerId: null, x: 500, y: 270, height: 160, verticalVelocity: -100, flightKind: 'lob' });
  state.possessionTeam = 'away';
  state.players.filter((player) => player.team === 'away' && player.role !== 'goalkeeper')
    .forEach((player) => Object.assign(player, { x: 900, y: 500, jumpCooldownSeconds: 0 }));

  stepGame(state, frame(), 0.01);

  assert.equal(nearest.jumpVelocity, 0);
  assert.equal(keeper.jumpVelocity, 0);

  state.ball.height = 5;
  state.ball.verticalVelocity = -20;
  stepGame(state, frame(), 0.01);
  assert.equal(nearest.jumpVelocity, 0);
});

test('AI does not jump for a descending ball outside every field player reach radius', () => {
  const state = createInitialGameState();
  for (const player of state.players) {
    Object.assign(player, {
      x: player.team === 'home' ? 30 : FIELD.width - 30,
      y: player.role === 'goalkeeper' ? FIELD.height / 2 : player.team === 'home' ? 25 : FIELD.height - 25,
      jumpCooldownSeconds: 0,
    });
  }
  Object.assign(state.ball, {
    ownerId: null, x: FIELD.width / 2, y: FIELD.height / 2,
    vx: 0, vy: 0, height: 50, verticalVelocity: -50, flightKind: 'lob',
  });

  stepGame(state, frame(), 0.01);

  assert.ok(state.players.every((player) => player.jumpVelocity === 0 && player.jumpHeight === 0));
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

  stepGame(state, frame({ moveY: 1 }), 0.05);

  assert.ok(presser.x > 650);
  assert.equal(controlled.y, 308);
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
  assert.ok(Math.abs(player.x - startX) <= 8.01);

  state.phase = 'finished';
  const frozenX = player.x;
  assert.deepEqual(stepGame(state, frame({ moveX: 1 }), 0.05), []);
  assert.equal(player.x, frozenX);
});
