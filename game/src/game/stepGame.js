import {
  BALL_GRAVITY,
  BALL_RADIUS,
  EAGLE_ASCENT_SECONDS,
  EAGLE_FLIGHT_HEIGHT,
  EAGLE_SHOT_INTERVAL_SECONDS,
  FIELD,
  GROUND_CLEARANCE_DISTANCE,
  GOLDEN_GOAL_SECONDS,
  getAiTuning,
  HEADER_HEIGHT_MAX,
  HEADER_HEIGHT_MIN,
  HEADER_RADIUS,
  LOB_CLEARANCE_DISTANCE,
  LOB_VERTICAL_VELOCITY,
  PLAYER_BODY_WIDTH,
  SHOT_ASSIST_DISTANCE,
  SHOT_ASSIST_MAX,
  KICKOFF_CIRCLE_RADIUS,
  SPRINT_DRAIN_PER_SECOND,
  SPRINT_RECOVERY_PER_SECOND,
  SPRINT_STAMINA_MAX,
  WORLD_SPLIT_SLIDE_SPEED,
} from './constants.js';
import { createInitialGameState, getBaseFormationPositions } from './createInitialGameState.js';
import { addSkillEffect, activateNextTeamSkill, spawnNextEagleProjectile } from './skills.js';

const PLAYER_SPEED = 176;
const AI_SPEED = 136;
const KEEPER_SPEED = 95;
const PRESSURE_SPEED = 190;
const SLIDE_SPEED = 160;
const SPRINT_SPEED_MULTIPLIER = 1.35;
const MAX_DELTA = 0.05;
const INTERCEPTION_RADIUS = 16;
const AI_MIN_PASS_DISTANCE = 48;
const AI_MAX_PASS_DISTANCE = 330;
const KNOCKDOWN_SECONDS = 1;
const KEEPER_REACH_Y = 44;
const KEEPER_REACTION_SECONDS = 0.12;
const KEEPER_MAX_DIVE_DISTANCE = 68;
const KEEPER_DIVE_SECONDS = 0.42;
const KEEPER_RECOVER_SECONDS = 0.24;
const KEEPER_MAX_SAVE_HEIGHT = 56;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function segmentProjection(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-9) return 0;
  return clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
}

function segmentDistance(point, start, end) {
  const progress = segmentProjection(point, start, end);
  return distance(point, { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress });
}

export function applyTornadoContacts(state, previousBallPosition, currentBallPosition) {
  const effect = state?.tornadoShotEffect;
  if (!effect) return [];
  if (![previousBallPosition?.x, previousBallPosition?.y, currentBallPosition?.x, currentBallPosition?.y]
    .every(Number.isFinite)) return [];

  const source = state.players.find((player) => player.id === effect.sourcePlayerId);
  if (!source || source.dismissed) {
    state.tornadoShotEffect = null;
    return [];
  }

  if (!Array.isArray(effect.hitPlayerIds)) effect.hitPlayerIds = [];
  const level = clamp(Number.isInteger(effect.level) ? effect.level : 1, 1, 3);
  const fallbackWidth = 2 * PLAYER_BODY_WIDTH * (1 + (level - 1) * 0.25);
  const pathWidth = Number.isFinite(effect.pathWidth) ? Math.max(0, effect.pathWidth) : fallbackWidth;
  const contactRadius = pathWidth / 2 + PLAYER_BODY_WIDTH / 2;
  const events = [];

  for (const player of state.players) {
    if (player.id === source.id || player.dismissed || effect.hitPlayerIds.includes(player.id)
        || !Number.isFinite(player.x) || !Number.isFinite(player.y)) continue;
    if (segmentDistance(player, previousBallPosition, currentBallPosition) > contactRadius) continue;
    player.airborneSecondsRemaining = 5;
    player.statusDurationSeconds = { ...(player.statusDurationSeconds ?? {}), airborne: 5 };
    player.statusDurationSeconds = { ...(player.statusDurationSeconds ?? {}), airborne: 5 };
    player.airborneFromTeam = effect.team;
    player.airborneSourcePlayerId = source.id;
    player.airborneSkillId = 'tornadoShot';
    effect.hitPlayerIds.push(player.id);
    events.push({ type: 'tornadoLift', skillId: 'tornadoShot', team: effect.team,
      playerId: player.id, level, durationSeconds: 5 });
  }
  return events;
}

function barrierSegment(barrier) {
  return { start: { x: barrier.x, y: barrier.y }, end: {
    x: barrier.x + barrier.facingX * barrier.length,
    y: barrier.y + barrier.facingY * barrier.length,
  } };
}

function barrierSegments(barrier) {
  const center = barrierSegment(barrier);
  const offset = Math.max(0, barrier.wallOffset ?? 0);
  if (offset === 0) return [center];
  const normal = { x: -barrier.facingY, y: barrier.facingX };
  return [-offset, offset].map((sideOffset) => ({
    start: { x: center.start.x + normal.x * sideOffset, y: center.start.y + normal.y * sideOffset },
    end: { x: center.end.x + normal.x * sideOffset, y: center.end.y + normal.y * sideOffset },
  }));
}

function blockedByBarrier(state, point, radius = 0, objectHeight = 0) {
  return (state.powerBarriers ?? []).some((barrier) => {
    if (objectHeight > (barrier.height ?? 72)) return false;
    return barrierSegments(barrier).some(({ start, end }) =>
      segmentDistance(point, start, end) <= barrier.thickness / 2 + radius);
  });
}

function blockedByBarrierSegment(state, start, end, radius, objectHeight) {
  const length = distance(start, end);
  const steps = Math.max(1, Math.ceil(length / Math.max(4, radius / 2)));
  for (let index = 0; index <= steps; index += 1) {
    const progress = index / steps;
    const point = {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
    };
    if (blockedByBarrier(state, point, radius, objectHeight)) return true;
  }
  return false;
}

function enforcePowerBarriers(state, frameStartPositions) {
  for (const player of state.players) {
    if (player.dismissed) continue;
    for (const barrier of state.powerBarriers ?? []) {
      if (barrier.sourcePlayerId === player.id) continue;
      for (const { start, end } of barrierSegments(barrier)) {
        if (segmentDistance(player, start, end) > barrier.thickness / 2 + 12) continue;
        const normal = { x: -barrier.facingY, y: barrier.facingX };
        const origin = frameStartPositions?.get(player.id) ?? player;
        const startSide = (origin.x - start.x) * normal.x + (origin.y - start.y) * normal.y;
        const signedSide = (player.x - start.x) * normal.x + (player.y - start.y) * normal.y;
        const crossed = startSide !== 0 && Math.sign(startSide) !== Math.sign(signedSide);
        const side = Math.sign(crossed ? startSide : signedSide || startSide || (player.vx * normal.x + player.vy * normal.y) || 1);
        const projection = segmentProjection(player, start, end);
        const center = { x: start.x + (end.x - start.x) * projection, y: start.y + (end.y - start.y) * projection };
        player.x = clamp(center.x + normal.x * side * (barrier.thickness / 2 + 12), 0, FIELD.width);
        player.y = clamp(center.y + normal.y * side * (barrier.thickness / 2 + 12), 0, FIELD.height);
        if ((player.launchSecondsRemaining ?? 0) <= 0) {
          player.vx = 0;
          player.vy = 0;
        }
      }
    }
  }
}

const unit = (x, y) => {
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
};

function setTimedMotion(player, action, durationSeconds = 0.36) {
  if (!player) return;
  player.motionAction = action;
  player.motionTimerSeconds = durationSeconds;
}

function byId(state, id) {
  return state.players.find((player) => player.id === id) ?? null;
}

function carrier(state) {
  return byId(state, state.ball.ownerId);
}

function moveToward(player, target, speed, deltaSeconds, allowSprint = true) {
  if (advanceWorldSplitSlide(player, deltaSeconds)) return;
  if (!player || !target || player.dismissed || player.stunnedSeconds > 0
      || player.knockdownSeconds > 0 || player.motionAction === 'recover'
      || (player.airborneSecondsRemaining ?? 0) > 0) return;
  const direction = unit(target.x - player.x, target.y - player.y);
  const distanceToTarget = distance(player, target);
  player.sprinting = allowSprint && player.role !== 'goalkeeper' && speed === AI_SPEED
    && distanceToTarget > 90 && player.sprintStamina > 0;
  const actualSpeed = speed * (player.sprinting ? SPRINT_SPEED_MULTIPLIER : 1);
  const travel = Math.min(distanceToTarget, actualSpeed * deltaSeconds);
  player.vx = direction.x * actualSpeed;
  player.vy = direction.y * actualSpeed;
  player.x = clamp(player.x + direction.x * travel, 0, FIELD.width);
  player.y = clamp(player.y + direction.y * travel, 0, FIELD.height);
  if (direction.x !== 0 || direction.y !== 0) {
    player.facingX = Math.sign(direction.x);
    player.facingY = Math.sign(direction.y);
    if ((player.motionTimerSeconds ?? 0) <= 0) player.motionAction = 'run';
  }
}

function moveByInput(player, moveX, moveY, speed, deltaSeconds, sprintRequested = false) {
  if (advanceWorldSplitSlide(player, deltaSeconds)) return;
  if (!player || player.dismissed || player.stunnedSeconds > 0
      || player.knockdownSeconds > 0 || player.motionAction === 'recover'
      || (player.airborneSecondsRemaining ?? 0) > 0) return;
  const direction = unit(
    Number.isFinite(moveX) ? moveX : 0,
    Number.isFinite(moveY) ? moveY : 0,
  );
  player.sprinting = Boolean(sprintRequested && (direction.x !== 0 || direction.y !== 0)
    && player.sprintStamina > 0);
  const actualSpeed = speed * (player.sprinting ? SPRINT_SPEED_MULTIPLIER : 1);
  player.vx = direction.x * actualSpeed;
  player.vy = direction.y * actualSpeed;
  player.x = clamp(player.x + player.vx * deltaSeconds, 0, FIELD.width);
  player.y = clamp(player.y + player.vy * deltaSeconds, 0, FIELD.height);
  if (direction.x !== 0 || direction.y !== 0) {
    player.facingX = Math.sign(direction.x);
    player.facingY = Math.sign(direction.y);
    if ((player.motionTimerSeconds ?? 0) <= 0) player.motionAction = 'run';
  }
}

function advanceWorldSplitSlide(player, deltaSeconds) {
  const remaining = player?.worldSplitSlideSecondsRemaining ?? 0;
  if (!player || remaining <= 0) return false;
  const step = Math.min(remaining, deltaSeconds);
  const direction = unit(player.worldSplitSlideDirectionX ?? player.facingX ?? 1,
    player.worldSplitSlideDirectionY ?? player.facingY ?? 0);
  player.worldSplitSlideSecondsRemaining = Math.max(0, remaining - step);
  player.vx = direction.x * WORLD_SPLIT_SLIDE_SPEED;
  player.vy = direction.y * WORLD_SPLIT_SLIDE_SPEED;
  player.x = clamp(player.x + player.vx * step, 0, FIELD.width);
  player.y = clamp(player.y + player.vy * step, 0, FIELD.height);
  player.facingX = direction.x;
  player.facingY = direction.y;
  player.sprinting = false;
  player.motionAction = player.worldSplitSlideSecondsRemaining > 0 ? 'tackle' : 'idle';
  return true;
}

function advanceSprintStamina(players, deltaSeconds) {
  for (const player of players) {
    const rate = player.sprinting ? -SPRINT_DRAIN_PER_SECOND : SPRINT_RECOVERY_PER_SECOND;
    player.sprintStamina = clamp((player.sprintStamina ?? SPRINT_STAMINA_MAX) + rate * deltaSeconds, 0, SPRINT_STAMINA_MAX);
    if (player.sprintStamina === 0) player.sprinting = false;
  }
}

function enforceKickoffCircle(state) {
  if (!state.kickoffLocked) return;
  const center = { x: FIELD.width / 2, y: FIELD.height / 2 };
  for (const player of state.players) {
    if (player.dismissed || player.id === state.kickoffTakerId) continue;
    const dx = player.x - center.x;
    const dy = player.y - center.y;
    const radius = Math.hypot(dx, dy);
    if (radius >= KICKOFF_CIRCLE_RADIUS) continue;
    const fallbackX = player.team === state.possessionTeam
      ? (player.team === 'home' ? -1 : 1)
      : (player.team === 'home' ? 1 : -1);
    const direction = radius > 0.001 ? { x: dx / radius, y: dy / radius } : { x: fallbackX, y: 0 };
    player.x = clamp(center.x + direction.x * KICKOFF_CIRCLE_RADIUS, 0, FIELD.width);
    player.y = clamp(center.y + direction.y * KICKOFF_CIRCLE_RADIUS, 0, FIELD.height);
  }
}

