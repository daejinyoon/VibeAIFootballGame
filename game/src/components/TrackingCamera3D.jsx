import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MathUtils, Vector3 } from 'three';
import { FIELD } from '../game/constants.js';

const clamp = (value, min, max) => MathUtils.clamp(value, min, max);

export function TrackingCamera3D({ ball, gameStateRef }) {
  const { camera } = useThree();
  const lookTarget = useRef(new Vector3(0, 0.12, 0));
  const desiredPosition = useRef(new Vector3(0, 11, 16));
  const nextTarget = useRef(new Vector3());

  useFrame((_, delta) => {
    const activeBall = gameStateRef?.current?.ball ?? ball;
    const worldX = (Number(activeBall?.x) || FIELD.width / 2) / 80 - FIELD.width / 160;
    const worldZ = ((Number(activeBall?.y) || FIELD.height / 2) - FIELD.height / 2) / 80;
    const followX = clamp(worldX * 0.36, -2.5, 2.5);
    const followZ = clamp(worldZ * 0.32, -1.25, 1.25);
    const followY = clamp((Number(activeBall?.height) || 0) / 80 * 0.12, 0, 0.2);
    const smoothing = Math.min(delta * 2.5, 1);

    nextTarget.current.set(followX, 0.12 + followY, followZ);
    lookTarget.current.lerp(nextTarget.current, smoothing);
    desiredPosition.current.set(
      clamp(followX, -3, 3),
      11,
      clamp(16 + followZ, 14.5, 17.5),
    );
    camera.position.lerp(desiredPosition.current, smoothing);
    camera.lookAt(lookTarget.current);
  });

  return null;
}
