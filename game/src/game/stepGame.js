import { FIELD, MAX_SKILL_GAUGE } from './constants.js';
import { createInitialGameState } from './createInitialGameState.js';
import { addSkillGauge, applyAutomaticRainbowReflect, applySkill, SKILL_IDS } from './skills.js';

const PLAYER_SPEED = 160;
const AI_SPEED = 125;
const KEEPER_SPEED = 95;
const PRESSURE_SPEED = 190;
const SLIDE_SPEED = 160;
const MAX_DELTA = 0.05;
const CHARGE_SECONDS = 1;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (x, y) => {
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
};

function byId(state, id) {
  return state.players.find((player) => player.id === id) ?? null;
}

function carrier(state) {
  return byId(state, state.ball.ownerId);
}

function moveToward(player, target, speed, deltaSeconds) {
  if (!player || !target || player.stunnedSeconds > 0) return;
  const direction = unit(target.x - player.x, target.y - player.y);
  const distanceToTarget = distance(player, target);
  const travel = Math.min(distanceToTarget, speed * deltaSeconds);
  player.vx = direction.x * speed;
  player.vy = direction.y * speed;
  player.x = clamp(player.x + direction.x * travel, 0, FIELD.width);
  player.y = clamp(player.y + direction.y * travel, 0, FIELD.height);
  if (direction.x !== 0 || direction.y !== 0) {
    player.facingX = Math.sign(direction.x);
    player.facingY = Math.sign(direction.y);
  }
}

function moveByInput(player, moveX, moveY, speed, deltaSeconds) {
  if (!player || player.stunnedSeconds > 0) return;
  const direction = unit(
    Number.isFinite(moveX) ? moveX : 0,
    Number.isFinite(moveY) ? moveY : 0,
  );
  player.vx = direction.x * speed;
  player.vy = direction.y * speed;
  player.x = clamp(player.x + player.vx * deltaSeconds, 0, FIELD.width);
  player.y = clamp(player.y + player.vy * deltaSeconds, 0, FIELD.height);
  if (direction.x !== 0 || direction.y !== 0) {
    player.facingX = Math.sign(direction.x);
    player.facingY = Math.sign(direction.y);
  }
}

function setBallOwner(state, player) {
  if (!player) return;
  state.ball.ownerId = player.id;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.height = 0;
  state.ball.flightKind = 'ground';
  state.ball.flightSeconds = 0;
  delete state.ball.flightDurationSeconds;
  delete state.ball.skillId;
  delete state.ball.passTeam;
  delete state.ball.passTarget;
  state.ball.passProtectionSeconds = 0;
  state.ball.lastTouchTeam = player.team;
  state.possessionTeam = player.team;
}

function putBallAtPlayer(state, player) {
  state.ball.x = clamp(player.x + player.facingX * 17, 0, FIELD.width);
  state.ball.y = clamp(player.y + player.facingY * 17, 0, FIELD.height);
}

function getTeammates(state, player) {
  return state.players.filter((candidate) => candidate.team === player.team && candidate.id !== player.id);
}

function chooseReceiver(state, passer, moveX, moveY) {
  const intent = unit(moveX, moveY);
  const facing = intent.x !== 0 || intent.y !== 0
    ? intent
    : { x: passer.facingX || (passer.team === 'home' ? 1 : -1), y: passer.facingY };

  return getTeammates(state, passer)
    .map((candidate) => {
      const direction = unit(candidate.x - passer.x, candidate.y - passer.y);
      const forwardScore = direction.x * facing.x + direction.y * facing.y;
      return { candidate, score: forwardScore * 2 - distance(candidate, passer) / FIELD.width };
    })
    .sort((a, b) => b.score - a.score)[0]?.candidate ?? null;
}

