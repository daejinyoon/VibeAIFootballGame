import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialGameState } from './createInitialGameState.js';
import { assignOpponentSkills, createCampaign, createOpponentSkillSets, finishStage, HOME_PLAYER_IDS } from './campaign.js';
import { SKILL_IDS } from './skills.js';

const loadout = Object.fromEntries(HOME_PLAYER_IDS.map((id, index) => [id, SKILL_IDS[index]]));

test('creates the requested opponent skill counts without duplicates', () => {
  const sets = createOpponentSkillSets(() => 0.25);

  assert.equal(sets[1].length, 3);
  assert.equal(sets[2].length, 4);
  assert.equal(sets[3].length, 6);
  for (const skills of Object.values(sets)) {
    assert.equal(new Set(skills).size, skills.length);
    assert.ok(skills.every((skillId) => SKILL_IDS.includes(skillId)));
  }
  assert.deepEqual(new Set(sets[3]), new Set(SKILL_IDS));
});

test('uses injected randomness and rejects an invalid home loadout', () => {
  const first = createCampaign({ rng: () => 0, homeLoadout: loadout });
  const second = createCampaign({ rng: () => 0.5, homeLoadout: loadout });
  assert.notDeepEqual(first.opponentSkillSets[1], second.opponentSkillSets[1]);
  assert.throws(() => createCampaign({ homeLoadout: {} }), /스킬을 하나씩 배정/);
});

test('a lost stage can be retried without clearing results or changing opponent skills', () => {
  const campaign = createCampaign({ rng: () => 0.4, homeLoadout: loadout });
  const lost = finishStage(campaign, { homeGoals: 1, awayGoals: 2 });

  assert.equal(lost.currentStage, 1);
  assert.equal(lost.status, 'active');
  assert.deepEqual(lost.clearedStageResults, []);
  assert.deepEqual(lost.opponentSkillSets, campaign.opponentSkillSets);
});

test('wins advance stages and boss victory completes the campaign', () => {
  let campaign = createCampaign({ rng: () => 0.2, homeLoadout: loadout });
  campaign = finishStage(campaign, { homeGoals: 2, awayGoals: 1 });
  assert.equal(campaign.currentStage, 2);
  assert.equal(campaign.clearedStageResults[0].goalDifference, 1);

  campaign = finishStage(campaign, { homeGoals: 3, awayGoals: 2 });
  assert.equal(campaign.currentStage, 3);
  assert.equal(campaign.clearedStageResults.length, 2);

  campaign = finishStage(campaign, { homeGoals: 1, awayGoals: 0 });
  assert.equal(campaign.currentStage, 3);
  assert.equal(campaign.status, 'complete');
  assert.equal(campaign.clearedStageResults.length, 3);
});

test('does not accept a tied stage result before golden goal ends it', () => {
  const campaign = createCampaign({ rng: () => 0.1, homeLoadout: loadout });
  assert.throws(() => finishStage(campaign, { homeGoals: 1, awayGoals: 1 }), /골든골/);
});

test('assigns each stage skill to one away player and leaves the home side intact', () => {
  const initial = createInitialGameState({ loadout, opponentSkillIds: [] });
  const assigned = assignOpponentSkills(initial.players, ['eagleShot', 'tornadoShot', 'eulryongta']);
  const away = assigned.filter((player) => player.team === 'away');
  const home = assigned.filter((player) => player.team === 'home');

  assert.deepEqual(away.slice(0, 3).map((player) => player.skillId), ['eagleShot', 'tornadoShot', 'eulryongta']);
  assert.ok(away.slice(3).every((player) => player.skillId === null));
  assert.deepEqual(home.map((player) => player.skillId), SKILL_IDS);
  assert.throws(() => assignOpponentSkills(initial.players, ['eagleShot', 'eagleShot']), /중복 없이/);
});
