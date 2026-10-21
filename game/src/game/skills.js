import { FIELD, MAX_SKILL_GAUGE, SKILL_GAUGE_REWARDS } from './constants.js';

export const SKILL_IDS = Object.freeze([
  'eagleShot',
  'tornadoShot',
  'powerTackle',
  'eulryongta',
  'vacuumCleaner',
  'rainbowReflect',
]);

export const SKILLS = Object.freeze({
  eagleShot: Object.freeze({ name: '독수리슛', type: 'attack', description: '일반 골키퍼가 막을 수 없는 필살 슛' }),
  tornadoShot: Object.freeze({ name: '회오리슛', type: 'attack', description: '수비수를 휘어 지나가는 슛' }),
  powerTackle: Object.freeze({ name: '파워 태클', type: 'defense', description: '4초 동안 태클 범위가 넓어짐' }),
  eulryongta: Object.freeze({ name: '을룡타', type: 'defense', description: '앞에 있는 상대 한 명을 2초 기절시킴' }),
  vacuumCleaner: Object.freeze({ name: '진공청소기', type: 'keeper', description: '주변 공을 사용자에게 끌어옴' }),
  rainbowReflect: Object.freeze({ name: '무지개반사', type: 'keeper', description: '상대 필살기를 상대 골문 쪽으로 되돌림' }),
});

export const HOME_PLAYER_IDS = Object.freeze([
  'home-gk', 'home-def-1', 'home-def-2', 'home-mid-1', 'home-mid-2', 'home-fw',
]);

const distance = (left, right) => Math.hypot(left.x - right.x, left.y - right.y);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function result(ok, skillId, team, reason = null, events = []) {
  return { ok, skillId, team, reason, events };
}

export function validateLoadout(loadout, playerIds = HOME_PLAYER_IDS) {
  const roster = Array.isArray(playerIds) ? playerIds : [];
  const assignments = loadout && typeof loadout === 'object' ? loadout : {};
  const missingPlayerIds = roster.filter((playerId) => !assignments[playerId]);
  const invalidSkillIds = roster
    .map((playerId) => assignments[playerId])
    .filter((skillId) => skillId && !SKILL_IDS.includes(skillId));
  const skillCounts = new Map();
  for (const playerId of roster) {
    const skillId = assignments[playerId];
    if (SKILL_IDS.includes(skillId)) skillCounts.set(skillId, (skillCounts.get(skillId) ?? 0) + 1);
  }
  const duplicateSkillIds = [...skillCounts]
    .filter(([, count]) => count > 1)
    .map(([skillId]) => skillId);
  const assignedCount = roster.filter((playerId) => SKILL_IDS.includes(assignments[playerId])).length;
  const valid = roster.length === SKILL_IDS.length
    && missingPlayerIds.length === 0
    && invalidSkillIds.length === 0
    && duplicateSkillIds.length === 0
    && assignedCount === SKILL_IDS.length;

  return { valid, missingPlayerIds, duplicateSkillIds, invalidSkillIds };
}

/** Add a one-time reward for a successful play, or passive charge for elapsed play time. */
export function addSkillGauge(state, eventType, team, amount = 1) {
  if (!state?.skillGauge || !['home', 'away'].includes(team)) return 0;
  const base = eventType === 'time'
    ? (100 / 60) * Math.max(0, Number.isFinite(amount) ? amount : 0)
    : SKILL_GAUGE_REWARDS[eventType] ?? 0;
  state.skillGauge[team] = clamp((state.skillGauge[team] ?? 0) + base, 0, MAX_SKILL_GAUGE);
  return state.skillGauge[team];
}

function launchSkillShot(state, player, skillId) {
  const attackDirection = player.team === 'home' ? 1 : -1;
  const targetY = FIELD.height / 2 + player.facingY * 54;
  const dx = attackDirection * FIELD.width;
  const dy = targetY - player.y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = skillId === 'eagleShot' ? 650 : 520;

  state.ball.x = clamp(player.x + player.facingX * 17, 0, FIELD.width);
  state.ball.y = clamp(player.y + player.facingY * 17, 0, FIELD.height);
  state.ball.ownerId = null;
  state.ball.vx = dx / length * speed;
  state.ball.vy = dy / length * speed;
  state.ball.height = 0;
  state.ball.flightKind = 'skill-shot';
  state.ball.flightSeconds = 0;
  state.ball.skillId = skillId;
  state.ball.lastTouchTeam = player.team;
  state.possessionTeam = player.team;

  const onTarget = targetY >= FIELD.goalTop && targetY <= FIELD.goalBottom;
  return [{ type: 'skillUsed', skillId, team: player.team }, ...(onTarget ? [{ type: 'shotOnTarget', team: player.team }] : [])];
}

function findEulryongtaTarget(state, player) {
  return state.players
    .filter((candidate) => candidate.team !== player.team && candidate.stunnedSeconds <= 0)
    .map((candidate) => {
      const dx = candidate.x - player.x;
      const dy = candidate.y - player.y;
      const forward = dx * player.facingX + dy * player.facingY;
      return { candidate, forward, distance: Math.hypot(dx, dy) };
    })
    .filter((entry) => entry.distance <= 140 && entry.forward >= 0)
    .sort((a, b) => a.distance - b.distance)[0]?.candidate ?? null;
}