function releasePass(state, player, kind, chargeRatio, moveX, moveY) {
  const receiver = chooseReceiver(state, player, moveX, moveY);
  if (!receiver) return [];

  putBallAtPlayer(state, player);
  const direction = unit(receiver.x - state.ball.x, receiver.y - state.ball.y);
  const speed = (kind === 'lobPass' ? 300 : 330) * (0.55 + 0.45 * chargeRatio);
  state.ball.ownerId = null;
  state.ball.vx = direction.x * speed;
  state.ball.vy = direction.y * speed;
  state.ball.flightKind = kind === 'lobPass' ? 'lob' : 'ground';
  state.ball.flightSeconds = 0;
  state.ball.flightDurationSeconds = Math.max(0.35, distance(receiver, player) / speed);
  state.ball.height = 0;
  delete state.ball.skillId;
  state.ball.passTeam = player.team;
  if (kind === 'groundPass') {
    state.ball.passTarget = { x: receiver.x, y: receiver.y };
    state.ball.passProtectionSeconds = state.ball.flightDurationSeconds;
  } else {
    delete state.ball.passTarget;
    state.ball.passProtectionSeconds = 0;
  }
  state.ball.lastTouchTeam = player.team;
  state.possessionTeam = player.team;
  state.controlledPlayerId = receiver.id;

  return [{ type: 'pass', team: player.team, action: kind, receiverId: receiver.id, completed: false }];
}

function releaseShot(state, player, chargeRatio) {
  const attackDirection = player.team === 'home' ? 1 : -1;
  const power = 0.55 + 0.45 * chargeRatio;
  const facing = player.facingX === 0 && player.facingY === 0
    ? { x: attackDirection, y: 0 }
    : { x: player.facingX, y: player.facingY };
  const direction = unit(facing.x, facing.y);
  const speed = (player.team === 'home' ? 500 : 430) * power;

  putBallAtPlayer(state, player);
  const start = { x: state.ball.x, y: state.ball.y };
  state.ball.ownerId = null;
  state.ball.vx = direction.x * speed;
  state.ball.vy = direction.y * speed;
  state.ball.flightKind = 'shot';
  state.ball.flightSeconds = 0;
  state.ball.height = 0;
  delete state.ball.flightDurationSeconds;
  delete state.ball.skillId;
  delete state.ball.passTeam;
  state.ball.lastTouchTeam = player.team;
  state.possessionTeam = player.team;

  const goalX = attackDirection > 0 ? FIELD.width : 0;
  const distanceToGoal = (goalX - start.x) / direction.x;
  const targetY = start.y + direction.y * distanceToGoal;
  const onTarget = distanceToGoal > 0
    && targetY >= FIELD.goalTop
    && targetY <= FIELD.goalBottom;
  return [{ type: 'shot', team: player.team }, ...(onTarget ? [{ type: 'shotOnTarget', team: player.team }] : [])];
}

function resetForKickoff(state, kickoffTeam) {
  const loadout = Object.fromEntries(
    state.players.filter((player) => player.team === 'home' && player.skillId)
      .map((player) => [player.id, player.skillId]),
  );
  const fresh = createInitialGameState({
    stage: state.stage,
    loadout,
    opponentSkillIds: state.opponentSkillIds,
  });
  const score = { ...state.score };
  const remainingSeconds = state.remainingSeconds;
  const skillGauge = { ...state.skillGauge };
  const controlledPlayerId = state.controlledPlayerId;

  Object.assign(state, fresh, { score, remainingSeconds, skillGauge });
  state.possessionTeam = kickoffTeam;
  state.ball.ownerId = `${kickoffTeam}-fw`;
  state.ball.lastTouchTeam = kickoffTeam;
  state.controlledPlayerId = byId(state, controlledPlayerId)?.team === 'home'
    ? controlledPlayerId
    : 'home-fw';
  putBallAtPlayer(state, carrier(state));
}

function finishMatch(state) {
  state.phase = 'finished';
  const won = state.score.home > state.score.away;
  return [{
    type: won ? 'matchWon' : 'matchLost',
    score: { ...state.score },
  }];
}

function scoreGoal(state, scoringTeam) {
  state.score[scoringTeam] += 1;
  const event = { type: 'goal', team: scoringTeam, score: { ...state.score } };

  if (state.phase === 'overtime') {
    return [event, ...finishMatch(state)];
  }

  state.phase = 'goalPause';
  state.phaseSeconds = 1;
  state.pendingKickoffTeam = scoringTeam === 'home' ? 'away' : 'home';
  return [event];
}

