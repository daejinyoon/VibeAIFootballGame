import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import { FIELD } from '../game/constants.js';

const clamp = (value, min, max) => MathUtils.clamp(value, min, max);
const CAMERA_FOV = 42;
const ZONE_HYSTERESIS = 24;
const ELEVATION_RADIANS = MathUtils.degToRad(36);
const WORLD_SCALE = 80;
const worldX = (x) => x / WORLD_SCALE - FIELD.width / (2 * WORLD_SCALE);

export function TrackingCamera3D({ ball, gameStateRef }) {
  const { camera, size } = useThree();
  const zone = useRef('center');
  const lookTarget = useRef(new Vector3(0, 0.12, 0));
  const desiredPosition = useRef(new Vector3(0, 8, 11));
  const nextTarget = useRef(new Vector3());

  useFrame((_, delta) => {
    const gameState = gameStateRef?.current;
    const activeBall = gameState?.ball ?? ball;
    const ballX = Number.isFinite(activeBall?.x) ? activeBall.x : FIELD.width / 2;
    const ballY = Number.isFinite(activeBall?.y) ? activeBall.y : FIELD.height / 2;
    const leftBoundary = FIELD.width / 3;
    const rightBoundary = FIELD.width * 2 / 3;
    if (zone.current === 'center') {
      if (ballX < leftBoundary - ZONE_HYSTERESIS) zone.current = 'left';
      else if (ballX > rightBoundary + ZONE_HYSTERESIS) zone.current = 'right';
    } else if (zone.current === 'left') {
      if (ballX > rightBoundary + ZONE_HYSTERESIS) zone.current = 'right';
      else if (ballX > leftBoundary + ZONE_HYSTERESIS) zone.current = 'center';
    } else if (ballX < leftBoundary - ZONE_HYSTERESIS) {
      zone.current = 'left';
    } else if (ballX < rightBoundary - ZONE_HYSTERESIS) {
      zone.current = 'center';
    }

    const zoneCenterX = zone.current === 'left'
      ? FIELD.width / 4
      : zone.current === 'right' ? FIELD.width * 3 / 4 : FIELD.width / 2;
    const aspect = Math.max(0.35, size.width / Math.max(1, size.height));
    const verticalTangent = Math.tan(MathUtils.degToRad(CAMERA_FOV / 2));
    const horizontalTangent = verticalTangent * aspect;
    const halfFrameWidth = zone.current === 'center'
      ? FIELD.width / (4 * WORLD_SCALE) + 0.5
      : FIELD.width / (3.5 * WORLD_SCALE) + 0.5;
    const halfFrameDepth = FIELD.height / (2 * WORLD_SCALE) + 1.0;
    const distanceForWidth = halfFrameWidth / horizontalTangent;
    const distanceForDepth = (halfFrameDepth * Math.sin(ELEVATION_RADIANS)) / verticalTangent;
    const cameraDistance = Math.max(7, distanceForWidth, distanceForDepth);
    const focusWorldX = worldX(zoneCenterX);
    const worldZ = (ballY - FIELD.height / 2) / WORLD_SCALE;
    const maxFollowZ = Math.max(0.15, halfFrameDepth - FIELD.height / (2 * WORLD_SCALE));
    const followZ = clamp(worldZ * 0.28, -maxFollowZ, maxFollowZ);
    const followY = clamp((Number(activeBall?.height) || 0) / 80 * 0.12, 0, 0.2);
    const smoothing = 1 - Math.exp(-Math.max(0, delta) * 4.5);

    nextTarget.current.set(focusWorldX, 0.12 + followY, followZ);
    lookTarget.current.lerp(nextTarget.current, smoothing);
    desiredPosition.current.set(
      focusWorldX,
      cameraDistance * Math.sin(ELEVATION_RADIANS),
      followZ + cameraDistance * Math.cos(ELEVATION_RADIANS),
    );
    camera.position.lerp(desiredPosition.current, smoothing);
    camera.lookAt(lookTarget.current);
  });

  return null;
}
