import assert from 'node:assert/strict';
import test from 'node:test';
import { createCampaign as createNewCampaign, createOpponentSkillSets } from '../game/campaign.js';
import { DEFAULT_TEAM_CUSTOMIZATION } from '../game/teamBranding.js';
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
    ownedTeamSkills: [
      { skillId: 'eagleShot', level: 2 },
      { skillId: 'powerTackle', level: 1 },
    ],
    equippedTeamSkillIds: ['eagleShot', 'powerTackle'],
    pendingSkillOffer: null,
    opponentSkillSets: createOpponentSkillSets(() => 0.2),
    status: 'active',
  };
}

function legacyV3Campaign(currentStage = 4) {
  return {
    currentStage,
    clearedStageResults: [1, 2, 3].map((stage) => ({ stage, homeGoals: 2, awayGoals: 1, goalDifference: 1 })),
    playerSkillStacks: {
      'home-def-1': { skillId: 'eagleShot', copies: 2 },
      'home-mid-1': null,
      'home-fw': { skillId: 'tornadoShot', copies: 3 },
    },
    skillInventory: {
      eagleShot: 2,
      tornadoShot: 1,
      powerTackle: 1,
      eulryongta: 0,
      vacuumCleaner: 2,
      rainbowReflect: 2,
    },
    pendingSkillOffer: null,
    pendingSkillAssignment: null,
    opponentSkillSets: createOpponentSkillSets(() => 0.2),
    status: 'active',
  };
}

test('migrates v5 rainbow reflect references to v6 without losing campaign progress', () => {
  const campaignSave = createCampaignSave(createCampaign(4));
  campaignSave.ownedTeamSkills.push({ skillId: 'rainbowReflect', level: 1 }, { skillId: 'tornadoShot', level: 2 });
  campaignSave.equippedTeamSkillIds = ['rainbowReflect', 'eagleShot', 'powerTackle'];
  campaignSave.pendingSkillOffer = ['rainbowReflect', 'tornadoShot'];
  campaignSave.opponentSkillSets = {
    1: [],
    2: ['rainbowReflect'],
    3: ['tornadoShot', 'rainbowReflect'],
    4: ['eagleShot', 'rainbowReflect', 'powerTackle'],
    5: ['vacuumCleaner', 'rainbowReflect', 'eulryongta'],
  };
  const storage = createMemoryStorage({ 'dex-pixel-football:v1': JSON.stringify({
    schemaVersion: 5,
    nickname: 'Dex',
    bestRecord: { nickname: 'Dex', stageReached: 4, goalDifference: 7, updatedAt: '2026-10-26T00:00:00.000Z' },
    teamCustomization: { logoId: 'apple', paletteId: 'rose-petal' },
    campaignSave,
  }) });

  const migrated = readProfile(storage);
  assert.equal(migrated.schemaVersion, 6);
  assert.equal(migrated.nickname, 'Dex');
  assert.deepEqual(migrated.bestRecord, { nickname: 'Dex', stageReached: 4, goalDifference: 7, updatedAt: '2026-10-26T00:00:00.000Z' });
  assert.deepEqual(migrated.teamCustomization, { logoId: 'apple', paletteId: 'rose-petal' });
  assert.equal(migrated.campaignSave.currentStage, 4);
  assert.deepEqual(migrated.campaignSave.clearedStageResults, campaignSave.clearedStageResults);
  assert.deepEqual(migrated.campaignSave.ownedTeamSkills, [
    { skillId: 'eagleShot', level: 2 }, { skillId: 'powerTackle', level: 1 }, { skillId: 'tornadoShot', level: 2 },
  ]);
  assert.deepEqual(migrated.campaignSave.equippedTeamSkillIds, ['eagleShot', 'powerTackle']);
  assert.deepEqual(migrated.campaignSave.pendingSkillOffer, ['tornadoShot']);
  assert.deepEqual(migrated.campaignSave.opponentSkillSets, {
    1: [], 2: [], 3: ['tornadoShot'], 4: ['eagleShot', 'powerTackle'], 5: ['vacuumCleaner', 'eulryongta'],
  });
  assert.deepEqual(readProfile(storage).campaignSave, migrated.campaignSave);
});

test('migrates valid v5 saves without rainbow reflect without changing campaign data', () => {
  const campaignSave = createCampaignSave(createCampaign(3));
  const storage = createMemoryStorage({ 'dex-pixel-football:v1': JSON.stringify({ schemaVersion: 5, nickname: 'Dex', campaignSave }) });
  assert.deepEqual(readProfile(storage).campaignSave, campaignSave);
});

