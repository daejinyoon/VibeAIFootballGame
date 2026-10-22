import assert from 'node:assert/strict';
import test from 'node:test';
import { createOpponentSkillSets } from '../game/campaign.js';
import { SKILL_IDS } from '../game/skills.js';
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

function createCampaign(currentStage = 2) {
  return {
    currentStage,
    clearedStageResults: [{ stage: 1, homeGoals: 2, awayGoals: 1, goalDifference: 1 }],
    playerSkillStacks: { 'home-def-1': { skillId: 'eagleShot', copies: 2 }, 'home-mid-1': null, 'home-fw': null },
    skillInventory: Object.fromEntries(SKILL_IDS.map((skillId) => [skillId, skillId === 'powerTackle' ? 1 : 0])),
    pendingSkillOffer: null,
    pendingSkillAssignment: null,
    opponentSkillSets: createOpponentSkillSets(() => 0.2),
    status: 'active',
  };
}

test('creates an empty profile and validates a trimmed nickname', () => {
  const empty = createEmptyProfile();
  assert.equal(empty.nickname, '');
  assert.equal(setNickname(empty, '  Dex  ').nickname, 'Dex');
  assert.throws(() => setNickname(empty, ' '));
  assert.throws(() => setNickname(empty, 'x'));
  assert.throws(() => setNickname(empty, '12345678901234567'));
});

test('recovers from malformed or unsupported browser profile data', () => {
  const broken = createMemoryStorage({ 'dex-pixel-football:v1': '{bad json' });
  assert.deepEqual(readProfile(broken), createEmptyProfile());
  const old = createMemoryStorage({ 'dex-pixel-football:v1': JSON.stringify({ schemaVersion: 3, nickname: 'Dex' }) });
  assert.deepEqual(readProfile(old), createEmptyProfile());
});

test('writes and reads skill stacks and inventory without match coordinates', () => {
  const storage = createMemoryStorage();
  const campaign = createCampaign();
  const save = createCampaignSave(campaign);
  const profile = writeProfile({ ...createEmptyProfile(), nickname: 'Dex', campaignSave: save }, storage);
  const loaded = readProfile(storage);
  assert.equal(loaded.nickname, 'Dex');
  assert.equal(profile.schemaVersion, 2);
  assert.equal(JSON.parse(storage.getItem('dex-pixel-football:v1')).schemaVersion, 2);
  assert.equal(loaded.campaignSave.currentStage, 2);
  assert.deepEqual(loaded.campaignSave.playerSkillStacks, campaign.playerSkillStacks);
  assert.deepEqual(loaded.campaignSave.skillInventory, campaign.skillInventory);
  assert.equal('ball' in loaded.campaignSave, false);
  assert.ok(profile.campaignSave.savedAt);
  assert.equal(createCampaignSave(createCampaign(5)).currentStage, 5);
});

test('migrates legacy six-person loadouts into inventory and leaves the new field roster unequipped', () => {
  const legacy = {
    currentStage: 2,
    clearedStageResults: [{ stage: 1, homeGoals: 2, awayGoals: 1, goalDifference: 1 }],
    homeLoadout: { 'home-gk': 'rainbowReflect', 'home-def-1': 'eagleShot' },
    opponentSkillSets: { 1: [], 2: [], 3: [] },
  };
  const storage = createMemoryStorage({ 'dex-pixel-football:v1': JSON.stringify({
    schemaVersion: 1,
    nickname: 'Dex',
    bestRecord: { nickname: 'Dex', stageReached: 3, goalDifference: 4, updatedAt: '2026-10-21T00:00:00.000Z' },
    campaignSave: legacy,
  }) });
  const profile = readProfile(storage);
  const saved = profile.campaignSave;
  assert.equal(profile.schemaVersion, 2);
  assert.equal(profile.nickname, 'Dex');
  assert.equal(profile.bestRecord.stageReached, 3);
  assert.equal(saved.currentStage, 2);
  assert.deepEqual(saved.clearedStageResults, legacy.clearedStageResults);
  assert.deepEqual(saved.playerSkillStacks, { 'home-def-1': null, 'home-mid-1': null, 'home-fw': null });
  assert.equal(saved.skillInventory.eagleShot, 1);
  assert.equal(saved.skillInventory.rainbowReflect, 1);
  assert.deepEqual(Object.values(saved.opponentSkillSets).map((skills) => skills.length), [0, 1, 2, 3, 3]);
});

test('migrates previous skill-stack checkpoints without losing inventory, pending offers, or opponent setup', () => {
  const campaign = createCampaign(4);
  campaign.clearedStageResults = [1, 2, 3].map((stage) => ({ stage, homeGoals: 2, awayGoals: 1, goalDifference: 1 }));
  campaign.pendingSkillOffer = ['eagleShot', 'tornadoShot', 'powerTackle'];
  campaign.skillInventory.eagleShot = 2;
  const storage = createMemoryStorage({ 'dex-pixel-football:v1': JSON.stringify({
    schemaVersion: 1, nickname: 'Dex', campaignSave: createCampaignSave(campaign),
  }) });
  const migrated = readProfile(storage).campaignSave;
  assert.equal(migrated.currentStage, 4);
  assert.equal(migrated.skillInventory.eagleShot, 2);
  assert.deepEqual(migrated.pendingSkillOffer, campaign.pendingSkillOffer);
  assert.deepEqual(migrated.opponentSkillSets, campaign.opponentSkillSets);
});

test('persists a pending card offer and assignment prompt for campaign resume', () => {
  const campaign = createCampaign(2);
  campaign.pendingSkillOffer = ['eagleShot', 'tornadoShot', 'powerTackle'];
  campaign.pendingSkillAssignment = 'eagleShot';
  const save = createCampaignSave(campaign);
  const storage = createMemoryStorage({ 'dex-pixel-football:v1': JSON.stringify({
    schemaVersion: 1,
    nickname: 'Dex',
    campaignSave: save,
  }) });
  const loaded = readProfile(storage).campaignSave;
  assert.deepEqual(loaded.pendingSkillOffer, campaign.pendingSkillOffer);
  assert.equal(loaded.pendingSkillAssignment, 'eagleShot');
});

test('keeps one campaign checkpoint and replaces it with a later save', () => {
  const storage = createMemoryStorage();
  const base = createEmptyProfile();
  const first = createCampaignSave(createCampaign(1));
  const second = createCampaignSave(createCampaign(2));
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
    { nickname: 'B', stageReached: 2, goalDifference: 3 },
    { nickname: 'A', stageReached: 2, goalDifference: 3 },
    { nickname: 'C', stageReached: 1, goalDifference: 100 },
    { nickname: 'Finalist', stageReached: 5, goalDifference: 1 },
  ]);
  profile = updateBestRecord(profile, { stageReached: 5, goalDifference: 6 });
  assert.equal(profile.bestRecord.stageReached, 5);
  assert.deepEqual(sorted.map((record) => record.nickname), ['Finalist', 'A', 'B', 'C']);
});

test('write failures propagate so the UI can offer a retry message', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  assert.throws(() => writeProfile(createEmptyProfile(), storage), /quota/);
});