function checkBallBoundary(state) {
  const { ball } = state;
  if (ball.y >= FIELD.goalTop && ball.y <= FIELD.goalBottom) {
    if (ball.x > FIELD.width) return scoreGoal(state, 'home');
    if (ball.x < 0) return scoreGoal(state, 'away');
  }

  if (ball.x < 0 || ball.x > FIELD.width || ball.y < 0 || ball.y > FIELD.height) {
    const kickoffTeam = ball.lastTouchTeam === 'home' ? 'away' : 'home';
    resetForKickoff(state, kickoffTeam);
    return [{ type: 'outOfBounds', team: kickoffTeam }];
  }
  return [];
}

function handleKeeperContact(state) {
  const { ball } = state;
  if (ball.ownerId || !['shot', 'skill-shot'].includes(ball.flightKind) || ball.height > 8) return [];

  for (const keeper of state.players.filter((player) => player.role === 'goalkeeper')) {
    if (Math.abs(ball.x - keeper.x) > 12 || Math.abs(ball.y - keeper.y) > 14) continue;

    if (ball.lastTouchTeam === keeper.team) continue;
    if (ball.skillId === 'eagleShot') continue;
    setBallOwner(state, keeper);
    state.phase = 'goalKick';
    state.phaseSeconds = 1;
    putBallAtPlayer(state, keeper);
    return [{ type: 'keeperCatch', team: keeper.team, keeperId: keeper.id }];
  }
  return [];
}

function integrateLooseBall(state, deltaSeconds) {
  const { ball } = state;
  if (ball.flightKind === 'skill-shot' && ball.skillId === 'tornadoShot') {
    const defender = state.players
      .filter((player) => player.team !== ball.lastTouchTeam && player.role !== 'goalkeeper')
      .map((player) => ({ player, distance: distance(player, ball) }))
      .filter((entry) => entry.distance < 100)
      .sort((a, b) => a.distance - b.distance)[0]?.player;
    if (defender) {
      const awayFromDefender = Math.sign(ball.y - defender.y) || (ball.lastTouchTeam === 'home' ? -1 : 1);
      ball.vy += awayFromDefender * 420 * (1 - distance(defender, ball) / 100) * deltaSeconds;
    }
  }
  if (ball.flightKind === 'ground'
      && ball.passTeam
      && ball.passProtectionSeconds > 0
      && ball.passTarget) {
    const dx = ball.passTarget.x - ball.x;
    const dy = ball.passTarget.y - ball.y;
    const remaining = Math.hypot(dx, dy);
    const speed = Math.hypot(ball.vx, ball.vy);
    const travel = Math.min(remaining, speed * deltaSeconds);
    if (remaining <= travel || remaining <= 0.001) {
      ball.x = ball.passTarget.x;
      ball.y = ball.passTarget.y;
      ball.vx = 0;
      ball.vy = 0;
      ball.passProtectionSeconds = 0;
      delete ball.passTarget;
    } else if (speed > 0) {
      ball.x += dx / remaining * travel;
      ball.y += dy / remaining * travel;
      ball.vx = dx / remaining * speed;
      ball.vy = dy / remaining * speed;
      ball.passProtectionSeconds = Math.max(0, ball.passProtectionSeconds - deltaSeconds);
      if (ball.passProtectionSeconds === 0) delete ball.passTarget;
    }
    ball.flightSeconds = (ball.flightSeconds ?? 0) + deltaSeconds;
    return;
  }

  ball.x += ball.vx * deltaSeconds;
  ball.y += ball.vy * deltaSeconds;
  ball.flightSeconds = (ball.flightSeconds ?? 0) + deltaSeconds;
  const friction = Math.exp(-2.4 * deltaSeconds);
  ball.vx *= friction;
  ball.vy *= friction;

  if (ball.flightKind === 'lob') {
    const duration = Math.max(0.35, ball.flightDurationSeconds ?? 0.9);
    const progress = clamp(ball.flightSeconds / duration, 0, 1);
    ball.height = Math.sin(progress * Math.PI) * 48;
    if (progress >= 1) {
      ball.height = 0;
      ball.flightKind = 'ground';
    }
  }
}

