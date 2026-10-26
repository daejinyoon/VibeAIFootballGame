import { BALL_RADIUS, EAGLE_SHOT_INTERVAL_SECONDS, FIELD, PLAYER_BODY_WIDTH, TEAM_SKILL_COOLDOWN_SECONDS, TEAM_SKILL_GLOBAL_COOLDOWN_SECONDS, WORLD_SPLIT_DURATION_SECONDS, WORLD_SPLIT_HEIGHT, WORLD_SPLIT_LENGTHS, WORLD_SPLIT_SLIDE_SECONDS, WORLD_SPLIT_SLIDE_SPEED, WORLD_SPLIT_THICKNESS, WORLD_SPLIT_WALL_OFFSET } from './constants.js';

export const SKILL_IDS = Object.freeze([
  'eagleShot',
  'tornadoShot',
  'powerTackle',
  'eulryongta',
  'vacuumCleaner',
]);

export const SKILLS = Object.freeze({
  eagleShot: Object.freeze({ name: '독수리슛', type: 'attack', description: '일반 골키퍼가 막을 수 없는 필살 슛', artwork: '/images/skills/eagle-shot.png' }),
  tornadoShot: Object.freeze({ name: '회오리슛', type: 'attack', description: '수비수를 휘어 지나가는 슛', artwork: '/images/skills/tornado-shot.png' }),
  powerTackle: Object.freeze({ name: '세계의 분리', type: 'defense', description: '슬라이딩 태클로 3초간 지형 장벽을 세운다', artwork: '/images/skills/world-split.svg' }),
  eulryongta: Object.freeze({ name: '을룡타', type: 'defense', description: '앞에 있는 상대를 최대 3명까지 5초간 기절시킴', artwork: '/images/skills/eulryongta.png' }),
  vacuumCleaner: Object.freeze({ name: '진공청소기', type: 'utility', description: '주변 공을 사용자에게 끌어옴', artwork: '/images/skills/vacuum-cleaner.png' }),
});

export const MAX_SKILL_COPIES = 3;
export const SKILL_MAX_LEVELS = Object.freeze({
  eagleShot: 3,
  tornadoShot: 3,
  powerTackle: 3,
  eulryongta: 3,
  vacuumCleaner: 1,
});
export const FIELD_PLAYER_IDS = Object.freeze(['home-def-1', 'home-mid-1', 'home-fw']);
export const HOME_PLAYER_IDS = FIELD_PLAYER_IDS;

const distance = (left, right) => Math.hypot(left.x - right.x, left.y - right.y);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function result(ok, skillId, team, reason = null, events = []) {
  return { ok, skillId, team, reason, events };
}

