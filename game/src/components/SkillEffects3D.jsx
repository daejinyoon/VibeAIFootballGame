import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FIELD } from '../game/constants.js';

const SLOT_COUNT = 32;
const AIR_SLOT_COUNT = 16;
const BARRIER_SLOT_COUNT = 2;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
export const SKILL_EFFECT_COLORS = {
  eagleShot: { home: ['#fff2a0', '#ff8b35'], away: ['#ffe28d', '#fa5f59'] },
  tornadoShot: { home: ['#a9f5ff', '#53d7e8'], away: ['#ffe39a', '#ff8b68'] },
  powerTackle: { home: ['#dfff75', '#64e6ce'], away: ['#ffd47a', '#ff756c'] },
  eulryongta: { home: ['#ffec8b', '#ff7a55'], away: ['#ffc276', '#ec5c74'] },
  vacuumCleaner: { home: ['#9dffec', '#67d7fa'], away: ['#ffe29a', '#ff806c'] },
  rainbowReflect: { home: ['#85efff', '#e2ff8e'], away: ['#ffb08a', '#ffe68d'] },
};
const RAINBOW = ['#ff5c66', '#ffad4d', '#fff06c', '#6ce999', '#59c9ff', '#b28aff'];
const RING_GEOMETRY = new THREE.TorusGeometry(0.38, 0.035, 8, 40);
const PARTICLE_GEOMETRY = new THREE.TetrahedronGeometry(0.09, 0);
const BEAM_GEOMETRY = new THREE.CylinderGeometry(0.045, 0.12, 1, 10, 1, true);
const RAINBOW_GEOMETRIES = RAINBOW.map(() => new THREE.TorusGeometry(0.53, 0.025, 6, 24, Math.PI));
const AIR_RING_GEOMETRY = new THREE.TorusGeometry(0.3, 0.025, 6, 28);
const AIR_PARTICLE_GEOMETRY = new THREE.TetrahedronGeometry(0.06, 0);
const BARRIER_BASE_GEOMETRY = new THREE.BoxGeometry(1, 0.34, 0.34);
const BARRIER_SHARD_GEOMETRY = new THREE.DodecahedronGeometry(0.16, 0);
const BARRIER_CRACK_GEOMETRY = new THREE.BoxGeometry(0.018, 0.28, 0.02);
const BARRIER_BASE_MATERIAL = new THREE.MeshStandardMaterial({ color: '#4b382a', roughness: 0.96 });
const BARRIER_SHARD_MATERIAL = new THREE.MeshStandardMaterial({ color: '#756451', roughness: 0.92 });

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
  const particles = Array.from({ length: 8 }, (_, index) => {
    const mesh = makeMesh(PARTICLE_GEOMETRY);
    root.add(mesh);
    return mesh;
  });
  const beam = makeMesh(BEAM_GEOMETRY, '#9dffec', 0.45);
  root.add(beam);
  const arcs = RAINBOW.map((color, index) => {
    const mesh = makeMesh(RAINBOW_GEOMETRIES[index], color, 0.88);
    root.add(mesh);
    return mesh;
  });
  return { root, rings, particles, beam, arcs };
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