function collectLooseBall(state) {
  const { ball } = state;
  if (ball.ownerId || ball.height > 14) return [];
  if (ball.flightKind === 'skill-shot' && ['eagleShot', 'tornadoShot'].includes(ball.skillId)) return [];
  const candidates = state.players
    .map((player) => ({ player, distance: distance(player, ball) }))
    .filter(({ player, distance: playerDistance }) => playerDistance <= 18
      && !(ball.passProtectionSeconds > 0 && ball.passTeam && player.team !== ball.passTeam))
    .sort((a, b) => a.distance - b.distance);
  const pickedUp = candidates[0]?.player;
  if (!pickedUp) return [];

  const previousTeam = state.possessionTeam;
  const completedPass = ball.passTeam === pickedUp.team;
  setBallOwner(state, pickedUp);
  if (pickedUp.team === 'home') state.controlledPlayerId = pickedUp.id;
  return [
    ...(previousTeam !== pickedUp.team ? [{ type: 'possessionChange', team: pickedUp.team, playerId: pickedUp.id }] : []),
    ...(completedPass ? [{ type: 'pass', team: pickedUp.team, completed: true, receiverId: pickedUp.id }] : []),
  ];
}

function handleHomeAttack(state, controlled, input, deltaSeconds) {
  const actionKeys = [
    ['a', 'lobPass'],
    ['s', 'groundPass'],
    ['d', 'shot'],
  ];
  const started = actionKeys.find(([key]) => input.pressed.has(key));
  if (started && !state.charge.action) {
    state.charge.action = started[1];
    state.charge.elapsedSeconds = 0;
  }

  const current = actionKeys.find(([, action]) => action === state.charge.action);
  if (!current) return [];
  const [key] = current;
  if (input.down.has(key)) {
    state.charge.elapsedSeconds = clamp(state.charge.elapsedSeconds + deltaSeconds, 0, CHARGE_SECONDS);
  }

  const released = input.released.has(key) || (!input.down.has(key) && !input.pressed.has(key));
  if (!released) return [];

  const action = state.charge.action;
  const ratio = clamp(state.charge.elapsedSeconds / CHARGE_SECONDS, 0, 1);
  state.charge = { action: null, elapsedSeconds: 0 };
  if (state.ball.ownerId !== controlled.id) return [];
  if (action === 'lobPass') return releasePass(state, controlled, 'lobPass', ratio, input.moveX, input.moveY);
  if (action === 'groundPass') return releasePass(state, controlled, 'groundPass', ratio, input.moveX, input.moveY);
  if (action === 'shot') return releaseShot(state, controlled, ratio);
  return [];
}

function controlBallAction(state, controlled, input, deltaSeconds) {
  if (state.possessionTeam !== 'home') {
    state.charge = { action: null, elapsedSeconds: 0 };
    return [];
  }

  return handleHomeAttack(state, controlled, input, deltaSeconds);
}

function nextRandom(state) {
  const seed = Number.isInteger(state.aiRandomSeed) && state.aiRandomSeed >= 0
    ? state.aiRandomSeed >>> 0
    : 0x6d2b79f5;
  state.aiRandomSeed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return state.aiRandomSeed / 0x100000000;
}

function chooseSupportTarget(state) {
  return {
    x: clamp(state.ball.x + (nextRandom(state) * 2 - 1) * 220, 0, FIELD.width),
    y: clamp(state.ball.y + (nextRandom(state) * 2 - 1) * 150, 0, FIELD.height),
  };
}

function updateHomeSupportPlayer(state, player, deltaSeconds) {
  player.aiRetargetSeconds = Math.max(0, (player.aiRetargetSeconds ?? 0) - deltaSeconds);
  const targetIsValid = player.aiTarget
    && Number.isFinite(player.aiTarget.x)
    && Number.isFinite(player.aiTarget.y);

  if (!targetIsValid || player.aiRetargetSeconds <= 0) {
    player.aiTarget = chooseSupportTarget(state);
    player.aiRetargetSeconds = 1.2 + nextRandom(state) * 1.2;
  }

  moveToward(player, player.aiTarget, AI_SPEED, deltaSeconds);
}

function updateHomeSupportAi(state, controlled, deltaSeconds) {
  for (const player of state.players) {
    if (player.team !== 'home'
        || player.role === 'goalkeeper'
        || player.id === controlled?.id
        || player.id === state.ball.ownerId
        || state.rainbowReflection?.playerId === player.id) continue;
    updateHomeSupportPlayer(state, player, deltaSeconds);
  }
}

