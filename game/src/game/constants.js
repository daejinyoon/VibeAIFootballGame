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
export const GOLDEN_GOAL_SECONDS = 30;
export const STAGE_COUNT = 5;
export const JUMP_INITIAL_VELOCITY = 360;
export const JUMP_GRAVITY = 920;
export const JUMP_MAX_HEIGHT = 70;
export const JUMP_COOLDOWN_SECONDS = 0.15;
export const GROUND_CLEARANCE_DISTANCE = 180;
export const LOB_CLEARANCE_DISTANCE = 260;
export const SHOT_ASSIST_DISTANCE = 360;
export const BALL_RADIUS = 11.6;
export const BALL_GRAVITY = 900;
export const LOB_VERTICAL_VELOCITY = 360;
export const HEADER_RADIUS = 24;
export const HEADER_HEIGHT_MIN = 20;
export const HEADER_HEIGHT_MAX = 72;

const AI_TUNING = Object.freeze([
  Object.freeze({ thinkIntervalSeconds: 1, teammateSupportRadius: 125, pressingDistance: 95 }),
  Object.freeze({ thinkIntervalSeconds: 0.88, teammateSupportRadius: 145, pressingDistance: 112 }),
  Object.freeze({ thinkIntervalSeconds: 0.76, teammateSupportRadius: 165, pressingDistance: 132 }),
  Object.freeze({ thinkIntervalSeconds: 0.62, teammateSupportRadius: 188, pressingDistance: 152 }),
  Object.freeze({ thinkIntervalSeconds: 0.45, teammateSupportRadius: 210, pressingDistance: 170 }),
]);

export function getAiTuning(stage) {
  const safeStage = Number.isInteger(stage) ? Math.min(5, Math.max(1, stage)) : 1;
  return AI_TUNING[safeStage - 1];
}
