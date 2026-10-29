import { createInitialGameState } from './createInitialGameState.js';
import { applySkill } from './skills.js';
import { getTeamBranding } from './teamBranding.js';

/** Create the campaign kickoff state, including saved branding and preview setup. */
export function createCampaignMatchState(campaign, teamCustomization) {
  const ownedSkills = new Map((campaign.ownedTeamSkills ?? []).map((entry) => [entry.skillId, entry]));
  const state = createInitialGameState({
    stage: campaign.currentStage,
    teamSkillDeck: (campaign.equippedTeamSkillIds ?? [])
      .map((skillId) => ownedSkills.get(skillId))
      .filter(Boolean),
    opponentSkillDeck: (campaign.opponentSkillSets?.[campaign.currentStage] ?? [])
      .map((skillId) => ({ skillId, level: 1 })),
    teamBranding: getTeamBranding(campaign.currentStage, teamCustomization),
  });
  if (campaign.isSkillPreview) {
    const skillId = campaign.ownedTeamSkills?.[0]?.skillId;
    const source = state.players.find((player) => player.id === state.controlledPlayerId);
    const target = state.players.find((player) => player.team === 'away' && player.role === 'forward');
    if (source) {
      source.facingX = 1;
      source.facingY = 0;
    }
    if (skillId === 'eulryongta' && source && target) {
      target.x = Math.min(source.x + 108, 900);
      target.y = source.y;
      target.facingX = -1;
      target.facingY = 0;
    }
    if (skillId === 'vacuumCleaner') {
      state.ball.x = Math.min(state.ball.x + 130, 850);
      state.ball.y = Math.max(60, state.ball.y - 45);
      state.ball.ownerId = null;
      state.possessionTeam = null;
    }
    if (source && skillId) {
      applySkill(state, {
        team: 'home',
        sourcePlayerId: source.id,
        skillId,
        level: ownedSkills.get(skillId)?.level ?? 1,
      });
    }
  }
  return state;
}