function targetForRole(player, possessionTeam, ball, ballCarrier) {
  if (player.role === 'goalkeeper') {
    const x = player.team === 'home' ? 48 : FIELD.width - 48;
    return { x, y: clamp(ball.y, FIELD.height / 2 - 72, FIELD.height / 2 + 72) };
  }

  const base = {
    goalkeeper: { x: 48, y: FIELD.height / 2 },
    defender: { x: 190, y: player.id.endsWith('2') ? 365 : 175 },
    midfielder: { x: 345, y: player.id.endsWith('2') ? 365 : 175 },
    forward: { x: 480, y: FIELD.height / 2 },
  }[player.role];

  const mirrored = player.team === 'home' ? base : { x: FIELD.width - base.x, y: base.y };
  if (possessionTeam === player.team && ballCarrier && player.role !== 'defender') {
    const towardGoal = player.team === 'home' ? 60 : -60;
    return { x: clamp(ballCarrier.x + towardGoal, 30, FIELD.width - 30), y: ballCarrier.y + (player.id.endsWith('2') ? 65 : -65) };
  }

  return mirrored;
}

function updateAi(state, controlled, input, deltaSeconds, events) {
  const ballCarrier = carrier(state);
  const opponentCarrier = state.players.find((player) => player.team !== 'home' && player.id === state.ball.ownerId);

  if (controlled.stunnedSeconds <= 0 && state.rainbowReflection?.playerId !== controlled.id) {
    if (state.possessionTeam === 'away' && input.down.has('d') && opponentCarrier) {
      moveToward(controlled, opponentCarrier, PRESSURE_SPEED, deltaSeconds);
    } else if (controlled.slideSeconds > 0 && opponentCarrier) {
      moveToward(controlled, opponentCarrier, SLIDE_SPEED, deltaSeconds);
      controlled.slideSeconds = Math.max(0, controlled.slideSeconds - deltaSeconds);
    } else {
      moveByInput(controlled, input.moveX, input.moveY, PLAYER_SPEED, deltaSeconds);
    }
  }

  if (state.possessionTeam === 'away' && input.pressed.has('s')) {
    const homePlayers = state.players.filter((player) => player.team === 'home');
    const index = homePlayers.findIndex((player) => player.id === state.controlledPlayerId);
    state.controlledPlayerId = homePlayers[(index + 1) % homePlayers.length].id;
    controlled = byId(state, state.controlledPlayerId);
  }

  if (state.possessionTeam === 'away' && input.pressed.has('a')) {
    controlled.slideSeconds = 0.25;
  }

  for (const player of state.players) {
    if (player.id === controlled.id) continue;
    if (state.rainbowReflection?.playerId === player.id) continue;
    if (player.id === state.ball.ownerId) {
      const direction = player.team === 'home' ? 1 : -1;
      const goal = { x: direction > 0 ? FIELD.width : 0, y: FIELD.height / 2 };
      const range = distance(player, goal);
      if (player.team === 'away' && range <= 180 && (state.aiShotCooldownSeconds ?? 0) <= 0) {
        events.push(...releaseShot(state, player, 0.72));
        state.aiShotCooldownSeconds = 0.8;
      } else if (player.team === 'home' && range <= 180 && player.id !== state.controlledPlayerId && (state.aiShotCooldownSeconds ?? 0) <= 0) {
        events.push(...releaseShot(state, player, 0.72));
        state.aiShotCooldownSeconds = 0.8;
      } else {
        moveToward(player, goal, AI_SPEED, deltaSeconds);
      }
      continue;
    }

    if (player.team === 'home' && player.role !== 'goalkeeper') {
      updateHomeSupportPlayer(state, player, deltaSeconds);
      continue;
    }

    const target = targetForRole(player, state.possessionTeam, state.ball, ballCarrier);
    moveToward(player, target, player.role === 'goalkeeper' ? KEEPER_SPEED : AI_SPEED, deltaSeconds);
  }

  const tackleRange = controlled.powerTackleSeconds > 0 ? 39 : 26;
  if (opponentCarrier && controlled.slideSeconds > 0 && distance(controlled, opponentCarrier) <= tackleRange) {
    setBallOwner(state, controlled);
    state.controlledPlayerId = controlled.id;
    events.push({ type: 'tackle', team: 'home', playerId: controlled.id });
  }

  const homeCarrier = state.players.find((player) => player.team === 'home' && player.id === state.ball.ownerId);
  if (homeCarrier && homeCarrier.id !== controlled.id && distance(homeCarrier, controlled) < 25 && input.pressed.has('s')) {
    state.controlledPlayerId = homeCarrier.id;
  }
  return byId(state, state.controlledPlayerId);
}

