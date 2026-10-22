import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import { FIELD } from '../game/constants.js';

const clamp = (value, min, max) => MathUtils.clamp(value, min, max);

export function TrackingCamera3D({ ball, gameStateRef }) {
  const { camera, size } = useThree();
  const lookTarget = useRef(new Vector3(0, 0.12, 0));
  const desiredPosition = useRef(new Vector3(0, 11, 16));
  const nextTarget = useRef(new Vector3());

  const getAttackDirection = (possessionTeam, lastTouchTeam) => {
    if (possessionTeam === 'home' || (possessionTeam == null && lastTouchTeam === 'home')) return 1;
    if (possessionTeam === 'away' || (possessionTeam == null && lastTouchTeam === 'away')) return -1;
    return null;
  };

  useFrame((_, delta) => {
    const gameState = gameStateRef?.current;
    const activeBall = gameState?.ball ?? ball;
    const ballX = Number.isFinite(activeBall?.x) ? activeBall.x : FIELD.width / 2;
    const ballY = Number.isFinite(activeBall?.y) ? activeBall.y : FIELD.height / 2;
    const attackDirection = getAttackDirection(gameState?.possessionTeam, activeBall?.lastTouchTeam);
    const attackAnchorX = attackDirection == null
      ? FIELD.width / 2
      : FIELD.width * (attackDirection > 0 ? 0.65 : 0.35);
    const focusX = attackDirection == null ? ballX : (ballX + attackAnchorX) / 2;
    const focusWorldX = focusX / 80 - FIELD.width / 160;
    const worldZ = (ballY - FIELD.height / 2) / 80;
    const horizontalLimit = size.width / Math.max(1, size.height) < 1.35 ? 0.55 : 1.8;
    const followX = clamp(focusWorldX * 0.55, -horizontalLimit, horizontalLimit);
    const followZ = clamp(worldZ * 0.32, -1.25, 1.25);
    const followY = clamp((Number(activeBall?.height) || 0) / 80 * 0.12, 0, 0.2);
    const smoothing = Math.min(delta * 2.5, 1);

    nextTarget.current.set(followX, 0.12 + followY, followZ);
    lookTarget.current.lerp(nextTarget.current, smoothing);
    desiredPosition.current.set(
      followX,
      11,
      clamp(16 + followZ, 14.5, 17.5),
    );
    camera.position.lerp(desiredPosition.current, smoothing);
    camera.lookAt(lookTarget.current);
  });

  return null;
}
