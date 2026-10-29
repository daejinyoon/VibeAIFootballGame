import assert from 'node:assert/strict';
import test from 'node:test';
import { createCampaignMatchState } from './campaignMatchState.js';
import { getPlayerKit } from './playerKit.js';
import { createCampaign } from './campaign.js';
import { DEFAULT_TEAM_CUSTOMIZATION, getTeamBranding } from './teamBranding.js';

test('campaign match carries the selected logo and palette to every home role, preserving stage rivals', () => {
  const campaign = createCampaign(() => 0.25);
  campaign.currentStage = 2;
  const customization = { logoId: 'google', paletteId: 'royal-gold' };
  const state = createCampaignMatchState(campaign, customization);
  const expectedBranding = getTeamBranding(2, customization);

  assert.deepEqual(state.teamBranding, expectedBranding);
  for (const role of ['goalkeeper', 'defender', 'midfielder', 'forward']) {
    const player = state.players.find((entry) => entry.team === 'home' && entry.role === role);
    const kit = getPlayerKit(player, state.teamBranding);
    if (role === 'goalkeeper') {
      assert.equal(kit.jersey, '#F2C230');
      assert.equal(kit.glove, '#F2C230');
    } else {
      assert.deepEqual(
        { jersey: kit.jersey, trim: kit.trim, shorts: kit.shorts, boots: kit.boots },
        { jersey: '#2447B8', trim: '#F2C230', shorts: '#F5F5F0', boots: '#252A38' },
      );
    }
  }
  assert.equal(state.teamBranding.away.kit.id, 'orange');
});

test('missing or invalid customization uses the existing default branding', () => {
  const campaign = createCampaign(() => 0.25);
  for (const customization of [undefined, { logoId: 'unknown', paletteId: 'unknown' }]) {
    assert.deepEqual(
      createCampaignMatchState(campaign, customization).teamBranding.home,
      getTeamBranding(campaign.currentStage, DEFAULT_TEAM_CUSTOMIZATION).home,
    );
  }
});

test('skill preview retains source facing and Eulryongta target placement and orientation', () => {
  const campaign = createCampaign(() => 0.25);
  campaign.isSkillPreview = true;
  campaign.ownedTeamSkills = [{ skillId: 'eulryongta', level: 2 }];
  campaign.equippedTeamSkillIds = ['eulryongta'];
  const state = createCampaignMatchState(campaign);
  const source = state.players.find(({ id }) => id === state.controlledPlayerId);
  const target = state.players.find(({ team, role }) => team === 'away' && role === 'forward');

  assert.deepEqual({ x: source.facingX, y: source.facingY }, { x: 1, y: 0 });
  assert.deepEqual({ x: target.x, y: target.y, facingX: target.facingX, facingY: target.facingY }, {
    x: Math.min(source.x + 108, 900), y: source.y, facingX: -1, facingY: 0,
  });
  assert.deepEqual(state.teamSkillDecks.home, [{ skillId: 'eulryongta', level: 2 }]);
});

test('skill preview applies the selected skill at its owned level', () => {
  const campaign = createCampaign(() => 0.25);
  campaign.isSkillPreview = true;
  campaign.ownedTeamSkills = [{ skillId: 'eagleShot', level: 2 }];
  campaign.equippedTeamSkillIds = ['eagleShot'];
  const state = createCampaignMatchState(campaign);

  assert.equal(state.ball.skillId, 'eagleShot');
  assert.equal(state.ball.skillLevel, 2);
});

test('Vacuum Cleaner preview releases the ball and moves it into the preview position', () => {
  const campaign = createCampaign(() => 0.25);
  campaign.isSkillPreview = true;
  campaign.ownedTeamSkills = [{ skillId: 'vacuumCleaner', level: 1 }];
  const state = createCampaignMatchState(campaign);

  assert.deepEqual({ x: state.ball.x, y: state.ball.y, ownerId: state.ball.ownerId, possessionTeam: state.possessionTeam }, {
    x: 610, y: 225, ownerId: null, possessionTeam: null,
  });
});