function releaseKickoffLockIfBallCleared(state) {
  if (!state.kickoffLocked) return;
  const center = { x: FIELD.width / 2, y: FIELD.height / 2 };
  if (distance(state.ball, center) < 12) return;
  const owner = carrier(state);
  const taker = byId(state, state.kickoffTakerId);
  const takerCarriedClear = owner?.id === state.kickoffTakerId && taker && distance(taker, center) >= 1;
  const ballWasKicked = !owner || owner.id !== state.kickoffTakerId || state.ball.flightKind !== 'ground';
  if (takerCarriedClear || ballWasKicked) {
    state.kickoffLocked = false;
    state.kickoffTakerId = null;
  }
}

function placeKickoffPlayers(state, kickoffTeam) {
  const center = { x: FIELD.width / 2, y: FIELD.height / 2 };
  const expectedTakerId = `${kickoffTeam}-fw`;
  const taker = byId(state, expectedTakerId);
  const actualTaker = taker && !taker.dismissed
    ? taker
    : nearestPlayer(activePlayers(state, kickoffTeam), center);
  state.kickoffTakerId = actualTaker?.id ?? null;
  state.kickoffLocked = Boolean(actualTaker);
  for (const player of state.players) {
    if (player.id === state.kickoffTakerId) {
      player.x = center.x;
      player.y = center.y;
      continue;
    }
    const dx = player.x - center.x;
    const dy = player.y - center.y;
    const radius = Math.hypot(dx, dy);
    if (radius >= KICKOFF_CIRCLE_RADIUS) continue;
    const towardOwnSide = player.team === kickoffTeam;
    const directionX = player.team === 'home' ? -1 : 1;
    const useOwnSide = towardOwnSide ? directionX : -directionX;
    player.x = center.x + useOwnSide * (KICKOFF_CIRCLE_RADIUS + 18);
    player.y = center.y;
  }
}

function setBallOwner(state, player) {
  if (!player) return;
  state.tornadoShotEffect = null;
  state.ball.ownerId = player.id;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.height = 0;
  state.ball.verticalVelocity = 0;
  state.ball.flightKind = 'ground';
  state.ball.flightSeconds = 0;
  delete state.ball.flightDurationSeconds;
  delete state.ball.passTeam;
  delete state.ball.passReceiverId;
  delete state.ball.passTarget;
  delete state.ball.flightTarget;
  state.ball.passProtectionSeconds = 0;
  delete state.ball.lastHeaderPlayerId;
  state.ball.lastTouchTeam = player.team;
  delete state.ball.skillId;
  delete state.ball.skillLevel;
  delete state.ball.scoreValue;
  state.possessionTeam = player.team;
}

function putBallAtPlayer(state, player) {
  state.ball.x = clamp(player.x + player.facingX * 17, 0, FIELD.width);
  state.ball.y = clamp(player.y + player.facingY * 17, 0, FIELD.height);
}

function getTeammates(state, player) {
  return state.players.filter((candidate) => candidate.team === player.team
    && candidate.id !== player.id
    && !candidate.dismissed);
}

function facingFor(player) {
  const facing = unit(player.facingX, player.facingY);
  return facing.x !== 0 || facing.y !== 0
    ? facing
    : { x: player.team === 'home' ? 1 : -1, y: 0 };
}

function chooseReceiver(state, passer, kind) {
  const facing = facingFor(passer);
  const candidates = getTeammates(state, passer)
    .filter((candidate) => candidate.role !== 'goalkeeper')
    .map((candidate) => {
      const dx = candidate.x - passer.x;
      const dy = candidate.y - passer.y;
      const forwardDistance = dx * facing.x + dy * facing.y;
      return { candidate, forwardDistance, distance: Math.hypot(dx, dy) };
    })
    .filter((entry) => entry.forwardDistance > 0)
    .sort((left, right) => kind === 'lobPass'
      ? right.forwardDistance - left.forwardDistance || right.distance - left.distance
      : left.distance - right.distance || right.forwardDistance - left.forwardDistance);

  return candidates[0]?.candidate ?? null;
}

function releasePass(state, player, kind, receiverOverride = null) {
  const receiver = receiverOverride ?? chooseReceiver(state, player, kind);
  const facing = facingFor(player);
  putBallAtPlayer(state, player);
  const clearDistance = kind === 'lobPass' ? LOB_CLEARANCE_DISTANCE : GROUND_CLEARANCE_DISTANCE;
  const target = receiver
    ? { x: receiver.x, y: receiver.y }
    : {
      x: clamp(state.ball.x + facing.x * clearDistance, 0, FIELD.width),
      y: clamp(state.ball.y + facing.y * clearDistance, 0, FIELD.height),
    };
  const direction = unit(target.x - state.ball.x, target.y - state.ball.y);
  if (direction.x === 0 && direction.y === 0) return [];
  if (!state.hasMatchClockStarted && player.id === state.openingKickoffTakerId) {
    state.hasMatchClockStarted = true;
  }
  setTimedMotion(player, 'pass', 0.32);
  const speed = kind === 'lobPass' ? 300 : 330;
  state.ball.ownerId = null;
  state.ball.vx = direction.x * speed;
  state.ball.vy = direction.y * speed;
  const attackDirection = player.team === 'home' ? 1 : -1;
  const isForward = direction.x * attackDirection > 0.2;
  const receiverIsWide = target.y < FIELD.height * 0.22 || target.y > FIELD.height * 0.78;
  const isWide = receiverIsWide || player.y < FIELD.height * 0.22 || player.y > FIELD.height * 0.78;
  const flightKind = kind === 'lobPass'
    ? (isWide && isForward ? 'cross' : 'lob')
    : 'ground';
  state.ball.flightKind = flightKind;
  state.ball.flightSeconds = 0;
  const targetDistance = distance(target, state.ball);
  state.ball.flightDurationSeconds = Math.max(0.35, targetDistance / speed);
  state.ball.height = 0;
  state.ball.verticalVelocity = flightKind === 'ground' ? 0 : LOB_VERTICAL_VELOCITY;
  delete state.ball.lastHeaderPlayerId;
  delete state.ball.skillId;
  state.ball.passTeam = player.team;
  state.ball.passReceiverId = kind === 'groundPass' && receiver ? receiver.id : null;
  state.ball.flightTarget = flightKind === 'ground' ? null : target;
  if (kind === 'groundPass') {
    state.ball.passTarget = target;
    state.ball.passProtectionSeconds = 0;
  } else {
    delete state.ball.passTarget;
    state.ball.passProtectionSeconds = 0;
  }
  state.ball.lastTouchTeam = player.team;
  state.possessionTeam = player.team;
  if (player.team === 'home' && receiver) state.controlledPlayerId = receiver.id;

  return [{
    type: 'pass', team: player.team,
    action: kind === 'lobPass' && !receiver ? 'clearance' : kind,
    receiverId: receiver?.id ?? null, completed: false,
  }];
}

function releaseShot(state, player) {
  const attackDirection = player.team === 'home' ? 1 : -1;
  const facing = facingFor(player);

  putBallAtPlayer(state, player);
  if (!state.hasMatchClockStarted && player.id === state.openingKickoffTakerId) {
    state.hasMatchClockStarted = true;
  }
  setTimedMotion(player, 'shot', 0.42);
  const start = { x: state.ball.x, y: state.ball.y };
  const goalX = attackDirection > 0 ? FIELD.width : 0;
  let direction = facing;
  if (facing.x * attackDirection > 0) {
    const distanceToGoal = (goalX - start.x) / facing.x;
    if (Number.isFinite(distanceToGoal) && distanceToGoal > 0) {
      const rawTargetY = start.y + facing.y * distanceToGoal;
      const distanceToGoalMouth = Math.hypot(goalX - start.x, rawTargetY - start.y);
      const assist = clamp(1 - distanceToGoalMouth / SHOT_ASSIST_DISTANCE, 0, SHOT_ASSIST_MAX);
      const nearestGoalY = clamp(rawTargetY, FIELD.goalTop + 10, FIELD.goalBottom - 10);
      const assistedTargetY = rawTargetY + (nearestGoalY - rawTargetY) * assist;
      direction = unit(goalX - start.x, assistedTargetY - start.y);
    }
  }
  const speed = player.team === 'home' ? 500 : 430;
  state.ball.ownerId = null;
  state.ball.vx = direction.x * speed;
  state.ball.vy = direction.y * speed;
  state.ball.flightKind = 'shot';
  state.ball.flightSeconds = 0;
  delete state.ball.skillId;
  delete state.ball.skillLevel;
  delete state.ball.scoreValue;
  state.ball.height = 0;
  state.ball.verticalVelocity = 0;
  delete state.ball.flightDurationSeconds;
  delete state.ball.skillId;
  delete state.ball.passTeam;
  delete state.ball.passReceiverId;
  delete state.ball.passTarget;
  delete state.ball.flightTarget;
  state.ball.passProtectionSeconds = 0;
  state.ball.lastTouchTeam = player.team;
  state.possessionTeam = player.team;

  const distanceToGoal = (goalX - start.x) / direction.x;
  const targetY = start.y + direction.y * distanceToGoal;
  const onTarget = distanceToGoal > 0
    && targetY >= FIELD.goalTop
    && targetY <= FIELD.goalBottom;
  return [{ type: 'shot', team: player.team }, ...(onTarget ? [{ type: 'shotOnTarget', team: player.team }] : [])];
}

function shotCanReachGoal(player) {
  const attackDirection = player.team === 'home' ? 1 : -1;
  const facing = player.facingX === 0 && player.facingY === 0
    ? { x: attackDirection, y: 0 }
    : { x: player.facingX, y: player.facingY };
  const direction = unit(facing.x, facing.y);
  if (direction.x * attackDirection <= 0) return false;
  const start = {
    x: clamp(player.x + direction.x * 17, 0, FIELD.width),
    y: clamp(player.y + direction.y * 17, 0, FIELD.height),
  };
  const goalX = attackDirection > 0 ? FIELD.width : 0;
  const distanceToGoal = (goalX - start.x) / direction.x;
  if (!Number.isFinite(distanceToGoal) || distanceToGoal <= 0) return false;
  const targetY = start.y + direction.y * distanceToGoal;
  return targetY >= FIELD.goalTop && targetY <= FIELD.goalBottom;
}

function predictGoalCrossing(ball, goalX) {
  if (!ball || !['shot', 'skill-shot'].includes(ball.flightKind)
      || ball.skillId === 'eagleShot'
      || ![ball.x, ball.y, ball.vx, ball.vy, goalX].every(Number.isFinite)
      || Math.abs(ball.vx) < 1e-6) return null;
  const seconds = (goalX - ball.x) / ball.vx;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const y = ball.y + ball.vy * seconds;
  const verticalVelocity = Number.isFinite(ball.verticalVelocity) ? ball.verticalVelocity : 0;
  const height = Math.max(0, (ball.height ?? 0) + verticalVelocity * seconds - 0.5 * BALL_GRAVITY * seconds * seconds);
  if (!Number.isFinite(y) || !Number.isFinite(height)) return null;
  return { seconds, y, height };
}

function keeperThreat(state, keeper) {
  const ball = state.ball;
  if (!keeper || ball.lastTouchTeam === keeper.team || !['home', 'away'].includes(ball.lastTouchTeam)) return null;
  const goalX = keeper.team === 'home' ? -BALL_RADIUS : FIELD.width + BALL_RADIUS;
  const crossing = predictGoalCrossing(ball, goalX);
  if (!crossing || crossing.y < FIELD.goalTop + BALL_RADIUS || crossing.y > FIELD.goalBottom - BALL_RADIUS
      || crossing.height > KEEPER_MAX_SAVE_HEIGHT) return null;
  const movementBudget = Math.min(KEEPER_MAX_DIVE_DISTANCE,
    KEEPER_SPEED * Math.max(0, crossing.seconds - KEEPER_REACTION_SECONDS) + KEEPER_REACH_Y);
  return {
    ...crossing,
    reachable: Math.abs(crossing.y - keeper.y) <= movementBudget,
  };
}

