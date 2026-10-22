import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialGameState } from './createInitialGameState.js';
import { assignOpponentSkills, createCampaign, createOpponentSkillSets, finishStage } from './campaign.js';
import { SKILL_IDS, assignSkillCard, awardSkillCard } from './skills.js';

test('starts campaigns with no equipped skills and an empty inventory', () => {
  const campaign = createCampaign({ rng: () => 0.25 });
  assert.deepEqual(campaign.playerSkillStacks, {
    'home-def-1': null,
    'home-mid-1': null,
    'home-fw': null,
  });
  assert.ok(SKILL_IDS.every((skillId) => campaign.skillInventory[skillId] === 0));
  assert.equal(campaign.pendingSkillOffer, null);
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

test('a lost stage retains stacks and inventory and can be retried', () => {
  const campaign = createCampaign({ rng: () => 0.4 });
  const lost = finishStage(campaign, { homeGoals: 1, awayGoals: 2 }, () => 0.2);
  assert.equal(lost.currentStage, 1);
  assert.equal(lost.status, 'active');
  assert.deepEqual(lost.clearedStageResults, []);
  assert.deepEqual(lost.playerSkillStacks, campaign.playerSkillStacks);
  assert.deepEqual(lost.skillInventory, campaign.skillInventory);
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

test('a tied stage result leaves campaign progression and rewards unchanged', () => {
  const campaign = createCampaign({ rng: () => 0.1 });
  const drawn = finishStage(campaign, { homeGoals: 1, awayGoals: 1 });
  assert.notEqual(drawn, campaign);
  assert.deepEqual(drawn, campaign);
});

test('drafted cards enter inventory and can be stacked on one field player up to three copies', () => {
  let campaign = createCampaign({ rng: () => 0.3 });
  campaign = finishStage(campaign, { homeGoals: 1, awayGoals: 0 }, () => 0.4);
  const skillId = campaign.pendingSkillOffer[0];
  const awarded = awardSkillCard(campaign, skillId);
  assert.equal(awarded.ok, true);
  campaign = awarded.campaign;
  assert.equal(campaign.skillInventory[skillId], 1);
  assert.equal(campaign.pendingSkillOffer, null);

  for (let copies = 1; copies <= 3; copies += 1) {
    if (copies > 1) {
      campaign.pendingSkillOffer = [skillId, ...SKILL_IDS.filter((id) => id !== skillId).slice(0, 2)];
      campaign = awardSkillCard(campaign, skillId).campaign;
    }
    const assigned = assignSkillCard(campaign, 'home-fw', skillId);
    assert.equal(assigned.ok, true);
    campaign = assigned.campaign;
    assert.equal(campaign.playerSkillStacks['home-fw'].copies, copies);
    assert.equal(campaign.skillInventory[skillId], 0);
  }
  campaign.skillInventory[skillId] = 1;
  const maxed = assignSkillCard(campaign, 'home-fw', skillId);
  assert.deepEqual(maxed, { ok: false, reason: 'maxCopies' });
  assert.equal(campaign.skillInventory[skillId], 1);
});

test('replacing a player skill returns all old copies to inventory and never allows goalkeeper assignment', () => {
  let campaign = createCampaign({ rng: () => 0.1 });
  const first = campaign.pendingSkillOffer = ['eagleShot', 'tornadoShot', 'powerTackle'];
  campaign = awardSkillCard(campaign, first[0]).campaign;
  campaign = assignSkillCard(campaign, 'home-def-1', first[0]).campaign;
  campaign.skillInventory.eagleShot = 2;
  campaign.pendingSkillOffer = ['tornadoShot', 'eagleShot', 'powerTackle'];
  campaign = awardSkillCard(campaign, 'tornadoShot').campaign;
  campaign = assignSkillCard(campaign, 'home-def-1', 'tornadoShot').campaign;

  assert.deepEqual(campaign.playerSkillStacks['home-def-1'], { skillId: 'tornadoShot', copies: 1 });
  assert.equal(campaign.skillInventory.eagleShot, 3);
  assert.deepEqual(assignSkillCard(campaign, 'home-gk', 'tornadoShot'), { ok: false, reason: 'notFieldPlayer' });
});

test('assigns opponent skills only to the three away field players', () => {
  const initial = createInitialGameState();
  const assigned = assignOpponentSkills(initial.players, ['eagleShot', 'tornadoShot', 'eulryongta']);
  const away = assigned.filter((player) => player.team === 'away');
  assert.deepEqual(away.filter((player) => player.role !== 'goalkeeper').map((player) => player.skillId), ['eagleShot', 'tornadoShot', 'eulryongta']);
  assert.equal(away.find((player) => player.role === 'goalkeeper').skillId, null);
  assert.throws(() => assignOpponentSkills(initial.players, ['eagleShot', 'eagleShot']));
});
