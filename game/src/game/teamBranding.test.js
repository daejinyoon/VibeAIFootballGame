import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_TEAM_CUSTOMIZATION,
  KIT_PALETTES,
  LOGO_OPTIONS,
  getOpponentBranding,
  normalizeTeamCustomization,
} from './teamBranding.js';

test('team branding exposes nine valid selectable kit palettes and keeps four logo options', () => {
  assert.equal(KIT_PALETTES.length, 9);
  assert.equal(new Set(KIT_PALETTES.map(({ id }) => id)).size, 9);
  assert.equal(LOGO_OPTIONS.length, 4);

  for (const palette of KIT_PALETTES) {
    for (const color of [palette.jersey, palette.trim, palette.shorts, palette.boots]) {
      assert.match(color, /^#[0-9A-F]{6}$/i);
    }
    assert.deepEqual(normalizeTeamCustomization({ paletteId: palette.id }).paletteId, palette.id);
  }
});

test('team branding falls back to the default kit for unknown palette IDs', () => {
  assert.deepEqual(normalizeTeamCustomization({ paletteId: 'not-a-kit' }), DEFAULT_TEAM_CUSTOMIZATION);
});

test('team branding keeps stage five black and gives regular rivals a contrasting kit', () => {
  const homeJerseys = KIT_PALETTES.map(({ jersey }) => jersey);
  const colorDistance = (left, right) => {
    const channels = (color) => color.slice(1).match(/.{2}/g).map((part) => Number.parseInt(part, 16));
    return Math.hypot(...channels(left).map((channel, index) => channel - channels(right)[index]));
  };

  for (const jersey of homeJerseys) {
    const home = KIT_PALETTES.find((palette) => palette.jersey === jersey);
    const boss = getOpponentBranding(5, { paletteId: home.id });
    assert.equal(boss.kit.id, 'boss-black');

    for (let stage = 1; stage < 5; stage += 1) {
      const rival = getOpponentBranding(stage, { paletteId: home.id });
      assert.ok(colorDistance(jersey, rival.kit.jersey) >= 95);
    }
  }
});
