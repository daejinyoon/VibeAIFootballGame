import {
  BALL_GRAVITY,
  BALL_RADIUS,
  FIELD,
  GROUND_CLEARANCE_DISTANCE,
  GOLDEN_GOAL_SECONDS,
  getAiTuning,
  HEADER_HEIGHT_MAX,
  HEADER_HEIGHT_MIN,
  HEADER_RADIUS,
  JUMP_COOLDOWN_SECONDS,
  JUMP_GRAVITY,
  JUMP_INITIAL_VELOCITY,
  JUMP_MAX_HEIGHT,
  LOB_CLEARANCE_DISTANCE,
  LOB_VERTICAL_VELOCITY,
  SHOT_ASSIST_DISTANCE,
} from './constants.js';
import { createInitialGameState } from './createInitialGameState.js';
import { applyAutomaticRainbowReflect, applySkill, SKILL_IDS } from './skills.js';

const PLAYER_SPEED = 160;
const AI_SPEED = 125;
const KEEPER_SPEED = 95;
const PRESSURE_SPEED = 190;
const SLIDE_SPEED = 160;
const MAX_DELTA = 0.05;
const INTERCEPTION_RADIUS = 16;
const AI_JUMP_REACH_RADIUS = 88;
const AI_MIN_PASS_DISTANCE = 48;
const AI_MAX_PASS_DISTANCE = 330;
const KNOCKDOWN_SECONDS = 1;

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
  if (!player || !target || player.dismissed || player.stunnedSeconds > 0
      || player.knockdownSeconds > 0 || player.motionAction === 'recover') return;
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
    player.motionAction = 'run';
  }
}

function moveByInput(player, moveX, moveY, speed, deltaSeconds) {
  if (!player || player.dismissed || player.stunnedSeconds > 0
      || player.knockdownSeconds > 0 || player.motionAction === 'recover') return;
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
    player.motionAction = 'run';
  }
}