test('creates a v6 empty profile and validates a trimmed nickname', () => {
  const empty = createEmptyProfile();
  assert.equal(empty.schemaVersion, 6);
  assert.equal(empty.nickname, '');
  assert.deepEqual(empty.teamCustomization, DEFAULT_TEAM_CUSTOMIZATION);
  assert.equal(setNickname(empty, '  Dex  ').nickname, 'Dex');
  assert.throws(() => setNickname(empty, ' '));
  assert.throws(() => setNickname(empty, 'x'));
  assert.throws(() => setNickname(empty, '12345678901234567'));
});

test('recovers from malformed or unsupported browser profile data', () => {
  const broken = createMemoryStorage({ 'dex-pixel-football:v1': '{bad json' });
  assert.deepEqual(readProfile(broken), createEmptyProfile());
  const old = createMemoryStorage({ 'dex-pixel-football:v1': JSON.stringify({ schemaVersion: 7, nickname: 'Dex' }) });
  assert.deepEqual(readProfile(old), createEmptyProfile());
});

test('round-trips an unlimited skill bag and ordered equipment without match fields', () => {
  const storage = createMemoryStorage();
  const campaign = createCampaign();
  campaign.ownedTeamSkills.push({ skillId: 'eulryongta', level: 1 }, { skillId: 'vacuumCleaner', level: 1 });
  campaign.equippedTeamSkillIds = ['powerTackle', 'eagleShot', 'vacuumCleaner'];
  const save = createCampaignSave(campaign);
  const profile = writeProfile({
    ...createEmptyProfile(), nickname: 'Dex', campaignSave: save,
    teamCustomization: { logoId: 'apple', paletteId: 'violet-ice' },
  }, storage);
  const loaded = readProfile(storage);
  assert.equal(loaded.nickname, 'Dex');
  assert.equal(profile.schemaVersion, 6);
  assert.equal(JSON.parse(storage.getItem('dex-pixel-football:v1')).schemaVersion, 6);
  assert.deepEqual(loaded.teamCustomization, { logoId: 'apple', paletteId: 'violet-ice' });
  assert.equal(loaded.campaignSave.currentStage, 2);
  assert.deepEqual(loaded.campaignSave.ownedTeamSkills, campaign.ownedTeamSkills);
  assert.deepEqual(loaded.campaignSave.equippedTeamSkillIds, campaign.equippedTeamSkillIds);
  assert.equal('playerSkillStacks' in loaded.campaignSave, false);
  assert.equal('skillInventory' in loaded.campaignSave, false);
  assert.equal('ball' in loaded.campaignSave, false);
  assert.ok(profile.campaignSave.savedAt);
  assert.equal(createCampaignSave(createCampaign(5)).currentStage, 5);
});

test('persists the starter team skill from a new campaign in the existing profile format', () => {
  const storage = createMemoryStorage();
  const campaign = createNewCampaign({ rng: () => 0.25 });

  writeProfile({
    ...createEmptyProfile(),
    nickname: 'Dex',
    campaignSave: createCampaignSave(campaign),
  }, storage);

  const restored = readProfile(storage).campaignSave;
  assert.deepEqual(restored.ownedTeamSkills, campaign.ownedTeamSkills);
  assert.deepEqual(restored.equippedTeamSkillIds, campaign.equippedTeamSkillIds);
  assert.equal(restored.currentStage, 1);
});

test('round-trips sorted replay results with gaps and rejects malformed result rows', () => {
  const storage = createMemoryStorage();
  const campaign = createCampaign(4);
  campaign.clearedStageResults = [
    { stage: 1, homeGoals: 2, awayGoals: 1, goalDifference: 1 },
    { stage: 3, homeGoals: 4, awayGoals: 2, goalDifference: 2 },
  ];
  const save = createCampaignSave(campaign);
  writeProfile({ ...createEmptyProfile(), nickname: 'Dex', campaignSave: save }, storage);
  assert.deepEqual(readProfile(storage).campaignSave.clearedStageResults, campaign.clearedStageResults);

  for (const clearedStageResults of [
    [campaign.clearedStageResults[0], campaign.clearedStageResults[0]],
    [...campaign.clearedStageResults].reverse(),
    [{ stage: 6, homeGoals: 1, awayGoals: 0, goalDifference: 1 }],
    [{ stage: 2, homeGoals: -1, awayGoals: 0, goalDifference: -1 }],
    [{ stage: 2, homeGoals: 2, awayGoals: 0, goalDifference: 0 }],
  ]) {
    const invalid = writeProfile({ ...createEmptyProfile(), nickname: 'Dex', campaignSave: { ...save, clearedStageResults } }, createMemoryStorage());
    assert.equal(invalid.campaignSave, null);
  }
});