export function addSkillEffect(state, { skillId, team, sourcePlayerId, targetPlayerId = null, durationSeconds, position, returnTargetPosition, transferredStatuses, cancellationPulse = false, level = 1 }) {
  if (!Array.isArray(state.skillEffects)) state.skillEffects = [];
  const id = Number.isInteger(state.nextSkillEffectId) ? state.nextSkillEffectId : 1;
  state.nextSkillEffectId = id + 1;
  const effect = { id, skillId, team, sourcePlayerId, targetPlayerId, elapsedSeconds: 0, durationSeconds, level,
    ...(position ? { position: { ...position } } : {}),
    ...(returnTargetPosition ? { returnTargetPosition: { ...returnTargetPosition } } : {}),
    ...(transferredStatuses ? { transferredStatuses: transferredStatuses.map((status) => ({ ...status })) } : {}),
    ...(cancellationPulse ? { cancellationPulse: true } : {}) };
  state.skillEffects.push(effect);
  return effect;
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

export function isSkillRewardEligible(skillId, ownedTeamSkills = []) {
  if (!SKILL_IDS.includes(skillId)) return false;
  const owned = Array.isArray(ownedTeamSkills) ? ownedTeamSkills.find((entry) => entry?.skillId === skillId) : null;
  return !owned || (Number.isInteger(owned.level) && owned.level < SKILL_MAX_LEVELS[skillId]);
}

export function createSkillCardOffer(rng = Math.random, ownedTeamSkills = []) {
  return shuffledSkills(rng)
    .filter((skillId) => isSkillRewardEligible(skillId, ownedTeamSkills))
    .slice(0, 3);
}

export function validateTeamSkillInventory(ownedTeamSkills) {
  const errors = [];
  if (!Array.isArray(ownedTeamSkills)) return { valid: false, errors: [{ reason: 'invalidInventory' }] };
  const seen = new Set();
  for (const entry of ownedTeamSkills) {
    if (!entry || !SKILL_IDS.includes(entry.skillId)
        || !Number.isInteger(entry.level) || entry.level < 1
        || entry.level > SKILL_MAX_LEVELS[entry.skillId]) {
      errors.push({ skillId: entry?.skillId ?? null, reason: 'invalidEntry' });
      continue;
    }
    if (seen.has(entry.skillId)) errors.push({ skillId: entry.skillId, reason: 'duplicateSkill' });
    seen.add(entry.skillId);
  }
  return { valid: errors.length === 0, errors };
}

export function validateTeamSkillLoadout(ownedTeamSkills, equippedTeamSkillIds) {
  const errors = [...validateTeamSkillInventory(ownedTeamSkills).errors];
  if (!Array.isArray(equippedTeamSkillIds)) {
    errors.push({ reason: 'invalidEquipment' });
    return { valid: false, errors };
  }
  if (equippedTeamSkillIds.length > 3) errors.push({ reason: 'tooManyEquipped' });
  const ownedIds = new Set(Array.isArray(ownedTeamSkills) ? ownedTeamSkills.map((entry) => entry?.skillId) : []);
  const seen = new Set();
  for (const skillId of equippedTeamSkillIds) {
    if (!SKILL_IDS.includes(skillId) || !ownedIds.has(skillId)) errors.push({ skillId, reason: 'notOwned' });
    if (seen.has(skillId)) errors.push({ skillId, reason: 'duplicateEquippedSkill' });
    seen.add(skillId);
  }
  return { valid: errors.length === 0, errors };
}

function setStatusDuration(player, status, durationSeconds) {
  player.statusDurationSeconds = {
    ...(player.statusDurationSeconds ?? {}),
    [status]: Math.max(player.statusDurationSeconds?.[status] ?? 0, durationSeconds),
  };
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
  if (!Array.isArray(campaign?.pendingSkillOffer) || !campaign.pendingSkillOffer.includes(skillId)) {
    return { ok: false, reason: 'notOffered' };
  }
  const ownedTeamSkills = Array.isArray(campaign.ownedTeamSkills) ? campaign.ownedTeamSkills.map((entry) => ({ ...entry })) : [];
  const index = ownedTeamSkills.findIndex((entry) => entry.skillId === skillId);
  if (index >= 0) {
    const current = ownedTeamSkills[index];
    if (!Number.isInteger(current.level) || current.level >= SKILL_MAX_LEVELS[skillId]) {
      return { ok: false, reason: 'maxLevel' };
    }
    ownedTeamSkills[index] = { ...current, level: current.level + 1 };
    return {
      ok: true,
      upgradedLevel: ownedTeamSkills[index].level,
      campaign: { ...campaign, ownedTeamSkills, pendingSkillOffer: null },
    };
  }
  if (!isSkillRewardEligible(skillId, ownedTeamSkills)) return { ok: false, reason: 'notEligible' };
  ownedTeamSkills.push({ skillId, level: 1 });
  return {
    ok: true,
    upgradedLevel: null,
    campaign: { ...campaign, ownedTeamSkills, pendingSkillOffer: null },
  };
}

export function equipTeamSkill(campaign, skillId, insertionIndex = campaign?.equippedTeamSkillIds?.length ?? 0) {
  const ownedTeamSkills = Array.isArray(campaign?.ownedTeamSkills) ? campaign.ownedTeamSkills : [];
  const current = Array.isArray(campaign?.equippedTeamSkillIds) ? campaign.equippedTeamSkillIds : [];
  if (!SKILL_IDS.includes(skillId) || !ownedTeamSkills.some((entry) => entry.skillId === skillId)) {
    return { ok: false, reason: 'skillNotOwned' };
  }
  if (current.includes(skillId)) return { ok: false, reason: 'alreadyEquipped' };
  if (current.length >= 3) return { ok: false, reason: 'equipmentFull' };
  if (!Number.isInteger(insertionIndex) || insertionIndex < 0 || insertionIndex > current.length) {
    return { ok: false, reason: 'invalidPosition' };
  }
  const equippedTeamSkillIds = [...current];
  equippedTeamSkillIds.splice(insertionIndex, 0, skillId);
  return { ok: true, campaign: { ...campaign, equippedTeamSkillIds } };
}

export function unequipTeamSkill(campaign, skillId) {
  const current = Array.isArray(campaign?.equippedTeamSkillIds) ? campaign.equippedTeamSkillIds : [];
  if (!current.includes(skillId)) return { ok: false, reason: 'notEquipped' };
  return { ok: true, campaign: { ...campaign, equippedTeamSkillIds: current.filter((entry) => entry !== skillId) } };
}

export function reorderTeamSkill(campaign, fromIndex, toIndex) {
  const deck = Array.isArray(campaign?.equippedTeamSkillIds) ? campaign.equippedTeamSkillIds : [];
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)
      || fromIndex < 0 || toIndex < 0 || fromIndex >= deck.length || toIndex >= deck.length) {
    return { ok: false, reason: 'invalidPosition' };
  }
  const equippedTeamSkillIds = [...deck];
  const [moved] = equippedTeamSkillIds.splice(fromIndex, 1);
  equippedTeamSkillIds.splice(toIndex, 0, moved);
  return { ok: true, campaign: { ...campaign, equippedTeamSkillIds } };
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