function resetForKickoff(state, kickoffTeam) {
  const fresh = createInitialGameState({
    stage: state.stage,
    teamSkillDeck: state.teamSkillDecks?.home,
    opponentSkillDeck: state.teamSkillDecks?.away,
    teamBranding: state.teamBranding,
  });
  const score = { ...state.score };
  const hasMatchClockStarted = state.hasMatchClockStarted;
  const openingKickoffTakerId = state.openingKickoffTakerId;
  const remainingSeconds = state.remainingSeconds;
  const overtimeRemainingSeconds = state.overtimeRemainingSeconds;
  const teamSkillDecks = state.teamSkillDecks;
  const skillCooldownRemaining = Object.fromEntries(['home', 'away'].map((team) => [
    team, { ...(state.skillCooldownRemaining?.[team] ?? {}) },
  ]));
  const skillQueueIndex = { ...(state.skillQueueIndex ?? { home: 0, away: 0 }) };
  const lastSkillCasterByTeam = { ...(state.lastSkillCasterByTeam ?? { home: null, away: null }) };
  const controlledPlayerId = state.controlledPlayerId;
  const controlledPlayer = byId(state, controlledPlayerId);
  const controlledPosition = controlledPlayer ? { x: controlledPlayer.x, y: controlledPlayer.y } : { x: FIELD.width / 2, y: FIELD.height / 2 };
  const dismissals = new Map(state.players.map((player) => [player.id, Boolean(player.dismissed)]));

  Object.assign(state, fresh, {
    score,
    hasMatchClockStarted,
    openingKickoffTakerId,
    remainingSeconds,
    overtimeRemainingSeconds,
    teamSkillDecks,
    skillCooldownRemaining,
    skillQueueIndex,
    lastSkillCasterByTeam,
  });
  for (const player of state.players) {
    player.dismissed = dismissals.get(player.id) ?? false;
  }
  state.possessionTeam = kickoffTeam;
  placeKickoffPlayers(state, kickoffTeam);
  state.ball.ownerId = state.kickoffTakerId;
  state.ball.lastTouchTeam = kickoffTeam;
  if (state.players.some((player) => player.id === state.ball.ownerId && player.dismissed)) {
    const restartPlayer = nearestPlayer(activePlayers(state, kickoffTeam), { x: FIELD.width / 2, y: FIELD.height / 2 });
    state.ball.ownerId = restartPlayer?.id ?? null;
    state.kickoffTakerId = restartPlayer?.id ?? null;
  }
  const homePlayers = activePlayers(state, 'home');
  const stillControlled = byId(state, controlledPlayerId);
  state.controlledPlayerId = kickoffTeam === 'home'
    ? state.kickoffTakerId
    : stillControlled?.team === 'home' && !stillControlled.dismissed
      ? controlledPlayerId
      : nearestPlayer(homePlayers, controlledPosition)?.id ?? null;
  putBallAtPlayer(state, carrier(state));
}

function finishMatch(state) {
  state.phase = 'finished';
  state.restart = null;
  clearSkillTransientState(state);
  if (state.score.home === state.score.away) {
    return [{ type: 'matchDraw', score: { ...state.score } }];
  }
  const won = state.score.home > state.score.away;
  return [{
    type: won ? 'matchWon' : 'matchLost',
    score: { ...state.score },
  }];
}

function clearSkillTransientState(state) {
  clearSkillVfxState(state);
  for (const player of state.players) {
    player.airborneSecondsRemaining = 0;
    player.knockdownSeconds = 0;
    player.stunnedSeconds = 0;
    delete player.statusDurationSeconds;
    delete player.airborneFromTeam;
    delete player.airborneSourcePlayerId;
    delete player.airborneSkillId;
    delete player.airborneReflectedByTeam;
    delete player.knockdownFromTeam;
    delete player.knockdownSourcePlayerId;
    delete player.knockdownSkillId;
    delete player.knockdownReflectedByTeam;
    delete player.stunnedFromTeam;
    delete player.stunnedSourcePlayerId;
    delete player.stunnedSkillId;
  }
}

function clearSkillVfxState(state) {
  state.skillEffects = [];
  state.skillProjectiles = [];
  state.eagleVolley = null;
  state.tornadoShotEffect = null;
  state.powerBarriers = [];
  state.vacuumEffect = null;
  delete state.vacuumPullVisual;
  state.skillCutIn = null;
  delete state.ball.skillId;
  delete state.ball.skillLevel;
  delete state.ball.scoreValue;
}

function scoreGoal(state, scoringTeam) {
  clearSkillVfxState(state);
  const points = 1;
  state.score[scoringTeam] += points;
  state.restart = null;
  const event = { type: 'goal', team: scoringTeam, points, score: { ...state.score } };

  if (state.overtimeRemainingSeconds !== null) {
    return [event, ...finishMatch(state)];
  }

  state.phase = 'goalPause';
  state.phaseSeconds = 1;
  state.pendingKickoffTeam = scoringTeam === 'home' ? 'away' : 'home';
  return [event];
}

function activePlayers(state, team) {
  return state.players.filter((player) => player.team === team && !player.dismissed);
}

function knockDownPlayer(state, player, source, durationSeconds = KNOCKDOWN_SECONDS) {
  if (!player || player.dismissed) return null;
  const dx = player.x - (source?.x ?? player.x);
  const dy = player.y - (source?.y ?? player.y);
  const length = Math.hypot(dx, dy);
  const direction = length > 0 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
  const duration = Math.max(0, Number.isFinite(durationSeconds) ? durationSeconds : KNOCKDOWN_SECONDS);
  player.knockdownSeconds = Math.max(player.knockdownSeconds ?? 0, duration);
  player.statusDurationSeconds = {
    ...(player.statusDurationSeconds ?? {}),
    knockdown: Math.max(player.statusDurationSeconds?.knockdown ?? 0, duration),
  };
  player.statusDurationSeconds = { ...(player.statusDurationSeconds ?? {}), knockdown: duration };
  player.knockdownDirectionX = direction.x;
  player.knockdownDirectionY = direction.y;
  player.motionAction = 'knockdown';
  player.vx = 0;
  player.vy = 0;
  return {
    type: 'playerKnockedDown',
    team: player.team,
    playerId: player.id,
    durationSeconds: duration,
    direction,
  };
}

function advancePlayerRecovery(player, deltaSeconds) {
  if ((player.launchSecondsRemaining ?? 0) > 0) {
    const travel = Math.min(player.launchSecondsRemaining, deltaSeconds);
    player.x = clamp(player.x + (player.vx ?? 0) * travel, 0, FIELD.width);
    player.y = clamp(player.y + (player.vy ?? 0) * travel, 0, FIELD.height);
    player.launchSecondsRemaining = Math.max(0, player.launchSecondsRemaining - deltaSeconds);
    const friction = Math.exp(-5 * deltaSeconds);
    player.vx *= friction;
    player.vy *= friction;
    if (player.launchSecondsRemaining === 0) {
      player.vx = 0;
      player.vy = 0;
    }
  }
  player.motionTimerSeconds = Math.max(0, (player.motionTimerSeconds ?? 0) - deltaSeconds);
  if (player.motionTimerSeconds === 0
      && ['pass', 'shot', 'skill', 'tackle', 'header'].includes(player.motionAction)) player.motionAction = 'idle';
  if (player.knockdownSeconds > 0) {
    player.knockdownSeconds = Math.max(0, player.knockdownSeconds - deltaSeconds);
    if (player.knockdownSeconds === 0) {
      player.motionAction = 'recover';
      player.vx = 0;
      player.vy = 0;
      delete player.knockdownFromTeam;
      delete player.knockdownSourcePlayerId;
      delete player.knockdownSkillId;
      delete player.knockdownReflectedByTeam;
      const statusDurations = { ...(player.statusDurationSeconds ?? {}) };
      delete statusDurations.knockdown;
      if (Object.keys(statusDurations).length) player.statusDurationSeconds = statusDurations;
      else delete player.statusDurationSeconds;
    }
  } else if (player.motionAction === 'recover') {
    player.motionAction = 'idle';
    player.knockdownDirectionX = 0;
    player.knockdownDirectionY = 0;
  }
  player.airborneSecondsRemaining = Math.max(0, (player.airborneSecondsRemaining ?? 0) - deltaSeconds);
  if (player.airborneSecondsRemaining === 0) {
    delete player.airborneFromTeam;
    delete player.airborneSourcePlayerId;
    delete player.airborneSkillId;
    delete player.airborneReflectedByTeam;
    const statusDurations = { ...(player.statusDurationSeconds ?? {}) };
    delete statusDurations.airborne;
    if (Object.keys(statusDurations).length) player.statusDurationSeconds = statusDurations;
    else delete player.statusDurationSeconds;
  }
}

function nearestPlayer(players, point) {
  return players
    .map((player, index) => ({ player, index, distance: distance(player, point) }))
    .sort((a, b) => a.distance - b.distance || a.index - b.index)[0]?.player ?? null;
}

function resolveTackle(state, tackler, ballCarrier, powerTackleActive = false) {
  if (!tackler || !ballCarrier || tackler.dismissed || ballCarrier.dismissed
      || tackler.stunnedSeconds > 0 || tackler.knockdownSeconds > 0
      || ballCarrier.knockdownSeconds > 0 || (tackler.airborneSecondsRemaining ?? 0) > 0
      || (ballCarrier.airborneSecondsRemaining ?? 0) > 0) return [];
  const tackleRange = tackler.powerTackleSeconds > 0 ? 39 : 26;
  if (distance(tackler, ballCarrier) > tackleRange) return [];

  const powered = powerTackleActive || (tackler.powerTackleSeconds ?? 0) > 0;
  tackler.motionAction = 'tackle';
  tackler.motionTimerSeconds = 0.32;
  if (powered) addSkillEffect(state, {
    skillId: 'powerTackle', team: tackler.team, sourcePlayerId: tackler.id,
    targetPlayerId: ballCarrier.id, durationSeconds: 0.48,
  });
  setBallOwner(state, tackler);
  const knockdownEvent = knockDownPlayer(state, ballCarrier, tackler);
  if (tackler.team === 'home') state.controlledPlayerId = tackler.id;
  return [{ type: 'tackle', team: tackler.team, playerId: tackler.id }, ...(knockdownEvent ? [knockdownEvent] : [])];
}

function stopBallAtFieldEdge(state) {
  state.tornadoShotEffect = null;
  state.ball.x = clamp(state.ball.x, 0, FIELD.width);
  state.ball.y = clamp(state.ball.y, 0, FIELD.height);
  state.ball.ownerId = null;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.height = 0;
  state.ball.flightKind = 'ground';
  state.ball.passProtectionSeconds = 0;
  delete state.ball.passTarget;
  delete state.ball.passReceiverId;
  delete state.ball.passTeam;
  delete state.ball.flightTarget;
}

function launchAutomaticRestart(state, player) {
  setBallOwner(state, player);
  const teammates = activePlayers(state, player.team).filter((candidate) => candidate.id !== player.id);
  const receiver = nearestPlayer(teammates, player);
  if (!receiver) {
    putBallAtPlayer(state, player);
    return null;
  }

  const direction = unit(receiver.x - player.x, receiver.y - player.y);
  player.facingX = Math.sign(direction.x) || player.facingX;
  player.facingY = Math.sign(direction.y);
  putBallAtPlayer(state, player);
  state.ball.ownerId = null;
  state.ball.vx = direction.x * 275;
  state.ball.vy = direction.y * 275;
  state.ball.height = 0;
  state.ball.flightKind = 'ground';
  state.ball.flightSeconds = 0;
  state.ball.lastTouchTeam = player.team;
  state.ball.passProtectionSeconds = 0;
  delete state.ball.passTarget;
  delete state.ball.flightDurationSeconds;
  return receiver;
}

function resetActivePlayersToBaseFormation(players) {
  const basePositions = getBaseFormationPositions();
  for (const player of players) {
    if (player.dismissed) continue;
    const basePosition = basePositions.get(player.id);
    if (basePosition) {
      player.x = basePosition.x;
      player.y = basePosition.y;
    }
    player.vx = 0;
    player.vy = 0;
    player.aiTarget = null;
    player.aiRetargetSeconds = 0;
  }
}

function beginManualRestart(state, type, restartTeam, spot) {
  stopBallAtFieldEdge(state);
  const previousControlledPlayerId = type === 'goalKick' && restartTeam === 'home'
    ? state.controlledPlayerId
    : null;
  const takerPool = type === 'goalKick'
    ? activePlayers(state, restartTeam).filter((player) => player.role === 'goalkeeper')
    : activePlayers(state, restartTeam).filter((player) => player.role !== 'goalkeeper');
  const taker = type === 'goalKick'
    ? takerPool[0] ?? null
    : nearestPlayer(takerPool, spot);

  if (!taker) {
    state.ball.x = spot.x;
    state.ball.y = spot.y;
    state.restart = null;
    state.phase = state.overtimeRemainingSeconds === null ? 'playing' : 'overtime';
    return [{ type, team: restartTeam, playerId: null }];
  }

  if (type === 'goalKick') {
    resetActivePlayersToBaseFormation(state.players);
    taker.x = restartTeam === 'home' ? 70 : FIELD.width - 70;
    taker.y = FIELD.height / 2;
    spot = { x: taker.x, y: taker.y };
    if (restartTeam === 'away') positionHomeGoalKickTriangle(state);
  } else {
    taker.x = spot.x;
    taker.y = type === 'throwIn'
      ? clamp(spot.y <= 0 ? 8 : FIELD.height - 8, 0, FIELD.height)
      : spot.y;
  }

  setBallOwner(state, taker);
  state.ball.x = spot.x;
  state.ball.y = spot.y;
  state.restart = {
    type,
    team: restartTeam,
    takerId: taker.id,
    spot: { ...spot },
    readySeconds: 0.35,
    previousControlledPlayerId,
  };
  state.phase = type;
  delete state.phaseSeconds;
  if (restartTeam === 'home') state.controlledPlayerId = taker.id;
  return [{ type, team: restartTeam, playerId: taker.id }];
}

