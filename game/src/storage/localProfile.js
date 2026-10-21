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
  return Boolean(value && [1, 2, 3].includes(value.currentStage)
    && value.homeLoadout && typeof value.homeLoadout === 'object'
    && value.opponentSkillSets && typeof value.opponentSkillSets === 'object'
    && Array.isArray(value.clearedStageResults));
}

function isBestRecord(value) {
  return Boolean(value && typeof value.nickname === 'string'
    && [1, 2, 3].includes(value.stageReached)
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
  if (!campaign || ![1, 2, 3].includes(campaign.currentStage)) {
    throw new TypeError('저장할 캠페인 정보가 올바르지 않습니다.');
  }
  return {
    savedAt: new Date().toISOString(),
    currentStage: campaign.currentStage,
    clearedStageResults: campaign.clearedStageResults.map((item) => ({ ...item })),
    homeLoadout: { ...campaign.homeLoadout },
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