function launchSkillShot(state, player, skillId, level) {
  const attackDirection = player.team === 'home' ? 1 : -1;
  const targetY = FIELD.height / 2 + player.facingY * 54;
  const dx = attackDirection * FIELD.width;
  const dy = targetY - player.y;
  const length = Math.hypot(dx, dy) || 1;
  const speed = 520;

  state.ball.x = clamp(player.x + player.facingX * 17, 0, FIELD.width);
  state.ball.y = clamp(player.y + player.facingY * 17, 0, FIELD.height);
  state.ball.ownerId = null;
  state.ball.vx = dx / length * speed;
  state.ball.vy = dy / length * speed;
  state.ball.height = 0;
  state.ball.flightKind = 'skill-shot';
  state.ball.flightSeconds = 0;
  state.ball.skillId = skillId;
  state.ball.skillLevel = level;
  state.ball.lastTouchTeam = player.team;
  state.possessionTeam = player.team;

  const onTarget = targetY >= FIELD.goalTop && targetY <= FIELD.goalBottom;
  return [{ type: 'skillUsed', skillId, team: player.team, playerId: player.id }, ...(onTarget ? [{ type: 'shotOnTarget', team: player.team }] : [])];
}

function eagleTargetYs(level) {
  const halfGoal = FIELD.goalBottom - FIELD.goalTop;
  const center = (FIELD.goalTop + FIELD.goalBottom) / 2;
  const offsets = level === 1 ? [0] : level === 2 ? [-0.22, 0.22] : [-0.22, 0, 0.22];
  return offsets.map((offset) => clamp(center + halfGoal * offset, FIELD.goalTop + BALL_RADIUS, FIELD.goalBottom - BALL_RADIUS));
}

function createEagleProjectile(state, volley, targetY) {
  const id = Number.isInteger(state.nextSkillProjectileId) ? state.nextSkillProjectileId : 1;
  state.nextSkillProjectileId = id + 1;
  const source = state.players.find((player) => player.id === volley.sourcePlayerId);
  const startX = clamp((source?.x ?? state.ball.x) + (source?.facingX ?? (volley.team === 'home' ? 1 : -1)) * 17, 0, FIELD.width);
  const startY = clamp((source?.y ?? state.ball.y) + (source?.facingY ?? 0) * 17, 0, FIELD.height);
  state.skillProjectiles.push({
    id,
    skillId: 'eagleShot',
    team: volley.team,
    sourcePlayerId: volley.sourcePlayerId,
    x: startX,
    y: startY,
    vx: 0,
    vy: 0,
    height: 0,
    verticalVelocity: 0,
    phase: 'ascending',
    ageSeconds: 0,
    targetY,
    resolved: false,
    outcome: null,
  });
  volley.spawned += 1;
  return state.skillProjectiles[state.skillProjectiles.length - 1];
}

