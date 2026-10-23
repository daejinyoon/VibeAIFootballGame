import assert from 'node:assert/strict';
import test from 'node:test';
import { getTeamBranding } from './teamBranding.js';
import { getPlayerKit } from './playerKit.js';

test('selected home palette reaches every field player and gives the keeper its selected accent', () => {
  const branding = getTeamBranding(2, { paletteId: 'royal-gold', logoId: 'google' });
  const fieldKit = getPlayerKit({ team: 'home', role: 'forward' }, branding);
  const keeperKit = getPlayerKit({ team: 'home', role: 'goalkeeper' }, branding);

  assert.deepEqual(
    { jersey: fieldKit.jersey, trim: fieldKit.trim, shorts: fieldKit.shorts, boots: fieldKit.boots },
    { jersey: '#2447B8', trim: '#F2C230', shorts: '#F5F5F0', boots: '#252A38' },
  );
  assert.equal(keeperKit.jersey, '#F2C230');
  assert.equal(keeperKit.glove, '#F2C230');
  assert.equal(branding.home.logoId, 'google');
});

test('away players keep stage-derived colors and the stage-five boss remains black', () => {
  const stageTwoBranding = getTeamBranding(2, { paletteId: 'royal-gold', logoId: 'dex' });
  const stageFiveBranding = getTeamBranding(5, { paletteId: 'royal-gold', logoId: 'dex' });

  assert.equal(getPlayerKit({ team: 'away', role: 'forward' }, stageTwoBranding).jersey, stageTwoBranding.away.kit.jersey);
  assert.equal(stageFiveBranding.away.kit.id, 'boss-black');
  assert.equal(getPlayerKit({ team: 'away', role: 'forward' }, stageFiveBranding).jersey, '#17191D');
});

test('missing team branding retains the default home and keeper kits', () => {
  assert.equal(getPlayerKit({ team: 'home', role: 'forward' }, null).jersey, '#12a9bd');
  assert.equal(getPlayerKit({ team: 'home', role: 'goalkeeper' }, null).jersey, '#d7f26b');
});
