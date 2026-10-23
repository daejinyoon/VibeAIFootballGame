import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FIELD } from '../game/constants.js';

const SLOT_COUNT = 3;
const TRAIL_POINTS = 28;
const TRAIL_COLORS = { home: ['#fff1a8', '#ff9b24'], away: ['#ffe2c1', '#ff5548'] };
const WING_GEOMETRY = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(-0.22, 0.26, -0.5, 0.22);
  shape.lineTo(-1.05, 0.43);
  shape.lineTo(-0.82, 0.2);
  shape.lineTo(-1.18, 0.19);
  shape.lineTo(-0.76, 0.03);
  shape.lineTo(-1.02, -0.09);
  shape.quadraticCurveTo(-0.37, -0.3, 0, 0);
  return new THREE.ShapeGeometry(shape);
})();

function worldX(x) {
  return (Number(x) || 0) / 80 - FIELD.width / 160;
}

function worldZ(y) {
  return ((Number(y) || FIELD.height / 2) - FIELD.height / 2) / 80;
}

function EagleModel({ gameStateRef, slotIndex, rootRef }) {
  const wings = useRef([]);
  const feathers = useRef([]);
  const plumeRef = useRef(null);
  const sparks = useRef([]);
  useFrame(() => {
    const projectile = (gameStateRef?.current?.skillProjectiles ?? []).filter((entry) => entry.skillId === 'eagleShot' && !entry.resolved)[slotIndex];
    if (!projectile) return;
    const [primary, glow] = TRAIL_COLORS[projectile.team === 'away' ? 'away' : 'home'];
    const ageSeconds = projectile.ageSeconds ?? 0;
    const ascending = projectile.phase === 'ascending';
    const flap = Math.sin(ageSeconds * 24) * 0.72;
    if (wings.current[0]) wings.current[0].rotation.z = flap;
    if (wings.current[1]) wings.current[1].rotation.z = -flap;
    if (plumeRef.current) {
      plumeRef.current.scale.z = ascending ? 1 : 0.72;
      plumeRef.current.material.opacity = ascending ? 0.52 : 0.38;
      plumeRef.current.material.color.set(glow);
    }
    sparks.current.forEach((spark, index) => {
      if (spark) spark.rotation.set(ageSeconds * (1.4 + index * 0.13), ageSeconds * (2 + index * 0.11), ageSeconds * (1.8 + index * 0.09));
    });
    if (rootRef.current) {
      const scale = ascending ? 1.7 : 1.95;
      rootRef.current.scale.set(scale, scale, scale);
      rootRef.current.rotation.z = Math.sin(ageSeconds * 11) * 0.035;
    }
    feathers.current.forEach((material, index) => {
      if (!material) return;
      material.color.set(index === 1 ? '#fff4ce' : primary);
      if (material.emissive) material.emissive.set(glow);
    });
  });
  return <group ref={rootRef}>
    {/* The eagle body replaces the football for the entire active projectile flight. */}
    <mesh castShadow scale={[0.78, 0.72, 1.8]}>
      <sphereGeometry args={[0.25, 16, 12]} />
      <meshStandardMaterial ref={(material) => { feathers.current[0] = material; }} color="#ffe18a" emissive="#ff9b24" emissiveIntensity={1.9} roughness={0.28} metalness={0.12} />
    </mesh>
    <mesh position={[0, 0.1, 0.39]} castShadow>
      <sphereGeometry args={[0.14, 14, 10]} />
      <meshStandardMaterial color="#fff4cf" emissive="#ff9b24" emissiveIntensity={1.4} roughness={0.25} />
    </mesh>
    <mesh position={[0, 0.085, 0.56]} rotation={[Math.PI / 2, 0, 0]}>
      <coneGeometry args={[0.09, 0.25, 5]} />
      <meshStandardMaterial color="#ffbd42" emissive="#ff671e" emissiveIntensity={1.6} roughness={0.3} />
    </mesh>
    {[-1, 1].map((side, sideIndex) => <group key={side} ref={(node) => { wings.current[sideIndex] = node; }} position={[side * 0.11, 0.04, 0.02]}>
      <mesh geometry={WING_GEOMETRY} scale={[side * 1.18, 1.08, 1]} castShadow>
        <meshStandardMaterial ref={(material) => { feathers.current[2 + sideIndex] = material; }} color="#ffe18a" emissive="#ff9b24" emissiveIntensity={1.65} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={WING_GEOMETRY} position={[side * -0.02, 0.005, -0.01]} scale={[side * 0.88, 0.64, 1]}>
        <meshBasicMaterial ref={(material) => { feathers.current[1] = material; }} color="#fff3b0" transparent opacity={0.78} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>)}
    {[-1, 0, 1].map((side, tailIndex) => <mesh key={`tail-${side}`} position={[side * 0.105, 0.015, -0.55]} rotation={[Math.PI / 2 + side * 0.18, 0, 0]}>
      <coneGeometry args={[0.1, 0.42, 5]} />
      <meshStandardMaterial ref={(material) => { feathers.current[4 + tailIndex] = material; }} color="#ffe18a" emissive="#ff9b24" emissiveIntensity={1.2} roughness={0.32} />
    </mesh>)}
    {[-1, 1].map((side) => <mesh key={`eye-${side}`} position={[side * 0.105, 0.15, 0.43]}>
      <sphereGeometry args={[0.034, 8, 8]} />
      <meshBasicMaterial color="#172033" />
    </mesh>)}
    <mesh ref={plumeRef} position={[0, -0.02, -0.72]} rotation={[-Math.PI / 2, 0, 0]}>
      <coneGeometry args={[0.29, 1.45, 12, 1, true]} />
      <meshBasicMaterial color="#ff9b24" transparent opacity={0.52} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
    </mesh>
    {[0, 1, 2, 3, 4, 5].map((index) => <mesh key={`spark-${index}`} ref={(node) => { sparks.current[index] = node; }} position={[(index % 2 ? 1 : -1) * (0.25 + (index % 3) * 0.13), 0.13 + (index % 3) * 0.11, -0.42 - (index % 2) * 0.22]} scale={0.72 + (index % 3) * 0.3}>
      <tetrahedronGeometry args={[0.085, 0]} />
      <meshBasicMaterial color={index % 2 ? '#fffce0' : '#ff9b24'} transparent opacity={0.96} toneMapped={false} />
    </mesh>)}
  </group>;
}

