import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialGameState } from './createInitialGameState.js';
import { assignOpponentSkills, createCampaign, createOpponentSkillSets, finishStage, getUnlockedStage } from './campaign.js';
import {
  SKILL_IDS,
  SKILL_MAX_LEVELS,
  awardSkillCard,
  equipTeamSkill,
  unequipTeamSkill,
  reorderTeamSkill,
} from './skills.js';

test('starts campaigns with one random active skill in the shared team deck', () => {
  const campaign = createCampaign({ rng: () => 0.25 });
  const otherCampaign = createCampaign({ rng: () => 0.5 });
  assert.equal(campaign.currentStage, 1);
  assert.equal(getUnlockedStage(campaign), 1);
  assert.equal(campaign.ownedTeamSkills.length, 1);
  assert.ok(SKILL_IDS.includes(campaign.ownedTeamSkills[0].skillId));
  assert.equal(campaign.ownedTeamSkills[0].level, 1);
  assert.deepEqual(campaign.equippedTeamSkillIds, [campaign.ownedTeamSkills[0].skillId]);
  assert.notEqual(campaign.ownedTeamSkills[0].skillId, otherCampaign.ownedTeamSkills[0].skillId);
  assert.deepEqual(campaign.opponentSkillSets[1], []);
  assert.equal(campaign.pendingSkillOffer, null);
});

test('clamps invalid starter random values to a valid active skill', () => {
  for (const rng of [() => -1, () => 1, () => Number.NaN]) {
    const campaign = createCampaign({ rng });
    assert.equal(campaign.ownedTeamSkills.length, 1);
    assert.ok(SKILL_IDS.includes(campaign.ownedTeamSkills[0].skillId));
  }
});

test('creates opponent skill sets for all five stages without duplicates', () => {
  const sets = createOpponentSkillSets(() => 0.25);
  assert.deepEqual(Object.keys(sets), ['1', '2', '3', '4', '5']);
  assert.deepEqual(Object.values(sets).map((skills) => skills.length), [0, 1, 2, 3, 3]);
  for (const skills of Object.values(sets)) {
    assert.equal(new Set(skills).size, skills.length);
    assert.ok(skills.every((skillId) => SKILL_IDS.includes(skillId)));
  }
});

test('a lost stage retains the shared team deck and can be retried', () => {
  const campaign = createCampaign({ rng: () => 0.4 });
  campaign.ownedTeamSkills = [{ skillId: 'eagleShot', level: 2 }];
  campaign.equippedTeamSkillIds = ['eagleShot'];
  const lost = finishStage(campaign, { homeGoals: 1, awayGoals: 2 }, () => 0.2);
  assert.equal(lost.currentStage, 1);
  assert.equal(lost.status, 'active');
  assert.deepEqual(lost.clearedStageResults, []);
  assert.deepEqual(lost.ownedTeamSkills, campaign.ownedTeamSkills);
  assert.deepEqual(lost.equippedTeamSkillIds, campaign.equippedTeamSkillIds);
  assert.equal(lost.pendingSkillOffer, null);
});

test('losing the final boss stage keeps the campaign on stage five for a retry', () => {
  const campaign = {
    ...createCampaign({ rng: () => 0.4 }),
    currentStage: 5,
    clearedStageResults: [1, 2, 3, 4].map((stage) => ({ stage, homeGoals: 1, awayGoals: 0, goalDifference: 1 })),
  };

  const lost = finishStage(campaign, { homeGoals: 0, awayGoals: 1 });

  assert.equal(lost.currentStage, 5);
  assert.equal(lost.status, 'active');
  assert.equal(lost.clearedStageResults.length, 4);
  assert.deepEqual(lost.pendingSkillOffer, null);
});

test('stage wins advance through stage five and create three unique card choices', () => {
  let campaign = createCampaign({ rng: () => 0.2 });
  for (let stage = 1; stage <= 5; stage += 1) {
    campaign = finishStage(campaign, { homeGoals: stage + 1, awayGoals: stage }, () => stage / 10);
    assert.equal(campaign.clearedStageResults.at(-1).stage, stage);
    assert.equal(campaign.currentStage, Math.min(stage + 1, 5));
    assert.equal(campaign.status, stage === 5 ? 'complete' : 'active');
    assert.equal(campaign.pendingSkillOffer.length, 3);
    assert.equal(new Set(campaign.pendingSkillOffer).size, 3);
  }
  assert.equal(campaign.clearedStageResults.length, 5);
});

