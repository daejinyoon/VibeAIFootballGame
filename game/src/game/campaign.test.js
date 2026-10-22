import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialGameState } from './createInitialGameState.js';
import { assignOpponentSkills, createCampaign, createOpponentSkillSets, finishStage, HOME_PLAYER_IDS } from './campaign.js';
import { SKILL_IDS } from './skills.js';

const loadout = Object.fromEntries(HOME_PLAYER_IDS.map((id, index) => [id, SKILL_IDS[index]]));

test('creates opponent skill sets for all five stages with no goalkeeper skills', () => {
  const sets = createOpponentSkillSets(() => 0.25);
  assert.deepEqual(Object.keys(sets), ['1', '2', '3', '4', '5']);
  assert.deepEqual(Object.values(sets).map((skills) => skills.length), [0, 1, 2, 3, 3]);
  for (const skills of Object.values(sets)) {
    assert.equal(new Set(skills).size, skills.length);
    assert.ok(skills.every((skillId) => SKILL_IDS.includes(skillId)));
  }
});

test('uses injected randomness and rejects an invalid home loadout', () => {
  const first = createCampaign({ rng: () => 0, homeLoadout: loadout });
  const second = createCampaign({ rng: () => 0.5, homeLoadout: loadout });
  assert.notDeepEqual(first.opponentSkillSets[2], second.opponentSkillSets[2]);
  assert.throws(() => createCampaign({ homeLoadout: {} }));
});

test('a lost stage can be retried without clearing results or changing opponent skills', () => {
  const campaign = createCampaign({ rng: () => 0.4, homeLoadout: loadout });
  const lost = finishStage(campaign, { homeGoals: 1, awayGoals: 2 });
  assert.equal(lost.currentStage, 1);
  assert.equal(lost.status, 'active');
  assert.deepEqual(lost.clearedStageResults, []);
  assert.deepEqual(lost.opponentSkillSets, campaign.opponentSkillSets);
});

test('wins advance through stage five and the final victory completes the campaign', () => {
  let campaign = createCampaign({ rng: () => 0.2, homeLoadout: loadout });
  for (let stage = 1; stage <= 5; stage += 1) {
    campaign = finishStage(campaign, { homeGoals: stage + 1, awayGoals: stage });
    assert.equal(campaign.clearedStageResults.at(-1).stage, stage);
    assert.equal(campaign.currentStage, Math.min(stage + 1, 5));
    assert.equal(campaign.status, stage === 5 ? 'complete' : 'active');
  }
  assert.equal(campaign.clearedStageResults.length, 5);
});

test('does not accept a tied stage result before golden goal ends it', () => {
  const campaign = createCampaign({ rng: () => 0.1, homeLoadout: loadout });
  assert.throws(() => finishStage(campaign, { homeGoals: 1, awayGoals: 1 }));
});

test('assigns skills only to the three away field players and keeps the goalkeeper unskilled', () => {
  const initial = createInitialGameState({ loadout, opponentSkillIds: [] });
  const assigned = assignOpponentSkills(initial.players, ['eagleShot', 'tornadoShot', 'eulryongta']);
  const away = assigned.filter((player) => player.team === 'away');
  const home = assigned.filter((player) => player.team === 'home');
  assert.deepEqual(away.filter((player) => player.role !== 'goalkeeper').map((player) => player.skillId), ['eagleShot', 'tornadoShot', 'eulryongta']);
  assert.equal(away.find((player) => player.role === 'goalkeeper').skillId, null);
  assert.deepEqual(home.map((player) => player.skillId), [null, 'tornadoShot', 'eulryongta', 'rainbowReflect']);
  assert.throws(() => assignOpponentSkills(initial.players, ['eagleShot', 'eagleShot']));
});