function EagleProjectileSlot({ gameStateRef, slotIndex }) {
  const rootRef = useRef(null);
  const history = useRef([]);
  const trailLine = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 3), 3));
    geometry.setDrawRange(0, 0);
    const material = new THREE.LineBasicMaterial({ color: '#ffe498', transparent: true, opacity: 0.96, depthWrite: false, toneMapped: false });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    return line;
  }, []);
  useEffect(() => () => {
    trailLine.geometry.dispose();
    trailLine.material.dispose();
  }, [trailLine]);

  useFrame(() => {
    const state = gameStateRef?.current;
    const projectile = (state?.skillProjectiles ?? []).filter((entry) => entry.skillId === 'eagleShot' && !entry.resolved)[slotIndex];
    const root = rootRef.current;
    if (!root || !projectile || !state.eagleVolley) {
      if (root) root.visible = false;
      trailLine.visible = false;
      history.current.length = 0;
      trailLine.geometry.setDrawRange(0, 0);
      return;
    }
    root.visible = true;
    const ascending = projectile.phase === 'ascending';
    const height = Math.max(0, Number(projectile.height) || 0) / 80;
    root.position.set(worldX(projectile.x), height + 0.17, worldZ(projectile.y));
    root.rotation.y = projectile.team === 'away' ? -Math.PI / 2 : Math.PI / 2;
    const point = new THREE.Vector3(root.position.x, root.position.y, root.position.z);
    const prior = history.current[history.current.length - 1];
    if (!prior || prior.distanceToSquared(point) >= 0.0007) {
      history.current.push(point);
      if (history.current.length > TRAIL_POINTS) history.current.shift();
    }
    const positions = trailLine.geometry.attributes.position.array;
    history.current.forEach((position, index) => {
      const offset = index * 3;
      positions[offset] = position.x;
      positions[offset + 1] = position.y;
      positions[offset + 2] = position.z;
    });
    trailLine.geometry.attributes.position.needsUpdate = true;
    trailLine.geometry.setDrawRange(0, history.current.length);
    trailLine.material.color.set(TRAIL_COLORS[projectile.team === 'away' ? 'away' : 'home'][1]);
    trailLine.material.opacity = ascending ? 0.66 : 0.98;
    trailLine.visible = history.current.length > 1;
  });

  return <>
    <EagleModel gameStateRef={gameStateRef} slotIndex={slotIndex} rootRef={rootRef} />
    <primitive object={trailLine} />
  </>;
}

export function EagleProjectile3D({ gameStateRef }) {
  return <group>
    {Array.from({ length: SLOT_COUNT }, (_, index) => <EagleProjectileSlot key={index} gameStateRef={gameStateRef} slotIndex={index} />)}
  </group>;
}
