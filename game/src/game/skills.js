import { FIELD, TEAM_SKILL_COOLDOWN_SECONDS } from './constants.js';

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
export const SKILL_MAX_LEVELS = Object.freeze({
  eagleShot: 3,
  tornadoShot: 3,
  powerTackle: 3,
  eulryongta: 3,
  vacuumCleaner: 1,
  rainbowReflect: 1,
});
export const FIELD_PLAYER_IDS = Object.freeze(['home-def-1', 'home-mid-1', 'home-fw']);
export const HOME_PLAYER_IDS = FIELD_PLAYER_IDS;

const distance = (left, right) => Math.hypot(left.x - right.x, left.y - right.y);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function result(ok, skillId, team, reason = null, events = []) {
  return { ok, skillId, team, reason, events };
}

export function addSkillEffect(state, { skillId, team, sourcePlayerId, targetPlayerId = null, durationSeconds }) {
  if (!Array.isArray(state.skillEffects)) state.skillEffects = [];
  const id = Number.isInteger(state.nextSkillEffectId) ? state.nextSkillEffectId : 1;
  state.nextSkillEffectId = id + 1;
  const effect = { id, skillId, team, sourcePlayerId, targetPlayerId, elapsedSeconds: 0, durationSeconds };
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

export function isSkillRewardEligible(skillId, teamSkillDeck = []) {
  if (!SKILL_IDS.includes(skillId)) return false;
  const owned = Array.isArray(teamSkillDeck) ? teamSkillDeck.find((entry) => entry?.skillId === skillId) : null;
  return !owned || (Number.isInteger(owned.level) && owned.level < SKILL_MAX_LEVELS[skillId]);
}

export function createSkillCardOffer(rng = Math.random, teamSkillDeck = []) {
  return shuffledSkills(rng)
    .filter((skillId) => isSkillRewardEligible(skillId, teamSkillDeck))
    .slice(0, 3);
}

export function validateTeamSkillDeck(teamSkillDeck) {
  const errors = [];
  if (!Array.isArray(teamSkillDeck)) return { valid: false, errors: [{ reason: 'invalidDeck' }] };
  const seen = new Set();
  for (const entry of teamSkillDeck) {
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
  if (campaign?.pendingSkillPlacement) return { ok: false, reason: 'placementPending' };
  if (!Array.isArray(campaign?.pendingSkillOffer) || !campaign.pendingSkillOffer.includes(skillId)) {
    return { ok: false, reason: 'notOffered' };
  }
  const teamSkillDeck = Array.isArray(campaign.teamSkillDeck) ? campaign.teamSkillDeck.map((entry) => ({ ...entry })) : [];
  const index = teamSkillDeck.findIndex((entry) => entry.skillId === skillId);
  if (index >= 0) {
    const current = teamSkillDeck[index];
    if (!Number.isInteger(current.level) || current.level >= SKILL_MAX_LEVELS[skillId]) {
      return { ok: false, reason: 'maxLevel' };
    }
    teamSkillDeck[index] = { ...current, level: current.level + 1 };
    return {
      ok: true,
      upgradedLevel: teamSkillDeck[index].level,
      campaign: { ...campaign, teamSkillDeck, pendingSkillOffer: null, pendingSkillPlacement: null },
    };
  }
  if (!isSkillRewardEligible(skillId, teamSkillDeck)) return { ok: false, reason: 'notEligible' };
  teamSkillDeck.push({ skillId, level: 1 });
  return {
    ok: true,
    upgradedLevel: null,
    campaign: { ...campaign, teamSkillDeck, pendingSkillOffer: null, pendingSkillPlacement: skillId },
  };
}

export function placeTeamSkill(campaign, skillId, insertionIndex) {
  const deck = Array.isArray(campaign?.teamSkillDeck) ? campaign.teamSkillDeck : [];
  if (!skillId || campaign?.pendingSkillPlacement !== skillId) return { ok: false, reason: 'placementNotPending' };
  const currentIndex = deck.findIndex((entry) => entry.skillId === skillId);
  if (currentIndex < 0) return { ok: false, reason: 'skillNotOwned' };
  const withoutSkill = deck.filter((entry) => entry.skillId !== skillId);
  if (!Number.isInteger(insertionIndex) || insertionIndex < 0 || insertionIndex > withoutSkill.length) {
    return { ok: false, reason: 'invalidPosition' };
  }
  const teamSkillDeck = [...withoutSkill];
  teamSkillDeck.splice(insertionIndex, 0, deck[currentIndex]);
  return { ok: true, campaign: { ...campaign, teamSkillDeck, pendingSkillPlacement: null } };
}

export function reorderTeamSkill(campaign, fromIndex, toIndex) {
  const deck = Array.isArray(campaign?.teamSkillDeck) ? campaign.teamSkillDeck : [];
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)
      || fromIndex < 0 || toIndex < 0 || fromIndex >= deck.length || toIndex >= deck.length) {
    return { ok: false, reason: 'invalidPosition' };
  }
  const teamSkillDeck = deck.map((entry) => ({ ...entry }));
  const [moved] = teamSkillDeck.splice(fromIndex, 1);
  teamSkillDeck.splice(toIndex, 0, moved);
  return { ok: true, campaign: { ...campaign, teamSkillDeck } };
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
  state.ball.skillLevel = level;
  if (skillId === 'eagleShot') state.ball.scoreValue = level;
  state.ball.lastTouchTeam = player.team;
  state.possessionTeam = player.team;

  const onTarget = targetY >= FIELD.goalTop && targetY <= FIELD.goalBottom;
  return [{ type: 'skillUsed', skillId, team: player.team, playerId: player.id }, ...(onTarget ? [{ type: 'shotOnTarget', team: player.team }] : [])];
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
  if (player.role === 'goalkeeper') return result(false, skillId, player.team, 'goalkeeperExcluded');
  if (skillId === 'rainbowReflect') return result(false, skillId, player.team, 'automaticSkill');
  if (!['playing', 'overtime'].includes(state.phase)) return result(false, skillId, player.team, 'matchNotActive');

  const opponentCarrier = state.players.find((candidate) => candidate.team !== player.team && candidate.id === state.ball.ownerId);
  let events = [];

  if (skillId === 'eagleShot' || skillId === 'tornadoShot') {
    if (state.ball.ownerId !== player.id || state.possessionTeam !== player.team) {
      return result(false, skillId, player.team, 'needBall');
    }
    events = launchSkillShot(state, player, skillId, level);
    if (skillId === 'tornadoShot') {
      const durationSeconds = 4 + level;
      for (const target of state.players) {
        if (target.id === player.id || target.dismissed) continue;
        target.airborneSecondsRemaining = durationSeconds;
        target.airborneFromTeam = player.team;
      }
      addSkillEffect(state, { skillId, team: player.team, sourcePlayerId: player.id, durationSeconds });
      events.push({ type: 'tornadoLift', team: player.team, durationSeconds });
    }
  } else if (skillId === 'powerTackle') {
    const forward = player.facingX !== 0 || player.facingY !== 0
      ? unitVector(player.facingX, player.facingY)
      : { x: player.team === 'home' ? 1 : -1, y: 0 };
    const barrier = { skillId, team: player.team, sourcePlayerId: player.id, x: player.x, y: player.y,
      facingX: forward.x, facingY: forward.y, length: 220, thickness: 28, remainingSeconds: 2 + level };
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
      const direction = unitVector(target.x - player.x, target.y - player.y);
      target.knockdownSeconds = 10;
      target.knockdownFromTeam = player.team;
      target.knockdownDirectionX = direction.x;
      target.knockdownDirectionY = direction.y;
      target.motionAction = 'knockdown';
      target.vx = 0;
      target.vy = 0;
      events.push({ type: 'playerKnockedDown', team: target.team, playerId: target.id, durationSeconds: 10, direction });
    }
    events.unshift({ type: 'skillUsed', skillId, team: player.team, playerId: player.id });
  } else if (skillId === 'vacuumCleaner') {
    state.ball.x = player.x;
    state.ball.y = player.y;
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
    setBallOwner(state, player);
    events = [{ type: 'skillUsed', skillId, team: player.team, playerId: player.id }];
  }

  player.motionAction = 'skill';
  player.motionTimerSeconds = 0.42;
  if (skillId === 'eagleShot') addSkillEffect(state, { skillId, team: player.team, sourcePlayerId: player.id, durationSeconds: 8 });
  if (!state.skillEffects?.some((effect) => effect.sourcePlayerId === player.id && effect.skillId === skillId)) {
    if (!['tornadoShot', 'powerTackle'].includes(skillId)) addSkillEffect(state, {
      skillId, team: player.team, sourcePlayerId: player.id,
      targetPlayerId: events.find((event) => event.type === 'playerKnockedDown')?.playerId ?? null,
      durationSeconds: skillId === 'eulryongta' ? 10 : 1,
    });
  }
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
  const deck = state?.teamSkillDecks?.[team] ?? [];
  if (!deck.length) return result(false, null, team, 'emptyDeck');
  if ((state.skillCooldownRemaining?.[team] ?? 0) > 0) return result(false, null, team, 'cooldown');
  const start = ((state.skillQueueIndex?.[team] ?? 0) % deck.length + deck.length) % deck.length;
  for (let offset = 0; offset < deck.length; offset += 1) {
    const index = (start + offset) % deck.length;
    const entry = deck[index];
    if (entry.skillId === 'rainbowReflect') continue;
    const attempt = applySkill(state, { team, sourcePlayerId, skillId: entry.skillId, level: entry.level });
    if (!attempt.ok) continue;
    state.skillQueueIndex[team] = (index + 1) % deck.length;
    state.skillCooldownRemaining[team] = TEAM_SKILL_COOLDOWN_SECONDS;
    return attempt;
  }
  return result(false, null, team, 'noUsableSkill');
}

