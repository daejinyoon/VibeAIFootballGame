import { STAGE_COUNT } from '../game/constants.js';
import { createOpponentSkillSets } from '../game/campaign.js';
import {
  FIELD_PLAYER_IDS,
  SKILL_IDS,
  SKILL_MAX_LEVELS,
  isSkillRewardEligible,
  validateTeamSkillDeck,
} from '../game/skills.js';
import { DEFAULT_TEAM_CUSTOMIZATION, normalizeTeamCustomization } from '../game/teamBranding.js';

export const STORAGE_KEY = 'dex-pixel-football:v1';
const PROFILE_VERSION = 4;

export function createEmptyProfile() {
  return {
    schemaVersion: PROFILE_VERSION,
    nickname: '',
    campaignSave: null,
    bestRecord: null,
    teamCustomization: { ...DEFAULT_TEAM_CUSTOMIZATION },
  };
}

function getDefaultStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isStageResult(value) {
  return Boolean(value && Number.isInteger(value.stage) && value.stage >= 1 && value.stage <= STAGE_COUNT
    && Number.isFinite(value.homeGoals) && value.homeGoals >= 0
    && Number.isFinite(value.awayGoals) && value.awayGoals >= 0
    && value.goalDifference === value.homeGoals - value.awayGoals);
}

function isOpponentSkillSets(value) {
  if (!value || typeof value !== 'object') return false;
  return Array.from({ length: STAGE_COUNT }, (_, index) => String(index + 1)).every((stage, index) => {
    const skills = value[stage];
    const expectedCount = [0, 1, 2, 3, 3][index];
    return Array.isArray(skills) && skills.length === expectedCount
      && new Set(skills).size === skills.length
      && skills.every((skillId) => SKILL_IDS.includes(skillId));
  });
}

function isCampaignSave(value) {
  if (!value || !Number.isInteger(value.currentStage) || value.currentStage < 1 || value.currentStage > STAGE_COUNT
      || !Array.isArray(value.clearedStageResults) || !isOpponentSkillSets(value.opponentSkillSets)
      || !validateTeamSkillDeck(value.teamSkillDeck).valid) return false;
  if (!value.clearedStageResults.every((item, index, results) => (
    isStageResult(item) && (index === 0 || results[index - 1].stage < item.stage)
  ))) return false;

  const validOffer = value.pendingSkillOffer == null
    || (Array.isArray(value.pendingSkillOffer) && value.pendingSkillOffer.length >= 1
      && value.pendingSkillOffer.length <= 3
      && new Set(value.pendingSkillOffer).size === value.pendingSkillOffer.length
      && value.pendingSkillOffer.every((skillId) => SKILL_IDS.includes(skillId)
        && isSkillRewardEligible(skillId, value.teamSkillDeck)));
  const validPlacement = value.pendingSkillPlacement == null
    || (SKILL_IDS.includes(value.pendingSkillPlacement)
      && value.teamSkillDeck.some(({ skillId }) => skillId === value.pendingSkillPlacement));
  const validStatus = value.status == null || ['active', 'complete'].includes(value.status);
  return validOffer && validPlacement && !(value.pendingSkillOffer && value.pendingSkillPlacement) && validStatus;
}

function isBestRecord(value) {
  return Boolean(value && typeof value.nickname === 'string'
    && Number.isInteger(value.stageReached) && value.stageReached >= 1 && value.stageReached <= STAGE_COUNT
    && Number.isFinite(value.goalDifference));
}

function addLegacySkill(totals, skillId, copies) {
  if (!SKILL_IDS.includes(skillId) || !Number.isInteger(copies) || copies <= 0) return;
  if (!totals.has(skillId)) totals.set(skillId, 0);
  totals.set(skillId, totals.get(skillId) + copies);
}

