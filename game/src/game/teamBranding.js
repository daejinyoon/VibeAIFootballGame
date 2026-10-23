const freezeOptions = (options) => Object.freeze(options.map((option) => Object.freeze(option)));

export const LOGO_OPTIONS = freezeOptions([
  { id: 'dex', displayName: 'DEX', assetPath: '/images/brands/dex.svg' },
  { id: 'samsung', displayName: 'SAMSUNG', assetPath: '/images/brands/samsung.svg' },
  { id: 'apple', displayName: 'APPLE', assetPath: '/images/brands/apple.svg' },
  { id: 'google', displayName: 'GOOGLE', assetPath: '/images/brands/google.svg' },
]);

export const KIT_PALETTES = freezeOptions([
  { id: 'cyan-lime', name: '사이안 라임', jersey: '#00A6C8', trim: '#B8F52A', shorts: '#F4F7F8', boots: '#17212A' },
  { id: 'royal-gold', name: '로열 골드', jersey: '#2447B8', trim: '#F2C230', shorts: '#F5F5F0', boots: '#252A38' },
  { id: 'forest-white', name: '포레스트 화이트', jersey: '#16724A', trim: '#F5F4E8', shorts: '#F7F7F2', boots: '#202820' },
  { id: 'crimson-ivory', name: '크림슨 아이보리', jersey: '#C72F3B', trim: '#F2D9B6', shorts: '#F6F0E2', boots: '#292229' },
  { id: 'violet-ice', name: '바이올렛 아이스', jersey: '#7042A8', trim: '#A8E8F2', shorts: '#E8F6F7', boots: '#24202E' },
  { id: 'charcoal-gold', name: '차콜 골드', jersey: '#30343B', trim: '#D4AF37', shorts: '#F2F2EE', boots: '#17191E' },
]);

export const DEFAULT_TEAM_CUSTOMIZATION = Object.freeze({ logoId: 'dex', paletteId: 'cyan-lime' });

const OPPONENT_PALETTES = freezeOptions([
  { id: 'coral', jersey: '#E94B55', trim: '#FFE2A6', shorts: '#FFF2E5', boots: '#28242A' },
  { id: 'blue', jersey: '#2457D6', trim: '#6FE4FF', shorts: '#F5F5F5', boots: '#20283A' },
  { id: 'orange', jersey: '#F07824', trim: '#FFE04A', shorts: '#FFF7E8', boots: '#30251E' },
  { id: 'green', jersey: '#19804F', trim: '#A9EF58', shorts: '#F4F4EC', boots: '#1E2922' },
  { id: 'purple', jersey: '#8A3DC2', trim: '#F4A8FF', shorts: '#F4EEF7', boots: '#29202F' },
  { id: 'boss-black', jersey: '#17191D', trim: '#D8B23A', shorts: '#E7E5DD', boots: '#090A0C' },
]);

const logoIds = new Set(LOGO_OPTIONS.map(({ id }) => id));
const paletteIds = new Set(KIT_PALETTES.map(({ id }) => id));

export function normalizeTeamCustomization(value) {
  return {
    logoId: logoIds.has(value?.logoId) ? value.logoId : DEFAULT_TEAM_CUSTOMIZATION.logoId,
    paletteId: paletteIds.has(value?.paletteId) ? value.paletteId : DEFAULT_TEAM_CUSTOMIZATION.paletteId,
  };
}

function colorDistance(left, right) {
  const channels = (color) => color.slice(1).match(/.{2}/g).map((channel) => Number.parseInt(channel, 16));
  const [lr, lg, lb] = channels(left);
  const [rr, rg, rb] = channels(right);
  return Math.hypot(lr - rr, lg - rg, lb - rb);
}

function getRivalPalette(stage, homeJersey) {
  if (stage === 5) return OPPONENT_PALETTES.find(({ id }) => id === 'boss-black');

  const regularPalettes = OPPONENT_PALETTES.filter(({ id }) => id !== 'boss-black');
  const rotation = (stage - 1) % regularPalettes.length;
  const rotated = [...regularPalettes.slice(rotation), ...regularPalettes.slice(0, rotation)];
  const distances = rotated.map((palette) => ({ palette, distance: colorDistance(palette.jersey, homeJersey) }));
  return distances.find(({ distance }) => distance >= 95)?.palette
    ?? distances.reduce((farthest, candidate) => candidate.distance > farthest.distance ? candidate : farthest).palette;
}

export function getOpponentBranding(stage, homeCustomization) {
  const safeStage = Number.isInteger(stage) && stage >= 1 && stage <= 5 ? stage : 1;
  const home = normalizeTeamCustomization(homeCustomization);
  const availableLogos = LOGO_OPTIONS.filter(({ id }) => id !== home.logoId);
  const logo = availableLogos[(safeStage - 1) % availableLogos.length];
  const homePalette = KIT_PALETTES.find(({ id }) => id === home.paletteId);
  const kit = getRivalPalette(safeStage, homePalette.jersey);

  return { logoId: logo.id, displayName: logo.displayName, kit };
}

export function getTeamBranding(stage, homeCustomization) {
  const home = normalizeTeamCustomization(homeCustomization);
  const logo = LOGO_OPTIONS.find(({ id }) => id === home.logoId);
  const kit = KIT_PALETTES.find(({ id }) => id === home.paletteId);
  return {
    home: { logoId: logo.id, displayName: logo.displayName, kit },
    away: getOpponentBranding(stage, home),
  };
}

export function getAwayHudAccent(homeJersey) {
  const red = '#ef4d51';
  const blue = '#315ed8';
  return colorDistance(homeJersey, red) < 95 ? blue : red;
}