function maybeUseAiSkill(state, team, events) {
  if ((state.skillGauge?.[team] ?? 0) < MAX_SKILL_GAUGE) return;
  const opponentCarrier = state.players.find((player) => player.team !== team && player.id === state.ball.ownerId);
  const candidates = state.players.filter((player) => player.team === team && SKILL_IDS.includes(player.skillId));

  for (const player of candidates) {
    if (player.skillId === 'rainbowReflect') continue;
    if (['eagleShot', 'tornadoShot'].includes(player.skillId)
        && (state.ball.ownerId !== player.id || state.possessionTeam !== team)) continue;
    if (player.skillId === 'powerTackle'
        && (!opponentCarrier || distance(player, opponentCarrier) > 180)) continue;
    if (player.skillId === 'vacuumCleaner'
        && (state.ball.ownerId === player.id || distance(player, state.ball) > 220)) continue;

    const attempt = applySkill(state, player.id);
    if (attempt.ok) {
      events.push(...attempt.events);
      return;
    }
  }
}

function advanceVacuum(state, deltaSeconds) {
  const effect = state.vacuumEffect;
  const player = byId(state, effect?.playerId);
  if (!effect || !player) {
    delete state.vacuumEffect;
    return [];
  }

  const dx = player.x - state.ball.x;
  const dy = player.y - state.ball.y;
  const length = Math.hypot(dx, dy) || 1;
  const travel = Math.min(length, 440 * deltaSeconds);
  state.ball.x = clamp(state.ball.x + dx / length * travel, 0, FIELD.width);
  state.ball.y = clamp(state.ball.y + dy / length * travel, 0, FIELD.height);
  state.ball.vx = 0;
  state.ball.vy = 0;
  effect.remainingSeconds -= deltaSeconds;

  if (length <= 18 || effect.remainingSeconds <= 0) {
    setBallOwner(state, player);
    putBallAtPlayer(state, player);
    if (player.role === 'goalkeeper') {
      state.phase = 'goalKick';
      state.phaseSeconds = 1;
    }
    if (player.team === 'home') state.controlledPlayerId = player.id;
    delete state.vacuumEffect;
    return [{ type: 'vacuumComplete', team: player.team, playerId: player.id }];
  }
  return [];
}

function awardSkillGauge(state, events) {
  for (const event of events) {
    if (event.type === 'pass' && event.completed) addSkillGauge(state, 'pass', event.team);
    if (event.type === 'tackle') addSkillGauge(state, 'tackle', event.team);
    if (event.type === 'shotOnTarget') addSkillGauge(state, 'shotOnTarget', event.team);
    if (event.type === 'keeperCatch') addSkillGauge(state, 'keeperCatch', event.team);
  }
}

function updateOwnedBall(state) {
  const player = carrier(state);
  if (!player) return;
  putBallAtPlayer(state, player);
}

function beginGoalKick(state, deltaSeconds) {
  state.phaseSeconds -= deltaSeconds;
  if (state.phaseSeconds > 0) return [];

  const keeper = carrier(state);
  state.phase = 'playing';
  delete state.phaseSeconds;
  if (keeper) {
    const direction = keeper.team === 'home' ? 1 : -1;
    state.ball.ownerId = null;
    state.ball.vx = direction * 275;
    state.ball.vy = clamp((FIELD.height / 2 - keeper.y) * 1.2, -90, 90);
    state.ball.flightKind = 'shot';
    state.ball.flightSeconds = 0;
    state.ball.lastTouchTeam = keeper.team;
    state.possessionTeam = keeper.team;
  }
  return [{ type: 'goalKick', team: keeper?.team }];
}

