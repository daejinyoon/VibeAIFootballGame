import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialGameState } from './createInitialGameState.js';
import { assignOpponentSkills, createCampaign, createOpponentSkillSets, finishStage, getUnlockedStage } from './campaign.js';
import {
  SKILL_IDS,
  SKILL_MAX_LEVELS,
  awardSkillCard,
  placeTeamSkill,
  reorderTeamSkill,
} from './skills.js';

test('starts campaigns with an empty shared team deck', () => {
  const campaign = createCampaign({ rng: () => 0.25 });
  assert.equal(campaign.currentStage, 1);
  assert.equal(getUnlockedStage(campaign), 1);
  assert.deepEqual(campaign.teamSkillDeck, []);
  assert.equal(campaign.pendingSkillOffer, null);
  assert.equal(campaign.pendingSkillPlacement, null);
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
  campaign.teamSkillDeck = [{ skillId: 'eagleShot', level: 2 }];
  const lost = finishStage(campaign, { homeGoals: 1, awayGoals: 2 }, () => 0.2);
  assert.equal(lost.currentStage, 1);
  assert.equal(lost.status, 'active');
  assert.deepEqual(lost.clearedStageResults, []);
  assert.deepEqual(lost.teamSkillDeck, campaign.teamSkillDeck);
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
    teamSkillDeck: [{ skillId: 'eagleShot', level: 2 }],
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
  assert.deepEqual(replayed.teamSkillDeck, campaign.teamSkillDeck);
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

test('new reward skills enter the ordered team deck and can be placed at any position', () => {
  let campaign = createCampaign({ rng: () => 0.3 });
  campaign = finishStage(campaign, { homeGoals: 1, awayGoals: 0 }, () => 0.4);
  const skillId = campaign.pendingSkillOffer[0];
  const awarded = awardSkillCard(campaign, skillId);
  assert.equal(awarded.ok, true);
  campaign = awarded.campaign;
  assert.deepEqual(campaign.teamSkillDeck, [{ skillId, level: 1 }]);
  assert.equal(campaign.pendingSkillPlacement, skillId);
  assert.equal(campaign.pendingSkillOffer, null);

  const placed = placeTeamSkill(campaign, skillId, 0);
  assert.equal(placed.ok, true);
  assert.equal(placed.campaign.pendingSkillPlacement, null);
  assert.deepEqual(placed.campaign.teamSkillDeck, [{ skillId, level: 1 }]);

  const pendingPlacement = { ...campaign, pendingSkillPlacement: skillId };
  assert.deepEqual(placeTeamSkill(pendingPlacement, skillId, -1), { ok: false, reason: 'invalidPosition' });
  assert.deepEqual(placeTeamSkill(pendingPlacement, skillId, 2), { ok: false, reason: 'invalidPosition' });
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
  campaign.teamSkillDeck = [
    { skillId: 'tornadoShot', level: 1 },
    { skillId: 'eagleShot', level: 1 },
  ];
  campaign.pendingSkillOffer = ['eagleShot'];
  let awarded = awardSkillCard(campaign, 'eagleShot');
  assert.equal(awarded.ok, true);
  assert.equal(awarded.upgradedLevel, 2);
  campaign = awarded.campaign;
  assert.deepEqual(campaign.teamSkillDeck, [
    { skillId: 'tornadoShot', level: 1 },
    { skillId: 'eagleShot', level: 2 },
  ]);
  assert.equal(campaign.pendingSkillPlacement, null);

  campaign.pendingSkillOffer = ['eagleShot'];
  campaign = awardSkillCard(campaign, 'eagleShot').campaign;
  assert.equal(campaign.teamSkillDeck[1].level, 3);
  campaign.pendingSkillOffer = ['eagleShot'];
  assert.deepEqual(awardSkillCard(campaign, 'eagleShot'), { ok: false, reason: 'maxLevel' });
  assert.equal(SKILL_MAX_LEVELS.vacuumCleaner, 1);
});

test('offers exclude owned non-upgradeable and max-level skills and stop when exhausted', () => {
  const campaign = createCampaign();
  campaign.teamSkillDeck = SKILL_IDS.map((skillId) => ({ skillId, level: SKILL_MAX_LEVELS[skillId] }));
  const won = finishStage(campaign, { homeGoals: 1, awayGoals: 0 });
  assert.equal(won.pendingSkillOffer, null);
});

test('reorders team skills without changing levels and rejects invalid positions', () => {
  const campaign = createCampaign();
  campaign.teamSkillDeck = [
    { skillId: 'eagleShot', level: 2 },
    { skillId: 'powerTackle', level: 1 },
  ];
  const moved = reorderTeamSkill(campaign, 0, 1);
  assert.deepEqual(moved.campaign.teamSkillDeck, [
    { skillId: 'powerTackle', level: 1 },
    { skillId: 'eagleShot', level: 2 },
  ]);
  assert.deepEqual(reorderTeamSkill(campaign, -1, 0), { ok: false, reason: 'invalidPosition' });
  assert.deepEqual(placeTeamSkill({ ...campaign, pendingSkillPlacement: null }, 'eagleShot', 0), {
    ok: false, reason: 'placementNotPending',
  });
});

test('assigns opponent skills only to the three away field players', () => {
  const initial = createInitialGameState();
  const assigned = assignOpponentSkills(initial.players, ['eagleShot', 'tornadoShot', 'eulryongta']);
  const away = assigned.filter((player) => player.team === 'away');
  assert.deepEqual(away.filter((player) => player.role !== 'goalkeeper').map((player) => player.skillId), ['eagleShot', 'tornadoShot', 'eulryongta']);
  assert.equal(away.find((player) => player.role === 'goalkeeper').skillId, null);
  assert.throws(() => assignOpponentSkills(initial.players, ['eagleShot', 'eagleShot']));
});