function positionHomeGoalKickTriangle(state) {
  const homeFieldPlayers = activePlayers(state, 'home')
    .filter((player) => player.role !== 'goalkeeper')
    .sort((a, b) => a.role.localeCompare(b.role) || a.id.localeCompare(b.id));
  const centerY = FIELD.height / 2;
  const vertices = [
    { x: FIELD.width * 0.70, y: centerY },
    { x: FIELD.width * 0.60, y: centerY - FIELD.height * 0.19 },
    { x: FIELD.width * 0.60, y: centerY + FIELD.height * 0.19 },
  ];
  homeFieldPlayers.forEach((player, index) => {
    const target = vertices[index];
    if (!target) return;
    player.x = clamp(target.x, 20, FIELD.width - 20);
    player.y = clamp(target.y, 12, FIELD.height - 12);
  });
}

function restartThrowIn(state, restartTeam, exitX, exitY) {
  const spot = {
    x: clamp(exitX, 0, FIELD.width),
    y: exitY <= 0 ? 0 : FIELD.height,
  };
  return beginManualRestart(state, 'throwIn', restartTeam, spot);
}

function restartCorner(state, restartTeam, exitX, exitY) {
  const spot = {
    x: exitX > FIELD.width ? FIELD.width - 18 : 18,
    y: exitY > FIELD.height / 2 ? FIELD.height - 18 : 18,
  };
  return beginManualRestart(state, 'cornerKick', restartTeam, spot);
}

function restartGoalKick(state, restartTeam) {
  const spot = {
    x: restartTeam === 'home' ? 70 : FIELD.width - 70,
    y: FIELD.height / 2,
  };
  return beginManualRestart(state, 'goalKick', restartTeam, spot);
}

function checkBallBoundary(state) {
  const { ball } = state;
  if (ball.x - BALL_RADIUS > FIELD.width
      && ball.y - BALL_RADIUS >= FIELD.goalTop
      && ball.y + BALL_RADIUS <= FIELD.goalBottom) {
    return scoreGoal(state, 'home');
  }
  if (ball.x + BALL_RADIUS < 0
      && ball.y - BALL_RADIUS >= FIELD.goalTop
      && ball.y + BALL_RADIUS <= FIELD.goalBottom) {
    return scoreGoal(state, 'away');
  }

  const lastTouchTeam = ['home', 'away'].includes(ball.lastTouchTeam) ? ball.lastTouchTeam : null;
  if (ball.y + BALL_RADIUS < 0 || ball.y - BALL_RADIUS > FIELD.height) {
    const restartTeam = lastTouchTeam
      ? (lastTouchTeam === 'home' ? 'away' : 'home')
      : 'home';
    return restartThrowIn(state, restartTeam, ball.x, ball.y);
  }

  if (ball.x - BALL_RADIUS > FIELD.width || ball.x + BALL_RADIUS < 0) {
    const attackingTeam = ball.x - BALL_RADIUS > FIELD.width ? 'home' : 'away';
    const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';
    if (!lastTouchTeam) {
      return attackingTeam === 'home'
        ? restartCorner(state, 'home', ball.x, ball.y)
        : restartGoalKick(state, 'home');
    }
    const lastTouch = lastTouchTeam;
    if (lastTouch === attackingTeam) return restartGoalKick(state, defendingTeam);
    return restartCorner(state, attackingTeam, ball.x, ball.y);
  }
  return [];
}

function finishEagleVolley(state, volley) {
  const ball = state.ball;
  const finalProjectile = state.skillProjectiles.at(-1);
  const lastPosition = volley.lastPosition ?? finalProjectile ?? { x: ball.x, y: ball.y };
  const lastOutcome = volley.lastOutcome ?? finalProjectile?.outcome ?? 'blocked';
  state.eagleVolley = null;
  state.skillProjectiles = [];
  ball.ownerId = null;
  ball.vx = 0;
  ball.vy = 0;
  ball.height = 0;
  ball.verticalVelocity = 0;
  ball.flightKind = 'ground';
  ball.flightSeconds = 0;
  delete ball.skillId;
  delete ball.skillLevel;
  delete ball.scoreValue;
  delete ball.flightTarget;
  delete ball.passTarget;
  delete ball.passReceiverId;

  if (volley.points > 0) {
    ball.x = FIELD.width / 2;
    ball.y = FIELD.height / 2;
    state.restart = null;
    if (state.overtimeRemainingSeconds !== null) return finishMatch(state);
    state.phase = 'goalPause';
    state.phaseSeconds = 1;
    state.pendingKickoffTeam = volley.team === 'home' ? 'away' : 'home';
    return [];
  }

  ball.x = clamp(lastPosition.x, -BALL_RADIUS - 1, FIELD.width + BALL_RADIUS + 1);
  ball.y = clamp(lastPosition.y, -BALL_RADIUS - 1, FIELD.height + BALL_RADIUS + 1);
  ball.lastTouchTeam = volley.team;
  state.possessionTeam = volley.team;
  if (lastOutcome === 'missed') return checkBallBoundary(state);
  return [];
}

function advanceEagleVolley(state, deltaSeconds) {
  const volley = state.eagleVolley;
  if (!volley) return [];
  const events = [];

  if (volley.spawned < volley.level) {
    volley.nextLaunchSeconds -= deltaSeconds;
    while (volley.spawned < volley.level && volley.nextLaunchSeconds <= 0) {
      spawnNextEagleProjectile(state);
      volley.nextLaunchSeconds += EAGLE_SHOT_INTERVAL_SECONDS;
    }
  }

  for (const projectile of state.skillProjectiles) {
    if (projectile.resolved) continue;
    projectile.ageSeconds += deltaSeconds;
    const previous = { x: projectile.x, y: projectile.y, height: projectile.height };
    if (projectile.phase === 'ascending') {
      projectile.height = Math.min(EAGLE_FLIGHT_HEIGHT,
        EAGLE_FLIGHT_HEIGHT * projectile.ageSeconds / EAGLE_ASCENT_SECONDS);
      if (projectile.ageSeconds >= EAGLE_ASCENT_SECONDS) {
        projectile.height = EAGLE_FLIGHT_HEIGHT;
        projectile.phase = 'flying';
        const goalX = projectile.team === 'home' ? FIELD.width + BALL_RADIUS + 1 : -BALL_RADIUS - 1;
        projectile.flightStartX = projectile.x;
        projectile.flightStartY = projectile.y;
        projectile.flightGoalX = goalX;
        const dx = goalX - projectile.x;
        const dy = projectile.targetY - projectile.y;
        const length = Math.hypot(dx, dy) || 1;
        projectile.flightDurationSeconds = length / 650;
        projectile.flightElapsedSeconds = 0;
      }
    } else {
      projectile.flightElapsedSeconds += deltaSeconds;
      const timeProgress = Math.max(0, Math.min(1,
        projectile.flightElapsedSeconds / Math.max(0.001, projectile.flightDurationSeconds)));
      const angle = timeProgress * Math.PI * 2;
      const cycloidProgress = (angle - Math.sin(angle)) / (Math.PI * 2);
      projectile.x = projectile.flightStartX + (projectile.flightGoalX - projectile.flightStartX) * cycloidProgress;
      projectile.y = projectile.flightStartY + (projectile.targetY - projectile.flightStartY) * cycloidProgress;
      const landingProgress = Math.max(0, Math.min(1, (cycloidProgress - 0.45) / 0.55));
      const smoothLandingProgress = landingProgress * landingProgress * (3 - 2 * landingProgress);
      projectile.height = EAGLE_FLIGHT_HEIGHT * (1 - smoothLandingProgress);
      projectile.vx = (projectile.x - previous.x) / Math.max(0.001, deltaSeconds);
      projectile.vy = (projectile.y - previous.y) / Math.max(0.001, deltaSeconds);
      projectile.verticalVelocity = (projectile.height - previous.height) / Math.max(0.001, deltaSeconds);
    }

    const next = { x: projectile.x, y: projectile.y };
    if (blockedByBarrierSegment(state, previous, next, BALL_RADIUS, projectile.height)) {
      projectile.resolved = true;
      projectile.outcome = 'blocked';
      volley.resolved += 1;
      volley.lastPosition = { ...next };
      volley.lastOutcome = projectile.outcome;
      continue;
    }

    const goalPlane = projectile.team === 'home' ? FIELD.width + BALL_RADIUS : -BALL_RADIUS;
    const crossedGoal = projectile.team === 'home'
      ? previous.x <= goalPlane && next.x > goalPlane
      : previous.x >= goalPlane && next.x < goalPlane;
    if (crossedGoal) {
      const progress = (goalPlane - previous.x) / (next.x - previous.x || 1);
      const crossingY = previous.y + (next.y - previous.y) * progress;
      projectile.resolved = true;
      if (crossingY - BALL_RADIUS >= FIELD.goalTop && crossingY + BALL_RADIUS <= FIELD.goalBottom) {
        projectile.outcome = 'goal';
        volley.points += 1;
        state.score[volley.team] += 1;
        events.push({ type: 'goal', team: volley.team, points: 1, skillId: 'eagleShot', score: { ...state.score } });
      } else {
        projectile.outcome = 'missed';
      }
      volley.resolved += 1;
      volley.lastPosition = { x: goalPlane, y: crossingY };
      volley.lastOutcome = projectile.outcome;
      continue;
    }

    const outsideField = projectile.x < -BALL_RADIUS - 1 || projectile.x > FIELD.width + BALL_RADIUS + 1
      || projectile.y < -BALL_RADIUS - 1 || projectile.y > FIELD.height + BALL_RADIUS + 1;
    if (outsideField) {
      projectile.resolved = true;
      projectile.outcome = 'missed';
      volley.resolved += 1;
      volley.lastPosition = { ...next };
      volley.lastOutcome = projectile.outcome;
    }
  }

  const activeProjectile = state.skillProjectiles.find((projectile) => !projectile.resolved);
  const displayProjectile = activeProjectile ?? state.skillProjectiles.at(-1);
  if (displayProjectile) {
    state.ball.x = displayProjectile.x;
    state.ball.y = displayProjectile.y;
    state.ball.height = displayProjectile.height;
    state.ball.vx = displayProjectile.vx;
    state.ball.vy = displayProjectile.vy;
  }

  if (volley.spawned >= volley.level && volley.resolved >= volley.level) {
    events.push(...finishEagleVolley(state, volley));
  }
  return events;
}

function handleKeeperContact(state, previousPosition) {
  const { ball } = state;
  if (ball.ownerId || !['shot', 'skill-shot'].includes(ball.flightKind) || ball.skillId === 'eagleShot') return [];

  for (const keeper of state.players.filter((player) => player.role === 'goalkeeper'
      && !player.dismissed && player.knockdownSeconds <= 0 && (player.airborneSecondsRemaining ?? 0) <= 0)) {
    const threat = keeperThreat(state, keeper);
    if (!threat?.reachable || ball.height > KEEPER_MAX_SAVE_HEIGHT) continue;

    let contact = { x: ball.x, y: ball.y };
    if (previousPosition && [previousPosition.x, previousPosition.y, ball.x, ball.y].every(Number.isFinite)) {
      const progress = segmentProjection(keeper, previousPosition, ball);
      contact = {
        x: previousPosition.x + (ball.x - previousPosition.x) * progress,
        y: previousPosition.y + (ball.y - previousPosition.y) * progress,
      };
    }
    if (Math.abs(contact.x - keeper.x) > BALL_RADIUS + 14
        || Math.abs(contact.y - keeper.y) > KEEPER_REACH_Y) continue;

    const direction = Math.sign(threat.y - keeper.y) || Math.sign(contact.y - keeper.y) || 1;
    keeper.keeperDiveDirection = direction;
    keeper.keeperAction = direction < 0 ? 'diveLeft' : 'diveRight';
    keeper.keeperActionSeconds = KEEPER_DIVE_SECONDS;
    setBallOwner(state, keeper);
    resetActivePlayersToBaseFormation(state.players);
    keeper.x = keeper.team === 'home' ? 70 : FIELD.width - 70;
    keeper.y = FIELD.height / 2;
    putBallAtPlayer(state, keeper);
    state.phase = 'goalKick';
    state.phaseSeconds = 1;
    putBallAtPlayer(state, keeper);
    return [
      { type: 'keeperSave', team: keeper.team, keeperId: keeper.id, direction, interceptY: contact.y },
      { type: 'keeperCatch', team: keeper.team, keeperId: keeper.id },
    ];
  }
  return [];
}