function makeBarrierSlot() {
  const root = new THREE.Group();
  const base = new THREE.Mesh(BARRIER_BASE_GEOMETRY, BARRIER_BASE_MATERIAL);
  base.position.y = 0.19;
  root.add(base);
  const shards = [];
  for (let index = 0; index < 9; index += 1) {
    const shard = new THREE.Mesh(BARRIER_SHARD_GEOMETRY, BARRIER_SHARD_MATERIAL);
    shard.position.set(-0.43 + index * 0.108, 0.28 + (index % 3) * 0.035, (index % 2 ? 1 : -1) * 0.015);
    shard.scale.set(0.8 + (index % 3) * 0.16, 1.05 + (index % 2) * 0.28, 0.85);
    shard.rotation.set((index % 2) * 0.16, index * 0.43, (index % 3 - 1) * 0.16);
    root.add(shard);
    shards.push(shard);
  }
  const cracks = Array.from({ length: 6 }, (_, index) => {
    const crackMaterial = new THREE.MeshBasicMaterial({ color: index % 2 ? '#6ef3ff' : '#ffb54f', transparent: true, toneMapped: false });
    const crack = new THREE.Mesh(BARRIER_CRACK_GEOMETRY, crackMaterial);
    crack.position.set(-0.36 + index * 0.145, 0.2, 0.188);
    crack.rotation.z = (index % 2 ? -1 : 1) * 0.42;
    root.add(crack);
    return crack;
  });
  return { root, shards, cracks };
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
  const barrierSlots = useMemo(() => Array.from({ length: BARRIER_SLOT_COUNT }, makeBarrierSlot), []);
  const scene = useMemo(() => {
    const group = new THREE.Group();
    for (const slot of slots) group.add(slot.root);
    for (const slot of airSlots) group.add(slot.root);
    for (const slot of barrierSlots) group.add(slot.root);
    return group;
  }, [slots, airSlots, barrierSlots]);

  useEffect(() => () => {
    for (const slot of slots) {
      for (const mesh of [...slot.rings, ...slot.particles, slot.beam, ...slot.arcs]) mesh.material.dispose();
    }
    for (const slot of airSlots) {
      for (const mesh of [...slot.rings, ...slot.particles]) mesh.material.dispose();
    }
    for (const slot of barrierSlots) for (const crack of slot.cracks) crack.material.dispose();
  }, [slots, airSlots, barrierSlots]);

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

      const source = state.players.find((player) => player.id === effect.sourcePlayerId);
      const target = effect.targetPlayerId
        ? state.players.find((player) => player.id === effect.targetPlayerId)
        : null;
      if (!source || source.dismissed || (effect.targetPlayerId && (!target || target.dismissed))) {
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
      const isBallSkill = effect.skillId === 'eagleShot' || effect.skillId === 'tornadoShot'
        || (effect.skillId === 'rainbowReflect' && ball.flightKind === 'skill-shot' && ball.skillId === 'rainbowReflect');
      const anchor = effect.position ?? (isBallSkill ? ball : (target ?? source));
      root.visible = true;
      root.position.set(worldX(anchor.x), (Number(anchor.height) || 0) / 80 + 0.12, worldZ(anchor.y));
      if (effect.skillId === 'vacuumCleaner') {
        const pull = state.vacuumPullVisual?.sourcePlayerId === source.id ? state.vacuumPullVisual : null;
        const midpoint = pull ? { x: (pull.from.x + pull.to.x) / 2, y: (pull.from.y + pull.to.y) / 2 }
          : { x: (source.x + ball.x) / 2, y: (source.y + ball.y) / 2 };
        root.position.set(worldX(midpoint.x), 0.18, worldZ(midpoint.y));
      }
      root.rotation.set(0, 0, 0);
      root.scale.set(1.65, 1.15, 1.65);

      const levelScale = effect.skillId === 'eagleShot' ? 1 + (Math.max(1, effect.level ?? 1) - 1) * 0.18 : 1;
      const radius = (effect.skillId === 'powerTackle' || effect.skillId === 'eulryongta' ? 0.48 : 0.36) * levelScale;
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
        if (effect.skillId === 'eagleShot') {
          const side = particleIndex < 4 ? -1 : 1;
          const feather = particleIndex % 4;
          particle.position.set(side * (0.17 + feather * 0.11), 0.16 + (3 - feather) * 0.055, (feather - 1.5) * 0.14);
          particle.rotation.set(0, 0, side * (0.45 + feather * 0.13));
          particle.scale.setScalar((1.05 - feather * 0.1) * levelScale);
        } else if (effect.skillId === 'eulryongta') {
          const coil = -1.2 + particleIndex * 0.38 + progress * 1.2;
          const coilRadius = 0.18 + particleIndex * 0.035;
          particle.position.set(Math.cos(coil) * coilRadius, 0.12 + particleIndex * 0.055, Math.sin(coil) * coilRadius);
          particle.rotation.set(now * 2 + particleIndex, now * 1.7, coil);
          particle.scale.setScalar(particleIndex === 0 ? 1.5 : 0.82);
        } else {
          particle.position.set(Math.cos(angle) * orbit, 0.13 + 0.18 + (particleIndex % 3) * 0.07, Math.sin(angle) * orbit);
          particle.rotation.set(now * 2 + particleIndex, now * 1.7, now * 2.4);
          particle.scale.setScalar(0.85);
        }
        particle.material.color.set(particleIndex % 2 ? secondary : primary);
        const visible = ['eagleShot', 'tornadoShot', 'powerTackle', 'eulryongta', 'rainbowReflect'].includes(effect.skillId);
        setOpacity(particle, visible ? fade * 0.78 : 0);
      });

      slot.beam.visible = false;
      if (effect.skillId === 'vacuumCleaner' || (effect.skillId === 'rainbowReflect' && !effect.cancellationPulse)) {
        const pull = effect.skillId === 'vacuumCleaner' && state.vacuumPullVisual?.sourcePlayerId === source.id
          ? state.vacuumPullVisual : null;
        const start = pull ? pull.from : source;
        const end = pull ? pull.to : ball;
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
        slot.beam.material.color.set(effect.skillId === 'rainbowReflect' ? primary : secondary);
        setOpacity(slot.beam, fade * (effect.skillId === 'vacuumCleaner' ? 0.5 : 0.26));
        slot.beam.visible = length > 0.08;
      }

      slot.arcs.forEach((arc, arcIndex) => {
        const rainbowActive = effect.skillId === 'rainbowReflect';
        arc.material.color.set(RAINBOW[arcIndex]);
        arc.position.set(0, 0.42 + arcIndex * 0.018, -0.08);
        arc.rotation.set(0, 0, Math.PI + (arcIndex % 2) * 0.04);
        arc.scale.set(0.75 + arcIndex * 0.035, 0.82 + arcIndex * 0.035, 1);
        setOpacity(arc, rainbowActive ? fade * 0.82 : 0);
      });
      if (effect.skillId === 'rainbowReflect' && effect.cancellationPulse) {
        const pulse = Math.min(1, progress * 5);
        slot.rings.forEach((ring, ringIndex) => {
          ring.scale.setScalar(0.7 + pulse * (1.2 + ringIndex * 0.35));
          ring.material.color.set(RAINBOW[(ringIndex + Math.floor(now * 12)) % RAINBOW.length]);
          setOpacity(ring, fade * (1 - pulse * 0.38));
        });
        slot.particles.forEach((particle, particleIndex) => {
          const angle = particleIndex / slot.particles.length * Math.PI * 2 + now * 4;
          const radius = 0.25 + pulse * 0.85;
          particle.position.set(Math.cos(angle) * radius, 0.2 + (particleIndex % 3) * 0.08, Math.sin(angle) * radius);
          particle.material.color.set(RAINBOW[particleIndex % RAINBOW.length]);
          setOpacity(particle, fade * (1 - pulse * 0.25));
        });
      }

      if (effect.skillId === 'powerTackle' && !target) {
        root.scale.set(1.45 + Math.sin(now * 12) * 0.1, 1.1, 1.45 + Math.sin(now * 12) * 0.1);
      }
      if (effect.skillId === 'eulryongta' || (effect.skillId === 'powerTackle' && target)) {
        const burstScale = 0.95 + progress * 1.2;
        root.scale.set(burstScale, 1.1, burstScale);
      }
      if (effect.skillId === 'eagleShot') {
        slot.rings[0].rotation.z = 0.35;
        slot.rings[1].rotation.z = -0.35;
      }
      if (effect.skillId === 'rainbowReflect' && isBallSkill) {
        const returnScale = 1.2 + Math.sin(now * 10) * 0.16;
        root.scale.set(returnScale, 1.1, returnScale);
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

    const barriers = state?.powerBarriers ?? [];
    for (let index = 0; index < barrierSlots.length; index += 1) {
      const slot = barrierSlots[index];
      const barrier = barriers[index];
      if (!barrier || barrier.remainingSeconds <= 0) {
        slot.root.visible = false;
        continue;
      }
      slot.root.visible = true;
      slot.root.position.set(
        worldX(barrier.x + barrier.facingX * barrier.length / 2),
        0,
        worldZ(barrier.y + barrier.facingY * barrier.length / 2),
      );
      slot.root.rotation.y = Math.atan2(-barrier.facingY, barrier.facingX);
      slot.root.scale.set(barrier.length / 80, 1, barrier.thickness / 28);
      const accent = barrier.team === 'away' ? '#ffb54f' : '#6ef3ff';
      for (const crack of slot.cracks) crack.material.color.set(accent);
      const pulse = 0.82 + Math.sin((barrier.remainingSeconds ?? 0) * 10) * 0.12;
      slot.root.children[0].material.emissive?.set('#21160e');
      slot.cracks.forEach((crack, crackIndex) => { crack.material.opacity = pulse - crackIndex * 0.025; });
    }
  });

  return <primitive object={scene} dispose={null} />;
}