test('rejects invalid inventory, equipment, and ineligible pending offer data', () => {
  const base = createCampaignSave(createCampaign());
  for (const ownedTeamSkills of [
    [{ skillId: 'eagleShot', level: 1 }, { skillId: 'eagleShot', level: 2 }],
    [{ skillId: 'rainbowReflect', level: 2 }],
    [{ skillId: 'unknownSkill', level: 1 }],
  ]) {
    const result = writeProfile({ ...createEmptyProfile(), nickname: 'Dex', campaignSave: { ...base, ownedTeamSkills } }, createMemoryStorage());
    assert.equal(result.campaignSave, null);
  }

  for (const equippedTeamSkillIds of [
    ['eagleShot', 'tornadoShot', 'powerTackle', 'eulryongta'],
    [base.equippedTeamSkillIds[0], base.equippedTeamSkillIds[0]],
    ['rainbowReflect'],
  ]) {
    const result = writeProfile({ ...createEmptyProfile(), nickname: 'Dex', campaignSave: { ...base, equippedTeamSkillIds } }, createMemoryStorage());
    assert.equal(result.campaignSave, null);
  }

  const ineligibleOffer = writeProfile({
    ...createEmptyProfile(), nickname: 'Dex',
    campaignSave: { ...base, ownedTeamSkills: [{ skillId: 'rainbowReflect', level: 1 }], equippedTeamSkillIds: ['rainbowReflect'], pendingSkillOffer: ['rainbowReflect'] },
  }, createMemoryStorage());
  assert.equal(ineligibleOffer.campaignSave, null);
});

