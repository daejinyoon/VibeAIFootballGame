import { HOME_PLAYER_IDS, SKILL_IDS, validateLoadout } from './skills.js';

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
    1: shuffledSkills(rng).slice(0, 3),
    2: shuffledSkills(rng).slice(0, 4),
    3: [...SKILL_IDS],
  };
}

export function createCampaign({ rng = Math.random, homeLoadout } = {}) {
  const validation = validateLoadout(homeLoadout, HOME_PLAYER_IDS);
  if (!validation.valid) {
    throw new Error('캠페인을 시작하려면 여섯 선수에게 서로 다른 스킬을 하나씩 배정해야 합니다.');
  }

  return {
    id: `campaign-${Date.now()}-${++campaignCounter}`,
    currentStage: 1,
    clearedStageResults: [],
    homeLoadout: { ...homeLoadout },
    opponentSkillSets: createOpponentSkillSets(rng),
    status: 'active',
  };
}

export function finishStage(campaign, result) {
  if (!campaign || campaign.status !== 'active') throw new Error('진행 중인 캠페인이 없습니다.');
  const homeGoals = Number(result?.homeGoals ?? result?.score?.home);
  const awayGoals = Number(result?.awayGoals ?? result?.score?.away);
  if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals) || homeGoals < 0 || awayGoals < 0) {
    throw new Error('경기 결과에 유효한 양 팀 점수가 필요합니다.');
  }
  if (homeGoals === awayGoals) throw new Error('골든골로 승패가 결정된 뒤 다음 단계로 진행할 수 있습니다.');

  if (homeGoals < awayGoals) return { ...campaign, homeLoadout: { ...campaign.homeLoadout } };

  const clearedStageResults = [
    ...campaign.clearedStageResults,
    {
      stage: campaign.currentStage,
      homeGoals,
      awayGoals,
      goalDifference: homeGoals - awayGoals,
    },
  ];
  const isFinal = campaign.currentStage === 3;
  return {
    ...campaign,
    clearedStageResults,
    currentStage: isFinal ? 3 : campaign.currentStage + 1,
    homeLoadout: { ...campaign.homeLoadout },
    status: isFinal ? 'complete' : 'active',
  };
}

export function assignOpponentSkills(players, skillIds) {
  if (!Array.isArray(players) || !Array.isArray(skillIds)) {
    throw new TypeError('선수 목록과 상대 스킬 목록은 배열이어야 합니다.');
  }
  if (skillIds.length > 6 || skillIds.some((skillId) => !SKILL_IDS.includes(skillId))
      || new Set(skillIds).size !== skillIds.length) {
    throw new Error('상대 스킬은 여섯 종 이내에서 중복 없이 선택해야 합니다.');
  }
  if (players.filter((player) => player.team === 'away').length !== 6) {
    throw new Error('상대 스킬을 배정하려면 상대 선수가 여섯 명이어야 합니다.');
  }

  let index = 0;
  return players.map((player) => {
    if (player.team !== 'away') return { ...player };
    const skillId = skillIds[index] ?? null;
    index += 1;
    return { ...player, skillId };
  });
}
