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
export const TEAM_SKILL_COOLDOWN_SECONDS = 10;
export const TEAM_SKILL_GLOBAL_COOLDOWN_SECONDS = 3;
export const SPRINT_STAMINA_MAX = 100;
export const SPRINT_DRAIN_PER_SECOND = 32;
export const SPRINT_RECOVERY_PER_SECOND = 24;
export const GROUND_CLEARANCE_DISTANCE = 180;
export const LOB_CLEARANCE_DISTANCE = 260;
export const SHOT_ASSIST_DISTANCE = 520;
export const SHOT_ASSIST_MAX = 0.88;
export const BALL_RADIUS = 11.6;
export const KICKOFF_CIRCLE_RADIUS = 70;
export const BALL_GRAVITY = 900;
export const LOB_VERTICAL_VELOCITY = 360;
export const PLAYER_BODY_WIDTH = 24;
// Barrier reach grows modestly with campaign stage while remaining near player scale.
export const EAGLE_ASCENT_SECONDS = 0.45;
export const EAGLE_SHOT_INTERVAL_SECONDS = 0.18;
export const EAGLE_FLIGHT_HEIGHT = 180;
export const EAGLE_CYCLOID_RADIUS = 90;
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