export function spawnNextEagleProjectile(state) {
  const volley = state?.eagleVolley;
  if (!volley || volley.spawned >= volley.level) return null;
  return createEagleProjectile(state, volley, volley.targetYs[volley.spawned]);
}

function launchEagleVolley(state, player, level) {
  const targetYs = eagleTargetYs(level).map((targetY) =>
    player.team === 'away' ? FIELD.height - targetY : targetY);
  const volley = {
    team: player.team,
    sourcePlayerId: player.id,
    level,
    targetYs,
    spawned: 0,
    resolved: 0,
    nextLaunchSeconds: 0,
    points: 0,
    lastPosition: null,
    lastOutcome: null,
  };
  state.eagleVolley = volley;
  state.skillProjectiles = [];
  createEagleProjectile(state, volley, targetYs[0]);
  volley.nextLaunchSeconds = EAGLE_SHOT_INTERVAL_SECONDS;

  state.ball.x = clamp(player.x + player.facingX * 17, 0, FIELD.width);
  state.ball.y = clamp(player.y + player.facingY * 17, 0, FIELD.height);
  state.ball.ownerId = null;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.height = 0;
  state.ball.verticalVelocity = 0;
  state.ball.flightKind = 'skill-shot';
  state.ball.flightSeconds = 0;
  state.ball.skillId = 'eagleShot';
  state.ball.skillLevel = level;
  state.ball.lastTouchTeam = player.team;
  state.possessionTeam = player.team;
  const onTarget = targetYs[0] >= FIELD.goalTop && targetYs[0] <= FIELD.goalBottom;
  return [{ type: 'skillUsed', skillId: 'eagleShot', team: player.team, playerId: player.id },
    ...(onTarget ? [{ type: 'shotOnTarget', team: player.team }] : [])];
}

function findEulryongtaTargets(state, player, level) {
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
    .sort((a, b) => a.distance - b.distance)
    .slice(0, level)
    .map((entry) => entry.candidate);
}

