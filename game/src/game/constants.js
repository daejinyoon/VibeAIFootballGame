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

export const MAX_SKILL_GAUGE = 100;
export const SKILL_GAUGE_REWARDS = Object.freeze({
  pass: 12,
  tackle: 20,
  shotOnTarget: 15,
  keeperCatch: 20,
});
