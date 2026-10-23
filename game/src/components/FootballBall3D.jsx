import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FIELD } from '../game/constants.js';

export function FootballBall3D({ ball, actorsRef }) {
  const ballRef = useRef(null);
  const tornadoWrapRef = useRef(null);
  const tornadoInnerWrapRef = useRef(null);
  if (!ball) return null;

  const x = (Number(ball.x) || 0) / 80 - FIELD.width / 160;
  const z = ((Number(ball.y) || FIELD.height / 2) - FIELD.height / 2) / 80;
  const height = Math.max(0, Number(ball.height) || 0) / 80;
  const ballY = height + 0.12;
  const inFlight = height > 0.06;

  useFrame((_, delta) => {
    if (ballRef.current) ballRef.current.rotation.x += delta * (inFlight ? 5.5 : 1.2);
    if (tornadoWrapRef.current) tornadoWrapRef.current.rotation.y += delta * 5;
    if (tornadoInnerWrapRef.current) tornadoInnerWrapRef.current.rotation.x -= delta * 4;
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
        <circleGeometry args={[0.2, 24]} />
        <meshBasicMaterial color="#275341" transparent opacity={Math.max(0.16, 0.34 - height * 0.025)} depthWrite={false} />
      </mesh>

      <group ref={(actor) => { ballRef.current = actor; registerBallBody(actor); }} position={[0, ballY, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.19, 18, 14]} />
          <meshStandardMaterial
            color={ball.skillId === 'tornadoShot' ? '#e9fcff' : ball.flightKind === 'skill-shot' ? '#fff1bd' : '#fff7df'}
            emissive={ball.skillId === 'tornadoShot' ? '#31cce8' : ball.flightKind === 'skill-shot' ? '#ffb144' : '#ffffff'}
            emissiveIntensity={ball.skillId === 'tornadoShot' ? 0.34 : ball.flightKind === 'skill-shot' ? 0.48 : 0.04}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[0, 0.018, 0.17]}>
          <icosahedronGeometry args={[0.05, 0]} />
          <meshStandardMaterial color={ball.skillId === 'tornadoShot' ? '#124c66' : '#273945'} roughness={0.54} />
        </mesh>
        <mesh position={[-0.122, 0.068, 0.093]} rotation={[0.3, 0, -0.4]}>
          <icosahedronGeometry args={[0.041, 0]} />
          <meshStandardMaterial color={ball.skillId === 'tornadoShot' ? '#124c66' : '#273945'} roughness={0.54} />
        </mesh>
        <mesh position={[0.119, -0.064, 0.089]} rotation={[-0.3, 0, 0.4]}>
          <icosahedronGeometry args={[0.041, 0]} />
          <meshStandardMaterial color={ball.skillId === 'tornadoShot' ? '#124c66' : '#273945'} roughness={0.54} />
        </mesh>
        <mesh ref={tornadoWrapRef} visible={ball.skillId === 'tornadoShot'} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.245, 0.018, 6, 32]} />
          <meshBasicMaterial color="#62e8ff" transparent opacity={0.86} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh ref={tornadoInnerWrapRef} visible={ball.skillId === 'tornadoShot'} rotation={[0.45, 0, Math.PI / 2]}>
          <torusGeometry args={[0.205, 0.012, 6, 32]} />
          <meshBasicMaterial color="#d8ffff" transparent opacity={0.78} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
