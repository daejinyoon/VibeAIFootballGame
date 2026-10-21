import { FIELD, REGULATION_SECONDS } from './constants.js';

const homeFormation = [
  { id: 'home-gk', role: 'goalkeeper', x: 55, y: 270 },
  { id: 'home-def-1', role: 'defender', x: 190, y: 175 },
  { id: 'home-def-2', role: 'defender', x: 190, y: 365 },
  { id: 'home-mid-1', role: 'midfielder', x: 345, y: 175 },
  { id: 'home-mid-2', role: 'midfielder', x: 345, y: 365 },
  { id: 'home-fw', role: 'forward', x: FIELD.width / 2, y: FIELD.height / 2 },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function createPlayer({ id, team, role, x, y, skillId = null, aiRetargetSeconds = 1.2 }) {
  const homeDirection = team === 'home' ? 1 : -1;

  return {
    id,
    team,
    role,
    x: clamp(x, 0, FIELD.width),
    y: clamp(y, 0, FIELD.height),
    vx: 0,
    vy: 0,
    facingX: homeDirection,
    facingY: 0,
    stunnedSeconds: 0,
    aiTarget: null,
    aiRetargetSeconds,
    skillId: typeof skillId === 'string' ? skillId : null,
  };
}

function createAwayFormation() {
  return homeFormation.map(({ id, role, x, y }) => ({
    id: id.replace('home-', 'away-'),
    role,
    x: FIELD.width - x,
    y,
  }));
}

/** Create a fresh 6v6 kickoff state without depending on browser APIs. */
export function createInitialGameState({ stage = 1, loadout, opponentSkillIds = [] } = {}) {
  const safeStage = [1, 2, 3].includes(stage) ? stage : 1;
  const safeLoadout = loadout && typeof loadout === 'object' ? loadout : {};
  const safeOpponentSkills = Array.isArray(opponentSkillIds)
    ? opponentSkillIds.filter((skillId) => typeof skillId === 'string')
    : [];

  const homePlayers = homeFormation.map((player, index) => createPlayer({
    ...player,
    team: 'home',
    aiRetargetSeconds: 1.2 + index * 0.2,
    skillId: safeLoadout[player.id],
  }));

  const awayPlayers = createAwayFormation().map((player, index) => createPlayer({
    ...player,
    team: 'away',
    skillId: safeOpponentSkills[index] ?? null,
  }));

  const players = [...homePlayers, ...awayPlayers];

  return {
    stage: safeStage,
    phase: 'playing',
    remainingSeconds: REGULATION_SECONDS,
    score: { home: 0, away: 0 },
    players,
    ball: {
      x: FIELD.width / 2,
      y: FIELD.height / 2,
      vx: 0,
      vy: 0,
      ownerId: 'home-fw',
      height: 0,
      flightKind: 'ground',
      flightSeconds: 0,
      lastTouchTeam: 'home',
      passTarget: null,
      passProtectionSeconds: 0,
    },
    controlledPlayerId: 'home-fw',
    possessionTeam: 'home',
    skillGauge: { home: 0, away: 0 },
    charge: { action: null, elapsedSeconds: 0 },
    aiRandomSeed: 0x6d2b79f5,
    opponentSkillIds: [...safeOpponentSkills],
  };
}