/** Activate one team-owned skill for its current eligible actor. */
export function applySkill(state, { team, sourcePlayerId, skillId, level = 1 } = {}) {
  const playerId = sourcePlayerId;
  const player = state?.players?.find((candidate) => candidate.id === playerId);
  if (!player) return result(false, skillId ?? null, team ?? null, 'playerNotFound');
  if (player.team !== team) return result(false, skillId ?? null, team ?? null, 'wrongTeam');
  if (player.dismissed) return result(false, skillId ?? null, player.team, 'playerDismissed');
  if (player.knockdownSeconds > 0 || player.motionAction === 'recover') {
    return result(false, skillId ?? null, player.team, 'playerKnockedDown');
  }
  if (!SKILL_IDS.includes(skillId)) return result(false, skillId ?? null, player.team, 'invalidSkill');
  if (!Number.isInteger(level) || level < 1 || level > SKILL_MAX_LEVELS[skillId]) return result(false, skillId, player.team, 'invalidLevel');
  if (!['playing', 'overtime'].includes(state.phase)) return result(false, skillId, player.team, 'matchNotActive');

  let events = [];
  const opponentCarrier = state.players.find((candidate) => candidate.team !== player.team && candidate.id === state.ball.ownerId);

  if (skillId === 'eagleShot' || skillId === 'tornadoShot') {
    if (state.ball.ownerId !== player.id || state.possessionTeam !== player.team) {
      return result(false, skillId, player.team, 'needBall');
    }
    events = skillId === 'eagleShot'
      ? launchEagleVolley(state, player, level)
      : launchSkillShot(state, player, skillId, level);
    if (skillId === 'tornadoShot') {
      const durationSeconds = 5;
      state.tornadoShotEffect = {
        team: player.team,
        sourcePlayerId: player.id,
        level,
        pathWidth: 2 * PLAYER_BODY_WIDTH * (1 + (level - 1) * 0.25),
        hitPlayerIds: [],
        elapsedSeconds: 0,
        durationSeconds,
      };
      addSkillEffect(state, { skillId, team: player.team, sourcePlayerId: player.id, durationSeconds, level });
    }
  } else if (skillId === 'powerTackle') {
    const forward = player.facingX !== 0 || player.facingY !== 0
      ? unitVector(player.facingX, player.facingY)
      : { x: player.team === 'home' ? 1 : -1, y: 0 };
    player.motionAction = 'tackle';
    player.motionTimerSeconds = Math.max(player.motionTimerSeconds ?? 0, WORLD_SPLIT_SLIDE_SECONDS);
    player.worldSplitSlideSecondsRemaining = WORLD_SPLIT_SLIDE_SECONDS;
    player.worldSplitSlideDirectionX = forward.x;
    player.worldSplitSlideDirectionY = forward.y;
    player.vx = forward.x * WORLD_SPLIT_SLIDE_SPEED;
    player.vy = forward.y * WORLD_SPLIT_SLIDE_SPEED;
    const campaignStage = clamp(Math.floor(Number(state.stage) || 1), 1, WORLD_SPLIT_LENGTHS.length);
    const barrier = { skillId, team: player.team, sourcePlayerId: player.id, x: player.x, y: player.y,
      facingX: forward.x, facingY: forward.y, length: WORLD_SPLIT_LENGTHS[campaignStage - 1],
      thickness: WORLD_SPLIT_THICKNESS, wallOffset: WORLD_SPLIT_WALL_OFFSET,
      height: WORLD_SPLIT_HEIGHT, elapsedSeconds: 0,
      remainingSeconds: WORLD_SPLIT_DURATION_SECONDS };
    state.powerBarriers = (state.powerBarriers ?? []).filter((entry) => entry.team !== player.team);
    state.powerBarriers.push(barrier);
    for (const target of state.players) {
      if (target.id === player.id || target.dismissed) continue;
      const along = (target.x - player.x) * forward.x + (target.y - player.y) * forward.y;
      const across = Math.abs((target.x - player.x) * -forward.y + (target.y - player.y) * forward.x);
      if (along >= 0 && along <= barrier.length && across <= barrier.thickness / 2 + 12) {
        target.vx = forward.x * 350;
        target.vy = forward.y * 350;
        target.launchSecondsRemaining = 0.35;
        target.knockdownSeconds = Math.max(target.knockdownSeconds ?? 0, 0.8);
        setStatusDuration(target, 'knockdown', 0.8);
        target.knockdownFromTeam = player.team;
        target.knockdownDirectionX = forward.x;
        target.knockdownDirectionY = forward.y;
        target.motionAction = 'knockdown';
      }
    }
    addSkillEffect(state, { skillId, team: player.team, sourcePlayerId: player.id, durationSeconds: barrier.remainingSeconds });
    events = [{ type: 'skillUsed', skillId, team: player.team, playerId: player.id }, { type: 'powerBarrierCreated', team: player.team, playerId: player.id }];
  } else if (skillId === 'eulryongta') {
    const targets = findEulryongtaTargets(state, player, level);
    if (!targets.length) return result(false, skillId, player.team, 'noTargetInFront');
    for (const target of targets) {
      if (state.ball.ownerId === target.id) {
        state.ball.ownerId = null;
        if (Number.isFinite(target.x) && Number.isFinite(target.y)) {
          state.ball.x = target.x;
          state.ball.y = target.y;
        }
        state.ball.vx = 0;
        state.ball.vy = 0;
        state.ball.height = 0;
        state.ball.verticalVelocity = 0;
        state.ball.flightKind = 'ground';
        state.ball.flightSeconds = 0;
        state.ball.passProtectionSeconds = 0;
        state.ball.lastTouchTeam = target.team;
        for (const field of ['flightDurationSeconds', 'passTeam', 'passReceiverId', 'passTarget',
          'flightTarget', 'lastHeaderPlayerId', 'skillId', 'skillLevel', 'scoreValue']) {
          delete state.ball[field];
        }
        state.possessionTeam = null;
      }
      const direction = unitVector(target.x - player.x, target.y - player.y);
      target.knockdownSeconds = 5;
      setStatusDuration(target, 'knockdown', 5);
      target.knockdownFromTeam = player.team;
      target.knockdownSourcePlayerId = player.id;
      target.knockdownSkillId = 'eulryongta';
      target.knockdownDirectionX = direction.x;
      target.knockdownDirectionY = direction.y;
      target.motionAction = 'knockdown';
      target.vx = 0;
      target.vy = 0;
      events.push({ type: 'playerKnockedDown', team: target.team, playerId: target.id, durationSeconds: 5, direction });
    }
    events.unshift({ type: 'skillUsed', skillId, team: player.team, playerId: player.id });
  } else if (skillId === 'vacuumCleaner') {
    state.vacuumEffect = {
      playerId: player.id,
      startPosition: { x: state.ball.x, y: state.ball.y },
      elapsedSeconds: 0,
      durationSeconds: 0.7,
      remainingSeconds: 0.7,
    };
    state.ball.ownerId = null;
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.ball.height = 0;
    state.ball.verticalVelocity = 0;
    state.ball.flightKind = 'ground';
    state.ball.flightSeconds = 0;
    delete state.ball.skillId;
    delete state.ball.skillLevel;
    delete state.ball.scoreValue;
    delete state.ball.flightTarget;
    delete state.ball.passTarget;
    state.possessionTeam = null;
    events = [{ type: 'skillUsed', skillId, team: player.team, playerId: player.id }];
  }

  player.motionAction = skillId === 'powerTackle' ? 'tackle' : 'skill';
  player.motionTimerSeconds = skillId === 'powerTackle' ? 0.4 : 0.42;
  if (skillId === 'eagleShot') addSkillEffect(state, { skillId, team: player.team, sourcePlayerId: player.id, durationSeconds: 8, level });
  if (skillId === 'eulryongta') {
    for (const event of events.filter((entry) => entry.type === 'playerKnockedDown')) {
      addSkillEffect(state, { skillId, team: player.team, sourcePlayerId: player.id,
        targetPlayerId: event.playerId, durationSeconds: 0.9 });
    }
  } else if (!state.skillEffects?.some((effect) => effect.sourcePlayerId === player.id && effect.skillId === skillId)) {
    if (!['tornadoShot', 'powerTackle'].includes(skillId)) addSkillEffect(state, {
      skillId, team: player.team, sourcePlayerId: player.id,
      durationSeconds: skillId === 'vacuumCleaner' ? 0.7 : 1,
    });
  }
  state.lastSkillCasterByTeam = {
    ...(state.lastSkillCasterByTeam ?? { home: null, away: null }),
    [team]: player.id,
  };
  return result(true, skillId, player.team, null, events);
}