test('v1 six-person loadouts migrate to unique shared team skills', () => {
  const legacy = {
    currentStage: 2,
    clearedStageResults: [{ stage: 1, homeGoals: 2, awayGoals: 1, goalDifference: 1 }],
    homeLoadout: { 'home-gk': 'rainbowReflect', 'home-def-1': 'eagleShot', 'home-fw': 'eagleShot' },
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
  assert.equal(profile.schemaVersion, 6);
  assert.deepEqual(profile.teamCustomization, DEFAULT_TEAM_CUSTOMIZATION);
  assert.equal(profile.nickname, 'Dex');
  assert.equal(profile.bestRecord.stageReached, 3);
  assert.equal(saved.currentStage, 2);
  assert.deepEqual(saved.clearedStageResults, legacy.clearedStageResults);
  assert.deepEqual(saved.ownedTeamSkills, [{ skillId: 'eagleShot', level: 2 }]);
  assert.deepEqual(saved.equippedTeamSkillIds, ['eagleShot']);
  assert.deepEqual(Object.values(saved.opponentSkillSets).map((skills) => skills.length), [0, 1, 2, 3, 3]);
});

test('v3 migration aggregates stacks then inventory, clamps levels, and preserves campaign and branding', () => {
  const legacyCampaign = legacyV3Campaign();
  const bestRecord = { nickname: 'Dex', stageReached: 4, goalDifference: 7, updatedAt: '2026-10-22T00:00:00.000Z' };
  const storage = createMemoryStorage({ 'dex-pixel-football:v1': JSON.stringify({
    schemaVersion: 3,
    nickname: 'Dex',
    campaignSave: legacyCampaign,
    bestRecord,
    teamCustomization: { logoId: 'apple', paletteId: 'rose-petal' },
  }) });
  const migrated = readProfile(storage);
  assert.equal(migrated.schemaVersion, 6);
  assert.deepEqual(migrated.campaignSave.ownedTeamSkills, [
    { skillId: 'eagleShot', level: 3 },
    { skillId: 'tornadoShot', level: 3 },
    { skillId: 'powerTackle', level: 1 },
    { skillId: 'vacuumCleaner', level: 1 },
  ]);
  assert.deepEqual(migrated.campaignSave.equippedTeamSkillIds, ['eagleShot', 'tornadoShot', 'powerTackle']);
  assert.equal(migrated.campaignSave.currentStage, legacyCampaign.currentStage);
  assert.deepEqual(migrated.campaignSave.clearedStageResults, legacyCampaign.clearedStageResults);
  assert.deepEqual(migrated.campaignSave.opponentSkillSets, legacyCampaign.opponentSkillSets);
  assert.deepEqual(migrated.teamCustomization, { logoId: 'apple', paletteId: 'rose-petal' });
  assert.deepEqual(migrated.bestRecord, bestRecord);
});

test('v3 migration filters pending offers against new ownership and upgrade rules', () => {
  const legacyCampaign = legacyV3Campaign(3);
  legacyCampaign.pendingSkillOffer = ['eagleShot', 'powerTackle', 'eulryongta', 'vacuumCleaner'];
  const storage = createMemoryStorage({ 'dex-pixel-football:v1': JSON.stringify({
    schemaVersion: 3, nickname: 'Dex', campaignSave: legacyCampaign,
  }) });
  assert.deepEqual(readProfile(storage).campaignSave.pendingSkillOffer, ['powerTackle', 'eulryongta']);
});

test('v2 campaigns migrate and v3 branding is repaired without losing campaign data', () => {
  const legacyCampaign = legacyV3Campaign(3);
  const bestRecord = { nickname: 'Dex', stageReached: 4, goalDifference: 7, updatedAt: '2026-10-22T00:00:00.000Z' };
  const storage = createMemoryStorage({ 'dex-pixel-football:v1': JSON.stringify({
    schemaVersion: 2, nickname: 'Dex', campaignSave: legacyCampaign, bestRecord,
  }) });
  const migrated = readProfile(storage);
  assert.equal(migrated.schemaVersion, 6);
  assert.deepEqual(migrated.teamCustomization, DEFAULT_TEAM_CUSTOMIZATION);
  assert.deepEqual(migrated.campaignSave.ownedTeamSkills[0], { skillId: 'eagleShot', level: 3 });
  assert.deepEqual(migrated.bestRecord, bestRecord);

  storage.setItem('dex-pixel-football:v1', JSON.stringify({
    schemaVersion: 3, nickname: 'Dex', campaignSave: legacyCampaign, bestRecord,
    teamCustomization: { logoId: 'not-a-logo', paletteId: 'not-a-palette' },
  }));
  const repaired = readProfile(storage);
  assert.deepEqual(repaired.teamCustomization, DEFAULT_TEAM_CUSTOMIZATION);
  assert.equal(repaired.campaignSave.currentStage, legacyCampaign.currentStage);
  assert.deepEqual(repaired.bestRecord, bestRecord);
});

test('migrates an old pending assignment into owned skills without a placement step', () => {
  const legacyCampaign = legacyV3Campaign(2);
  legacyCampaign.pendingSkillAssignment = 'powerTackle';
  legacyCampaign.pendingSkillOffer = ['powerTackle', 'eagleShot', 'tornadoShot'];
  const storage = createMemoryStorage({ 'dex-pixel-football:v1': JSON.stringify({
    schemaVersion: 3, nickname: 'Dex', campaignSave: legacyCampaign,
  }) });
  const saved = readProfile(storage).campaignSave;
  assert.ok(saved.ownedTeamSkills.some(({ skillId }) => skillId === 'powerTackle'));
  assert.deepEqual(saved.equippedTeamSkillIds, ['eagleShot', 'tornadoShot', 'powerTackle']);
  assert.equal('pendingSkillPlacement' in saved, false);
  assert.equal(saved.pendingSkillOffer, null);
});

test('persists bag ownership and equipped order without legacy placement fields', () => {
  const campaign = createCampaign(2);
  campaign.ownedTeamSkills.push({ skillId: 'eulryongta', level: 1 });
  campaign.equippedTeamSkillIds = ['powerTackle', 'eagleShot', 'eulryongta'];
  const storage = createMemoryStorage();
  const save = createCampaignSave(campaign);
  writeProfile({ ...createEmptyProfile(), nickname: 'Dex', campaignSave: save }, storage);
  const loaded = readProfile(storage).campaignSave;
  assert.deepEqual(loaded.ownedTeamSkills, campaign.ownedTeamSkills);
  assert.deepEqual(loaded.equippedTeamSkillIds, campaign.equippedTeamSkillIds);
  assert.equal('teamSkillDeck' in loaded, false);
  assert.equal('pendingSkillPlacement' in loaded, false);
  assert.equal(loaded.pendingSkillOffer, null);
});

test('v4 migration keeps the full skill bag and equips the first three in deck order', () => {
  const legacySave = createCampaignSave(createNewCampaign({ rng: () => 0.25 }));
  delete legacySave.ownedTeamSkills;
  delete legacySave.equippedTeamSkillIds;
  legacySave.teamSkillDeck = [
    { skillId: 'eagleShot', level: 2 },
    { skillId: 'tornadoShot', level: 1 },
    { skillId: 'powerTackle', level: 3 },
    { skillId: 'eulryongta', level: 1 },
  ];
  const storage = createMemoryStorage({ 'dex-pixel-football:v1': JSON.stringify({
    schemaVersion: 4,
    nickname: 'Dex',
    campaignSave: legacySave,
    teamCustomization: { logoId: 'google', paletteId: 'rose-petal' },
  }) });

  const migrated = readProfile(storage);
  assert.equal(migrated.schemaVersion, 6);
  assert.deepEqual(migrated.campaignSave.ownedTeamSkills, legacySave.teamSkillDeck);
  assert.deepEqual(migrated.campaignSave.equippedTeamSkillIds, ['eagleShot', 'tornadoShot', 'powerTackle']);
  assert.deepEqual(migrated.teamCustomization, { logoId: 'google', paletteId: 'rose-petal' });
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