function setBallOwner(state, player) {
  if (!player) return;
  state.ball.ownerId = player.id;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.height = 0;
  state.ball.verticalVelocity = 0;
  state.ball.flightKind = 'ground';
  state.ball.flightSeconds = 0;
  delete state.ball.flightDurationSeconds;
  delete state.ball.skillId;
  delete state.ball.passTeam;
  delete state.ball.passTarget;
  delete state.ball.flightTarget;
  state.ball.passProtectionSeconds = 0;
  delete state.ball.lastHeaderPlayerId;
  state.ball.lastTouchTeam = player.team;
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
  const start = { x: state.ball.x, y: state.ball.y };
  const goalX = attackDirection > 0 ? FIELD.width : 0;
  let direction = facing;
  if (facing.x * attackDirection > 0) {
    const distanceToGoal = (goalX - start.x) / facing.x;
    if (Number.isFinite(distanceToGoal) && distanceToGoal > 0) {
      const rawTargetY = start.y + facing.y * distanceToGoal;
      const distanceToGoalMouth = Math.hypot(goalX - start.x, rawTargetY - start.y);
      const assist = clamp(1 - distanceToGoalMouth / SHOT_ASSIST_DISTANCE, 0, 0.7);
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
  state.ball.height = 0;
  state.ball.verticalVelocity = 0;
  delete state.ball.flightDurationSeconds;
  delete state.ball.skillId;
  delete state.ball.passTeam;
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

function resetForKickoff(state, kickoffTeam) {
  const playerSkillStacks = Object.fromEntries(state.players
    .filter((player) => player.team === 'home' && player.skillId)
    .map((player) => [player.id, { skillId: player.skillId, copies: player.skillCopies }]));
  const opponentSkillStacks = Object.fromEntries(state.players
    .filter((player) => player.team === 'away' && player.skillId)
    .map((player) => [player.id, { skillId: player.skillId, copies: player.skillCopies }]));
  const fresh = createInitialGameState({
    stage: state.stage,
    playerSkillStacks,
    opponentSkillStacks,
  });
  const score = { ...state.score };
  const remainingSeconds = state.remainingSeconds;
  const overtimeRemainingSeconds = state.overtimeRemainingSeconds;
  const remainingUses = new Map(state.players.map((player) => [player.id, player.skillUsesRemaining]));
  const controlledPlayerId = state.controlledPlayerId;
  const controlledPlayer = byId(state, controlledPlayerId);
  const controlledPosition = controlledPlayer ? { x: controlledPlayer.x, y: controlledPlayer.y } : { x: FIELD.width / 2, y: FIELD.height / 2 };
  const discipline = new Map(state.players.map((player) => [player.id, {
    foulCount: player.foulCount ?? 0,
    card: player.card ?? 'none',
    dismissed: Boolean(player.dismissed),
  }]));

  Object.assign(state, fresh, { score, remainingSeconds, overtimeRemainingSeconds });
  for (const player of state.players) {
    Object.assign(player, discipline.get(player.id));
    player.skillUsesRemaining = remainingUses.get(player.id) ?? player.skillUsesRemaining;
  }
  state.possessionTeam = kickoffTeam;
  state.ball.ownerId = `${kickoffTeam}-fw`;
  state.ball.lastTouchTeam = kickoffTeam;
  const homePlayers = activePlayers(state, 'home');
  const stillControlled = byId(state, controlledPlayerId);
  state.controlledPlayerId = stillControlled?.team === 'home' && !stillControlled.dismissed
    ? controlledPlayerId
    : nearestPlayer(homePlayers, controlledPosition)?.id ?? null;
  if (state.players.some((player) => player.id === state.ball.ownerId && player.dismissed)) {
    const restartPlayer = nearestPlayer(activePlayers(state, kickoffTeam), { x: FIELD.width / 2, y: FIELD.height / 2 });
    state.ball.ownerId = restartPlayer?.id ?? null;
  }
  putBallAtPlayer(state, carrier(state));
}

function finishMatch(state) {
  state.phase = 'finished';
  state.restart = null;
  if (state.score.home === state.score.away) {
    return [{ type: 'matchDraw', score: { ...state.score } }];
  }
  const won = state.score.home > state.score.away;
  return [{
    type: won ? 'matchWon' : 'matchLost',
    score: { ...state.score },
  }];
}

function scoreGoal(state, scoringTeam) {
  state.score[scoringTeam] += 1;
  state.restart = null;
  const event = { type: 'goal', team: scoringTeam, score: { ...state.score } };

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
  const duration = clamp(Number.isFinite(durationSeconds) ? durationSeconds : KNOCKDOWN_SECONDS, 0, KNOCKDOWN_SECONDS);
  player.knockdownSeconds = Math.max(player.knockdownSeconds ?? 0, duration);
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
  if (player.motionAction === 'tackle') {
    player.motionAction = 'idle';
  }
  if (player.knockdownSeconds > 0) {
    player.knockdownSeconds = Math.max(0, player.knockdownSeconds - deltaSeconds);
    if (player.knockdownSeconds === 0) {
      player.motionAction = 'recover';
      player.vx = 0;
      player.vy = 0;
    }
  } else if (player.motionAction === 'recover') {
    player.motionAction = 'idle';
    player.knockdownDirectionX = 0;
    player.knockdownDirectionY = 0;
  }
}

function nearestPlayer(players, point) {
  return players
    .map((player, index) => ({ player, index, distance: distance(player, point) }))
    .sort((a, b) => a.distance - b.distance || a.index - b.index)[0]?.player ?? null;
}

function isBehindTackler(tackler, ballCarrier) {
  const facingX = ballCarrier.facingX || (ballCarrier.team === 'home' ? 1 : -1);
  return (tackler.x - ballCarrier.x) * facingX
    + (tackler.y - ballCarrier.y) * ballCarrier.facingY < 0;
}

function awardFoul(state, foulingPlayer, fouledPlayer, spot) {
  const foulSpot = { x: clamp(spot.x, 0, FIELD.width), y: clamp(spot.y, 0, FIELD.height) };
  const defendingTeam = foulingPlayer.team;
  const inPenaltyArea = Math.abs(foulSpot.y - FIELD.height / 2) <= 100
    && (defendingTeam === 'home' ? foulSpot.x <= 132 : foulSpot.x >= FIELD.width - 132);
  const restart = inPenaltyArea ? 'penaltyKick' : 'freeKick';
  foulingPlayer.motionAction = 'tackle';
  foulingPlayer.foulCount = Math.min(2, (foulingPlayer.foulCount ?? 0) + 1);
  const redCard = foulingPlayer.foulCount >= 2;
  foulingPlayer.card = redCard ? 'red' : 'yellow';
  if (redCard) foulingPlayer.dismissed = true;

  const taker = nearestPlayer(activePlayers(state, fouledPlayer.team), foulSpot);
  state.foulSpot = foulSpot;
  state.foulNoticeSeconds = 3;
  state.lastFoul = { team: foulingPlayer.team, playerId: foulingPlayer.id, restart, spot: foulSpot };
  state.phase = restart;
  state.phaseSeconds = 1;
  state.possessionTeam = fouledPlayer.team;
  if (taker) {
    taker.x = foulSpot.x;
    taker.y = foulSpot.y;
    setBallOwner(state, taker);
    putBallAtPlayer(state, taker);
    if (taker.team === 'home') state.controlledPlayerId = taker.id;
  } else {
    state.ball.ownerId = null;
    state.ball.x = foulSpot.x;
    state.ball.y = foulSpot.y;
    state.ball.vx = 0;
    state.ball.vy = 0;
  }

  const events = [
    { type: 'foul', team: foulingPlayer.team, playerId: foulingPlayer.id, spot: foulSpot, restart },
    { type: redCard ? 'redCard' : 'yellowCard', team: foulingPlayer.team, playerId: foulingPlayer.id },
  ];
  const knockdownEvent = knockDownPlayer(state, fouledPlayer, foulingPlayer);
  if (knockdownEvent) events.push(knockdownEvent);
  if (redCard) {
    events.push({ type: 'playerDismissed', team: foulingPlayer.team, playerId: foulingPlayer.id });
    if (state.controlledPlayerId === foulingPlayer.id) {
      state.controlledPlayerId = nearestPlayer(activePlayers(state, 'home'), foulingPlayer)?.id ?? null;
    }
  }
  events.push({ type: restart, team: fouledPlayer.team, playerId: taker?.id ?? null });
  return events;
}

function resolveTackle(state, tackler, ballCarrier, skillProtected = false) {
  if (!tackler || !ballCarrier || tackler.dismissed || ballCarrier.dismissed
      || tackler.stunnedSeconds > 0 || tackler.knockdownSeconds > 0
      || ballCarrier.knockdownSeconds > 0) return [];
  const tackleRange = tackler.powerTackleSeconds > 0 ? 39 : 26;
  if (distance(tackler, ballCarrier) > tackleRange) return [];

  const ballDistance = distance(tackler, state.ball);
  const playerDistance = distance(tackler, ballCarrier);
  if (!skillProtected && playerDistance <= 22
      && (isBehindTackler(tackler, ballCarrier) || ballDistance > playerDistance)) {
    return awardFoul(state, tackler, ballCarrier, state.ball);
  }

  tackler.motionAction = 'tackle';
  setBallOwner(state, tackler);
  const knockdownEvent = knockDownPlayer(state, ballCarrier, tackler);
  if (tackler.team === 'home') state.controlledPlayerId = tackler.id;
  return [{ type: 'tackle', team: tackler.team, playerId: tackler.id }, ...(knockdownEvent ? [knockdownEvent] : [])];
}

function stopBallAtFieldEdge(state) {
  state.ball.x = clamp(state.ball.x, 0, FIELD.width);
  state.ball.y = clamp(state.ball.y, 0, FIELD.height);
  state.ball.ownerId = null;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.height = 0;
  state.ball.flightKind = 'ground';
  state.ball.passProtectionSeconds = 0;
  delete state.ball.passTarget;
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
    taker.x = restartTeam === 'home' ? 70 : FIELD.width - 70;
    taker.y = FIELD.height / 2;
    spot = { x: taker.x, y: taker.y };
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

function handleKeeperContact(state) {
  const { ball } = state;
  if (ball.ownerId || !['shot', 'skill-shot'].includes(ball.flightKind) || ball.height > 8) return [];

  for (const keeper of state.players.filter((player) => player.role === 'goalkeeper'
      && !player.dismissed && player.knockdownSeconds <= 0)) {
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

function findGroundPassInterceptor(state, passerTeam, start, end) {
  if (![start.x, start.y, end.x, end.y].every(Number.isFinite)) return null;
  return state.players
    .filter((player) => player.team !== passerTeam && player.role !== 'goalkeeper' && !player.dismissed)
    .map((player, index) => ({
      player,
      index,
      progress: segmentProjection(player, start, end),
      gap: segmentDistance(player, start, end),
    }))
    .filter((entry) => entry.gap <= INTERCEPTION_RADIUS)
    .sort((left, right) => left.progress - right.progress || left.gap - right.gap || left.index - right.index)[0] ?? null;
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
        { type: 'passIntercepted', team: player.team, playerId: player.id, fromTeam: passTeam, passKind: 'ground' },
        ...(previousTeam !== player.team ? [{ type: 'possessionChange', team: player.team, playerId: player.id }] : []),
      ];
    }
  }
  return [];
}

function predictedLandingPoint(ball) {
  const height = Number.isFinite(ball.height) ? ball.height : 0;
  const verticalVelocity = Number.isFinite(ball.verticalVelocity) ? ball.verticalVelocity : 0;
  const discriminant = verticalVelocity * verticalVelocity + 2 * BALL_GRAVITY * height;
  const time = (verticalVelocity + Math.sqrt(Math.max(0, discriminant))) / BALL_GRAVITY;
  if (!Number.isFinite(time) || time < 0) return { x: ball.x, y: ball.y };
  return {
    x: clamp(ball.x + (Number.isFinite(ball.vx) ? ball.vx : 0) * time, 0, FIELD.width),
    y: clamp(ball.y + (Number.isFinite(ball.vy) ? ball.vy : 0) * time, 0, FIELD.height),
  };
}

function updateJumps(state, controlled, input, deltaSeconds) {
  const { ball } = state;
  const landingPoint = ball.height > 10 && ball.height <= HEADER_HEIGHT_MAX + 45 && ball.verticalVelocity < 0
    ? predictedLandingPoint(ball)
    : null;
  const autoJumper = landingPoint
    ? state.players
      .filter((player) => !player.dismissed && player.role !== 'goalkeeper' && player.id !== controlled?.id
        && player.knockdownSeconds <= 0 && player.jumpHeight <= 0 && player.jumpCooldownSeconds <= deltaSeconds)
      .map((player, index) => ({ player, index, gap: distance(player, landingPoint) }))
      .filter((entry) => entry.gap <= AI_JUMP_REACH_RADIUS)
      .sort((left, right) => left.gap - right.gap || left.index - right.index)[0]?.player ?? null
    : null;

  for (const player of state.players) {
    player.jumpCooldownSeconds = Math.max(0, (player.jumpCooldownSeconds ?? 0) - deltaSeconds);
    if (player.dismissed || player.role === 'goalkeeper' || player.knockdownSeconds > 0 || player.motionAction === 'recover') continue;
    if (player.id === controlled?.id && input.pressed.has('Space')
        && player.jumpHeight <= 0 && player.jumpCooldownSeconds === 0) {
      player.jumpVelocity = JUMP_INITIAL_VELOCITY;
      player.jumpCooldownSeconds = JUMP_COOLDOWN_SECONDS;
    }
    if (player.id === autoJumper?.id
        && player.jumpHeight <= 0 && player.jumpCooldownSeconds === 0) {
      player.jumpVelocity = JUMP_INITIAL_VELOCITY;
      player.jumpCooldownSeconds = JUMP_COOLDOWN_SECONDS;
    }
    if (player.jumpVelocity !== 0 || player.jumpHeight > 0) {
      player.jumpVelocity -= JUMP_GRAVITY * deltaSeconds;
      player.jumpHeight = clamp(player.jumpHeight + player.jumpVelocity * deltaSeconds, 0, JUMP_MAX_HEIGHT);
      if (player.jumpHeight === 0) player.jumpVelocity = 0;
    }
  }
}

function resolveAerialHeader(state) {
  const { ball } = state;
  if (ball.ownerId || ball.height < HEADER_HEIGHT_MIN || ball.height > HEADER_HEIGHT_MAX) return [];
  const lastHeaderPlayer = byId(state, ball.lastHeaderPlayerId);
  if (lastHeaderPlayer && distance(lastHeaderPlayer, ball) > HEADER_RADIUS) {
    delete ball.lastHeaderPlayerId;
  }
  const jumper = state.players
    .filter((player) => !player.dismissed && player.role !== 'goalkeeper'
      && player.knockdownSeconds <= 0 && player.id !== ball.lastHeaderPlayerId && player.jumpHeight > 0)
    .map((player, index) => ({ player, index, distance: distance(player, ball) }))
    .filter(({ distance: gap }) => gap <= HEADER_RADIUS)
    .sort((a, b) => a.distance - b.distance || a.index - b.index)[0]?.player;
  if (!jumper) return [];

  const previousTeam = state.possessionTeam;
  const incomingPassTeam = ball.passTeam;
  const incomingPassKind = ball.flightKind;
  const interceptedPass = incomingPassTeam && incomingPassTeam !== jumper.team
    && ['lob', 'cross'].includes(incomingPassKind);
  const attackDirection = jumper.team === 'home' ? 1 : -1;
  const facing = unit(jumper.facingX, jumper.facingY);
  ball.ownerId = null;
  ball.vx = (facing.x || attackDirection) * 360;
  ball.vy = (facing.y || 0) * 360 + (jumper.team === 'home' ? 120 : -120);
  ball.height = Math.max(HEADER_HEIGHT_MIN, jumper.jumpHeight + 22);
  ball.verticalVelocity = 120;
  ball.flightKind = 'header';
  ball.flightSeconds = 0;
  ball.lastHeaderPlayerId = jumper.id;
  ball.lastTouchTeam = jumper.team;
  delete ball.passTarget;
  ball.passProtectionSeconds = 0;
  delete ball.passTeam;
  state.possessionTeam = jumper.team;
  if (jumper.team === 'home') state.controlledPlayerId = jumper.id;
  return [
    { type: 'header', team: jumper.team, playerId: jumper.id },
    ...(interceptedPass ? [{
      type: 'passIntercepted', team: jumper.team, playerId: jumper.id,
      fromTeam: incomingPassTeam, passKind: incomingPassKind,
    }] : []),
    ...(previousTeam !== jumper.team ? [{ type: 'possessionChange', team: jumper.team, playerId: jumper.id }] : []),
  ];
}

function collectLooseBall(state) {
  const { ball } = state;
  if (ball.ownerId || ball.height > 14) return [];
  if (ball.flightKind === 'skill-shot' && ['eagleShot', 'tornadoShot'].includes(ball.skillId)) return [];
  const candidates = state.players
    .filter((player) => !player.dismissed && player.knockdownSeconds <= 0 && player.motionAction !== 'recover')
    .map((player) => ({ player, distance: distance(player, ball) }))
    .filter(({ distance: playerDistance }) => playerDistance <= 18)
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

function handleHomeAttack(state, controlled, input) {
  if (state.ball.ownerId !== controlled.id) return [];
  if (input.pressed.has('a')) return releasePass(state, controlled, 'lobPass');
  if (input.pressed.has('s')) return releasePass(state, controlled, 'groundPass');
  if (input.pressed.has('d')) return releaseShot(state, controlled);
  return [];
}

function controlBallAction(state, controlled, input) {
  if (controlled.knockdownSeconds > 0 || controlled.motionAction === 'recover') {
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
  for (const player of state.players) {
    if (player.team !== 'home'
        || player.dismissed
        || player.role === 'goalkeeper'
        || player.id === controlled?.id
        || player.id === state.ball.ownerId
        || state.rainbowReflection?.playerId === player.id) continue;
    updateSupportPlayer(state, player, deltaSeconds);
  }
}

function updateAwayDefense(state, deltaSeconds, events, defendingTeam = 'away', controlled = null) {
  const defendingCarrier = carrier(state);
  if (!defendingCarrier || defendingCarrier.team === defendingTeam) return;
  const defenders = activePlayers(state, defendingTeam)
    .filter((player) => player.role !== 'goalkeeper' && player.id !== controlled?.id
      && player.knockdownSeconds <= 0 && player.motionAction !== 'recover');
  const attackers = activePlayers(state, defendingCarrier.team)
    .filter((player) => player.role !== 'goalkeeper' && player.id !== defendingCarrier.id
      && player.knockdownSeconds <= 0 && player.motionAction !== 'recover')
    .sort((left, right) => distance(left, defendingCarrier) - distance(right, defendingCarrier));
  const pressingDistance = getAiTuning(state.stage).pressingDistance;
  const presser = nearestPlayer(defenders, defendingCarrier);
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
  coverers.forEach((player, index) => {
    const receiver = attackers[index % Math.max(1, attackers.length)];
    const target = receiver
      ? {
        x: (defendingCarrier.x * 0.56) + (receiver.x * 0.44),
        y: (defendingCarrier.y * 0.56) + (receiver.y * 0.44),
      }
      : targetForRole(state, player, defendingCarrier.team, state.ball, defendingCarrier);
    player.aiTarget = { x: clamp(target.x, 20, FIELD.width - 20), y: clamp(target.y, 12, FIELD.height - 12) };
    player.aiRetargetSeconds = getAiTuning(state.stage).thinkIntervalSeconds;
    moveToward(player, player.aiTarget, AI_SPEED, deltaSeconds);
  });

  const keeper = activePlayers(state, defendingTeam).find((player) => player.role === 'goalkeeper');
  if (keeper && keeper.id !== controlled?.id) {
    const target = targetForRole(state, keeper, defendingCarrier.team, state.ball, defendingCarrier);
    keeper.aiTarget = target;
    moveToward(keeper, target, KEEPER_SPEED, deltaSeconds);
  }
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
    .sort((left, right) => distance(left, ballCarrier) - distance(right, ballCarrier));
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
      && controlled.motionAction !== 'recover' && state.rainbowReflection?.playerId !== controlled.id) {
    if (state.possessionTeam === 'away' && input.down.has('d') && opponentCarrier) {
      moveToward(controlled, opponentCarrier, PRESSURE_SPEED, deltaSeconds);
    } else if (controlled.slideSeconds > 0 && opponentCarrier) {
      moveToward(controlled, opponentCarrier, SLIDE_SPEED, deltaSeconds);
      controlled.slideSeconds = Math.max(0, controlled.slideSeconds - deltaSeconds);
    } else {
      moveByInput(controlled, input.moveX, input.moveY, PLAYER_SPEED, deltaSeconds);
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
    if (state.rainbowReflection?.playerId === player.id) continue;
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
          moveToward(player, goal, AI_SPEED, deltaSeconds);
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
  const opponentCarrier = state.players.find((player) => player.team !== team && !player.dismissed && player.id === state.ball.ownerId);
  const candidates = state.players.filter((player) => player.team === team && player.role !== 'goalkeeper' && !player.dismissed
    && player.knockdownSeconds <= 0 && player.motionAction !== 'recover'
    && SKILL_IDS.includes(player.skillId) && player.skillUsesRemaining > 0);

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

  if (input.moveX !== 0 || input.moveY !== 0) {
    const facing = unit(input.moveX, input.moveY);
    taker.facingX = facing.x;
    taker.facingY = facing.y;
  }
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
  if (state.phase === 'overtime' && state.overtimeRemainingSeconds == null) {
    state.overtimeRemainingSeconds = GOLDEN_GOAL_SECONDS;
  }
  state.aiShotCooldownSeconds = Math.max(0, (state.aiShotCooldownSeconds ?? 0) - dt);
  for (const player of state.players) {
    player.stunnedSeconds = Math.max(0, (player.stunnedSeconds ?? 0) - dt);
    advancePlayerRecovery(player, dt);
    player.powerTackleSeconds = Math.max(0, (player.powerTackleSeconds ?? 0) - dt);
    player.aiTackleCooldownSeconds = Math.max(0, (player.aiTackleCooldownSeconds ?? 0) - dt);
  }
  state.foulNoticeSeconds = Math.max(0, (state.foulNoticeSeconds ?? 0) - dt);

  if (state.overtimeRemainingSeconds !== null) {
    state.overtimeRemainingSeconds = Math.max(0, state.overtimeRemainingSeconds - dt);
    if (state.overtimeRemainingSeconds === 0 && state.score.home === state.score.away) {
      state.phase = 'finished';
      return [{ type: 'matchDraw', score: { ...state.score } }];
    }
  } else {
    state.remainingSeconds = Math.max(0, state.remainingSeconds - dt);
    if (state.remainingSeconds === 0) {
      if (state.score.home === state.score.away) {
        state.overtimeRemainingSeconds = GOLDEN_GOAL_SECONDS;
        if (state.phase === 'playing') state.phase = 'overtime';
        events.push({ type: 'overtime' });
      } else {
        return finishMatch(state);
      }
    }
  }

  if (state.phase === 'goalPause') return [...events, ...beginKickoff(state, dt)];
  if (state.restart && ['throwIn', 'cornerKick', 'goalKick'].includes(state.phase)) {
    return [...events, ...advanceManualRestart(state, input, dt)];
  }
  if (state.phase === 'goalKick') return [...events, ...beginGoalKick(state, dt)];
  if (state.phase === 'throwIn' || state.phase === 'cornerKick') return events;
  if (state.phase === 'freeKick' || state.phase === 'penaltyKick') return [...events, ...beginSetPiece(state, dt)];

  let controlled = byId(state, state.controlledPlayerId);
  if (!controlled || controlled.dismissed) {
    controlled = nearestPlayer(activePlayers(state, 'home'), state.ball) ?? null;
    state.controlledPlayerId = controlled?.id ?? null;
  }

  updateJumps(state, controlled, input, dt);

  for (const team of ['home', 'away']) {
    const reflectionEvent = applyAutomaticRainbowReflect(state, team, dt);
    if (reflectionEvent) events.push(reflectionEvent);
  }

  if (controlled && controlled.knockdownSeconds <= 0 && controlled.motionAction !== 'recover'
      && input.pressed.has('f') && state.rainbowReflection?.playerId !== controlled.id) {
    const attempt = applySkill(state, controlled.id);
    if (attempt.ok) events.push(...attempt.events);
  }
  maybeUseAiSkill(state, 'away', events);

  if (state.possessionTeam === 'home') {
    if (controlled && state.rainbowReflection?.playerId !== controlled.id) {
      moveByInput(controlled, input.moveX, input.moveY, PLAYER_SPEED, dt);
      events.push(...controlBallAction(state, controlled, input));
    }
    updateHomeSupportAi(state, byId(state, state.controlledPlayerId), dt);
      updateAwayDefense(state, dt, events, 'away', null);
  } else {
    if (controlled) controlled = updateAi(state, controlled, input, dt, events);
    updateAwayDefense(state, dt, events, 'home', controlled);
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
      events.push(...integrateLooseBall(state, dt));
      events.push(...resolveAerialHeader(state));
      events.push(...handleKeeperContact(state));
      events.push(...checkBallBoundary(state));
      if (!['goalPause', 'goalKick', 'finished'].includes(state.phase)) {
        events.push(...collectLooseBall(state));
      }
    }
  }

  return events;
}

export { MAX_DELTA };
