import { MathUtils } from 'three';
import { FIELD } from './constants.js';

const WORLD_SCALE = 80;
const CAMERA_FOV_RADIANS = MathUtils.degToRad(42);
const CELEBRATION_ELEVATION_RADIANS = MathUtils.degToRad(24);
const HORIZONTAL_MARGIN = 0.45;
const MIN_CAMERA_DISTANCE = 4.5;

/** Frame the selected ceremony participants from the scoring team's attacking side. */
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
  const lateralValues = worldPositions.map(({ z }) => z);
  const halfWidth = (Math.max(...lateralValues) - Math.min(...lateralValues)) / 2 + HORIZONTAL_MARGIN;
  const safeAspect = Number.isFinite(aspect) ? Math.max(0.35, aspect) : 1;
  const horizontalHalfFov = Math.atan(Math.tan(CAMERA_FOV_RADIANS / 2) * safeAspect);
  const cameraDistance = Math.max(MIN_CAMERA_DISTANCE, halfWidth / Math.tan(horizontalHalfFov));
  const attackDirection = team === 'home' ? 1 : -1;

  return {
    target: { x: targetX, y: 0.85, z: targetZ },
    position: {
      x: targetX + attackDirection * cameraDistance * Math.cos(CELEBRATION_ELEVATION_RADIANS),
      y: cameraDistance * Math.sin(CELEBRATION_ELEVATION_RADIANS),
      z: targetZ,
    },
  };
}
