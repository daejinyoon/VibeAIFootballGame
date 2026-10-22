import { FIELD } from './constants.js';

export const SKILL_IDS = Object.freeze([
  'eagleShot',
  'tornadoShot',
  'powerTackle',
  'eulryongta',
  'vacuumCleaner',
  'rainbowReflect',
]);

export const SKILLS = Object.freeze({
  eagleShot: Object.freeze({ name: '독수리슛', type: 'attack', description: '일반 골키퍼가 막을 수 없는 필살 슛', artwork: '/images/skills/eagle-shot.png' }),
  tornadoShot: Object.freeze({ name: '회오리슛', type: 'attack', description: '수비수를 휘어 지나가는 슛', artwork: '/images/skills/tornado-shot.png' }),
  powerTackle: Object.freeze({ name: '파워 태클', type: 'defense', description: '4초 동안 태클 범위가 넓어짐', artwork: '/images/skills/power-tackle.png' }),
  eulryongta: Object.freeze({ name: '을룡타', type: 'defense', description: '앞에 있는 상대 한 명을 2초 기절시킴', artwork: '/images/skills/eulryongta.png' }),
  vacuumCleaner: Object.freeze({ name: '진공청소기', type: 'utility', description: '주변 공을 사용자에게 끌어옴', artwork: '/images/skills/vacuum-cleaner.png' }),
  rainbowReflect: Object.freeze({ name: '무지개반사', type: 'utility', description: '상대 필살기를 상대 골문 쪽으로 되돌림', artwork: '/images/skills/rainbow-reflect.png' }),
});

export const MAX_SKILL_COPIES = 3;
export const FIELD_PLAYER_IDS = Object.freeze(['home-def-1', 'home-mid-1', 'home-fw']);
export const HOME_PLAYER_IDS = FIELD_PLAYER_IDS;

const distance = (left, right) => Math.hypot(left.x - right.x, left.y - right.y);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function result(ok, skillId, team, reason = null, events = []) {
  return { ok, skillId, team, reason, events };
}