function findGroundPassInterceptor(state, passerTeam, start, end) {
  if (![start.x, start.y, end.x, end.y].every(Number.isFinite)) return null;
  return state.players
    .filter((player) => player.team !== passerTeam && player.role !== 'goalkeeper' && !player.dismissed
      && (player.airborneSecondsRemaining ?? 0) <= 0 && player.knockdownSeconds <= 0)
    .map((player, index) => ({
      player,
      index,
      progress: segmentProjection(player, start, end),
      gap: segmentDistance(player, start, end),
    }))
    .filter((entry) => entry.gap <= INTERCEPTION_RADIUS)
    .sort((left, right) => left.progress - right.progress || left.gap - right.gap || left.index - right.index)[0] ?? null;
}

function updateGroundPassReceiverTarget(state) {
  const { ball } = state;
  if (ball.flightKind !== 'ground' || !ball.passReceiverId) return;
  const receiver = byId(state, ball.passReceiverId);
  if (!receiver || receiver.dismissed || receiver.team !== ball.passTeam || receiver.role === 'goalkeeper') {
    delete ball.passReceiverId;
    delete ball.passTarget;
    return;
  }

  const velocityX = Number.isFinite(receiver.vx) ? receiver.vx : 0;
  const velocityY = Number.isFinite(receiver.vy) ? receiver.vy : 0;
  const speed = Math.hypot(velocityX, velocityY);
  const leadDistance = Math.min(10, speed * 0.1);
  const leadX = speed > 0 ? velocityX / speed * leadDistance : 0;
  const leadY = speed > 0 ? velocityY / speed * leadDistance : 0;
  ball.passTarget = {
    x: clamp(receiver.x + leadX, 0, FIELD.width),
    y: clamp(receiver.y + leadY, 0, FIELD.height),
  };
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
  updateGroundPassReceiverTarget(state);
  const previousPosition = { x: ball.x, y: ball.y };
  const passTeam = ball.flightKind === 'ground' ? ball.passTeam : null;
  const hasGroundPassTarget = ball.flightKind === 'ground' && passTeam && ball.passTarget
    && Number.isFinite(ball.passTarget.x) && Number.isFinite(ball.passTarget.y);
  if (hasGroundPassTarget) {
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
    }
    ball.flightSeconds = (ball.flightSeconds ?? 0) + deltaSeconds;
  } else {
    const flightTarget = ball.flightTarget;
    if (flightTarget && Number.isFinite(flightTarget.x) && Number.isFinite(flightTarget.y)) {
      const dx = flightTarget.x - ball.x;
      const dy = flightTarget.y - ball.y;
      const remaining = Math.hypot(dx, dy);
      const speed = Math.hypot(ball.vx, ball.vy);
      const travel = Math.min(remaining, speed * deltaSeconds);
      if (remaining <= travel || remaining <= 0.001) {
        ball.x = flightTarget.x;
        ball.y = flightTarget.y;
        ball.vx = 0;
        ball.vy = 0;
        delete ball.flightTarget;
        delete ball.flightDurationSeconds;
      } else if (speed > 0) {
        ball.x += dx / remaining * travel;
        ball.y += dy / remaining * travel;
        ball.vx = dx / remaining * speed;
        ball.vy = dy / remaining * speed;
      }
    } else {
      ball.x += ball.vx * deltaSeconds;
      ball.y += ball.vy * deltaSeconds;
    }
    ball.flightSeconds = (ball.flightSeconds ?? 0) + deltaSeconds;
    if (['lob', 'cross', 'header'].includes(ball.flightKind)) {
      ball.verticalVelocity = (ball.verticalVelocity ?? 0) - BALL_GRAVITY * deltaSeconds;
      ball.height = Math.max(0, ball.height + ball.verticalVelocity * deltaSeconds);
      if (ball.height === 0) {
        ball.verticalVelocity = 0;
        ball.height = 0;
        ball.flightKind = 'ground';
      }
    } else if (ball.flightKind === 'ground' && !hasGroundPassTarget && !ball.flightTarget) {
      const friction = Math.exp(-2.4 * deltaSeconds);
      ball.vx *= friction;
      ball.vy *= friction;
    }
  }

  if (blockedByBarrier(state, ball, BALL_RADIUS, ball.height ?? 0)) {
    ball.x = previousPosition.x;
    ball.y = previousPosition.y;
    ball.vx = 0;
    ball.vy = 0;
    delete ball.flightTarget;
    delete ball.passTarget;
  }
  const tornadoContactEvents = applyTornadoContacts(state, previousPosition, { x: ball.x, y: ball.y });
  if (passTeam && ball.flightKind === 'ground') {
    const interception = findGroundPassInterceptor(state, passTeam, previousPosition, { x: ball.x, y: ball.y });
    if (interception) {
      const { player, progress } = interception;
      const previousTeam = state.possessionTeam;
      ball.x = previousPosition.x + (ball.x - previousPosition.x) * progress;
      ball.y = previousPosition.y + (ball.y - previousPosition.y) * progress;
      setBallOwner(state, player);
      if (player.team === 'home') state.controlledPlayerId = player.id;
      return [
        ...tornadoContactEvents,
        { type: 'passIntercepted', team: player.team, playerId: player.id, fromTeam: passTeam, passKind: 'ground' },
        ...(previousTeam !== player.team ? [{ type: 'possessionChange', team: player.team, playerId: player.id }] : []),
      ];
    }
  }
  return tornadoContactEvents;
}

function resolveAerialHeader(state) {
  const { ball } = state;
  if (ball.ownerId || ball.height < HEADER_HEIGHT_MIN || ball.height > HEADER_HEIGHT_MAX) return [];
  const lastHeaderPlayer = byId(state, ball.lastHeaderPlayerId);
  if (lastHeaderPlayer && distance(lastHeaderPlayer, ball) > HEADER_RADIUS) {
    delete ball.lastHeaderPlayerId;
  }
  const headerPlayer = state.players
    .filter((player) => !player.dismissed && player.role !== 'goalkeeper'
      && player.knockdownSeconds <= 0 && (player.airborneSecondsRemaining ?? 0) <= 0
      && player.id !== ball.lastHeaderPlayerId)
    .map((player, index) => ({ player, index, distance: distance(player, ball) }))
    .filter(({ distance: gap }) => gap <= HEADER_RADIUS)
    .sort((a, b) => a.distance - b.distance || a.index - b.index)[0]?.player;
  if (!headerPlayer) return [];

  const previousTeam = state.possessionTeam;
  const incomingPassTeam = ball.passTeam;
  const incomingPassKind = ball.flightKind;
  const interceptedPass = incomingPassTeam && incomingPassTeam !== headerPlayer.team
    && ['lob', 'cross'].includes(incomingPassKind);
  const attackDirection = headerPlayer.team === 'home' ? 1 : -1;
  const facing = unit(headerPlayer.facingX, headerPlayer.facingY);
  ball.ownerId = null;
  ball.vx = (facing.x || attackDirection) * 360;
  ball.vy = (facing.y || 0) * 360 + (headerPlayer.team === 'home' ? 120 : -120);
  ball.height = clamp(ball.height, HEADER_HEIGHT_MIN, HEADER_HEIGHT_MAX);
  ball.verticalVelocity = 120;
  ball.flightKind = 'header';
  ball.flightSeconds = 0;
  ball.lastHeaderPlayerId = headerPlayer.id;
  ball.lastTouchTeam = headerPlayer.team;
  delete ball.passTarget;
  delete ball.passReceiverId;
  ball.passProtectionSeconds = 0;
  delete ball.passTeam;
  state.possessionTeam = headerPlayer.team;
  setTimedMotion(headerPlayer, 'header', 0.34);
  if (headerPlayer.team === 'home') state.controlledPlayerId = headerPlayer.id;
  return [
    { type: 'header', team: headerPlayer.team, playerId: headerPlayer.id },
    ...(interceptedPass ? [{
      type: 'passIntercepted', team: headerPlayer.team, playerId: headerPlayer.id,
      fromTeam: incomingPassTeam, passKind: incomingPassKind,
    }] : []),
    ...(previousTeam !== headerPlayer.team ? [{ type: 'possessionChange', team: headerPlayer.team, playerId: headerPlayer.id }] : []),
  ];
}

