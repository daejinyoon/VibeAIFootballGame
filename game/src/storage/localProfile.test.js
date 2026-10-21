import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCampaignSave,
  createEmptyProfile,
  readProfile,
  setNickname,
  sortLeaderboard,
  updateBestRecord,
  writeProfile,
} from './localProfile.js';

function createMemoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    size() { return values.size; },
  };
}

test('creates an empty profile and validates a trimmed 2 to 16 character nickname', () => {
  const empty = createEmptyProfile();
  assert.equal(empty.nickname, '');
  assert.equal(setNickname(empty, '  윤대진  ').nickname, '윤대진');
  assert.throws(() => setNickname(empty, ' '), /2~16자/);
  assert.throws(() => setNickname(empty, 'x'), /2~16자/);
  assert.throws(() => setNickname(empty, '12345678901234567'), /2~16자/);
});

test('recovers from malformed or unsupported browser profile data', () => {
  const broken = createMemoryStorage({ 'dex-pixel-football:v1': '{bad json' });
  assert.deepEqual(readProfile(broken), createEmptyProfile());
  const old = createMemoryStorage({ 'dex-pixel-football:v1': JSON.stringify({ schemaVersion: 2, nickname: 'Dex' }) });
  assert.deepEqual(readProfile(old), createEmptyProfile());
});

test('writes and reads a campaign checkpoint without match coordinates', () => {
  const storage = createMemoryStorage();
  const campaign = {
    currentStage: 2,
    clearedStageResults: [{ stage: 1, homeGoals: 2, awayGoals: 1, goalDifference: 1 }],
    homeLoadout: { 'home-gk': 'rainbowReflect' },
    opponentSkillSets: { 1: ['eagleShot'], 2: ['tornadoShot'], 3: ['eagleShot'] },
  };
  const save = createCampaignSave(campaign);
  const profile = writeProfile({ ...createEmptyProfile(), nickname: 'Dex', campaignSave: save }, storage);
  const loaded = readProfile(storage);
  assert.equal(loaded.nickname, 'Dex');
  assert.equal(loaded.campaignSave.currentStage, 2);
  assert.deepEqual(loaded.campaignSave.homeLoadout, campaign.homeLoadout);
  assert.equal('ball' in loaded.campaignSave, false);
  assert.ok(profile.campaignSave.savedAt);
});

test('keeps exactly one campaign checkpoint and replaces it with a later save', () => {
  const storage = createMemoryStorage();
  const base = createEmptyProfile();
  const first = createCampaignSave({ currentStage: 1, clearedStageResults: [], homeLoadout: {}, opponentSkillSets: { 1: [], 2: [], 3: [] } });
  const second = createCampaignSave({ currentStage: 2, clearedStageResults: [], homeLoadout: {}, opponentSkillSets: { 1: [], 2: [], 3: [] } });
  writeProfile({ ...base, nickname: 'Dex', campaignSave: first }, storage);
  writeProfile({ ...base, nickname: 'Dex', campaignSave: second }, storage);
  assert.equal(readProfile(storage).campaignSave.currentStage, 2);
  assert.equal(storage.size(), 1);
});

test('updates only a better best record and sorts by stage, goal difference, then nickname', () => {
  let profile = setNickname(createEmptyProfile(), 'Dex');
  profile = updateBestRecord(profile, { stageReached: 2, goalDifference: 3 });
  const original = profile.bestRecord;
  assert.equal(updateBestRecord(profile, { stageReached: 1, goalDifference: 99 }).bestRecord, original);
  assert.equal(updateBestRecord(profile, { stageReached: 2, goalDifference: 3 }).bestRecord, original);
  assert.equal(updateBestRecord(profile, { stageReached: 2, goalDifference: 4 }).bestRecord.goalDifference, 4);
  const sorted = sortLeaderboard([
    { nickname: '나', stageReached: 2, goalDifference: 3 },
    { nickname: '가', stageReached: 2, goalDifference: 3 },
    { nickname: '다', stageReached: 1, goalDifference: 100 },
  ]);
  assert.deepEqual(sorted.map((record) => record.nickname), ['가', '나', '다']);
});

test('write failures propagate so the UI can offer a retry message', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  assert.throws(() => writeProfile(createEmptyProfile(), storage), /quota/);
});
