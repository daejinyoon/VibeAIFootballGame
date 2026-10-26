import { STAGE_COUNT } from './constants.js';
import { HOME_PLAYER_IDS, SKILL_IDS, createSkillCardOffer } from './skills.js';

export { HOME_PLAYER_IDS };

let campaignCounter = 0;

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

export function createOpponentSkillSets(rng = Math.random) {
  return {
    1: [],
    2: shuffledSkills(rng).slice(0, 1),
    3: shuffledSkills(rng).slice(0, 2),
    4: shuffledSkills(rng).slice(0, 3),
    5: shuffledSkills(rng).slice(0, 3),
  };
}

export function createCampaign({ rng = Math.random } = {}) {
  const starterSkills = SKILL_IDS;
  const randomValue = Number(rng());
  const safeValue = Number.isFinite(randomValue) ? Math.min(0.999999, Math.max(0, randomValue)) : 0;
  const starterSkillId = starterSkills[Math.floor(safeValue * starterSkills.length)];
  return {
    id: `campaign-${Date.now()}-${++campaignCounter}`,
    currentStage: 1,
    clearedStageResults: [],
    ownedTeamSkills: [{ skillId: starterSkillId, level: 1 }],
    equippedTeamSkillIds: [starterSkillId],
    pendingSkillOffer: null,
    opponentSkillSets: createOpponentSkillSets(rng),
    status: 'active',
  };
}

export function finishStage(campaign, result, rng = Math.random) {
  if (!campaign || campaign.status !== 'active') throw new Error('진행 중인 캠페인이 없습니다.');
  const homeGoals = Number(result?.homeGoals ?? result?.score?.home);
  const awayGoals = Number(result?.awayGoals ?? result?.score?.away);
  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals) || homeGoals < 0 || awayGoals < 0) {
    throw new Error('경기 결과에 유효한 양 팀 점수가 필요합니다.');
  }
  if (homeGoals === awayGoals) return { ...campaign };

  if (homeGoals < awayGoals) return { ...campaign };

  const stageResult = {
    stage: campaign.currentStage,
    homeGoals,
    awayGoals,
    goalDifference: homeGoals - awayGoals,
  };
  const clearedStageResults = [
    ...campaign.clearedStageResults.filter((item) => item.stage !== campaign.currentStage),
    stageResult,
  ].sort((left, right) => left.stage - right.stage);
  const isFinal = campaign.currentStage === STAGE_COUNT;
  const pendingSkillOffer = createSkillCardOffer(rng, campaign.ownedTeamSkills);
  return {
    ...campaign,
    clearedStageResults,
    currentStage: isFinal ? STAGE_COUNT : campaign.currentStage + 1,
    pendingSkillOffer: pendingSkillOffer.length ? pendingSkillOffer : null,
    status: isFinal ? 'complete' : 'active',
  };
}

export function getUnlockedStage(campaign) {
  const currentStage = Number.isInteger(campaign?.currentStage)
    ? campaign.currentStage
    : 1;
  const highestClearedStage = Array.isArray(campaign?.clearedStageResults)
    ? campaign.clearedStageResults.reduce((highest, result) => (
      Number.isInteger(result?.stage) && result.stage >= 1 && result.stage <= STAGE_COUNT
        ? Math.max(highest, result.stage)
        : highest
    ), 0)
    : 0;
  return Math.min(STAGE_COUNT, Math.max(1, currentStage, highestClearedStage + 1));
}

export function assignOpponentSkills(players, skillIds) {
  if (!Array.isArray(players) || !Array.isArray(skillIds)) {
    throw new TypeError('선수 목록과 상대 스킬 목록은 배열이어야 합니다.');
  }
  if (skillIds.length > 3 || skillIds.some((skillId) => !SKILL_IDS.includes(skillId))
      || new Set(skillIds).size !== skillIds.length) {
    throw new Error('상대 스킬은 세 종 이내에서 중복 없이 선택해야 합니다.');
  }
  const awayPlayers = players.filter((player) => player.team === 'away');
  if (awayPlayers.length !== 4 || awayPlayers.filter((player) => player.role !== 'goalkeeper').length !== 3) {
    throw new Error('Opponent roster must contain three field players and one goalkeeper.');
  }

  let index = 0;
  return players.map((player) => {
    if (player.team !== 'away') return { ...player };
    const skillId = player.role === 'goalkeeper' ? null : skillIds[index++] ?? null;
    return { ...player, skillId, skillCopies: skillId ? 1 : 0, skillUsesRemaining: skillId ? 1 : 0 };
  });
}