function collectLooseBall(state) {
  const { ball } = state;
  if (ball.ownerId || ball.height > 14) return [];
  if (ball.flightKind === 'skill-shot' && ['eagleShot', 'tornadoShot'].includes(ball.skillId)) return [];
  const candidates = state.players
    .filter((player) => !player.dismissed && player.knockdownSeconds <= 0 && player.motionAction !== 'recover'
      && (player.airborneSecondsRemaining ?? 0) <= 0
      && !(player.role === 'goalkeeper' && ['shot', 'skill-shot'].includes(ball.flightKind)))
    .map((player) => ({ player, distance: distance(player, ball) }))
    .filter(({ distance: playerDistance }) => playerDistance <= 18)
    .sort((a, b) => a.distance - b.distance);
  const intendedReceiver = ball.flightKind === 'ground' && ball.passReceiverId
    ? byId(state, ball.passReceiverId)
    : null;
  const pickedUp = intendedReceiver && !intendedReceiver.dismissed
    && intendedReceiver.knockdownSeconds <= 0
    && intendedReceiver.motionAction !== 'recover'
    && distance(intendedReceiver, ball) <= 18
    ? intendedReceiver
    : candidates[0]?.player;
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

function handleHomeAttack(state, controlled, input) {
  if (state.ball.ownerId !== controlled.id) return [];
  if (input.pressed.has('a')) return releasePass(state, controlled, 'lobPass');
  if (input.pressed.has('s')) return releasePass(state, controlled, 'groundPass');
  if (input.pressed.has('d')) return releaseShot(state, controlled);
  return [];
}

function controlBallAction(state, controlled, input) {
  if (controlled.knockdownSeconds > 0 || controlled.motionAction === 'recover'
      || (controlled.airborneSecondsRemaining ?? 0) > 0) {
    return [];
  }
  if (state.possessionTeam !== 'home') return [];

  return handleHomeAttack(state, controlled, input);
}

function updateSupportPlayer(state, player, deltaSeconds) {
  player.aiRetargetSeconds = Math.max(0, (player.aiRetargetSeconds ?? 0) - deltaSeconds);
  const targetIsValid = player.aiTarget
    && Number.isFinite(player.aiTarget.x)
    && Number.isFinite(player.aiTarget.y);

  if (!targetIsValid || player.aiRetargetSeconds <= 0) {
    const ballCarrier = carrier(state);
    player.aiTarget = targetForRole(state, player, state.possessionTeam, state.ball, ballCarrier);
    player.aiRetargetSeconds = getAiTuning(state.stage).thinkIntervalSeconds;
  }

  moveToward(player, player.aiTarget, AI_SPEED, deltaSeconds);
}

function updateHomeSupportAi(state, controlled, deltaSeconds) {
  const ballCarrier = carrier(state);
  const supportPlayers = activePlayers(state, 'home')
    .filter((player) => player.role !== 'goalkeeper'
      && player.id !== controlled?.id && player.id !== ballCarrier?.id);
  const orderedSupport = ballCarrier
    ? [...supportPlayers].sort((a, b) => distance(a, ballCarrier) - distance(b, ballCarrier) || a.id.localeCompare(b.id))
    : [];
  const shortOutletId = orderedSupport[0]?.id;
  for (const player of state.players) {
    if (player.team !== 'home'
        || player.dismissed
        || player.role === 'goalkeeper'
        || player.id === controlled?.id
        || player.id === state.ball.ownerId) continue;
    if (state.possessionTeam === 'home' && ballCarrier?.team === 'home') {
      player.aiRetargetSeconds = Math.max(0, (player.aiRetargetSeconds ?? 0) - deltaSeconds);
      if (!player.aiTarget || player.aiRetargetSeconds <= 0) {
        player.aiTarget = homeSupportTarget(state, player, ballCarrier, player.id === shortOutletId);
        player.aiRetargetSeconds = getAiTuning(state.stage).thinkIntervalSeconds;
      }
      moveToward(player, player.aiTarget, AI_SPEED, deltaSeconds);
    } else {
      updateSupportPlayer(state, player, deltaSeconds);
    }
  }
}

function homeSupportTarget(state, player, ballCarrier, isShortOutlet) {
  const carrierIsAboveCenter = ballCarrier.y < FIELD.height / 2;
  const shortLane = carrierIsAboveCenter ? 1 : -1;
  const supportRadius = getAiTuning(state.stage).teammateSupportRadius;
  const defensiveLine = Math.max(...activePlayers(state, 'away')
    .filter((candidate) => candidate.role !== 'goalkeeper')
    .map((candidate) => candidate.x), ballCarrier.x + 90);
  const rawShortY = ballCarrier.y + shortLane * 55;
  const rawForwardY = ballCarrier.y - shortLane * 105;
  const minY = Math.min(rawShortY, rawForwardY);
  const maxY = Math.max(rawShortY, rawForwardY);
  let yShift = 0;
  if (minY < 18) yShift = 18 - minY;
  if (maxY + yShift > FIELD.height - 18) yShift -= maxY + yShift - (FIELD.height - 18);
  const shortTarget = {
    x: clamp(ballCarrier.x + Math.min(92, supportRadius * 0.7), 28, FIELD.width - 28),
    y: rawShortY + yShift,
  };
  if (isShortOutlet) return shortTarget;
  return {
    x: clamp(Math.max(ballCarrier.x + 145, defensiveLine + 28), 28, FIELD.width - 28),
    y: rawForwardY + yShift,
  };
}

function updateAwayDefense(state, deltaSeconds, events, defendingTeam = 'away', controlled = null) {
  const defendingCarrier = carrier(state);
  if (!defendingCarrier || defendingCarrier.team === defendingTeam) {
    state.aiPressingPlayerId = null;
    state.aiPressingLostSeconds = 0;
    state.aiObservedCarrierId = null;
    updateKeeperPosition(state, defendingTeam, defendingCarrier, deltaSeconds, controlled);
    return;
  }
  const defenders = activePlayers(state, defendingTeam)
    .filter((player) => player.role !== 'goalkeeper' && player.id !== controlled?.id);
  const eligible = defenders.filter((player) => player.knockdownSeconds <= 0
    && player.motionAction !== 'recover' && player.stunnedSeconds <= 0);
  const attackers = activePlayers(state, defendingCarrier.team)
    .filter((player) => player.role !== 'goalkeeper')
    .sort((a, b) => a.id.localeCompare(b.id));
  const possessionChanged = state.aiMarkingPossessionTeam !== defendingCarrier.team;
  const carrierChanged = state.aiObservedCarrierId !== defendingCarrier.id;
  if (possessionChanged) {
    state.aiMarkingPossessionTeam = defendingCarrier.team;
    state.aiMarkingAssignments = assignMarks(defenders, attackers);
  } else {
    const activeAttackerIds = new Set(attackers.map((player) => player.id));
    for (const [defenderId, attackerId] of Object.entries(state.aiMarkingAssignments ?? {})) {
      if (!activeAttackerIds.has(attackerId)) delete state.aiMarkingAssignments[defenderId];
    }
    const assigned = new Set(Object.values(state.aiMarkingAssignments));
    for (const defender of defenders) {
      if (defender.id in state.aiMarkingAssignments) continue;
      const attacker = attackers.filter((candidate) => !assigned.has(candidate.id))
        .sort((a, b) => Number(b.role === defender.role) - Number(a.role === defender.role)
          || distance(defender, a) - distance(defender, b) || a.id.localeCompare(b.id))[0];
      if (attacker) {
        state.aiMarkingAssignments[defender.id] = attacker.id;
        assigned.add(attacker.id);
      }
    }
  }
  const tuning = getAiTuning(state.stage);
  const pressingDistance = tuning.pressingDistance;
  let presser = eligible.find((player) => player.id === state.aiPressingPlayerId) ?? null;
  if (carrierChanged || !presser) {
    presser = eligible
      .sort((a, b) => distance(a, defendingCarrier) - distance(b, defendingCarrier)
        || a.role.localeCompare(b.role) || a.id.localeCompare(b.id))[0] ?? null;
    state.aiPressingPlayerId = presser?.id ?? null;
    state.aiPressingLostSeconds = 0;
  } else if (distance(presser, defendingCarrier) > pressingDistance * 1.5) {
    state.aiPressingLostSeconds = (state.aiPressingLostSeconds ?? 0) + deltaSeconds;
    if (state.aiPressingLostSeconds >= 0.75) {
      presser = nearestPlayer(eligible, defendingCarrier);
      state.aiPressingPlayerId = presser?.id ?? null;
      state.aiPressingLostSeconds = 0;
    }
  } else {
    state.aiPressingLostSeconds = 0;
  }
  state.aiObservedCarrierId = defendingCarrier.id;
  if (presser && distance(presser, defendingCarrier) <= pressingDistance) {
    const approachDistance = distance(presser, defendingCarrier);
    if (approachDistance > 30) moveToward(presser, defendingCarrier, SLIDE_SPEED, deltaSeconds);
    if (approachDistance >= 18 && approachDistance <= 34 && presser.knockdownSeconds <= 0
        && presser.aiTackleCooldownSeconds <= 0) {
      putBallAtPlayer(state, defendingCarrier);
      presser.aiTackleCooldownSeconds = 1.35;
      events.push(...resolveTackle(state, presser, defendingCarrier, presser.powerTackleSeconds > 0));
    }
  }

  const coverers = defenders.filter((player) => player.id !== presser?.id);
  const defendingGoalX = defendingTeam === 'home' ? 0 : FIELD.width;
  for (const attacker of attackers) {
    if (Math.abs(attacker.x - defendingGoalX) >= 180) continue;
    const assignedCover = coverers.find((player) => state.aiMarkingAssignments[player.id] === attacker.id);
    if (assignedCover) continue;
    const nearestCover = coverers.filter((player) => state.aiMarkingAssignments[player.id])
      .sort((a, b) => distance(a, attacker) - distance(b, attacker) || a.id.localeCompare(b.id))[0];
    if (nearestCover) state.aiMarkingAssignments[nearestCover.id] = attacker.id;
  }
  const coverTargets = coverers.map((player) => {
    const receiver = byId(state, state.aiMarkingAssignments[player.id]);
    const base = receiver
      ? { x: (defendingCarrier.x * 0.34) + (receiver.x * 0.66), y: (defendingCarrier.y * 0.34) + (receiver.y * 0.66) }
      : targetForRole(state, player, defendingCarrier.team, state.ball, defendingCarrier);
    const goalX = defendingTeam === 'home' ? 0 : FIELD.width;
    const towardGoal = unit(goalX - (receiver?.x ?? base.x), FIELD.height / 2 - (receiver?.y ?? base.y));
    const target = receiver ? {
      x: base.x + towardGoal.x * 26,
      y: base.y + towardGoal.y * 26,
    } : base;
    return { player, target: { x: clamp(target.x, 20, FIELD.width - 20), y: clamp(target.y, 12, FIELD.height - 12) } };
  });
  if (coverTargets.length >= 2) {
    const ordered = [...coverTargets].sort((a, b) => a.target.y - b.target.y || a.player.id.localeCompare(b.player.id));
    const top = ordered[0].target.y;
    const bottom = ordered[ordered.length - 1].target.y;
    if (bottom - top < 90) {
      const middle = (top + bottom) / 2;
      let upperY = middle - 45;
      let lowerY = middle + 45;
      if (upperY < 12) { lowerY += 12 - upperY; upperY = 12; }
      if (lowerY > FIELD.height - 12) { upperY -= lowerY - (FIELD.height - 12); lowerY = FIELD.height - 12; }
      ordered[0].target.y = upperY;
      ordered[ordered.length - 1].target.y = lowerY;
    }
  }
  coverTargets.forEach(({ player, target }) => {
    player.aiTarget = target;
    moveToward(player, player.aiTarget, AI_SPEED, deltaSeconds);
  });

  updateKeeperPosition(state, defendingTeam, defendingCarrier, deltaSeconds, controlled);
}

function updateKeeperPosition(state, defendingTeam, opposingCarrier, deltaSeconds, controlled) {
  const keeper = activePlayers(state, defendingTeam).find((player) => player.role === 'goalkeeper');
  if (!keeper || keeper.id === controlled?.id) return;
  const homeKeepsLeft = defendingTeam === 'home';
  const goalLineX = homeKeepsLeft ? 48 : FIELD.width - 48;
  const goalX = homeKeepsLeft ? 0 : FIELD.width;
  const shotThreat = keeperThreat(state, keeper);
  const targetY = shotThreat?.reachable ? shotThreat.y : state.ball.y;
  const goalY = clamp(targetY, 224, 316);
  const closeThreat = opposingCarrier && distance(opposingCarrier, { x: goalX, y: goalY }) <= 150;
  const hasClearLane = closeThreat && !activePlayers(state, defendingTeam)
    .some((player) => player.role !== 'goalkeeper' && player.id !== opposingCarrier.id
      && segmentDistance(player, opposingCarrier, { x: goalX, y: goalY }) <= 24);
  const targetX = hasClearLane
    ? (homeKeepsLeft ? 112 : FIELD.width - 112)
    : goalLineX;
  const target = {
    x: homeKeepsLeft ? clamp(targetX, 32, 180) : clamp(targetX, FIELD.width - 180, FIELD.width - 32),
    y: goalY,
  };
  keeper.aiTarget = target;
  moveToward(keeper, target, KEEPER_SPEED, deltaSeconds, false);

  if (shotThreat?.reachable && shotThreat.seconds <= KEEPER_DIVE_SECONDS + KEEPER_REACTION_SECONDS
      && !['diveLeft', 'diveRight', 'recover'].includes(keeper.keeperAction)) {
    keeper.keeperDiveDirection = Math.sign(shotThreat.y - keeper.y) || 1;
    keeper.keeperAction = keeper.keeperDiveDirection < 0 ? 'diveLeft' : 'diveRight';
    keeper.keeperActionSeconds = KEEPER_DIVE_SECONDS;
  }
}

function advanceKeeperAction(player, deltaSeconds) {
  if (player.role !== 'goalkeeper') return;
  if (['diveLeft', 'diveRight'].includes(player.keeperAction)) {
    player.keeperActionSeconds = Math.max(0, (player.keeperActionSeconds ?? 0) - deltaSeconds);
    if (player.keeperActionSeconds === 0) {
      player.keeperAction = 'recover';
      player.keeperActionSeconds = KEEPER_RECOVER_SECONDS;
    }
  } else if (player.keeperAction === 'recover') {
    player.keeperActionSeconds = Math.max(0, (player.keeperActionSeconds ?? 0) - deltaSeconds);
    if (player.keeperActionSeconds === 0) {
      player.keeperAction = 'idle';
      player.keeperDiveDirection = 0;
    }
  }
}

function updateAutomaticHomeDefender(state) {
  const awayCarrier = carrier(state);
  if (!awayCarrier || awayCarrier.team !== 'away') {
    state.aiControlledCarrierId = null;
    return;
  }
  if (state.aiControlledCarrierId === awayCarrier.id) return;
  state.aiControlledCarrierId = awayCarrier.id;
  const eligible = activePlayers(state, 'home').filter((player) => player.role !== 'goalkeeper'
    && player.knockdownSeconds <= 0 && player.stunnedSeconds <= 0 && player.motionAction !== 'recover');
  const selected = eligible.sort((a, b) => distance(a, awayCarrier) - distance(b, awayCarrier)
    || a.role.localeCompare(b.role) || a.id.localeCompare(b.id))[0];
  state.controlledPlayerId = selected?.id ?? null;
}

function handOffHomeControlAfterEulryongta(state) {
  const controlled = byId(state, state.controlledPlayerId);
  if (!controlled || controlled.team !== 'home' || controlled.knockdownSeconds <= 0
      || controlled.knockdownSkillId !== 'eulryongta' || controlled.knockdownFromTeam !== 'away') return false;

  const selected = state.players
    .filter((player) => player.team === 'home' && player.role !== 'goalkeeper' && !player.dismissed
      && player.knockdownSeconds <= 0 && player.motionAction !== 'recover' && player.stunnedSeconds <= 0
      && (player.airborneSecondsRemaining ?? 0) <= 0 && Number.isFinite(player.x) && Number.isFinite(player.y))
    .map((player) => ({ player, distance: distance(player, state.ball) }))
    .sort((a, b) => a.distance - b.distance || a.player.id.localeCompare(b.player.id))[0]?.player ?? null;

  state.controlledPlayerId = selected?.id ?? null;
  return true;
}

function assignMarks(defenders, attackers) {
  const assignments = {};
  const available = new Set(attackers.map((player) => player.id));
  for (const defender of [...defenders].sort((a, b) => a.id.localeCompare(b.id))) {
    const attacker = attackers.filter((candidate) => available.has(candidate.id))
      .sort((a, b) => Number(b.role === defender.role) - Number(a.role === defender.role)
        || distance(defender, a) - distance(defender, b) || a.id.localeCompare(b.id))[0];
    if (!attacker) break;
    assignments[defender.id] = attacker.id;
    available.delete(attacker.id);
  }
  return assignments;
}

function targetForRole(state, player, possessionTeam, ball, ballCarrier) {
  if (player.role === 'goalkeeper') {
    const x = player.team === 'home' ? 48 : FIELD.width - 48;
    return { x, y: clamp(ball.y, FIELD.height / 2 - 72, FIELD.height / 2 + 72) };
  }

  const attackDirection = player.team === 'home' ? 1 : -1;
  const roleX = { defender: 190, midfielder: 350, forward: 485 }[player.role] ?? 300;
  const roleHome = {
    x: player.team === 'home' ? roleX : FIELD.width - roleX,
    y: FIELD.height / 2,
  };
  if (possessionTeam === player.team && ballCarrier) {
    const supportRadius = getAiTuning(state.stage).teammateSupportRadius;
    const laneSide = player.y < FIELD.height / 2 ? -1 : 1;
    const roleAdvance = player.role === 'defender' ? -70 : player.role === 'midfielder' ? 70 : supportRadius * 0.72;
    const laneOffset = player.role === 'defender' ? 72 : player.role === 'midfielder' ? supportRadius * 0.45 : 58;
    return {
      x: clamp(ballCarrier.x + attackDirection * roleAdvance, 30, FIELD.width - 30),
      y: clamp(ballCarrier.y + laneSide * laneOffset, 18, FIELD.height - 18),
    };
  }

  if (!ballCarrier || ballCarrier.team === player.team) {
    const retreat = player.team === possessionTeam ? 0 : -attackDirection * 50;
    return {
      x: clamp(roleHome.x + retreat, 30, FIELD.width - 30),
      y: clamp(roleHome.y + (ball.y - FIELD.height / 2) * 0.28, 24, FIELD.height - 24),
    };
  }

  const opponents = activePlayers(state, ballCarrier.team)
    .filter((candidate) => candidate.role !== 'goalkeeper' && candidate.id !== ballCarrier.id)
    .sort((left, right) => distance(left, ballCarrier) - distance(right, ballCarrier)
      || left.role.localeCompare(right.role) || left.id.localeCompare(right.id));
  const marked = opponents.find((candidate) => candidate.role === player.role) ?? opponents[0];
  const coverPoint = marked
    ? { x: ballCarrier.x * 0.56 + marked.x * 0.44, y: ballCarrier.y * 0.56 + marked.y * 0.44 }
    : roleHome;
  return {
    x: clamp(coverPoint.x * 0.68 + roleHome.x * 0.32, 24, FIELD.width - 24),
    y: clamp(coverPoint.y * 0.68 + roleHome.y * 0.32, 18, FIELD.height - 18),
  };
}

function chooseAiPass(state, passer) {
  const attackDirection = passer.team === 'home' ? 1 : -1;
  const defenders = activePlayers(state, passer.team === 'home' ? 'away' : 'home')
    .filter((player) => player.role !== 'goalkeeper');
  const candidates = getTeammates(state, passer)
    .filter((receiver) => receiver.role !== 'goalkeeper')
    .map((receiver, index) => {
      const passDistance = distance(passer, receiver);
      const forward = (receiver.x - passer.x) * attackDirection;
      const direction = unit(receiver.x - passer.x, receiver.y - passer.y);
      const facing = unit(passer.facingX, passer.facingY);
      const start = { x: passer.x + facing.x * 17, y: passer.y + facing.y * 17 };
      const groundBlocked = defenders.some((defender) => segmentDistance(defender, start, receiver) <= INTERCEPTION_RADIUS * 1.5);
      const wide = receiver.y <= FIELD.height * 0.24 || receiver.y >= FIELD.height * 0.76;
      const roleBonus = receiver.role === 'forward' ? 12 : receiver.role === 'midfielder' ? 6 : 0;
      if (passDistance < AI_MIN_PASS_DISTANCE || passDistance > AI_MAX_PASS_DISTANCE || forward < -80) return null;
      if (!groundBlocked) {
        return { receiver, kind: 'groundPass', score: forward * 0.55 - passDistance * 0.16 + roleBonus + 100 + (direction.x * attackDirection * 8) - index * 0.001 };
      }
      return {
        receiver,
        kind: 'lobPass',
        score: forward * 0.55 - passDistance * 0.16 + roleBonus + 22 + (wide && forward > 30 ? 18 : 0) - index * 0.001,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score);
  return candidates[0] ?? null;
}

function updateAi(state, controlled, input, deltaSeconds, events) {
  const ballCarrier = carrier(state);
  const opponentCarrier = state.players.find((player) => player.team !== 'home' && !player.dismissed && player.id === state.ball.ownerId);

  if (controlled.stunnedSeconds <= 0 && controlled.knockdownSeconds <= 0
      && controlled.motionAction !== 'recover') {
    if (state.possessionTeam === 'away' && input.down.has('d') && opponentCarrier) {
      moveToward(controlled, opponentCarrier, PRESSURE_SPEED, deltaSeconds);
    } else if (controlled.slideSeconds > 0 && opponentCarrier) {
      moveToward(controlled, opponentCarrier, SLIDE_SPEED, deltaSeconds);
      controlled.slideSeconds = Math.max(0, controlled.slideSeconds - deltaSeconds);
    } else {
      moveByInput(controlled, input.moveX, input.moveY, PLAYER_SPEED, deltaSeconds, input.down.has('e'));
    }
  }

  if (controlled.knockdownSeconds <= 0 && controlled.motionAction !== 'recover'
      && state.possessionTeam === 'away' && input.pressed.has('s')) {
    const homePlayers = activePlayers(state, 'home').filter((player) => player.knockdownSeconds <= 0
      && player.motionAction !== 'recover');
    const index = homePlayers.findIndex((player) => player.id === state.controlledPlayerId);
    if (homePlayers.length > 0) {
      state.controlledPlayerId = homePlayers[(index + 1) % homePlayers.length].id;
      controlled = byId(state, state.controlledPlayerId);
    }
  }

  if (controlled.knockdownSeconds <= 0 && controlled.motionAction !== 'recover'
      && state.possessionTeam === 'away' && input.pressed.has('a')) {
    controlled.slideSeconds = 0.25;
  }

  for (const player of state.players) {
    if (player.dismissed || player.id === controlled?.id || player.knockdownSeconds > 0 || player.motionAction === 'recover') continue;
    if (player.team !== 'away') continue;
    if (player.id === state.ball.ownerId) {
      const direction = player.team === 'home' ? 1 : -1;
      const goal = { x: direction > 0 ? FIELD.width : 0, y: FIELD.height / 2 };
      const range = distance(player, goal);
      if (range <= 180 && shotCanReachGoal(player) && (state.aiShotCooldownSeconds ?? 0) <= 0) {
        events.push(...releaseShot(state, player));
        state.aiShotCooldownSeconds = getAiTuning(state.stage).thinkIntervalSeconds;
      } else {
        const pass = (state.aiShotCooldownSeconds ?? 0) <= 0 ? chooseAiPass(state, player) : null;
        if (pass) {
          const action = pass.kind === 'groundPass' ? 'groundPass' : 'lobPass';
          events.push(...releasePass(state, player, action, pass.receiver));
          state.aiShotCooldownSeconds = getAiTuning(state.stage).thinkIntervalSeconds;
        } else {
          const hasNearbyDefender = activePlayers(state, 'home')
            .some((candidate) => candidate.role !== 'goalkeeper' && distance(candidate, player) <= 26);
          moveToward(player, goal, AI_SPEED, deltaSeconds, !hasNearbyDefender);
        }
      }
      continue;
    }

    updateSupportPlayer(state, player, deltaSeconds);
  }

  if (controlled && opponentCarrier && controlled.slideSeconds > 0) {
    putBallAtPlayer(state, opponentCarrier);
    events.push(...resolveTackle(state, controlled, opponentCarrier, controlled.powerTackleSeconds > 0));
  }

  const homeCarrier = state.players.find((player) => player.team === 'home' && !player.dismissed && player.id === state.ball.ownerId);
  if (homeCarrier && homeCarrier.id !== controlled?.id && controlled && distance(homeCarrier, controlled) < 25 && input.pressed.has('s')) {
    state.controlledPlayerId = homeCarrier.id;
  }
  return byId(state, state.controlledPlayerId);
}

function maybeUseAiSkill(state, team, events) {
  if (!state.hasMatchClockStarted) return;
  const candidates = activePlayers(state, team).filter((player) => player.role !== 'goalkeeper'
    && player.knockdownSeconds <= 0 && player.motionAction !== 'recover'
    && (player.airborneSecondsRemaining ?? 0) <= 0);
  const actor = candidates.find((player) => player.id === state.ball.ownerId)
    ?? nearestPlayer(candidates, state.ball);
  if (!actor) return;
  const attempt = activateNextTeamSkill(state, team, actor.id);
  if (attempt.ok) events.push(...attempt.events);
}

function advanceVacuum(state, deltaSeconds) {
  const effect = state.vacuumEffect;
  const player = byId(state, effect?.playerId);
  if (!effect || !player) {
    delete state.vacuumEffect;
    return [];
  }

  const start = effect.startPosition ?? { x: state.ball.x, y: state.ball.y };
  const distanceToPlayer = distance(state.ball, player);
  effect.durationSeconds = Math.max(0.001, effect.durationSeconds ?? 0.7);
  effect.elapsedSeconds = Math.min(effect.durationSeconds, (effect.elapsedSeconds ?? 0) + deltaSeconds);
  const progress = clamp(effect.elapsedSeconds / effect.durationSeconds, 0, 1);
  const easedProgress = progress * progress;
  const dx = player.x - start.x;
  const dy = player.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const spiralRadius = Math.min(22, length * 0.12) * (1 - progress);
  const spiralAngle = progress * Math.PI * 6;
  const spiralOffset = Math.sin(spiralAngle) * spiralRadius;
  state.ball.x = clamp(start.x + dx * easedProgress - (dy / length) * spiralOffset, 0, FIELD.width);
  state.ball.y = clamp(start.y + dy * easedProgress + (dx / length) * spiralOffset, 0, FIELD.height);
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.height = 0;
  effect.remainingSeconds = Math.max(0, effect.durationSeconds - effect.elapsedSeconds);

  if (distanceToPlayer <= 18 || effect.remainingSeconds <= 0) {
    setBallOwner(state, player);
    putBallAtPlayer(state, player);
    if (player.role === 'goalkeeper') {
      state.phase = 'goalKick';
      state.phaseSeconds = 1;
    }
    if (player.team === 'home') state.controlledPlayerId = player.id;
    delete state.vacuumEffect;
    state.skillEffects = (state.skillEffects ?? []).filter((cue) => !(cue.skillId === 'vacuumCleaner' && cue.sourcePlayerId === player.id));
    return [{ type: 'vacuumComplete', team: player.team, playerId: player.id }];
  }
  return [];
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
  state.phase = state.overtimeRemainingSeconds === null ? 'playing' : 'overtime';
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

function releaseRestart(state, restart, action) {
  const taker = byId(state, restart.takerId);
  if (!taker || taker.dismissed) return [];

  const isShort = action === 'shortPass';
  const receiver = isShort || action === 'throwIn'
    ? chooseReceiver(state, taker, 'groundPass')
    : null;
  const facing = facingFor(taker);
  putBallAtPlayer(state, taker);
  let target;
  if (receiver) {
    target = { x: receiver.x, y: receiver.y };
  } else if (restart.type === 'cornerKick' && action === 'cornerCross') {
    const attackDirection = restart.team === 'home' ? 1 : -1;
    target = {
      x: clamp(state.ball.x + attackDirection * 300, 0, FIELD.width),
      y: clamp(state.ball.y + facing.y * 150, 55, FIELD.height - 55),
    };
  } else {
    const targetDistance = action === 'longKick'
      ? 300
      : restart.type === 'throwIn' ? 180 : GROUND_CLEARANCE_DISTANCE;
    target = {
      x: clamp(state.ball.x + facing.x * targetDistance, 0, FIELD.width),
      y: clamp(state.ball.y + facing.y * targetDistance, 0, FIELD.height),
    };
  }

  const direction = unit(target.x - state.ball.x, target.y - state.ball.y);
  if (direction.x === 0 && direction.y === 0) return [];
  const isAerial = action !== 'shortPass';
  const speed = action === 'throwIn' ? 235
    : action === 'cornerCross' ? 320
      : action === 'longKick' ? 340 : 330;
  state.ball.ownerId = null;
  state.ball.x = clamp(state.ball.x, 0, FIELD.width);
  state.ball.y = clamp(state.ball.y, 0, FIELD.height);
  state.ball.vx = direction.x * speed;
  state.ball.vy = direction.y * speed;
  state.ball.flightKind = isAerial
    ? (action === 'cornerCross' ? 'cross' : 'lob')
    : 'ground';
  state.ball.flightSeconds = 0;
  state.ball.flightDurationSeconds = Math.max(0.35, distance(target, state.ball) / speed);
  state.ball.height = 0;
  state.ball.verticalVelocity = isAerial ? LOB_VERTICAL_VELOCITY : 0;
  state.ball.passTeam = restart.team;
  state.ball.passReceiverId = null;
  state.ball.lastTouchTeam = restart.team;
  state.ball.passProtectionSeconds = 0;
  delete state.ball.skillId;
  delete state.ball.lastHeaderPlayerId;
  if (isAerial) {
    state.ball.flightTarget = target;
    delete state.ball.passTarget;
  } else {
    state.ball.flightTarget = null;
    state.ball.passTarget = target;
  }
  state.possessionTeam = restart.team;
  if (restart.team === 'home' && receiver && restart.type !== 'goalKick') {
    state.controlledPlayerId = receiver.id;
  }
  if (restart.type === 'goalKick' && restart.team === 'home') {
    const previous = byId(state, restart.previousControlledPlayerId);
    state.controlledPlayerId = previous?.team === 'home' && !previous.dismissed
      ? previous.id
      : nearestPlayer(activePlayers(state, 'home'), taker)?.id ?? null;
  }
  state.restart = null;
  state.phase = state.overtimeRemainingSeconds === null ? 'playing' : 'overtime';
  return [
    { type: 'pass', team: restart.team, action: action === 'shortPass' ? 'groundPass' : action, receiverId: receiver?.id ?? null, completed: false },
    { type: 'restartTaken', restartType: restart.type, team: restart.team, playerId: taker.id },
  ];
}

function advanceManualRestart(state, input, deltaSeconds) {
  const restart = state.restart;
  if (!restart) return [];
  if (restart.team === 'home') {
    if (input.moveX !== 0 || input.moveY !== 0) {
      const facing = unit(input.moveX, input.moveY);
      const taker = byId(state, restart.takerId);
      if (taker && !taker.dismissed) {
        taker.facingX = facing.x;
        taker.facingY = facing.y;
      }
    }
    const action = restart.type === 'throwIn' && input.pressed.has('s') ? 'throwIn'
      : restart.type === 'cornerKick' && input.pressed.has('a') ? 'cornerCross'
        : restart.type === 'cornerKick' && input.pressed.has('s') ? 'shortPass'
          : restart.type === 'goalKick' && input.pressed.has('a') ? 'longKick'
            : restart.type === 'goalKick' && input.pressed.has('s') ? 'shortPass'
              : null;
    if (action) restart.queuedAction ??= action;
  }
  restart.readySeconds = Math.max(0, restart.readySeconds - deltaSeconds);
  const taker = byId(state, restart.takerId);
  if (!taker || taker.dismissed) return [];
  if (restart.readySeconds > 0) return [];

  if (restart.team === 'away') {
    const receiver = launchAutomaticRestart(state, taker);
    state.restart = null;
    state.phase = state.overtimeRemainingSeconds === null ? 'playing' : 'overtime';
    return [{ type: 'restartTaken', restartType: restart.type, team: restart.team, playerId: taker.id, receiverId: receiver?.id ?? null }];
  }

  if (restart.queuedAction) return releaseRestart(state, restart, restart.queuedAction);
  if (restart.type === 'throwIn' && input.pressed.has('s')) return releaseRestart(state, restart, 'throwIn');
  if (restart.type === 'cornerKick' && input.pressed.has('a')) return releaseRestart(state, restart, 'cornerCross');
  if (restart.type === 'cornerKick' && input.pressed.has('s')) return releaseRestart(state, restart, 'shortPass');
  if (restart.type === 'goalKick' && input.pressed.has('a')) return releaseRestart(state, restart, 'longKick');
  if (restart.type === 'goalKick' && input.pressed.has('s')) return releaseRestart(state, restart, 'shortPass');
  return [];
}

function beginSetPiece(state, deltaSeconds) {
  state.phaseSeconds -= deltaSeconds;
  if (state.phaseSeconds > 0) return [];
  state.phase = state.overtimeRemainingSeconds === null ? 'playing' : 'overtime';
  delete state.phaseSeconds;
  return [{ type: 'setPieceStart', team: state.possessionTeam }];
}

function beginKickoff(state, deltaSeconds) {
  state.phaseSeconds -= deltaSeconds;
  if (state.phaseSeconds > 0) return [];
  const team = state.pendingKickoffTeam ?? 'home';
  delete state.pendingKickoffTeam;
  delete state.phaseSeconds;
  resetForKickoff(state, team);
  if (state.overtimeRemainingSeconds !== null) state.phase = 'overtime';
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
  const finishFrame = (frameEvents) => {
    if (!state.skillCutIn) {
      const skillEvent = frameEvents.find((event) => event.type === 'skillUsed' && !event.automatic && event.playerId);
      if (skillEvent) {
        state.skillCutIn = {
          playerId: skillEvent.playerId,
          team: skillEvent.team,
          skillId: skillEvent.skillId,
          elapsedSeconds: 0,
          durationSeconds: ['eulryongta', 'tornadoShot', 'powerTackle'].includes(skillEvent.skillId) ? 1.35 : 0.9,
        };
      }
    }
    advanceSprintStamina(state.players, dt);
    return frameEvents;
  };
  for (const player of state.players) player.sprinting = false;
  advanceSkillEffects(state, dt);
  for (const team of ['home', 'away']) {
    const cooldowns = state.skillCooldownRemaining?.[team] ?? {};
    for (const [skillId, remaining] of Object.entries(cooldowns)) {
      cooldowns[skillId] = Math.max(0, remaining - dt);
    }
  }
  state.powerBarriers = (state.powerBarriers ?? []).map((barrier) => ({
    ...barrier,
    elapsedSeconds: (barrier.elapsedSeconds ?? 0) + dt,
    remainingSeconds: barrier.remainingSeconds - dt,
  })).filter((barrier) => barrier.remainingSeconds > 0);
  if (state.phase === 'overtime' && state.overtimeRemainingSeconds == null) {
    state.overtimeRemainingSeconds = GOLDEN_GOAL_SECONDS;
  }
  state.aiShotCooldownSeconds = Math.max(0, (state.aiShotCooldownSeconds ?? 0) - dt);
  for (const player of state.players) {
    player.stunnedSeconds = Math.max(0, (player.stunnedSeconds ?? 0) - dt);
    if (player.stunnedSeconds === 0 && player.statusDurationSeconds?.stunned !== undefined) {
      const statusDurations = { ...player.statusDurationSeconds };
      delete statusDurations.stunned;
      if (Object.keys(statusDurations).length) player.statusDurationSeconds = statusDurations;
      else delete player.statusDurationSeconds;
    }
    advancePlayerRecovery(player, dt);
    advanceKeeperAction(player, dt);
    player.powerTackleSeconds = Math.max(0, (player.powerTackleSeconds ?? 0) - dt);
    player.aiTackleCooldownSeconds = Math.max(0, (player.aiTackleCooldownSeconds ?? 0) - dt);
  }
  releaseKickoffLockIfBallCleared(state);

  if (state.hasMatchClockStarted) {
    if (state.overtimeRemainingSeconds !== null) {
      state.overtimeRemainingSeconds = Math.max(0, state.overtimeRemainingSeconds - dt);
      if (state.overtimeRemainingSeconds === 0 && state.score.home === state.score.away) {
        state.phase = 'finished';
        clearSkillTransientState(state);
        return finishFrame([{ type: 'matchDraw', score: { ...state.score } }]);
      }
    } else {
      state.remainingSeconds = Math.max(0, state.remainingSeconds - dt);
      if (state.remainingSeconds === 0) {
        if (state.score.home === state.score.away) {
          state.overtimeRemainingSeconds = GOLDEN_GOAL_SECONDS;
          if (state.phase === 'playing') state.phase = 'overtime';
          events.push({ type: 'overtime' });
        } else {
          return finishFrame(finishMatch(state));
        }
      }
    }
  }

  if (state.phase === 'goalPause') return finishFrame([...events, ...beginKickoff(state, dt)]);
  if (state.restart && ['throwIn', 'cornerKick', 'goalKick'].includes(state.phase)) {
    return finishFrame([...events, ...advanceManualRestart(state, input, dt)]);
  }
  if (state.phase === 'goalKick') return finishFrame([...events, ...beginGoalKick(state, dt)]);
  if (state.phase === 'throwIn' || state.phase === 'cornerKick') return finishFrame(events);
  if (state.phase === 'freeKick' || state.phase === 'penaltyKick') return finishFrame([...events, ...beginSetPiece(state, dt)]);

  updateAutomaticHomeDefender(state);
  let controlled = byId(state, state.controlledPlayerId);
  if (!controlled || controlled.dismissed) {
    const availableHomePlayers = activePlayers(state, 'home').filter((player) => state.possessionTeam !== 'away'
      || (player.role !== 'goalkeeper' && player.knockdownSeconds <= 0 && player.stunnedSeconds <= 0
        && player.motionAction !== 'recover'));
    controlled = nearestPlayer(availableHomePlayers, state.ball) ?? null;
    state.controlledPlayerId = controlled?.id ?? null;
  }

  const frameStartPositions = new Map(state.players.map((player) => [player.id, { x: player.x, y: player.y }]));

  if (state.hasMatchClockStarted && controlled && input.pressed.has('f')
      && (controlled.knockdownSeconds <= 0 && controlled.motionAction !== 'recover'
        || (state.teamSkillDecks?.home ?? []).some(({ skillId }) => skillId === 'rainbowReflect'))) {
    const attempt = activateNextTeamSkill(state, 'home', controlled.id);
    if (attempt.ok) events.push(...attempt.events);
  }
  maybeUseAiSkill(state, 'away', events);
  if (handOffHomeControlAfterEulryongta(state)) {
    controlled = byId(state, state.controlledPlayerId);
  }

  if (state.possessionTeam === 'home') {
    if (controlled) {
      moveByInput(controlled, input.moveX, input.moveY, PLAYER_SPEED, dt, input.down.has('e'));
      events.push(...controlBallAction(state, controlled, input));
    }
    updateHomeSupportAi(state, byId(state, state.controlledPlayerId), dt);
      updateAwayDefense(state, dt, events, 'away', null);
  } else {
    if (controlled) controlled = updateAi(state, controlled, input, dt, events);
    updateAwayDefense(state, dt, events, 'home', controlled);
  }

  enforceKickoffCircle(state);
  enforcePowerBarriers(state, frameStartPositions);

  if (state.eagleVolley) {
    events.push(...advanceEagleVolley(state, dt));
  } else if (state.vacuumEffect) {
    events.push(...advanceVacuum(state, dt));
  } else {
    const owner = carrier(state);
    if (owner && controlled && owner.id === controlled.id && state.possessionTeam === 'home') {
      updateOwnedBall(state);
    } else if (state.ball.ownerId && owner) {
      const direction = unit(owner.team === 'home' ? 1 : -1, 0);
      owner.facingX = direction.x;
      updateOwnedBall(state);
    } else {
      const previousBallPosition = { x: state.ball.x, y: state.ball.y };
      events.push(...integrateLooseBall(state, dt));
      events.push(...handleKeeperContact(state, previousBallPosition));
      events.push(...resolveAerialHeader(state));
      events.push(...checkBallBoundary(state));
      if (!['goalPause', 'goalKick', 'finished'].includes(state.phase)) {
        events.push(...collectLooseBall(state));
      }
    }
  }

  releaseKickoffLockIfBallCleared(state);

  return finishFrame(events);
}

function advanceSkillEffects(state, deltaSeconds) {
  if (!Array.isArray(state.skillEffects)) state.skillEffects = [];
  const tornado = state.tornadoShotEffect;
  if (tornado) {
    const source = state.players.find((player) => player.id === tornado.sourcePlayerId);
    if (!source || source.dismissed || state.ball.flightKind !== 'skill-shot' || state.ball.skillId !== 'tornadoShot') {
      state.tornadoShotEffect = null;
    } else {
      tornado.elapsedSeconds = (Number.isFinite(tornado.elapsedSeconds) ? tornado.elapsedSeconds : 0) + deltaSeconds;
      if (tornado.elapsedSeconds >= (tornado.durationSeconds ?? 5)) state.tornadoShotEffect = null;
    }
  }
  const playersById = new Map(state.players.map((player) => [player.id, player]));
  state.skillEffects = state.skillEffects.filter((effect) => {
    const source = playersById.get(effect.sourcePlayerId);
    const target = effect.targetPlayerId ? playersById.get(effect.targetPlayerId) : null;
    if (!source || source.dismissed || (effect.targetPlayerId && (!target || target.dismissed))) return false;
    effect.elapsedSeconds += deltaSeconds;
    if (effect.elapsedSeconds >= effect.durationSeconds) return false;
    if (effect.skillId === 'vacuumCleaner'
        && state.vacuumEffect?.playerId !== effect.sourcePlayerId) return false;
    if (effect.skillId === 'powerTackle' && !effect.targetPlayerId
        && !(state.powerBarriers ?? []).some((barrier) => barrier.sourcePlayerId === effect.sourcePlayerId)) return false;
    if (effect.skillId === 'eagleShot' && !state.eagleVolley) return false;
    if (effect.skillId === 'tornadoShot'
        && (state.ball.flightKind !== 'skill-shot' || state.ball.skillId !== effect.skillId)) return false;
    return true;
  });
}

export { MAX_DELTA };
