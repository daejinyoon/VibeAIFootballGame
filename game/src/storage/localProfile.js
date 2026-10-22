import { STAGE_COUNT } from '../game/constants.js';
import { createOpponentSkillSets } from '../game/campaign.js';
import { FIELD_PLAYER_IDS, SKILL_IDS, validateSkillAssignments } from '../game/skills.js';

export const STORAGE_KEY = 'dex-pixel-football:v1';
const PROFILE_VERSION = 2;

export function createEmptyProfile() {
  return { schemaVersion: PROFILE_VERSION, nickname: '', campaignSave: null, bestRecord: null };
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
      || !value.playerSkillStacks || !value.skillInventory) return false;
  if (!value.clearedStageResults.every((item, index, results) => (
    isStageResult(item) && (index === 0 || results[index - 1].stage < item.stage)
  ))) return false;
  const validOffer = value.pendingSkillOffer == null
    || (Array.isArray(value.pendingSkillOffer) && value.pendingSkillOffer.length === 3
      && new Set(value.pendingSkillOffer).size === 3
      && value.pendingSkillOffer.every((skillId) => SKILL_IDS.includes(skillId)));
  const validStatus = value.status == null || ['active', 'complete'].includes(value.status);
  return validOffer && validStatus
    && (value.pendingSkillAssignment == null || SKILL_IDS.includes(value.pendingSkillAssignment))
    && validateSkillAssignments(value.playerSkillStacks, FIELD_PLAYER_IDS).valid
    && SKILL_IDS.every((skillId) => Number.isInteger(value.skillInventory[skillId]) && value.skillInventory[skillId] >= 0);
}

function isBestRecord(value) {
  return Boolean(value && typeof value.nickname === 'string'
    && Number.isInteger(value.stageReached) && value.stageReached >= 1 && value.stageReached <= STAGE_COUNT
    && Number.isFinite(value.goalDifference));
}

function migrateLegacyCampaign(campaignSave) {
  if (!campaignSave || !Number.isInteger(campaignSave.currentStage)
      || campaignSave.currentStage < 1 || campaignSave.currentStage > STAGE_COUNT
      || !Array.isArray(campaignSave.clearedStageResults)) return null;

  const clearedStageResults = campaignSave.clearedStageResults
    .filter(isStageResult)
    .filter((item, index, results) => results.findIndex((result) => result.stage === item.stage) === index)
    .sort((left, right) => left.stage - right.stage);
  const opponentSkillSets = createOpponentSkillSets();

  // Preserve the newer v1 checkpoint shape created by earlier builds.
  if (campaignSave.playerSkillStacks && campaignSave.skillInventory) {
    const checkpoint = {
      ...campaignSave,
      clearedStageResults,
      opponentSkillSets: isOpponentSkillSets(campaignSave.opponentSkillSets) ? campaignSave.opponentSkillSets : opponentSkillSets,
      status: campaignSave.status === 'complete' ? 'complete' : 'active',
    };
    return isCampaignSave(checkpoint) ? checkpoint : null;
  }

  // Older six-person loadouts become inventory cards; the keeper remains unequipped.
  if (!campaignSave.homeLoadout || typeof campaignSave.homeLoadout !== 'object') return null;
  const playerSkillStacks = Object.fromEntries(FIELD_PLAYER_IDS.map((playerId) => [playerId, null]));
  const skillInventory = Object.fromEntries(SKILL_IDS.map((skillId) => [skillId, 0]));
  for (const skillId of Object.values(campaignSave.homeLoadout)) {
    if (SKILL_IDS.includes(skillId)) skillInventory[skillId] += 1;
  }
  return {
    savedAt: campaignSave.savedAt,
    currentStage: campaignSave.currentStage,
    clearedStageResults,
    playerSkillStacks,
    skillInventory,
    pendingSkillOffer: null,
    pendingSkillAssignment: null,
    status: 'active',
    opponentSkillSets,
  };
}

/** Converts the old local profile envelope into the current schema without changing its storage key. */
export function migrateProfileV1(parsedProfile) {
  if (!parsedProfile || parsedProfile.schemaVersion !== 1 || typeof parsedProfile.nickname !== 'string') {
    return createEmptyProfile();
  }
  const migratedCampaign = migrateLegacyCampaign(parsedProfile.campaignSave);
  return {
    schemaVersion: PROFILE_VERSION,
    nickname: parsedProfile.nickname,
    campaignSave: migratedCampaign,
    bestRecord: isBestRecord(parsedProfile.bestRecord) ? { ...parsedProfile.bestRecord } : null,
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
    if (parsed.schemaVersion !== PROFILE_VERSION) return createEmptyProfile();
    return {
      schemaVersion: PROFILE_VERSION,
      nickname: parsed.nickname,
      campaignSave: isCampaignSave(parsed.campaignSave) ? parsed.campaignSave : null,
      bestRecord: isBestRecord(parsed.bestRecord) ? parsed.bestRecord : null,
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
    bestRecord: isBestRecord(profile?.bestRecord) ? profile.bestRecord : null,
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
    playerSkillStacks: Object.fromEntries(FIELD_PLAYER_IDS.map((playerId) => [playerId, campaign.playerSkillStacks?.[playerId] ? { ...campaign.playerSkillStacks[playerId] } : null])),
    skillInventory: Object.fromEntries(SKILL_IDS.map((skillId) => [skillId, campaign.skillInventory?.[skillId] ?? 0])),
    pendingSkillOffer: Array.isArray(campaign.pendingSkillOffer) ? [...campaign.pendingSkillOffer] : null,
    pendingSkillAssignment: campaign.pendingSkillAssignment ?? null,
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
