export const PREVIEW_PLAYER_IDS = Object.freeze([
  'preview-home-left',
  'preview-home-center',
  'preview-home-right',
]);

export const RKO_PREVIEW_ROLES = Object.freeze({
  targetId: PREVIEW_PLAYER_IDS[1],
  strikerId: PREVIEW_PLAYER_IDS[0],
  finisherId: PREVIEW_PLAYER_IDS[2],
});

export const PREVIEW_PLAYER_POSITIONS = Object.freeze({
  kit: [[0, 0, 0]],
  group: [[-0.92, 0, 0], [0, 0, -0.12], [0.92, 0, 0]],
  // Front camera is on +Z: stage the striker near-left/front, target in the
  // center, and finisher on the opposite diagonal behind the target.
  rko: [[-0.9, 0, 0.52], [0, 0, 0], [0.9, 0, -0.62]],
});

export const RKO_PREVIEW_CAMERA = Object.freeze({
  position: Object.freeze([2.9, 2.5, 5.9]),
  target: Object.freeze([0, 0.78, 0]),
  fov: 30,
});
