export const TEAM_KITS = {
  home: { jersey: '#12a9bd', trim: '#d7ff74', shorts: '#f4fff7', boots: '#f5ff81', keeper: '#d7f26b', glove: '#f0ffab' },
  away: { jersey: '#f36d62', trim: '#ffe083', shorts: '#fff3e5', boots: '#ffe083', keeper: '#ffcf70', glove: '#fff2a5' },
};

export function getPlayerKit(player, teamBranding) {
  const team = player?.team === 'away' ? 'away' : 'home';
  const fallback = TEAM_KITS[team];
  const configuredKit = teamBranding?.[team]?.kit;
  const palette = { ...fallback, ...(configuredKit ?? {}) };
  if (player?.role !== 'goalkeeper') return palette;

  const keeperColor = configuredKit?.keeper ?? (configuredKit ? configuredKit.trim : fallback.keeper) ?? fallback.keeper;
  return {
    ...palette,
    jersey: keeperColor,
    trim: palette.jersey,
    glove: keeperColor,
  };
}