test('a match-win event score envelope advances the campaign stage', () => {
  const campaign = createCampaign({ rng: () => 0.2 });
  const terminalEvent = { type: 'matchWon', score: { home: 2, away: 1 } };

  const advanced = finishStage(campaign, { score: terminalEvent.score }, () => 0.3);

  assert.equal(advanced.currentStage, 2);
  assert.deepEqual(advanced.clearedStageResults[0], {
    stage: 1, homeGoals: 2, awayGoals: 1, goalDifference: 1,
  });
  assert.equal(advanced.pendingSkillOffer.length, 3);
});

test('winning a replay replaces its stage record and offers eligible team skills', () => {
  let campaign = createCampaign({ rng: () => 0.2 });
  for (let stage = 1; stage <= 3; stage += 1) {
    campaign = finishStage(campaign, { homeGoals: stage + 1, awayGoals: stage }, () => stage / 10);
  }
  campaign = {
    ...campaign,
    currentStage: 2,
    ownedTeamSkills: [{ skillId: 'eagleShot', level: 2 }],
    equippedTeamSkillIds: ['eagleShot'],
    pendingSkillOffer: ['eagleShot', 'tornadoShot', 'powerTackle'],
  };

  const replayed = finishStage(campaign, { homeGoals: 4, awayGoals: 1 }, () => 0.45);

  assert.deepEqual(replayed.clearedStageResults, [
    { stage: 1, homeGoals: 2, awayGoals: 1, goalDifference: 1 },
    { stage: 2, homeGoals: 4, awayGoals: 1, goalDifference: 3 },
    { stage: 3, homeGoals: 4, awayGoals: 3, goalDifference: 1 },
  ]);
  assert.equal(replayed.currentStage, 3);
  assert.equal(getUnlockedStage(replayed), 4);
  assert.equal(replayed.status, 'active');
  assert.equal(replayed.pendingSkillOffer.length, 3);
  assert.notDeepEqual(replayed.pendingSkillOffer, campaign.pendingSkillOffer);
  assert.deepEqual(replayed.ownedTeamSkills, campaign.ownedTeamSkills);
  assert.deepEqual(replayed.equippedTeamSkillIds, campaign.equippedTeamSkillIds);
  assert.deepEqual(replayed.opponentSkillSets, campaign.opponentSkillSets);
});

test('stage five remains unlocked after replaying an earlier cleared stage', () => {
  const campaign = {
    ...createCampaign({ rng: () => 0.2 }),
    currentStage: 3,
    clearedStageResults: [1, 2, 3, 4, 5].map((stage) => ({ stage, homeGoals: 2, awayGoals: 1, goalDifference: 1 })),
    status: 'active',
  };

  const replayed = finishStage({ ...campaign, currentStage: 2 }, { homeGoals: 3, awayGoals: 0 }, () => 0.6);

  assert.equal(getUnlockedStage(replayed), 5);
  assert.equal(replayed.currentStage, 3);
  assert.equal(replayed.status, 'active');
  assert.deepEqual(replayed.clearedStageResults.map(({ stage }) => stage), [1, 2, 3, 4, 5]);
});

test('a tied stage result leaves campaign progression and rewards unchanged', () => {
  const campaign = createCampaign({ rng: () => 0.1 });
  const drawn = finishStage(campaign, { homeGoals: 1, awayGoals: 1 });
  assert.notEqual(drawn, campaign);
  assert.deepEqual(drawn, campaign);
});

test('new reward skills enter the bag and can be equipped at any position', () => {
  let campaign = createCampaign({ rng: () => 0.3 });
  campaign.ownedTeamSkills = [];
  campaign.equippedTeamSkillIds = [];
  campaign = finishStage(campaign, { homeGoals: 1, awayGoals: 0 }, () => 0.4);
  const skillId = campaign.pendingSkillOffer[0];
  const awarded = awardSkillCard(campaign, skillId);
  assert.equal(awarded.ok, true);
  campaign = awarded.campaign;
  assert.deepEqual(campaign.ownedTeamSkills, [{ skillId, level: 1 }]);
  assert.deepEqual(campaign.equippedTeamSkillIds, [], 'the campaign model leaves auto-equip to App orchestration');
  assert.equal(campaign.pendingSkillOffer, null);

  const equipped = equipTeamSkill(campaign, skillId, 0);
  assert.equal(equipped.ok, true);
  assert.deepEqual(equipped.campaign.equippedTeamSkillIds, [skillId]);
  assert.deepEqual(equipTeamSkill(campaign, skillId, -1), { ok: false, reason: 'invalidPosition' });
  assert.deepEqual(equipTeamSkill(campaign, skillId, 2), { ok: false, reason: 'invalidPosition' });
  assert.deepEqual(unequipTeamSkill(equipped.campaign, skillId).campaign.equippedTeamSkillIds, []);
});