function migrateLegacyCampaign(campaignSave) {
  if (!campaignSave || !Number.isInteger(campaignSave.currentStage)
      || campaignSave.currentStage < 1 || campaignSave.currentStage > STAGE_COUNT
      || !Array.isArray(campaignSave.clearedStageResults)) return null;

  const clearedStageResults = campaignSave.clearedStageResults
    .filter(isStageResult)
    .filter((item, index, results) => results.findIndex((result) => result.stage === item.stage) === index)
    .sort((left, right) => left.stage - right.stage);
  const totals = new Map();

  if (campaignSave.playerSkillStacks && campaignSave.skillInventory) {
    for (const playerId of FIELD_PLAYER_IDS) {
      const stack = campaignSave.playerSkillStacks[playerId];
      if (typeof stack === 'string') addLegacySkill(totals, stack, 1);
      else if (stack && typeof stack === 'object') addLegacySkill(totals, stack.skillId, stack.copies);
    }
    for (const skillId of SKILL_IDS) addLegacySkill(totals, skillId, campaignSave.skillInventory[skillId]);
  } else if (campaignSave.homeLoadout && typeof campaignSave.homeLoadout === 'object') {
    for (const skillId of Object.values(campaignSave.homeLoadout)) addLegacySkill(totals, skillId, 1);
  }

  const teamSkillDeck = [...totals].map(([skillId, copies]) => ({
    skillId,
    level: Math.min(SKILL_MAX_LEVELS[skillId], SKILL_MAX_LEVELS[skillId] === 1 ? 1 : copies),
  }));
  const pendingSkillOffer = Array.isArray(campaignSave.pendingSkillOffer)
    ? [...new Set(campaignSave.pendingSkillOffer.filter((skillId) => SKILL_IDS.includes(skillId)
      && isSkillRewardEligible(skillId, teamSkillDeck)))].slice(0, 3)
    : [];
  const pendingSkillPlacementCandidate = campaignSave.pendingSkillPlacement ?? campaignSave.pendingSkillAssignment ?? null;
  const pendingSkillPlacement = SKILL_IDS.includes(pendingSkillPlacementCandidate)
    && teamSkillDeck.some(({ skillId }) => skillId === pendingSkillPlacementCandidate)
    ? pendingSkillPlacementCandidate
    : null;

  return {
    savedAt: campaignSave.savedAt,
    currentStage: campaignSave.currentStage,
    clearedStageResults,
    teamSkillDeck,
    pendingSkillOffer: pendingSkillOffer.length && !pendingSkillPlacement ? pendingSkillOffer : null,
    pendingSkillPlacement,
    status: campaignSave.status === 'complete' ? 'complete' : 'active',
    opponentSkillSets: isOpponentSkillSets(campaignSave.opponentSkillSets)
      ? campaignSave.opponentSkillSets
      : createOpponentSkillSets(() => 0.25),
  };
}

/** Converts a v1 local profile and its legacy campaign data into the current schema. */
export function migrateProfileV1(parsedProfile) {
  if (!parsedProfile || parsedProfile.schemaVersion !== 1 || typeof parsedProfile.nickname !== 'string') {
    return createEmptyProfile();
  }
  return {
    schemaVersion: PROFILE_VERSION,
    nickname: parsedProfile.nickname,
    campaignSave: migrateLegacyCampaign(parsedProfile.campaignSave),
    bestRecord: isBestRecord(parsedProfile.bestRecord) ? { ...parsedProfile.bestRecord } : null,
    teamCustomization: { ...DEFAULT_TEAM_CUSTOMIZATION },
  };
}

/** Migrates the pre-branding v2 envelope and its campaign into profile v4. */
export function migrateProfileV2(parsedProfile) {
  if (!parsedProfile || parsedProfile.schemaVersion !== 2 || typeof parsedProfile.nickname !== 'string') {
    return createEmptyProfile();
  }
  return {
    schemaVersion: PROFILE_VERSION,
    nickname: parsedProfile.nickname,
    campaignSave: migrateLegacyCampaign(parsedProfile.campaignSave),
    bestRecord: isBestRecord(parsedProfile.bestRecord) ? { ...parsedProfile.bestRecord } : null,
    teamCustomization: { ...DEFAULT_TEAM_CUSTOMIZATION },
  };
}

