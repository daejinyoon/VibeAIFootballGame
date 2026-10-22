export const FIELD = Object.freeze({
  width: 960,
  height: 540,
  goalTop: 210,
  goalBottom: 330,
});

export const TEAM_IDS = Object.freeze(['home', 'away']);

export const ROLES = Object.freeze({
  goalkeeper: 'goalkeeper',
  defender: 'defender',
  midfielder: 'midfielder',
  forward: 'forward',
});

export const REGULATION_SECONDS = 60;
export const STAGE_COUNT = 5;
export const JUMP_INITIAL_VELOCITY = 360;
export const JUMP_GRAVITY = 920;
export const JUMP_MAX_HEIGHT = 70;
export const JUMP_COOLDOWN_SECONDS = 0.15;
export const BALL_GRAVITY = 900;
export const LOB_VERTICAL_VELOCITY = 360;
export const HEADER_RADIUS = 24;
export const HEADER_HEIGHT_MIN = 20;
export const HEADER_HEIGHT_MAX = 72;

const STANDARD_AI_TUNING = Object.freeze({
  thinkIntervalSeconds: 0.8,
  teammateSupportRadius: 160,
  pressingDistance: 130,
});

const BOSS_AI_TUNING = Object.freeze({
  thinkIntervalSeconds: 0.45,
  teammateSupportRadius: 210,
  pressingDistance: 170,
});

export function getAiTuning(stage) {
  return stage === 5 ? BOSS_AI_TUNING : STANDARD_AI_TUNING;
}
