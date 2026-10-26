import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FIELD } from '../game/constants.js';
import { EagleProjectile3D } from './EagleProjectile3D.jsx';

const SLOT_COUNT = 32;
const AIR_SLOT_COUNT = 16;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
export const SKILL_EFFECT_COLORS = {
  eagleShot: { home: ['#fff2a0', '#ff8b35'], away: ['#ffe28d', '#fa5f59'] },
  tornadoShot: { home: ['#a9f5ff', '#53d7e8'], away: ['#ffe39a', '#ff8b68'] },
  eulryongta: { home: ['#ffec8b', '#ff7a55'], away: ['#ffc276', '#ec5c74'] },
  vacuumCleaner: { home: ['#9dffec', '#67d7fa'], away: ['#ffe29a', '#ff806c'] },
};
const RING_GEOMETRY = new THREE.TorusGeometry(0.38, 0.035, 8, 40);
const PARTICLE_GEOMETRY = new THREE.TetrahedronGeometry(0.09, 0);
const BEAM_GEOMETRY = new THREE.CylinderGeometry(0.045, 0.12, 1, 10, 1, true);
const AIR_RING_GEOMETRY = new THREE.TorusGeometry(0.3, 0.025, 6, 28);
const AIR_PARTICLE_GEOMETRY = new THREE.TetrahedronGeometry(0.06, 0);
function makeMesh(geometry, color = '#ffffff', opacity = 0.8) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
  });
  return new THREE.Mesh(geometry, material);
}

function makeSlot() {
  const root = new THREE.Group();
  const rings = [0, 1, 2].map(() => {
    const mesh = makeMesh(RING_GEOMETRY);
    mesh.rotation.x = Math.PI / 2;
    root.add(mesh);
    return mesh;
  });
  const particles = Array.from({ length: 12 }, (_, index) => {
    const mesh = makeMesh(PARTICLE_GEOMETRY);
    root.add(mesh);
    return mesh;
  });
  const beam = makeMesh(BEAM_GEOMETRY, '#9dffec', 0.45);
  root.add(beam);
  return { root, rings, particles, beam };
}

function makeAirSlot() {
  const root = new THREE.Group();
  const rings = Array.from({ length: 3 }, () => {
    const mesh = new THREE.Mesh(AIR_RING_GEOMETRY, new THREE.MeshBasicMaterial({ color: '#84f6ff', transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false }));
    root.add(mesh);
    return mesh;
  });
  const particles = Array.from({ length: 6 }, (_, index) => {
    const mesh = new THREE.Mesh(AIR_PARTICLE_GEOMETRY, new THREE.MeshBasicMaterial({ color: index % 2 ? '#b5ffff' : '#59d9ec', transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }));
    root.add(mesh);
    return mesh;
  });
  return { root, rings, particles };
}

function worldX(x) {
  return (Number(x) || 0) / 80 - FIELD.width / 160;
}

function worldZ(y) {
  return ((Number(y) || FIELD.height / 2) - FIELD.height / 2) / 80;
}

function setOpacity(mesh, opacity) {
  mesh.material.opacity = opacity;
  mesh.visible = opacity > 0.015;
}