/** Try to use the selected player's skill. Invalid attempts do not consume gauge. */
export function applySkill(state, playerId) {
  const player = state?.players?.find((candidate) => candidate.id === playerId);
  if (!player) return result(false, null, null, 'playerNotFound');
  const skillId = player.skillId;
  if (!SKILL_IDS.includes(skillId)) return result(false, skillId ?? null, player.team, 'noSkillEquipped');
  if (!state.skillGauge) return result(false, skillId, player.team, 'gaugeUnavailable');
  if (skillId === 'rainbowReflect') return result(false, skillId, player.team, 'automaticSkill');
  if ((state.skillGauge?.[player.team] ?? 0) < MAX_SKILL_GAUGE) return result(false, skillId, player.team, 'gaugeNotFull');
  if (!['playing', 'overtime'].includes(state.phase)) return result(false, skillId, player.team, 'matchNotActive');

  const opponentCarrier = state.players.find((candidate) => candidate.team !== player.team && candidate.id === state.ball.ownerId);
  let events = [];

  if (skillId === 'eagleShot' || skillId === 'tornadoShot') {
    if (state.ball.ownerId !== player.id || state.possessionTeam !== player.team) {
      return result(false, skillId, player.team, 'needBall');
    }
    events = launchSkillShot(state, player, skillId);
  } else if (skillId === 'powerTackle') {
    if (!opponentCarrier) return result(false, skillId, player.team, 'noOpponentCarrier');
    player.powerTackleSeconds = 4;
    events = [{ type: 'skillUsed', skillId, team: player.team }];
  } else if (skillId === 'eulryongta') {
    const target = findEulryongtaTarget(state, player);
    if (!target) return result(false, skillId, player.team, 'noTargetInFront');
    target.stunnedSeconds = 2;
    events = [{ type: 'skillUsed', skillId, team: player.team, targetId: target.id }];
  } else if (skillId === 'vacuumCleaner') {
    if (distance(player, state.ball) > 220) return result(false, skillId, player.team, 'ballTooFar');
    state.ball.ownerId = null;
    state.vacuumEffect = { playerId, team: player.team, remainingSeconds: 0.5 };
    state.possessionTeam = null;
    events = [{ type: 'skillUsed', skillId, team: player.team }];
  }

  state.skillGauge[player.team] = 0;
  return result(true, skillId, player.team, null, events);
}

/** Start or advance an automatic reflection for either team. */
export function applyAutomaticRainbowReflect(state, defendingTeam = 'home', deltaSeconds = 0) {
  if (!state?.ball || !state.skillGauge || !['home', 'away'].includes(defendingTeam)) return null;

  const active = state.rainbowReflection;
  if (active) {
    if (active.team !== defendingTeam) return null;
    const player = state.players.find((candidate) => candidate.id === active.playerId);
    if (!player || state.ball.ownerId || state.ball.flightKind !== 'skill-shot') {
      delete state.rainbowReflection;
      return null;
    }
    active.remainingSeconds -= Math.max(0, deltaSeconds);
    const dx = state.ball.x - player.x;
    const dy = state.ball.y - player.y;
    const length = Math.hypot(dx, dy) || 1;
    const travel = Math.min(length, 700 * Math.max(0, deltaSeconds));
    player.x = clamp(player.x + dx / length * travel, 0, FIELD.width);
    player.y = clamp(player.y + dy / length * travel, 0, FIELD.height);
    player.facingX = Math.sign(dx) || player.facingX;
    player.facingY = Math.sign(dy);

    if (Math.hypot(state.ball.x - player.x, state.ball.y - player.y) <= 22) {
      const direction = defendingTeam === 'home' ? 1 : -1;
      const goalY = FIELD.height / 2;
      const velocityLength = Math.hypot(FIELD.width, goalY - state.ball.y) || 1;
      state.ball.ownerId = null;
      state.ball.vx = direction * FIELD.width / velocityLength * 560;
      state.ball.vy = (goalY - state.ball.y) / velocityLength * 560;
      state.ball.flightKind = 'skill-shot';
      state.ball.flightSeconds = 0;
      state.ball.skillId = 'rainbowReflect';
      state.ball.lastTouchTeam = defendingTeam;
      state.possessionTeam = defendingTeam;
      delete state.rainbowReflection;
      return { type: 'skillUsed', skillId: 'rainbowReflect', team: defendingTeam, playerId: player.id, automatic: true };
    }

    if (active.remainingSeconds <= 0) delete state.rainbowReflection;
    return null;
  }

  const attackingTeam = defendingTeam === 'home' ? 'away' : 'home';
  if (state.ball.ownerId || state.ball.flightKind !== 'skill-shot'
      || state.ball.lastTouchTeam !== attackingTeam
      || !['eagleShot', 'tornadoShot'].includes(state.ball.skillId)
      || (state.skillGauge[defendingTeam] ?? 0) < MAX_SKILL_GAUGE) return null;

  const reflector = state.players
    .filter((player) => player.team === defendingTeam && player.skillId === 'rainbowReflect')
    .sort((a, b) => distance(a, state.ball) - distance(b, state.ball))[0];
  if (!reflector) return null;

  state.skillGauge[defendingTeam] = 0;
  state.ball.vx *= 0.25;
  state.ball.vy *= 0.25;
  state.rainbowReflection = { team: defendingTeam, playerId: reflector.id, remainingSeconds: 2.5 };
  return { type: 'rainbowStarted', skillId: 'rainbowReflect', team: defendingTeam, playerId: reflector.id, automatic: true };
}