/** Rainbow Reflect is a passive team defense that erases opponent skill effects globally. */
export function applyAutomaticRainbowReflect(state, defendingTeam = 'home') {
  const deck = state?.teamSkillDecks?.[defendingTeam] ?? [];
  if (!deck.some((entry) => entry.skillId === 'rainbowReflect')) return null;
  const opposingTeam = defendingTeam === 'home' ? 'away' : 'home';
  const opponentEffects = (state.skillEffects ?? []).filter((effect) => effect.team === opposingTeam);
  const hasBarrier = (state.powerBarriers ?? []).some((effect) => effect.team === opposingTeam);
  const hasLift = state.players.some((player) => player.team !== defendingTeam && (player.airborneSecondsRemaining ?? 0) > 0);
  const hasSkillShot = state.ball.flightKind === 'skill-shot' && state.ball.lastTouchTeam === opposingTeam
    && ['eagleShot', 'tornadoShot'].includes(state.ball.skillId);
  if (!opponentEffects.length && !hasBarrier && !hasLift && !hasSkillShot) return null;
  state.skillEffects = (state.skillEffects ?? []).filter((effect) => effect.team !== opposingTeam);
  state.powerBarriers = (state.powerBarriers ?? []).filter((effect) => effect.team !== opposingTeam);
  for (const player of state.players) {
    if (player.airborneFromTeam === opposingTeam) {
      player.airborneSecondsRemaining = 0;
      delete player.airborneFromTeam;
    }
    if (player.knockdownFromTeam === opposingTeam && player.knockdownSeconds > 0) {
      player.knockdownSeconds = 0;
      player.motionAction = 'recover';
      delete player.knockdownFromTeam;
    }
  }
  if (hasSkillShot) {
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.ball.flightKind = 'ground';
    delete state.ball.skillId;
    delete state.ball.skillLevel;
    delete state.ball.scoreValue;
    state.ball.x = clamp(state.ball.x, 0, FIELD.width);
    state.ball.y = clamp(state.ball.y, 0, FIELD.height);
  }
  return { type: 'skillReflected', skillId: 'rainbowReflect', team: defendingTeam, automatic: true };
}