function unitVector(x, y) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function setBallOwner(state, player) {
  state.ball.ownerId = player.id;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.flightKind = 'ground';
  state.ball.height = 0;
  state.possessionTeam = player.team;
  state.ball.lastTouchTeam = player.team;
  delete state.ball.skillId;
  delete state.ball.skillLevel;
  delete state.ball.scoreValue;
}

export function activateNextTeamSkill(state, team, sourcePlayerId) {
  if ((state?.teamSkillGlobalCooldownRemaining?.[team] ?? 0) > 0) {
    return result(false, null, team, 'teamCooldown');
  }
  const deck = state?.teamSkillDecks?.[team] ?? [];
  if (!deck.length) return result(false, null, team, 'emptyDeck');
  const start = ((state.skillQueueIndex?.[team] ?? 0) % deck.length + deck.length) % deck.length;
  for (let offset = 0; offset < deck.length; offset += 1) {
    const index = (start + offset) % deck.length;
    const entry = deck[index];
    if ((state.skillCooldownRemaining?.[team]?.[entry.skillId] ?? 0) > 0) continue;
    const attempt = applySkill(state, { team, sourcePlayerId, skillId: entry.skillId, level: entry.level });
    if (!attempt.ok) continue;
    state.skillQueueIndex[team] = (index + 1) % deck.length;
    state.skillCooldownRemaining[team] = {
      ...(state.skillCooldownRemaining[team] ?? {}),
      [entry.skillId]: TEAM_SKILL_COOLDOWN_SECONDS,
    };
    if (team === 'home' || team === 'away') {
      state.teamSkillGlobalCooldownRemaining = {
        home: 0,
        away: 0,
        ...(state.teamSkillGlobalCooldownRemaining ?? {}),
        [team]: TEAM_SKILL_GLOBAL_COOLDOWN_SECONDS,
      };
    }
    return attempt;
  }
  return result(false, null, team, 'noUsableSkill');
}