function beginKickoff(state, deltaSeconds) {
  state.phaseSeconds -= deltaSeconds;
  if (state.phaseSeconds > 0) return [];
  const team = state.pendingKickoffTeam ?? 'home';
  delete state.pendingKickoffTeam;
  delete state.phaseSeconds;
  resetForKickoff(state, team);
  return [{ type: 'kickoff', team }];
}

/** Advance the football simulation by one clamped frame, mutating state in place. */
export function stepGame(state, inputFrame = {}, deltaSeconds = 0) {
  if (!state || !Array.isArray(state.players) || !state.ball) {
    throw new TypeError('stepGame에는 유효한 경기 상태가 필요합니다.');
  }

  const dt = clamp(Number.isFinite(deltaSeconds) ? deltaSeconds : 0, 0, MAX_DELTA);
  const input = {
    moveX: Number.isFinite(inputFrame.moveX) ? inputFrame.moveX : 0,
    moveY: Number.isFinite(inputFrame.moveY) ? inputFrame.moveY : 0,
    down: inputFrame.down instanceof Set ? inputFrame.down : new Set(),
    pressed: inputFrame.pressed instanceof Set ? inputFrame.pressed : new Set(),
    released: inputFrame.released instanceof Set ? inputFrame.released : new Set(),
  };
  const events = [];

  if (state.phase === 'finished' || dt === 0) return events;
  state.aiShotCooldownSeconds = Math.max(0, (state.aiShotCooldownSeconds ?? 0) - dt);
  for (const player of state.players) {
    player.stunnedSeconds = Math.max(0, (player.stunnedSeconds ?? 0) - dt);
    player.powerTackleSeconds = Math.max(0, (player.powerTackleSeconds ?? 0) - dt);
  }

  if (state.phase === 'goalPause') return beginKickoff(state, dt);
  if (state.phase === 'goalKick') return beginGoalKick(state, dt);

  if (state.phase === 'playing' || state.phase === 'overtime') {
    addSkillGauge(state, 'time', 'home', dt);
    addSkillGauge(state, 'time', 'away', dt);
  }

  if (state.phase === 'playing') {
    state.remainingSeconds = Math.max(0, state.remainingSeconds - dt);
    if (state.remainingSeconds === 0) {
      if (state.score.home === state.score.away) {
        state.phase = 'overtime';
        events.push({ type: 'overtime' });
      } else {
        return finishMatch(state);
      }
    }
  }

  let controlled = byId(state, state.controlledPlayerId);
  if (!controlled) throw new Error(`조작 선수를 찾을 수 없습니다: ${state.controlledPlayerId}`);

  for (const team of ['home', 'away']) {
    const reflectionEvent = applyAutomaticRainbowReflect(state, team, dt);
    if (reflectionEvent) events.push(reflectionEvent);
  }

  if (input.pressed.has('f') && state.rainbowReflection?.playerId !== controlled.id) {
    const attempt = applySkill(state, controlled.id);
    if (attempt.ok) events.push(...attempt.events);
  }
  maybeUseAiSkill(state, 'away', events);

  if (state.possessionTeam === 'home') {
    if (state.rainbowReflection?.playerId !== controlled.id) {
      moveByInput(controlled, input.moveX, input.moveY, PLAYER_SPEED, dt);
      events.push(...controlBallAction(state, controlled, input, dt));
    }
    updateHomeSupportAi(state, byId(state, state.controlledPlayerId), dt);
  } else {
    controlled = updateAi(state, controlled, input, dt, events);
  }

  if (state.vacuumEffect) {
    events.push(...advanceVacuum(state, dt));
  } else {
    const owner = carrier(state);
    if (owner && owner.id === controlled.id && state.possessionTeam === 'home') {
      updateOwnedBall(state);
    } else if (state.ball.ownerId && owner) {
      const direction = unit(owner.team === 'home' ? 1 : -1, 0);
      owner.facingX = direction.x;
      updateOwnedBall(state);
    } else {
      integrateLooseBall(state, dt);
      events.push(...handleKeeperContact(state));
      events.push(...checkBallBoundary(state));
      if (!['goalPause', 'goalKick', 'finished'].includes(state.phase)) {
        events.push(...collectLooseBall(state));
      }
    }
  }

  awardSkillGauge(state, events);
  return events;
}

export { MAX_DELTA };
