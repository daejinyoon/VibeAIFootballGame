import { FIELD, KICKOFF_CIRCLE_RADIUS, REGULATION_SECONDS, STAGE_COUNT } from './constants.js';
import { getTeamBranding } from './teamBranding.js';
import { SKILL_IDS, SKILL_MAX_LEVELS } from './skills.js';

const homeFormation = [
  { id: 'home-gk', role: 'goalkeeper', x: 55, y: 270 },
  { id: 'home-def-1', role: 'defender', x: 220, y: 190 },
  { id: 'home-mid-1', role: 'midfielder', x: 370, y: 350 },
  { id: 'home-fw', role: 'forward', x: FIELD.width / 2, y: FIELD.height / 2 },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function createPlayer({ id, team, role, x, y, aiRetargetSeconds = 1.2 }) {
  const homeDirection = team === 'home' ? 1 : -1;
  return {
    id, team, role,
    x: clamp(x, 0, FIELD.width),
    y: clamp(y, 0, FIELD.height),
    vx: 0, vy: 0,
    sprintStamina: 100,
    sprinting: false,
    facingX: homeDirection,
    facingY: 0,
    stunnedSeconds: 0,
    knockdownSeconds: 0,
    airborneSecondsRemaining: 0,
    statusDurationSeconds: {},
    launchSecondsRemaining: 0,
    knockdownDirectionX: 0,
    knockdownDirectionY: 0,
    motionAction: 'idle',
    motionTimerSeconds: 0,
    dismissed: false,
    aiTackleCooldownSeconds: 0,
    aiTarget: null,
    aiRetargetSeconds,
    ...(role === 'goalkeeper' ? {
      keeperAction: 'idle',
      keeperActionSeconds: 0,
      keeperDiveDirection: 0,
    } : {}),
  };
}

function createAwayFormation() {
  return homeFormation.map(({ id, role, x, y }) => ({
    id: id.replace('home-', 'away-'), role, x: FIELD.width - x, y,
  }));
}

export function getBaseFormationPositions() {
  return new Map([...homeFormation, ...createAwayFormation()].map(({ id, x, y }) => [id, { x, y }]));
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
  opponentSkillIds = [],
  teamSkillDeck = [],
  opponentSkillDeck,
  teamBranding,
} = {}) {
  const safeStage = Number.isInteger(stage) && stage >= 1 && stage <= STAGE_COUNT ? stage : 1;
  const safeOpponentSkills = Array.isArray(opponentSkillIds)
    ? opponentSkillIds.filter((skillId) => typeof skillId === 'string')
    : [];

  const sanitizeDeck = (deck) => {
    if (!Array.isArray(deck)) return [];
    const seen = new Set();
    return deck.filter((entry) => {
      if (!entry || !SKILL_IDS.includes(entry.skillId) || seen.has(entry.skillId)) return false;
      const maxLevel = SKILL_MAX_LEVELS[entry.skillId];
      if (!Number.isInteger(entry.level) || entry.level < 1 || entry.level > maxLevel) return false;
      seen.add(entry.skillId);
      return true;
    }).map(({ skillId, level }) => ({ skillId, level }));
  };
  const homeDeck = sanitizeDeck(teamSkillDeck);
  const awayDeck = sanitizeDeck(Array.isArray(opponentSkillDeck)
    ? opponentSkillDeck
    : safeOpponentSkills.map((skillId) => ({ skillId, level: 1 })));

  const homePlayers = homeFormation.map((player, index) => createPlayer({
    ...player,
    team: 'home',
    aiRetargetSeconds: 1.2 + index * 0.2,
  }));

  const awayFormation = createAwayFormation();
  const awayPlayers = awayFormation.map((player) => createPlayer({ ...player, team: 'away' }));

  const players = [...homePlayers, ...awayPlayers];
  positionForKickoff(players, 'home', 'home-fw');

  return {
    stage: safeStage,
    teamBranding: teamBranding ?? getTeamBranding(safeStage),
    phase: 'playing',
    kickoffLocked: true,
    kickoffTakerId: 'home-fw',
    openingKickoffTakerId: 'home-fw',
    hasMatchClockStarted: false,
    aiSkillGraceSecondsRemaining: 0,
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
      passReceiverId: null,
      passTarget: null,
      passProtectionSeconds: 0,
    },
    controlledPlayerId: 'home-fw',
    possessionTeam: 'home',
    aiPressingPlayerId: null,
    aiPressingLostSeconds: 0,
    aiMarkingAssignments: {},
    aiMarkingPossessionTeam: null,
    aiObservedCarrierId: null,
    aiControlledCarrierId: null,
    skillEffects: [],
    skillProjectiles: [],
    eagleVolley: null,
    tornadoShotEffect: null,
    vacuumEffect: null,
    teamSkillDecks: { home: homeDeck, away: awayDeck },
    skillCooldownRemaining: {
      home: Object.fromEntries(homeDeck.map(({ skillId }) => [skillId, 0])),
      away: Object.fromEntries(awayDeck.map(({ skillId }) => [skillId, 0])),
    },
    teamSkillGlobalCooldownRemaining: { home: 0, away: 0 },
    skillQueueIndex: { home: 0, away: 0 },
    lastSkillCasterByTeam: { home: null, away: null },
    skillCutIn: null,
    nextSkillEffectId: 1,
    nextSkillProjectileId: 1,
    restart: null,
    aiRandomSeed: 0x6d2b79f5,
    opponentSkillIds: [...safeOpponentSkills],
  };
}