function shuffledSkills(rng) {
  const items = [...SKILL_IDS];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const value = Number(rng());
    const safeValue = Number.isFinite(value) ? Math.min(0.999999, Math.max(0, value)) : 0;
    const swapIndex = Math.floor(safeValue * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

export function createSkillCardOffer(rng = Math.random) {
  return shuffledSkills(rng).slice(0, 3);
}

export function validateSkillAssignments(playerSkillStacks, fieldPlayerIds = FIELD_PLAYER_IDS) {
  const stacks = playerSkillStacks && typeof playerSkillStacks === 'object' ? playerSkillStacks : {};
  const roster = Array.isArray(fieldPlayerIds) ? fieldPlayerIds : [];
  const errors = [];
  for (const playerId of roster) {
    const stack = stacks[playerId];
    if (stack == null) continue;
    if (!stack || typeof stack !== 'object' || !SKILL_IDS.includes(stack.skillId)
        || !Number.isInteger(stack.copies) || stack.copies < 1 || stack.copies > MAX_SKILL_COPIES) {
      errors.push({ playerId, reason: 'invalidStack' });
    }
  }
  for (const playerId of Object.keys(stacks)) {
    if (!roster.includes(playerId)) errors.push({ playerId, reason: 'notFieldPlayer' });
  }
  return { valid: errors.length === 0, errors };
}

export function awardSkillCard(campaign, skillId) {
  if (!SKILL_IDS.includes(skillId)) return { ok: false, reason: 'invalidSkill' };
  if (campaign?.pendingSkillAssignment) return { ok: false, reason: 'assignmentPending' };
  if (!Array.isArray(campaign?.pendingSkillOffer) || !campaign.pendingSkillOffer.includes(skillId)) {
    return { ok: false, reason: 'notOffered' };
  }
  const skillInventory = { ...(campaign.skillInventory ?? {}) };
  skillInventory[skillId] = (Number.isInteger(skillInventory[skillId]) ? skillInventory[skillId] : 0) + 1;
  return {
    ok: true,
    campaign: { ...campaign, skillInventory, pendingSkillOffer: null, pendingSkillAssignment: skillId },
  };
}

export function assignSkillCard(campaign, playerId, skillId) {
  if (!FIELD_PLAYER_IDS.includes(playerId)) return { ok: false, reason: 'notFieldPlayer' };
  if (!SKILL_IDS.includes(skillId)) return { ok: false, reason: 'invalidSkill' };
  const skillInventory = { ...(campaign?.skillInventory ?? {}) };
  if (!Number.isInteger(skillInventory[skillId]) || skillInventory[skillId] <= 0) {
    return { ok: false, reason: 'cardUnavailable' };
  }
  const playerSkillStacks = Object.fromEntries(FIELD_PLAYER_IDS.map((id) => [id, campaign.playerSkillStacks?.[id] ?? null]));
  const current = playerSkillStacks[playerId];
  if (current?.skillId === skillId && current.copies >= MAX_SKILL_COPIES) {
    return { ok: false, reason: 'maxCopies' };
  }

  skillInventory[skillId] -= 1;
  if (current?.skillId === skillId) {
    playerSkillStacks[playerId] = { skillId, copies: current.copies + 1 };
  } else {
    if (current?.skillId && Number.isInteger(current.copies)) {
      skillInventory[current.skillId] = (skillInventory[current.skillId] ?? 0) + current.copies;
    }
    playerSkillStacks[playerId] = { skillId, copies: 1 };
  }
  return {
    ok: true,
    campaign: { ...campaign, playerSkillStacks, skillInventory, pendingSkillAssignment: null },
  };
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
    .filter((candidate) => candidate.team !== player.team && !candidate.dismissed
      && candidate.stunnedSeconds <= 0 && candidate.knockdownSeconds <= 0)
    .map((candidate) => {
      const dx = candidate.x - player.x;
      const dy = candidate.y - player.y;
      const forward = dx * player.facingX + dy * player.facingY;
      return { candidate, forward, distance: Math.hypot(dx, dy) };
    })
    .filter((entry) => entry.distance <= 140 && entry.forward >= 0)
    .sort((a, b) => a.distance - b.distance)[0]?.candidate ?? null;
}

/** Try to use a selected player's skill. Invalid attempts do not consume a copy. */
export function applySkill(state, playerId) {
  const player = state?.players?.find((candidate) => candidate.id === playerId);
  if (!player) return result(false, null, null, 'playerNotFound');
  if (player.dismissed) return result(false, player.skillId ?? null, player.team, 'playerDismissed');
  if (player.knockdownSeconds > 0 || player.motionAction === 'recover') {
    return result(false, player.skillId ?? null, player.team, 'playerKnockedDown');
  }
  if (player.role === 'goalkeeper') return result(false, null, player.team, 'goalkeeperExcluded');
  const skillId = player.skillId;
  if (!SKILL_IDS.includes(skillId)) return result(false, skillId ?? null, player.team, 'noSkillEquipped');
  if (!Number.isInteger(player.skillUsesRemaining) || player.skillUsesRemaining <= 0) {
    return result(false, skillId, player.team, 'noUsesRemaining');
  }
  if (skillId === 'rainbowReflect') return result(false, skillId, player.team, 'automaticSkill');
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
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const length = Math.hypot(dx, dy);
    const direction = length > 0 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
    const durationSeconds = 1;
    target.knockdownSeconds = durationSeconds;
    target.knockdownDirectionX = direction.x;
    target.knockdownDirectionY = direction.y;
    target.motionAction = 'knockdown';
    target.vx = 0;
    target.vy = 0;
    events = [
      { type: 'skillUsed', skillId, team: player.team, targetId: target.id },
      { type: 'playerKnockedDown', team: target.team, playerId: target.id, durationSeconds, direction },
    ];
  } else if (skillId === 'vacuumCleaner') {
    if (distance(player, state.ball) > 220) return result(false, skillId, player.team, 'ballTooFar');
    state.ball.ownerId = null;
    state.vacuumEffect = { playerId, team: player.team, remainingSeconds: 0.5 };
    state.possessionTeam = null;
    events = [{ type: 'skillUsed', skillId, team: player.team }];
  }

  player.skillUsesRemaining -= 1;
  return result(true, skillId, player.team, null, events);
}

/** Start or advance an automatic reflection for either team. */
export function applyAutomaticRainbowReflect(state, defendingTeam = 'home', deltaSeconds = 0) {
  if (!state?.ball || !['home', 'away'].includes(defendingTeam)) return null;

  const active = state.rainbowReflection;
  if (active) {
    if (active.team !== defendingTeam) return null;
    const player = state.players.find((candidate) => candidate.id === active.playerId && !candidate.dismissed);
    if (!player || player.knockdownSeconds > 0 || player.motionAction === 'recover'
        || state.ball.ownerId || state.ball.flightKind !== 'skill-shot') {
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
  ) return null;

  const reflector = state.players
    .filter((player) => player.team === defendingTeam && player.role !== 'goalkeeper' && !player.dismissed
      && player.knockdownSeconds <= 0 && player.motionAction !== 'recover' && player.skillId === 'rainbowReflect'
      && player.skillUsesRemaining > 0)
    .sort((a, b) => distance(a, state.ball) - distance(b, state.ball))[0];
  if (!reflector) return null;

  reflector.skillUsesRemaining -= 1;
  state.ball.vx *= 0.25;
  state.ball.vy *= 0.25;
  state.rainbowReflection = { team: defendingTeam, playerId: reflector.id, remainingSeconds: 2.5 };
  return { type: 'rainbowStarted', skillId: 'rainbowReflect', team: defendingTeam, playerId: reflector.id, automatic: true };
}