/** Migrates v3 player stacks/inventory into the ordered team deck. */
export function migrateProfileV3(parsedProfile) {
  if (!parsedProfile || parsedProfile.schemaVersion !== 3 || typeof parsedProfile.nickname !== 'string') {
    return createEmptyProfile();
  }
  return {
    schemaVersion: PROFILE_VERSION,
    nickname: parsedProfile.nickname,
    campaignSave: migrateLegacyCampaign(parsedProfile.campaignSave),
    bestRecord: isBestRecord(parsedProfile.bestRecord) ? { ...parsedProfile.bestRecord } : null,
    teamCustomization: normalizeTeamCustomization(parsedProfile.teamCustomization),
  };
}

export function readProfile(storage = getDefaultStorage()) {
  if (!storage) return createEmptyProfile();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyProfile();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.nickname !== 'string') return createEmptyProfile();
    if (parsed.schemaVersion === 1) return migrateProfileV1(parsed);
    if (parsed.schemaVersion === 2) return migrateProfileV2(parsed);
    if (parsed.schemaVersion === 3) return migrateProfileV3(parsed);
    if (parsed.schemaVersion !== PROFILE_VERSION) return createEmptyProfile();
    return {
      schemaVersion: PROFILE_VERSION,
      nickname: parsed.nickname,
      campaignSave: isCampaignSave(parsed.campaignSave) ? parsed.campaignSave : null,
      bestRecord: isBestRecord(parsed.bestRecord) ? { ...parsed.bestRecord } : null,
      teamCustomization: normalizeTeamCustomization(parsed.teamCustomization),
    };
  } catch {
    return createEmptyProfile();
  }
}

export function writeProfile(profile, storage = getDefaultStorage()) {
  if (!storage) throw new Error('이 브라우저에서는 로컬 저장을 사용할 수 없습니다.');
  const normalized = {
    schemaVersion: PROFILE_VERSION,
    nickname: String(profile?.nickname ?? ''),
    campaignSave: isCampaignSave(profile?.campaignSave) ? profile.campaignSave : null,
    bestRecord: isBestRecord(profile?.bestRecord) ? { ...profile.bestRecord } : null,
    teamCustomization: normalizeTeamCustomization(profile?.teamCustomization),
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function setNickname(profile, nickname) {
  const normalized = String(nickname ?? '').trim();
  if (normalized.length < 2 || normalized.length > 16) {
    throw new Error('별명은 공백을 제외하고 2~16자로 입력해 주세요.');
  }
  const bestRecord = profile.bestRecord
    ? { ...profile.bestRecord, nickname: normalized }
    : null;
  return { ...profile, schemaVersion: PROFILE_VERSION, nickname: normalized, bestRecord };
}

export function createCampaignSave(campaign) {
  if (!campaign || !Number.isInteger(campaign.currentStage) || campaign.currentStage < 1 || campaign.currentStage > STAGE_COUNT) {
    throw new TypeError('저장할 캠페인 정보가 올바르지 않습니다.');
  }
  return {
    savedAt: new Date().toISOString(),
    currentStage: campaign.currentStage,
    clearedStageResults: campaign.clearedStageResults.map((item) => ({ ...item })),
    teamSkillDeck: campaign.teamSkillDeck.map((entry) => ({ ...entry })),
    pendingSkillOffer: Array.isArray(campaign.pendingSkillOffer) ? [...campaign.pendingSkillOffer] : null,
    pendingSkillPlacement: campaign.pendingSkillPlacement ?? null,
    status: campaign.status === 'complete' ? 'complete' : 'active',
    opponentSkillSets: Object.fromEntries(Object.entries(campaign.opponentSkillSets).map(([stage, skills]) => [stage, [...skills]])),
  };
}

export function updateBestRecord(profile, campaignResult) {
  const candidate = {
    nickname: profile.nickname,
    stageReached: campaignResult.stageReached,
    goalDifference: campaignResult.goalDifference,
    updatedAt: new Date().toISOString(),
  };
  const existing = profile.bestRecord;
  const isBetter = !existing || candidate.stageReached > existing.stageReached
    || (candidate.stageReached === existing.stageReached && candidate.goalDifference > existing.goalDifference);
  return isBetter ? { ...profile, bestRecord: candidate } : profile;
}

export function sortLeaderboard(records) {
  return [...records].sort((a, b) => b.stageReached - a.stageReached
    || b.goalDifference - a.goalDifference
    || a.nickname.localeCompare(b.nickname, 'ko'));
}
