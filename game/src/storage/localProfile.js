import { STAGE_COUNT } from '../game/constants.js';
import { FIELD_PLAYER_IDS, SKILL_IDS, validateSkillAssignments } from '../game/skills.js';

export const STORAGE_KEY = 'dex-pixel-football:v1';

export function createEmptyProfile() {
  return { schemaVersion: 1, nickname: '', campaignSave: null, bestRecord: null };
}

function getDefaultStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isCampaignSave(value) {
  if (!value || !Number.isInteger(value.currentStage) || value.currentStage < 1 || value.currentStage > STAGE_COUNT
      || !value.opponentSkillSets || typeof value.opponentSkillSets !== 'object'
      || !Array.isArray(value.clearedStageResults)) return false;
  if (value.playerSkillStacks && value.skillInventory) {
    const validOffer = value.pendingSkillOffer == null
      || (Array.isArray(value.pendingSkillOffer) && value.pendingSkillOffer.length === 3
        && new Set(value.pendingSkillOffer).size === 3
        && value.pendingSkillOffer.every((skillId) => SKILL_IDS.includes(skillId)));
    return validOffer
      && (value.pendingSkillAssignment == null || SKILL_IDS.includes(value.pendingSkillAssignment))
      && validateSkillAssignments(value.playerSkillStacks, FIELD_PLAYER_IDS).valid
      && SKILL_IDS.every((skillId) => Number.isInteger(value.skillInventory[skillId]) && value.skillInventory[skillId] >= 0);
  }
  return Boolean(value.homeLoadout && typeof value.homeLoadout === 'object');
}

function upgradeCampaignSave(value) {
  if (value.playerSkillStacks && value.skillInventory) return value;
  const playerSkillStacks = Object.fromEntries(FIELD_PLAYER_IDS.map((playerId) => {
    const skillId = value.homeLoadout[playerId];
    return [playerId, SKILL_IDS.includes(skillId) ? { skillId, copies: 1 } : null];
  }));
  return {
    ...value,
    playerSkillStacks,
    skillInventory: Object.fromEntries(SKILL_IDS.map((skillId) => [skillId, 0])),
    pendingSkillOffer: null,
    pendingSkillAssignment: null,
  };
}

function isBestRecord(value) {
  return Boolean(value && typeof value.nickname === 'string'
    && Number.isInteger(value.stageReached) && value.stageReached >= 1 && value.stageReached <= STAGE_COUNT
    && Number.isFinite(value.goalDifference));
}

export function readProfile(storage = getDefaultStorage()) {
  if (!storage) return createEmptyProfile();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyProfile();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== 1 || typeof parsed.nickname !== 'string') return createEmptyProfile();
    return {
      schemaVersion: 1,
      nickname: parsed.nickname,
      campaignSave: isCampaignSave(parsed.campaignSave) ? upgradeCampaignSave(parsed.campaignSave) : null,
      bestRecord: isBestRecord(parsed.bestRecord) ? parsed.bestRecord : null,
    };
  } catch {
    return createEmptyProfile();
  }
}

export function writeProfile(profile, storage = getDefaultStorage()) {
  if (!storage) throw new Error('이 브라우저에서는 로컬 저장을 사용할 수 없습니다.');
  const normalized = {
    schemaVersion: 1,
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
  return { ...profile, nickname: normalized, bestRecord };
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
