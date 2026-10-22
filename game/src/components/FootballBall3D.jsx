import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FIELD } from '../game/constants.js';

export function FootballBall3D({ ball, actorsRef }) {
  const ballRef = useRef(null);
  if (!ball) return null;

  const x = (Number(ball.x) || 0) / 80 - FIELD.width / 160;
  const z = ((Number(ball.y) || FIELD.height / 2) - FIELD.height / 2) / 80;
  const height = Math.max(0, Number(ball.height) || 0) / 80;
  const ballY = height + 0.12;
  const inFlight = height > 0.06;

  useFrame((_, delta) => {
    if (ballRef.current) ballRef.current.rotation.x += delta * (inFlight ? 5.5 : 1.2);
  });

  const registerActor = (actor) => {
    if (actorsRef?.current) actorsRef.current.ball = actor;
  };
  const registerBallBody = (actor) => {
    if (actorsRef?.current) actorsRef.current.ballBody = actor;
  };

  return (
    <group ref={registerActor} position={[x, 0, z]}>
      <mesh position={[0, 0.033, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1 + height * 0.15, 1, 1 + height * 0.15]}>
        <circleGeometry args={[0.14, 24]} />
        <meshBasicMaterial color="#275341" transparent opacity={Math.max(0.16, 0.34 - height * 0.025)} depthWrite={false} />
      </mesh>

      <group ref={(actor) => { ballRef.current = actor; registerBallBody(actor); }} position={[0, ballY, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.145, 18, 14]} />
          <meshStandardMaterial
            color={ball.flightKind === 'skill-shot' ? '#fff1bd' : '#ffffff'}
            emissive={ball.flightKind === 'skill-shot' ? '#ffb144' : '#ffffff'}
            emissiveIntensity={ball.flightKind === 'skill-shot' ? 0.48 : 0.04}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[0, 0.014, 0.13]}>
          <icosahedronGeometry args={[0.038, 0]} />
          <meshStandardMaterial color="#273945" roughness={0.54} />
        </mesh>
        <mesh position={[-0.093, 0.052, 0.071]} rotation={[0.3, 0, -0.4]}>
          <icosahedronGeometry args={[0.031, 0]} />
          <meshStandardMaterial color="#273945" roughness={0.54} />
        </mesh>
        <mesh position={[0.091, -0.049, 0.068]} rotation={[-0.3, 0, 0.4]}>
          <icosahedronGeometry args={[0.031, 0]} />
          <meshStandardMaterial color="#273945" roughness={0.54} />
        </mesh>
      </group>
    </group>
  );
}