/** Draw transient skill cues directly from the mutable simulation state. */
export function SkillEffects3D({ gameStateRef }) {
  const slots = useMemo(() => Array.from({ length: SLOT_COUNT }, makeSlot), []);
  const airSlots = useMemo(() => Array.from({ length: AIR_SLOT_COUNT }, makeAirSlot), []);
  const disposeTimerRef = useRef(null);
  const scene = useMemo(() => {
    const group = new THREE.Group();
    for (const slot of slots) group.add(slot.root);
    for (const slot of airSlots) group.add(slot.root);
    return group;
  }, [slots, airSlots]);

  useEffect(() => {
    if (disposeTimerRef.current !== null) {
      clearTimeout(disposeTimerRef.current);
      disposeTimerRef.current = null;
    }
    return () => {
      // React StrictMode replays effect cleanup/setup on mount in development.
      // Delay disposal by one task so the setup replay can cancel this cleanup.
      disposeTimerRef.current = setTimeout(() => {
        for (const slot of slots) {
          for (const mesh of [...slot.rings, ...slot.particles, slot.beam]) mesh.material.dispose();
        }
        for (const slot of airSlots) {
          for (const mesh of [...slot.rings, ...slot.particles]) mesh.material.dispose();
        }
        disposeTimerRef.current = null;
      }, 0);
    };
  }, [slots, airSlots]);

  useFrame((_, delta) => {
    const state = gameStateRef?.current;
    const effects = state?.skillEffects ?? [];
    for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index];
      const effect = effects[index];
      const root = slot.root;
      if (!effect) {
        root.visible = false;
        continue;
      }
      if (effect.skillId === 'vacuumCleaner') {
        root.visible = false;
        continue;
      }

      const source = state.players.find((player) => player.id === effect.sourcePlayerId);
      const target = effect.targetPlayerId
        ? state.players.find((player) => player.id === effect.targetPlayerId)
        : null;
      if (!source || source.dismissed || (effect.targetPlayerId && (!target || target.dismissed))) {
        root.visible = false;
        continue;
      }

      if ((effect.skillId === 'eagleShot' && state.eagleVolley)
          || (effect.skillId === 'tornadoShot' && state.tornadoShotEffect)) {
        root.visible = false;
        continue;
      }

      const ball = state.ball;
      const team = effect.team === 'away' ? 'away' : 'home';
      const [primary, secondary] = SKILL_EFFECT_COLORS[effect.skillId]?.[team] ?? SKILL_EFFECT_COLORS.eagleShot.home;
      const duration = Math.max(0.001, effect.durationSeconds);
      const progress = THREE.MathUtils.clamp(effect.elapsedSeconds / duration, 0, 1);
      const fade = Math.min(1, progress * 12 + 0.08, (1 - progress) * (effect.durationSeconds > 1 ? 3 : 2.2));
      const now = effect.elapsedSeconds;
      const isBallSkill = effect.skillId === 'eagleShot' || effect.skillId === 'tornadoShot';
      const anchor = effect.position ?? (isBallSkill ? ball : (target ?? source));
      root.visible = true;
      root.position.set(worldX(anchor.x), (Number(anchor.height) || 0) / 80 + 0.12, worldZ(anchor.y));
      root.rotation.set(0, 0, 0);
      root.scale.setScalar(1.65);

      const levelScale = effect.skillId === 'eagleShot' ? 1 + (Math.max(1, effect.level ?? 1) - 1) * 0.18 : 1;
      const radius = (effect.skillId === 'eulryongta' ? 0.48 : 0.36) * levelScale;
      slot.rings.forEach((ring, ringIndex) => {
        ring.visible = false;
        ring.material.color.set(ringIndex === 1 ? secondary : primary);
        ring.position.set(0, 0.08 + ringIndex * 0.055, 0);
        ring.scale.setScalar(radius * (0.76 + ringIndex * 0.25 + (effect.skillId === 'tornadoShot' ? Math.sin(now * 8 + ringIndex) * 0.08 : 0)));
        ring.rotation.set(Math.PI / 2 + (effect.skillId === 'tornadoShot' ? now * (ringIndex % 2 ? -3 : 3) : 0), 0, ringIndex * 0.32);
        const ringOpacity = effect.skillId === 'vacuumCleaner' && ringIndex === 2 ? 0 : fade * (ringIndex === 0 ? 0.74 : 0.48);
        setOpacity(ring, ringOpacity);
      });

      slot.particles.forEach((particle, particleIndex) => {
        const angle = particleIndex / slot.particles.length * Math.PI * 2 + now * (effect.skillId === 'tornadoShot' ? 5 : 2.1);
        const orbit = effect.skillId === 'eulryongta' ? 0.35 + progress * 0.4 : radius * 1.2;
        if (effect.skillId === 'eulryongta') {
          const angle = particleIndex / slot.particles.length * Math.PI * 2 + (particleIndex % 2 ? -1 : 1) * now * 1.4;
          const burstRadius = 0.08 + progress * (0.62 + (particleIndex % 3) * 0.08);
          particle.position.set(Math.cos(angle) * burstRadius,
            0.08 + Math.sin(progress * Math.PI) * (0.12 + (particleIndex % 4) * 0.045),
            Math.sin(angle) * burstRadius * 0.82);
          particle.rotation.set(angle, now * 2.6, angle * 1.35);
          particle.scale.set(0.72 + (particleIndex % 4) * 0.18, 0.75 + progress * 0.35, 0.72 + (particleIndex % 3) * 0.14);
        } else if (effect.skillId === 'eagleShot') {
          const side = particleIndex < 4 ? -1 : 1;
          const feather = particleIndex % 4;
          particle.position.set(side * (0.17 + feather * 0.11), 0.16 + (3 - feather) * 0.055, (feather - 1.5) * 0.14);
          particle.rotation.set(0, 0, side * (0.45 + feather * 0.13));
          particle.scale.setScalar((1.05 - feather * 0.1) * levelScale);
        } else if (effect.skillId === 'vacuumCleaner') {
          const routeProgress = (particleIndex / slot.particles.length + (now * 1.65) % 1) % 1;
          const ballX = worldX(ball.x) - root.position.x;
          const ballZ = worldZ(ball.y) - root.position.z;
          const sourceX = worldX(source.x) - root.position.x;
          const sourceZ = worldZ(source.y) - root.position.z;
          const spiralAngle = now * 28 - routeProgress * Math.PI * 5;
          const spiralRadius = 0.06 + (1 - routeProgress) * 0.2;
          particle.position.set(
            THREE.MathUtils.lerp(ballX, sourceX, routeProgress) + Math.cos(spiralAngle) * spiralRadius,
            0.16 + Math.sin(spiralAngle * 0.7) * 0.07,
            THREE.MathUtils.lerp(ballZ, sourceZ, routeProgress) + Math.sin(spiralAngle) * spiralRadius,
          );
          particle.rotation.set(now * 4, spiralAngle, now * 2.4);
          particle.scale.setScalar(0.72 + (particleIndex % 3) * 0.18);
        } else {
          particle.position.set(Math.cos(angle) * orbit, 0.13 + 0.18 + (particleIndex % 3) * 0.07, Math.sin(angle) * orbit);
          particle.rotation.set(now * 2 + particleIndex, now * 1.7, now * 2.4);
          particle.scale.setScalar(0.85);
        }
        particle.material.color.set(particleIndex % 2 ? secondary : primary);
        const visible = ['eagleShot', 'tornadoShot', 'eulryongta', 'vacuumCleaner'].includes(effect.skillId);
        setOpacity(particle, visible ? fade * 0.78 : 0);
      });

      slot.beam.visible = false;
      if (effect.skillId === 'vacuumCleaner') {
        const start = source;
        const end = ball;
        const startPoint = new THREE.Vector3(
          worldX(start.x) - root.position.x,
          (Number(start.height) || 0) / 80 + 0.18 - root.position.y,
          worldZ(start.y) - root.position.z,
        );
        const endPoint = new THREE.Vector3(
          worldX(end.x) - root.position.x,
          (Number(end.height) || 0) / 80 + 0.18 - root.position.y,
          worldZ(end.y) - root.position.z,
        );
        const direction = endPoint.clone().sub(startPoint);
        const length = direction.length();
        slot.beam.position.copy(startPoint).addScaledVector(direction, 0.5);
        slot.beam.quaternion.setFromUnitVectors(WORLD_UP, direction.lengthSq() ? direction.normalize() : WORLD_UP);
        slot.beam.scale.set(1, length, 1);
        slot.beam.material.color.set(secondary);
        setOpacity(slot.beam, fade * 0.76);
        slot.beam.visible = length > 0.08;
      }


      if (effect.skillId === 'eulryongta') {
        const burstScale = 0.95 + progress * 1.2;
        root.scale.set(burstScale, 1.1, burstScale);
      }
      if (effect.skillId === 'eagleShot') {
        slot.rings[0].rotation.z = 0.35;
        slot.rings[1].rotation.z = -0.35;
      }
    }

    const airbornePlayers = (state?.players ?? []).filter((player) => !player.dismissed && (player.airborneSecondsRemaining ?? 0) > 0);
    for (let index = 0; index < airSlots.length; index += 1) {
      const slot = airSlots[index];
      const player = airbornePlayers[index];
      if (!player) {
        slot.root.visible = false;
        continue;
      }
      slot.root.visible = true;
      slot.root.position.set(worldX(player.x), 1.04 + Math.sin(player.airborneSecondsRemaining * 7) * 0.06, worldZ(player.y));
      const time = (player.airborneSecondsRemaining ?? 0) * 5;
      slot.rings.forEach((ring, ringIndex) => {
        ring.position.y = -0.3 + ringIndex * 0.29;
        ring.rotation.set(Math.PI / 2, 0, time * (ringIndex % 2 ? -1 : 1.6));
        ring.scale.setScalar(0.72 + ringIndex * 0.12 + Math.sin(time + ringIndex) * 0.08);
        ring.material.opacity = 0.62 - ringIndex * 0.1;
      });
      slot.particles.forEach((particle, particleIndex) => {
        const angle = particleIndex / slot.particles.length * Math.PI * 2 + time * 1.8;
        const radius = 0.35 + (particleIndex % 2) * 0.1;
        particle.position.set(Math.cos(angle) * radius, -0.48 + (particleIndex % 3) * 0.43, Math.sin(angle) * radius);
        particle.rotation.set(time, angle, time * 0.7);
      });
    }

  });

  return <>
    <primitive object={scene} dispose={null} />
    <EagleProjectile3D gameStateRef={gameStateRef} />
  </>;
}
