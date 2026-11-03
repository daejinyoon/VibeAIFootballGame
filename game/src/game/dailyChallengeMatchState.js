import { createInitialGameState } from './createInitialGameState.js';
import { DEFAULT_GOAL_CELEBRATION_SETTINGS, selectGoalCelebrationId } from './goalCelebrations.js';
import { getTeamBranding } from './teamBranding.js';

export const DAILY_CHALLENGE_SKILL_IDS = Object.freeze([
  'eagleShot',
  'tornadoShot',
  'eulryongta',
]);

function isValidChallenge(challenge) {
  return Boolean(challenge && typeof challenge === 'object' && !Array.isArray(challenge)
    && typeof challenge.challengeId === 'string' && challenge.challengeId.trim()
    && Number.isInteger(challenge.regulationSeconds)
    && challenge.regulationSeconds >= 30 && challenge.regulationSeconds <= 45
    && Number.isInteger(challenge.aiStage) && challenge.aiStage >= 2 && challenge.aiStage <= 5
    && Array.isArray(challenge.skillIds)
    && challenge.skillIds.length === DAILY_CHALLENGE_SKILL_IDS.length
    && challenge.skillIds.every((skillId, index) => skillId === DAILY_CHALLENGE_SKILL_IDS[index]));
}

function createSkillDeck() {
  return DAILY_CHALLENGE_SKILL_IDS.map((skillId) => ({ skillId, level: 1 }));
}

export function createDailyChallengeMatchState(challenge, teamCustomization, goalCelebration) {
  if (!isValidChallenge(challenge)) return null;
  const skillDeck = createSkillDeck();
  return createInitialGameState({
    stage: challenge.aiStage,
    teamSkillDeck: skillDeck,
    opponentSkillDeck: skillDeck,
    teamBranding: getTeamBranding(challenge.aiStage, teamCustomization),
    goalCelebrationId: selectGoalCelebrationId(goalCelebration ?? DEFAULT_GOAL_CELEBRATION_SETTINGS),
    regulationSeconds: challenge.regulationSeconds,
    skillUsesPerEntry: 1,
  });
}
