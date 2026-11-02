import { MathUtils } from 'three';
import { FIELD } from './constants.js';

const WORLD_SCALE = 80;
const CAMERA_FOV_RADIANS = MathUtils.degToRad(42);
const CELEBRATION_ELEVATION_RADIANS = MathUtils.degToRad(24);
const CELEBRATION_AZIMUTH_RADIANS = MathUtils.degToRad(20);
const HORIZONTAL_MARGIN = 0.45;
const PLAYER_HEIGHT = 1.6;
const VERTICAL_MARGIN = 0.2;
const MIN_CAMERA_DISTANCE = 4.5;
const CELEBRATION_TARGET_HEIGHT = 0.85;

/** Frame every selected participant from a low, three-quarter attacking-front view. */
export function getGoalCelebrationCameraFrame({ players, participantIds, team, aspect } = {}) {
  if (!Array.isArray(players) || !Array.isArray(participantIds) || participantIds.length === 0
      || !['home', 'away'].includes(team)
      || participantIds.some((id) => typeof id !== 'string')) return null;

  const playersById = new Map(players.map((player) => [player?.id, player]));
  const participants = participantIds.map((id) => playersById.get(id));
  if (participants.some((player) => !player || !Number.isFinite(player.x) || !Number.isFinite(player.y))) return null;

  const worldPositions = participants.map((player) => ({
    x: player.x / WORLD_SCALE - FIELD.width / (2 * WORLD_SCALE),
    z: (player.y - FIELD.height / 2) / WORLD_SCALE,
  }));
  const targetX = worldPositions.reduce((sum, point) => sum + point.x, 0) / worldPositions.length;
  const targetZ = worldPositions.reduce((sum, point) => sum + point.z, 0) / worldPositions.length;
  const attackDirection = team === 'home' ? 1 : -1;
  const cameraRight = {
    x: -attackDirection * Math.sin(CELEBRATION_AZIMUTH_RADIANS),
    z: Math.cos(CELEBRATION_AZIMUTH_RADIANS),
  };
  const projectedWidths = worldPositions.map(({ x, z }) => (
    (x - targetX) * cameraRight.x + (z - targetZ) * cameraRight.z
  ));
  const halfWidth = Math.max(...projectedWidths.map(Math.abs)) + HORIZONTAL_MARGIN;

  const cameraUp = {
    x: -attackDirection * Math.sin(CELEBRATION_ELEVATION_RADIANS) * Math.cos(CELEBRATION_AZIMUTH_RADIANS),
    y: Math.cos(CELEBRATION_ELEVATION_RADIANS),
    z: -Math.sin(CELEBRATION_ELEVATION_RADIANS) * Math.sin(CELEBRATION_AZIMUTH_RADIANS),
  };
  const projectedVerticalExtents = worldPositions.flatMap(({ x, z }) => {
    const horizontalOffset = (x - targetX) * cameraUp.x + (z - targetZ) * cameraUp.z;
    return [
      horizontalOffset - CELEBRATION_TARGET_HEIGHT * cameraUp.y,
      horizontalOffset + (PLAYER_HEIGHT - CELEBRATION_TARGET_HEIGHT) * cameraUp.y,
    ];
  });
  const halfHeight = Math.max(1.0, Math.max(...projectedVerticalExtents.map(Math.abs)) + VERTICAL_MARGIN);

  const safeAspect = Number.isFinite(aspect) ? Math.max(0.35, aspect) : 1;
  const verticalHalfFov = CAMERA_FOV_RADIANS / 2;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * safeAspect);
  const cameraDistance = Math.max(
    MIN_CAMERA_DISTANCE,
    halfWidth / Math.tan(horizontalHalfFov),
    halfHeight / Math.tan(verticalHalfFov),
  );

  return {
    target: { x: targetX, y: CELEBRATION_TARGET_HEIGHT, z: targetZ },
    position: {
      x: targetX + attackDirection * cameraDistance
        * Math.cos(CELEBRATION_ELEVATION_RADIANS) * Math.cos(CELEBRATION_AZIMUTH_RADIANS),
      y: CELEBRATION_TARGET_HEIGHT + cameraDistance * Math.sin(CELEBRATION_ELEVATION_RADIANS),
      z: targetZ + cameraDistance * Math.cos(CELEBRATION_ELEVATION_RADIANS)
        * Math.sin(CELEBRATION_AZIMUTH_RADIANS),
    },
  };
}
