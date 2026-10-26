import { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { SRGBColorSpace, TextureLoader } from 'three';
import { LOGO_OPTIONS } from '../game/teamBranding.js';

const FACE_VARIANTS = [
  { skin: '#f2c49b', hair: '#3b3029', hairStyle: 0, eyeColor: '#293c48' },
  { skin: '#d9a37c', hair: '#171819', hairStyle: 1, eyeColor: '#292d31' },
  { skin: '#f0d1ad', hair: '#a8783c', hairStyle: 2, eyeColor: '#42634f' },
  { skin: '#b97855', hair: '#211a18', hairStyle: 0, eyeColor: '#30241f' },
  { skin: '#f1c7b4', hair: '#6a4435', hairStyle: 2, eyeColor: '#375663' },
  { skin: '#e4b18a', hair: '#d8ba77', hairStyle: 1, eyeColor: '#39343a' },
  { skin: '#8c573e', hair: '#191818', hairStyle: 2, eyeColor: '#262f35' },
  { skin: '#e8c8aa', hair: '#514a3e', hairStyle: 0, eyeColor: '#485846' },
];

const hashPlayerId = (id = '') => {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

function LimbMesh({ color, length = 0.16, radius = 0.045 }) {
  return (
    <mesh position={[0, -length / 2, 0]} castShadow>
      <capsuleGeometry args={[radius, length, 3, 8]} />
      <meshStandardMaterial key={`limb-${color}`} color={color} roughness={0.62} />
    </mesh>
  );
}

function Hair({ style, color }) {
  return (
    <group position={[0, 0.68, -0.008]}>
      <mesh position={[0, style === 1 ? 0.005 : 0.018, -0.012]} scale={style === 1 ? [1.03, 0.56, 1.04] : [1.04, 0.69, 1.04]} castShadow>
        <sphereGeometry args={[0.145, 14, 10]} />
        <meshStandardMaterial color={color} roughness={0.88} />
      </mesh>
      {style === 1 && <mesh position={[0.035, 0.067, 0.071]} rotation={[0, 0, -0.28]}>
        <capsuleGeometry args={[0.045, 0.12, 3, 8]} />
        <meshStandardMaterial color={color} roughness={0.88} />
      </mesh>}
      {style === 2 && [-0.075, 0, 0.075].map((x, index) => (
        <mesh key={x} position={[x, 0.085 + (index === 1 ? 0.025 : 0), 0.005]} rotation={[0, 0, (index - 1) * -0.24]}>
          <coneGeometry args={[0.061, 0.13, 7]} />
          <meshStandardMaterial color={color} roughness={0.88} />
        </mesh>
      ))}
    </group>
  );
}

/** Shared procedural character model for field players and skill cut-ins. */
export function MiiPlayerModel({ player, gameStateRef, pose = 'field', scale = 1, paused = false, kit, logoId = 'dex', isKeeper = false }) {
  const leftArm = useRef(null);
  const rightArm = useRef(null);
  const leftLeg = useRef(null);
  const rightLeg = useRef(null);
  const torso = useRef(null);
  const head = useRef(null);
  const body = useRef(null);
  const phase = useRef(0);
  const previousAction = useRef('idle');
  const recoveryPoseSeconds = useRef(0);
  const variant = FACE_VARIANTS[hashPlayerId(player?.id) % FACE_VARIANTS.length];
  const modelScale = scale * (pose === 'cutIn' ? 1.22 : 1);
  const logo = LOGO_OPTIONS.find((option) => option.id === logoId) ?? LOGO_OPTIONS[0];
  const logoTexture = useLoader(TextureLoader, logo.assetPath);
  logoTexture.colorSpace = SRGBColorSpace;

  useFrame((_, delta) => {
    if (paused) return;
    const livePlayer = gameStateRef?.current?.players?.find((candidate) => candidate.id === player?.id) ?? player;
    if (!livePlayer) return;
    const speed = Math.hypot(livePlayer.vx ?? 0, livePlayer.vy ?? 0);
    const moving = speed > 3 && ['run', 'tackle'].includes(livePlayer.motionAction);
    const ownsBall = gameStateRef?.current?.ball?.ownerId === livePlayer.id;
    const action = livePlayer.motionAction;
    if (action === 'recover' && previousAction.current !== 'recover') recoveryPoseSeconds.current = 0.24;
    else if (action !== 'recover') recoveryPoseSeconds.current = Math.max(0, recoveryPoseSeconds.current - delta);
    previousAction.current = action;
    const displayAction = action === 'recover' || recoveryPoseSeconds.current > 0 ? 'recover' : action;
    const cadence = livePlayer.sprinting ? 15.5 : ownsBall ? 9.5 : 11.5;
    if (moving || ownsBall || ['pass', 'shot', 'skill', 'tackle', 'header', 'knockdown', 'recover'].includes(action)) {
      phase.current += delta * cadence;
    }

    const swing = Math.sin(phase.current);
    const runStrength = moving ? (livePlayer.sprinting ? 1.25 : 1) : 0;
    const dribbleTouch = ownsBall && moving ? Math.max(0, Math.sin(phase.current * 0.5)) * 0.48 : 0;
    const actionPose = displayAction === 'pass' ? 0.65 : displayAction === 'shot' ? 1 : displayAction === 'skill' ? 0.85
      : displayAction === 'header' ? -0.55 : displayAction === 'tackle' ? (sliding ? 0.25 : 0.92) : 0;

    if (leftArm.current) leftArm.current.rotation.x = -swing * runStrength + actionPose;
    if (rightArm.current) rightArm.current.rotation.x = swing * runStrength + actionPose * 0.35;
    if (leftLeg.current) {
      leftLeg.current.rotation.x = swing * runStrength - dribbleTouch;
      leftLeg.current.position.y = 0.22 + (ownsBall && !moving ? Math.max(0, Math.sin(phase.current)) * 0.035 : 0);
    }
    if (rightLeg.current) {
      rightLeg.current.rotation.x = -swing * runStrength - (dribbleTouch ? Math.max(0, -Math.sin(phase.current * 0.5)) * 0.48 : 0);
      rightLeg.current.position.y = 0.22 + (ownsBall && !moving ? Math.max(0, -Math.sin(phase.current)) * 0.035 : 0);
    }
    if (torso.current) {
      torso.current.position.y = 0.31 + (moving ? Math.abs(swing) * 0.025 : 0);
      torso.current.rotation.x = livePlayer.sprinting ? -0.2 : moving ? -0.16 : actionPose * 0.18;
    }
    if (head.current) head.current.rotation.x = displayAction === 'header' ? -0.42 : livePlayer.sprinting ? 0.08 : 0;
    if (body.current) {
      const knocked = displayAction === 'knockdown' || displayAction === 'recover';
      body.current.rotation.z = displayAction === 'knockdown'
        ? (livePlayer.knockdownDirectionX < 0 ? -1 : 1) * 1.36
        : displayAction === 'recover' ? (livePlayer.knockdownDirectionX < 0 ? -1 : 1) * 0.24 : 0;
      body.current.position.y = displayAction === 'knockdown' ? 0.34 : 0;
      if (knocked && torso.current) torso.current.position.y = 0.31;
    }
    if (isKeeper && ['diveLeft', 'diveRight', 'recover'].includes(livePlayer.keeperAction)) {
      const diving = livePlayer.keeperAction !== 'recover';
      const actionDuration = diving ? 0.42 : 0.24;
      const progress = diving
        ? 1 - Math.min(1, (livePlayer.keeperActionSeconds ?? actionDuration) / actionDuration)
        : Math.min(1, 1 - (livePlayer.keeperActionSeconds ?? 0) / actionDuration);
      const direction = livePlayer.keeperDiveDirection || (livePlayer.keeperAction === 'diveLeft' ? -1 : 1);
      if (body.current) {
        body.current.rotation.z = direction * (diving ? 0.48 + progress * 0.62 : 1.1 * (1 - progress));
        body.current.position.y = diving ? -0.06 - progress * 0.2 : -0.26 * (1 - progress);
      }
      if (leftArm.current) leftArm.current.rotation.set(-0.52, 0, -0.92 + direction * 0.24);
      if (rightArm.current) rightArm.current.rotation.set(-0.52, 0, 0.92 + direction * 0.24);
      if (leftLeg.current) leftLeg.current.rotation.z = -direction * 0.28;
      if (rightLeg.current) rightLeg.current.rotation.z = -direction * 0.18;
      if (torso.current) torso.current.rotation.x = -0.12;
    }
    if (pose === 'cutIn') {
      phase.current += delta * 3;
      const pulse = Math.sin(phase.current) * 0.08;
      if (leftArm.current) leftArm.current.rotation.set(-1.2 + pulse, 0, -0.7);
      if (rightArm.current) rightArm.current.rotation.set(-1.2 - pulse, 0, 0.7);
      if (leftLeg.current) leftLeg.current.rotation.x = -0.12;
      if (rightLeg.current) rightLeg.current.rotation.x = 0.12;
      if (torso.current) {
        torso.current.position.y = 0.31 + Math.abs(pulse) * 0.3;
        torso.current.rotation.x = -0.22;
      }
      if (head.current) head.current.rotation.x = -0.06;
      if (body.current) body.current.rotation.z = Math.sin(phase.current * 0.5) * 0.035;
    }
  });

  return (
    <group scale={modelScale}>
      <group ref={body}>
      <group ref={torso} position={[0, 0.31, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.125, 0.15, 4, 10]} />
          <meshStandardMaterial key={`jersey-${kit.jersey}`} color={kit.jersey} roughness={0.58} />
        </mesh>
        <mesh position={[0, 0.085, 0.103]}>
          <boxGeometry args={[0.105, 0.11, 0.018]} />
          <meshStandardMaterial key={`trim-${kit.trim}`} color={kit.trim} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.085, 0.116]}>
          <planeGeometry args={[0.082, 0.044]} />
          <meshBasicMaterial color="white" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.085, 0.119]}>
          <planeGeometry args={[0.073, logo.id === 'apple' ? 0.05 : 0.028]} />
          <meshBasicMaterial map={logoTexture} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </group>

      <group ref={leftArm} position={[-0.17, 0.39, 0]} rotation={[0, 0, -0.15]}>
        <LimbMesh color={kit.jersey} length={0.18} radius={0.043} />
        <mesh position={[0, -0.19, 0.015]}>
          <sphereGeometry args={[0.052, 10, 8]} />
          <meshStandardMaterial key={`hand-${isKeeper ? kit.glove : variant.skin}`} color={isKeeper ? kit.glove : variant.skin} roughness={0.68} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.17, 0.39, 0]} rotation={[0, 0, 0.15]}>
        <LimbMesh color={kit.jersey} length={0.18} radius={0.043} />
        <mesh position={[0, -0.19, 0.015]}>
          <sphereGeometry args={[0.052, 10, 8]} />
          <meshStandardMaterial key={`hand-${isKeeper ? kit.glove : variant.skin}`} color={isKeeper ? kit.glove : variant.skin} roughness={0.68} />
        </mesh>
      </group>

      <group ref={leftLeg} position={[-0.07, 0.22, 0]}>
        <LimbMesh color={kit.shorts} length={0.16} radius={0.042} />
        <mesh position={[0, -0.18, 0.035]}>
          <boxGeometry args={[0.09, 0.055, 0.17]} />
          <meshStandardMaterial key={`boots-${kit.boots}`} color={kit.boots} roughness={0.45} />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.07, 0.22, 0]}>
        <LimbMesh color={kit.shorts} length={0.16} radius={0.042} />
        <mesh position={[0, -0.18, 0.035]}>
          <boxGeometry args={[0.09, 0.055, 0.17]} />
          <meshStandardMaterial key={`boots-${kit.boots}`} color={kit.boots} roughness={0.45} />
        </mesh>
      </group>

      <group ref={head}>
        <mesh position={[0, 0.58, 0]} castShadow>
          <sphereGeometry args={[0.155, 16, 14]} />
          <meshStandardMaterial color={variant.skin} roughness={0.72} />
        </mesh>
        <Hair style={variant.hairStyle} color={variant.hair} />
        {[-0.052, 0.052].map((eyeX) => (
          <group key={eyeX} position={[eyeX, 0.595, 0.135]}>
            <mesh>
              <sphereGeometry args={[0.023, 8, 6]} />
              <meshBasicMaterial color="#fff9e9" />
            </mesh>
            <mesh position={[0, 0, 0.017]}>
              <sphereGeometry args={[0.011, 8, 6]} />
              <meshBasicMaterial color={variant.eyeColor} />
            </mesh>
          </group>
        ))}
      </group>
      </group>
    </group>
  );
}
