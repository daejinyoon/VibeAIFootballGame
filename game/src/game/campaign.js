import { STAGE_COUNT } from './constants.js';
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
    1: [],
    2: shuffledSkills(rng).slice(0, 1),
    3: shuffledSkills(rng).slice(0, 2),
    4: shuffledSkills(rng).slice(0, 3),
    5: shuffledSkills(rng).slice(0, 3),
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
    { stage: campaign.currentStage, homeGoals, awayGoals, goalDifference: homeGoals - awayGoals },
  ];
  const isFinal = campaign.currentStage === STAGE_COUNT;
  return {
    ...campaign,
    clearedStageResults,
    currentStage: isFinal ? STAGE_COUNT : campaign.currentStage + 1,
    homeLoadout: { ...campaign.homeLoadout },
    status: isFinal ? 'complete' : 'active',
  };
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