test('a fourth owned skill stays in the bag when all three match slots are occupied', () => {
  const campaign = createCampaign();
  campaign.ownedTeamSkills = SKILL_IDS.slice(0, 4).map((skillId) => ({ skillId, level: 1 }));
  campaign.equippedTeamSkillIds = SKILL_IDS.slice(0, 3);
  const before = structuredClone(campaign);
  assert.deepEqual(equipTeamSkill(campaign, SKILL_IDS[3]), { ok: false, reason: 'equipmentFull' });
  assert.deepEqual(campaign, before);
});

test('rejects a skill that was not offered without changing the campaign', () => {
  const campaign = {
    ...createCampaign(),
    pendingSkillOffer: ['eagleShot'],
  };
  const before = structuredClone(campaign);
  assert.deepEqual(awardSkillCard(campaign, 'tornadoShot'), { ok: false, reason: 'notOffered' });
  assert.deepEqual(campaign, before);
});

test('duplicate rewards upgrade in place up to the skill max level', () => {
  let campaign = createCampaign();
  campaign.ownedTeamSkills = [
    { skillId: 'tornadoShot', level: 1 },
    { skillId: 'eagleShot', level: 1 },
  ];
  campaign.equippedTeamSkillIds = ['tornadoShot'];
  const equippedBeforeUpgrade = [...campaign.equippedTeamSkillIds];
  campaign.pendingSkillOffer = ['eagleShot'];
  let awarded = awardSkillCard(campaign, 'eagleShot');
  assert.equal(awarded.ok, true);
  assert.equal(awarded.upgradedLevel, 2);
  campaign = awarded.campaign;
  assert.deepEqual(campaign.ownedTeamSkills, [
    { skillId: 'tornadoShot', level: 1 },
    { skillId: 'eagleShot', level: 2 },
  ]);
  assert.deepEqual(campaign.equippedTeamSkillIds, equippedBeforeUpgrade,
    'upgrading an unequipped skill does not add it to the loadout');

  campaign.pendingSkillOffer = ['eagleShot'];
  campaign = awardSkillCard(campaign, 'eagleShot').campaign;
  assert.equal(campaign.ownedTeamSkills[1].level, 3);
  campaign.pendingSkillOffer = ['eagleShot'];
  assert.deepEqual(awardSkillCard(campaign, 'eagleShot'), { ok: false, reason: 'maxLevel' });
  assert.equal(SKILL_MAX_LEVELS.vacuumCleaner, 1);
});

test('offers exclude owned non-upgradeable and max-level skills and stop when exhausted', () => {
  const campaign = createCampaign();
  campaign.ownedTeamSkills = SKILL_IDS.map((skillId) => ({ skillId, level: SKILL_MAX_LEVELS[skillId] }));
  campaign.equippedTeamSkillIds = SKILL_IDS.slice(0, 3);
  const won = finishStage(campaign, { homeGoals: 1, awayGoals: 0 });
  assert.equal(won.pendingSkillOffer, null);
});

test('reorders team skills without changing levels and rejects invalid positions', () => {
  const campaign = createCampaign();
  campaign.ownedTeamSkills = [
    { skillId: 'eagleShot', level: 2 },
    { skillId: 'powerTackle', level: 1 },
  ];
  campaign.equippedTeamSkillIds = ['eagleShot', 'powerTackle'];
  const moved = reorderTeamSkill(campaign, 0, 1);
  assert.deepEqual(moved.campaign.equippedTeamSkillIds, ['powerTackle', 'eagleShot']);
  assert.deepEqual(reorderTeamSkill(campaign, -1, 0), { ok: false, reason: 'invalidPosition' });
  assert.equal(equipTeamSkill(campaign, 'invalidSkill').ok, false);
});

test('assigns opponent skills only to the three away field players', () => {
  const initial = createInitialGameState();
  const assigned = assignOpponentSkills(initial.players, ['eagleShot', 'tornadoShot', 'eulryongta']);
  const away = assigned.filter((player) => player.team === 'away');
  assert.deepEqual(away.filter((player) => player.role !== 'goalkeeper').map((player) => player.skillId), ['eagleShot', 'tornadoShot', 'eulryongta']);
  assert.equal(away.find((player) => player.role === 'goalkeeper').skillId, null);
  assert.throws(() => assignOpponentSkills(initial.players, ['eagleShot', 'eagleShot']));
});
