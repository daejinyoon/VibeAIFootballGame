import { FIELD, KICKOFF_CIRCLE_RADIUS, REGULATION_SECONDS, STAGE_COUNT } from './constants.js';

const homeFormation = [
  { id: 'home-gk', role: 'goalkeeper', x: 55, y: 270 },
  { id: 'home-def-1', role: 'defender', x: 220, y: 190 },
  { id: 'home-mid-1', role: 'midfielder', x: 370, y: 350 },
  { id: 'home-fw', role: 'forward', x: FIELD.width / 2, y: FIELD.height / 2 },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function stackFor(stacks, playerId) {
  const stack = stacks && typeof stacks === 'object' ? stacks[playerId] : null;
  if (typeof stack === 'string') return { skillId: stack, copies: 1 };
  if (!stack || typeof stack !== 'object') return null;
  const copies = Number.isInteger(stack.copies) && stack.copies > 0 ? Math.min(3, stack.copies) : 0;
  return { skillId: typeof stack.skillId === 'string' ? stack.skillId : null, copies };
}

function createPlayer({ id, team, role, x, y, skillId = null, skillCopies = 0, aiRetargetSeconds = 1.2 }) {
  const homeDirection = team === 'home' ? 1 : -1;
  const isGoalkeeper = role === 'goalkeeper';
  const copies = isGoalkeeper ? 0 : Math.max(0, skillCopies);
  const equippedSkill = isGoalkeeper ? null : (typeof skillId === 'string' ? skillId : null);

  return {
    id, team, role,
    x: clamp(x, 0, FIELD.width),
    y: clamp(y, 0, FIELD.height),
    vx: 0, vy: 0,
    jumpHeight: 0,
    jumpVelocity: 0,
    jumpCooldownSeconds: 0,
    facingX: homeDirection,
    facingY: 0,
    stunnedSeconds: 0,
    knockdownSeconds: 0,
    knockdownDirectionX: 0,
    knockdownDirectionY: 0,
    motionAction: 'idle',
    foulCount: 0,
    yellowCardCount: 0,
    card: 'none',
    dismissed: false,
    aiTackleCooldownSeconds: 0,
    aiTarget: null,
    aiRetargetSeconds,
    skillId: equippedSkill,
    skillCopies: equippedSkill ? copies : 0,
    skillUsesRemaining: equippedSkill ? copies : 0,
  };
}

function createAwayFormation() {
  return homeFormation.map(({ id, role, x, y }) => ({
    id: id.replace('home-', 'away-'), role, x: FIELD.width - x, y,
  }));
}

function positionForKickoff(players, kickoffTeam, kickoffTakerId) {
  const center = { x: FIELD.width / 2, y: FIELD.height / 2 };
  const nonKickerOffset = kickoffTeam === 'home' ? 88 : -88;
  for (const player of players) {
    if (player.id === kickoffTakerId) {
      player.x = center.x;
      player.y = center.y;
      continue;
    }
    if (Math.hypot(player.x - center.x, player.y - center.y) < KICKOFF_CIRCLE_RADIUS) {
      const teamOffset = player.team === kickoffTeam ? -nonKickerOffset : nonKickerOffset;
      player.x = center.x + teamOffset;
      player.y = center.y;
    }
  }
}

/** Create a fresh 4v4 kickoff state without depending on browser APIs. */
export function createInitialGameState({
  stage = 1,
  loadout,
  opponentSkillIds = [],
  playerSkillStacks = {},
  opponentSkillStacks = {},
} = {}) {
  const safeStage = Number.isInteger(stage) && stage >= 1 && stage <= STAGE_COUNT ? stage : 1;
  const safeLoadout = loadout && typeof loadout === 'object' ? loadout : {};
  const safeOpponentSkills = Array.isArray(opponentSkillIds)
    ? opponentSkillIds.filter((skillId) => typeof skillId === 'string')
    : [];

  const homePlayers = homeFormation.map((player, index) => {
    const stack = stackFor(playerSkillStacks, player.id);
    const legacySkill = safeLoadout[player.id];
    const skillId = stack?.skillId ?? legacySkill ?? null;
    const copies = stack ? stack.copies : (skillId ? 1 : 0);
    return createPlayer({
      ...player,
      team: 'home',
      aiRetargetSeconds: 1.2 + index * 0.2,
      skillId,
      skillCopies: copies,
    });
  });

  const awayFormation = createAwayFormation();
  const awayPlayers = awayFormation.map((player, index) => {
    const stack = stackFor(opponentSkillStacks, player.id);
    const legacySkill = player.role === 'goalkeeper' ? null : safeOpponentSkills[index - 1] ?? null;
    return createPlayer({
      ...player,
      team: 'away',
      skillId: stack?.skillId ?? legacySkill,
      skillCopies: stack ? stack.copies : (legacySkill ? 1 : 0),
    });
  });

  const players = [...homePlayers, ...awayPlayers];
  positionForKickoff(players, 'home', 'home-fw');

  return {
    stage: safeStage,
    phase: 'playing',
    kickoffLocked: true,
    kickoffTakerId: 'home-fw',
    remainingSeconds: REGULATION_SECONDS,
    overtimeRemainingSeconds: null,
    score: { home: 0, away: 0 },
    players,
    ball: {
      x: FIELD.width / 2,
      y: FIELD.height / 2,
      vx: 0,
      vy: 0,
      ownerId: 'home-fw',
      height: 0,
      verticalVelocity: 0,
      flightKind: 'ground',
      flightSeconds: 0,
      lastTouchTeam: 'home',
      passTarget: null,
      passProtectionSeconds: 0,
    },
    controlledPlayerId: 'home-fw',
    possessionTeam: 'home',
    restart: null,
    aiRandomSeed: 0x6d2b79f5,
    foulSpot: null,
    foulNoticeSeconds: 0,
    opponentSkillIds: [...safeOpponentSkills],
  };
}
