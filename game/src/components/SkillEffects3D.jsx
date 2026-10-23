import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FIELD } from '../game/constants.js';
import { EagleProjectile3D } from './EagleProjectile3D.jsx';

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
const RAINBOW_RIBBON_SEGMENTS = 18;
const RING_GEOMETRY = new THREE.TorusGeometry(0.38, 0.035, 8, 40);
const PARTICLE_GEOMETRY = new THREE.TetrahedronGeometry(0.09, 0);
const BEAM_GEOMETRY = new THREE.CylinderGeometry(0.045, 0.12, 1, 10, 1, true);
const RAINBOW_GEOMETRIES = RAINBOW.map(() => new THREE.TorusGeometry(0.53, 0.025, 6, 24, Math.PI));
const RAINBOW_SHIELD_GEOMETRIES = RAINBOW.map((_, index) => new THREE.SphereGeometry(
  1, 10, 12, (index / RAINBOW.length) * Math.PI * 2, Math.PI * 2 / RAINBOW.length, 0.12, Math.PI - 0.24,
));
const AIR_RING_GEOMETRY = new THREE.TorusGeometry(0.3, 0.025, 6, 28);
const AIR_PARTICLE_GEOMETRY = new THREE.TetrahedronGeometry(0.06, 0);
function makeFissureGeometry(halfWidth, jitterScale) {
  const shape = new THREE.Shape();
  const segments = 24;
  const edgeJitter = (index, salt) => Math.sin(index * 12.9898 + salt * 78.233) * jitterScale;
  shape.moveTo(-0.5, -halfWidth + edgeJitter(0, 1));
  for (let index = 1; index <= segments; index += 1) {
    const x = -0.5 + index / segments;
    shape.lineTo(x, -halfWidth + edgeJitter(index, 1));
  }
  for (let index = segments - 1; index >= 0; index -= 1) {
    const x = -0.5 + index / segments;
    shape.lineTo(x, halfWidth + edgeJitter(index, 2));
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

const BARRIER_FISSURE_GEOMETRY = makeFissureGeometry(0.19, 0.065);
const BARRIER_GLOW_GEOMETRY = makeFissureGeometry(0.035, 0.012);
const BARRIER_PLATE_GEOMETRY = new THREE.DodecahedronGeometry(1, 0);
const BARRIER_GROUND_PLATE_GEOMETRY = new THREE.DodecahedronGeometry(1, 0);
const BARRIER_SHARD_GEOMETRY = new THREE.ConeGeometry(0.3, 0.9, 5, 1);
const BARRIER_DEBRIS_GEOMETRY = new THREE.TetrahedronGeometry(0.15, 0);
const RAINBOW_PULSE_GEOMETRY = new THREE.SphereGeometry(0.12, 12, 8);
const BARRIER_GROUND_MATERIAL = new THREE.MeshStandardMaterial({ color: '#100f15', roughness: 1, emissive: '#09070b', emissiveIntensity: 0.28, side: THREE.DoubleSide });
const BARRIER_GLOW_MATERIAL = new THREE.MeshBasicMaterial({ color: '#ff672b', transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
const BARRIER_PLATE_MATERIAL = new THREE.MeshStandardMaterial({ color: '#635748', roughness: 0.96, emissive: '#241911', emissiveIntensity: 0.3 });
const BARRIER_GROUND_PLATE_MATERIAL = new THREE.MeshStandardMaterial({ color: '#837361', roughness: 0.98, emissive: '#28170f', emissiveIntensity: 0.18 });
const BARRIER_SHARD_MATERIAL = new THREE.MeshStandardMaterial({ color: '#766149', roughness: 0.92, emissive: '#713112', emissiveIntensity: 0.48 });

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

function makeRibbon(color) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((RAINBOW_RIBBON_SEGMENTS + 1) * 2 * 3);
  const indices = [];
  for (let index = 0; index <= RAINBOW_RIBBON_SEGMENTS; index += 1) {
    if (index < RAINBOW_RIBBON_SEGMENTS) {
      const vertex = index * 2;
      indices.push(vertex, vertex + 1, vertex + 2, vertex + 1, vertex + 3, vertex + 2);
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  return { mesh: new THREE.Mesh(geometry, material), positions };
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
  const rainbowStrands = RAINBOW.map((color) => {
    const ribbon = makeRibbon(color);
    root.add(ribbon.mesh);
    return ribbon;
  });
  const rainbowPulse = makeMesh(RAINBOW_PULSE_GEOMETRY, '#ffffff', 0.98);
  root.add(rainbowPulse);
  const arcs = RAINBOW.map((color, index) => {
    const mesh = makeMesh(RAINBOW_GEOMETRIES[index], color, 0.88);
    root.add(mesh);
    return mesh;
  });
  const shieldSegments = RAINBOW.map((color, index) => {
    const material = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.34, depthWrite: false,
      toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(RAINBOW_SHIELD_GEOMETRIES[index], material);
    root.add(mesh);
    return mesh;
  });
  return { root, rings, particles, beam, rainbowStrands, rainbowPulse, arcs, shieldSegments };
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
  const groundCrack = new THREE.Mesh(BARRIER_FISSURE_GEOMETRY, BARRIER_GROUND_MATERIAL);
  groundCrack.rotation.x = -Math.PI / 2;
  groundCrack.position.y = 0.026;
  root.add(groundCrack);
  const glow = new THREE.Mesh(BARRIER_GLOW_GEOMETRY, BARRIER_GLOW_MATERIAL);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.04;
  root.add(glow);
  const groundPlates = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let index = 0; index < 14; index += 1) {
      const plate = new THREE.Mesh(BARRIER_GROUND_PLATE_GEOMETRY, BARRIER_GROUND_PLATE_MATERIAL);
      plate.userData = { side, index };
      root.add(plate);
      groundPlates.push(plate);
    }
  }
  const wallBlocks = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let index = 0; index < 14; index += 1) {
      const plate = new THREE.Mesh(BARRIER_PLATE_GEOMETRY, BARRIER_PLATE_MATERIAL);
      plate.userData = { side, index };
      root.add(plate);
      wallBlocks.push(plate);
    }
  }
  const shards = [];
  for (let index = 0; index < 14; index += 1) {
    const shard = new THREE.Mesh(BARRIER_SHARD_GEOMETRY, BARRIER_SHARD_MATERIAL);
    shard.position.set(-0.46 + index * 0.071, 0.96, (index % 2 ? 1 : -1) * 0.5);
    shard.scale.set(0.72 + (index % 3) * 0.1, 0.75 + (index % 2) * 0.18, 0.8);
    shard.rotation.set((index % 2) * 0.16, index * 0.43, (index % 3 - 1) * 0.2);
    root.add(shard);
    shards.push(shard);
  }
  const debris = Array.from({ length: 22 }, (_, index) => {
    const piece = new THREE.Mesh(BARRIER_DEBRIS_GEOMETRY, new THREE.MeshStandardMaterial({
      color: index % 2 ? '#b38a55' : '#73624f', emissive: '#a24217', emissiveIntensity: 0.35,
      roughness: 0.92, transparent: true, opacity: 0.85,
    }));
    root.add(piece);
    return piece;
  });
  return { root, groundCrack, glow, groundPlates, wallBlocks, shards, debris };
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
      for (const mesh of [...slot.rings, ...slot.particles, slot.beam, ...slot.rainbowStrands.map(({ mesh }) => mesh), slot.rainbowPulse, ...slot.arcs, ...slot.shieldSegments]) mesh.material.dispose();
      for (const { mesh } of slot.rainbowStrands) mesh.geometry.dispose();
    }
    for (const slot of airSlots) {
      for (const mesh of [...slot.rings, ...slot.particles]) mesh.material.dispose();
    }
    for (const slot of barrierSlots) {
      for (const mesh of [slot.groundCrack, slot.glow, ...slot.groundPlates, ...slot.wallBlocks, ...slot.shards, ...slot.debris]) mesh.material.dispose();
    }
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
      const isBallSkill = effect.skillId === 'eagleShot' || effect.skillId === 'tornadoShot'
        || (effect.skillId === 'rainbowReflect' && ball.flightKind === 'skill-shot' && ball.skillId === 'rainbowReflect');
      const anchor = effect.skillId === 'rainbowReflect' ? source : effect.position ?? (isBallSkill ? ball : (target ?? source));
      root.visible = true;
      root.position.set(worldX(anchor.x), (Number(anchor.height) || 0) / 80 + 0.12, worldZ(anchor.y));
      root.rotation.set(0, 0, 0);
      root.scale.setScalar(effect.skillId === 'rainbowReflect' ? 1 : 1.65);

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
        const visible = ['eagleShot', 'tornadoShot', 'powerTackle', 'eulryongta', 'vacuumCleaner', 'rainbowReflect'].includes(effect.skillId);
        setOpacity(particle, visible ? fade * 0.78 : 0);
      });

      slot.beam.visible = false;
      slot.rainbowStrands.forEach(({ mesh }) => { mesh.visible = false; });
      slot.rainbowPulse.visible = false;
      if (effect.skillId === 'vacuumCleaner' || (effect.skillId === 'rainbowReflect' && !effect.cancellationPulse)) {
        const start = source;
        const end = effect.skillId === 'vacuumCleaner' ? ball : target;
        const startPoint = new THREE.Vector3(
          worldX(start.x) - root.position.x,
          (Number(start.height) || 0) / 80 + (effect.skillId === 'rainbowReflect' ? 0.78 : 0.18) - root.position.y,
          worldZ(start.y) - root.position.z,
        );
        const endPoint = new THREE.Vector3(
          worldX(end.x) - root.position.x,
          (Number(end.height) || 0) / 80 + (effect.skillId === 'rainbowReflect' ? 0.78 : 0.18) - root.position.y,
          worldZ(end.y) - root.position.z,
        );
        const direction = endPoint.clone().sub(startPoint);
        const length = direction.length();
        if (effect.skillId === 'rainbowReflect' && target) {
          const unitDirection = direction.lengthSq() ? direction.clone().normalize() : WORLD_UP;
          const side = new THREE.Vector3(-unitDirection.z, 0, unitDirection.x).normalize();
          slot.rainbowStrands.forEach(({ mesh, positions }, strandIndex) => {
            const laneOffset = (strandIndex - (slot.rainbowStrands.length - 1) / 2) * 0.052;
            const halfWidth = 0.018 + Math.sin(now * 20 + strandIndex) * 0.004;
            for (let pointIndex = 0; pointIndex <= RAINBOW_RIBBON_SEGMENTS; pointIndex += 1) {
              const t = pointIndex / RAINBOW_RIBBON_SEGMENTS;
              const wave = Math.sin(t * Math.PI * 2.4 - now * 12 + strandIndex * 0.65);
              const center = startPoint.clone().lerp(endPoint, t)
                .addScaledVector(side, laneOffset + wave * 0.075)
                .add(new THREE.Vector3(0, Math.sin(t * Math.PI) * 0.22 + Math.sin(t * Math.PI * 4 - now * 10 + strandIndex) * 0.045, 0));
              const vertex = pointIndex * 6;
              positions[vertex] = center.x;
              positions[vertex + 1] = center.y - halfWidth;
              positions[vertex + 2] = center.z;
              positions[vertex + 3] = center.x;
              positions[vertex + 4] = center.y + halfWidth;
              positions[vertex + 5] = center.z;
            }
            mesh.geometry.attributes.position.needsUpdate = true;
            mesh.geometry.boundingSphere = new THREE.Sphere(startPoint.clone().lerp(endPoint, 0.5), length * 0.6 + 0.5);
            mesh.material.opacity = fade * (0.82 + Math.sin(now * 22 + strandIndex) * 0.12);
            mesh.visible = length > 0.08;
          });
          slot.rainbowPulse.position.copy(startPoint).lerp(endPoint, progress);
          slot.rainbowPulse.material.color.set(RAINBOW[Math.floor(now * 16) % RAINBOW.length]);
          slot.rainbowPulse.scale.setScalar(1.55 + Math.sin(now * 35) * 0.35);
          slot.rainbowPulse.material.opacity = fade;
          slot.rainbowPulse.visible = true;
          if ((effect.transferredStatuses ?? []).length > 0 && progress > 0.68) {
            const arrival = Math.min(1, (progress - 0.68) / 0.24);
            const ring = slot.rings[0];
            ring.visible = true;
            ring.position.copy(endPoint).add(new THREE.Vector3(0, -0.5, 0));
            ring.scale.setScalar(0.55 + arrival * 1.1);
            ring.material.color.set(RAINBOW[(Math.floor(now * 10) + 2) % RAINBOW.length]);
            setOpacity(ring, fade * (1 - arrival * 0.35));
            slot.particles.slice(0, 4).forEach((particle, particleIndex) => {
              const angle = particleIndex / 4 * Math.PI * 2 + now * 18;
              particle.position.copy(endPoint).add(new THREE.Vector3(Math.cos(angle) * 0.28, -0.42 + Math.sin(angle * 2) * 0.08, Math.sin(angle) * 0.24));
              particle.material.color.set(particleIndex % 2 ? '#fff8b0' : '#a7f6ff');
              setOpacity(particle, fade * arrival);
            });
          }
          if (effect.transferredStatuses?.length && progress < 0.22) {
            const departure = 1 - progress / 0.22;
            const ring = slot.rings[2];
            ring.visible = true;
            ring.position.copy(startPoint).add(new THREE.Vector3(0, -0.5, 0));
            ring.scale.setScalar(0.3 + (1 - departure) * 0.86);
            ring.material.color.set('#ffffff');
            setOpacity(ring, fade * departure * 0.9);
          }
        } else {
          slot.beam.position.copy(startPoint).addScaledVector(direction, 0.5);
          slot.beam.quaternion.setFromUnitVectors(WORLD_UP, direction.lengthSq() ? direction.normalize() : WORLD_UP);
          slot.beam.scale.set(1, length, 1);
          slot.beam.material.color.set(secondary);
          setOpacity(slot.beam, fade * 0.76);
          slot.beam.visible = length > 0.08;
        }
      }

      if (effect.skillId === 'rainbowReflect' && effect.cancellationPulse) {
        const destination = effect.returnTargetPosition ?? { x: effect.team === 'home' ? FIELD.width : 0, y: anchor.y };
        root.rotation.y = Math.atan2(worldX(destination.x) - worldX(anchor.x), worldZ(destination.y) - worldZ(anchor.y));
      }

      slot.arcs.forEach((arc, arcIndex) => {
        const rainbowActive = effect.skillId === 'rainbowReflect';
        arc.material.color.set(RAINBOW[arcIndex]);
        arc.position.set(0, 0.34 + arcIndex * 0.032, -0.08);
        arc.rotation.set(0, effect.cancellationPulse ? 0 : 0, Math.PI + (arcIndex % 2) * 0.04);
        const returnPulse = effect.cancellationPulse ? 1 + progress * 0.55 : 0.75;
        arc.scale.set((0.75 + arcIndex * 0.035) * returnPulse, (0.82 + arcIndex * 0.035) * returnPulse, 1);
        setOpacity(arc, rainbowActive ? fade * 0.82 : 0);
      });
      slot.shieldSegments.forEach((segment, segmentIndex) => {
        const shieldActive = effect.skillId === 'rainbowReflect';
        const shieldRise = THREE.MathUtils.clamp(progress * 8, 0, 1);
        const shieldFade = Math.max(0, 1 - progress * 3.6);
        const shimmer = 0.88 + Math.sin(now * 30 + segmentIndex * 0.9) * 0.12;
        segment.position.set(0, 0.76, 0);
        segment.scale.set(0.54 + shieldRise * 0.11, 0.77 + shieldRise * 0.14, 0.32 + shieldRise * 0.06);
        segment.rotation.y = segmentIndex * 0.008;
        segment.material.opacity = shieldActive ? (0.28 + Math.sin(now * 24 + segmentIndex) * 0.09) * shieldFade * shimmer : 0;
        segment.visible = shieldActive && shieldFade > 0.02;
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
      if (!barrier || !Number.isFinite(barrier.remainingSeconds) || barrier.remainingSeconds <= 0
          || ![barrier.x, barrier.y, barrier.length, barrier.facingX, barrier.facingY].every(Number.isFinite)) {
        slot.root.visible = false;
        continue;
      }
      const facingLength = Math.hypot(barrier.facingX, barrier.facingY) || 1;
      const facingX = barrier.facingX / facingLength;
      const facingY = barrier.facingY / facingLength;
      const age = Math.max(0, Number(barrier.elapsedSeconds) || 0);
      const rise = THREE.MathUtils.smoothstep(age, 0, 0.35);
      const wallOffset = Math.max(0, Number(barrier.wallOffset) || 40) / 80;
      const directionAngle = Math.atan2(-facingY, facingX);
      const lifetime = Math.max(0.001, Number(barrier.remainingSeconds) || 0.001);
      const fade = Math.min(1, lifetime / 0.28);
      slot.root.visible = true;
      slot.root.position.set(
        worldX(barrier.x + facingX * barrier.length / 2),
        0,
        worldZ(barrier.y + facingY * barrier.length / 2),
      );
      slot.root.rotation.y = directionAngle;
      slot.root.scale.set(barrier.length / 80, 1, 1);
      const accent = barrier.team === 'away' ? '#ffb54f' : '#6ef3ff';
      const pulse = 0.76 + Math.sin(age * 13) * 0.16;
      const teamGlow = barrier.team === 'away' ? '#ff653c' : '#ff8d38';
      slot.glow.material.color.set(teamGlow);
      slot.glow.material.opacity = pulse * fade;
      slot.groundCrack.material.emissive.set(accent);
      const maximumWallHeight = Math.max(0.3, Number(barrier.height) || 144) / 80;
      slot.groundPlates.forEach((plate) => {
        const { side, index: plateIndex } = plate.userData;
        const lane = plateIndex / 13;
        const jitter = Math.sin(plateIndex * 8.17 + side * 3.2);
        const chipRise = rise * (0.035 + (plateIndex % 4) * 0.012);
        plate.position.set(-0.47 + lane * 0.94, 0.035 + chipRise, side * (0.205 + rise * (0.045 + Math.abs(jitter) * 0.035)));
        plate.rotation.set(0.1 + jitter * 0.12, plateIndex * 0.7, (plateIndex % 2 ? 1 : -1) * 0.07);
        plate.scale.set(0.025 + (plateIndex % 3) * 0.009, 0.025 + (plateIndex % 2) * 0.014, 0.045 + Math.abs(jitter) * 0.035);
        plate.material.emissive.set(accent === '#ffb54f' ? '#352017' : '#162b30');
      });
      slot.wallBlocks.forEach((block) => {
        const { side, index: blockIndex } = block.userData;
        const lane = blockIndex / 13;
        const variation = Math.sin(blockIndex * 4.61 + side * 2.7);
        const shapeHeight = 0.72 + (blockIndex % 4) * 0.055 + Math.abs(variation) * 0.08;
        const height = maximumWallHeight / 1.88 * shapeHeight * rise;
        block.position.set(-0.48 + lane * 0.96, height * 0.88, side * wallOffset);
        block.rotation.set(variation * 0.12, blockIndex * 0.63, variation * 0.16);
        block.scale.set(0.115 + (blockIndex % 3) * 0.017, height, 0.22 + (blockIndex % 4) * 0.025);
        block.material.color.set(blockIndex % 3 ? '#655747' : '#83715b');
        block.material.emissive.set(accent === '#ffb54f' ? '#2b1710' : '#17262a');
      });
      slot.shards.forEach((shard, shardIndex) => {
        const side = shardIndex % 2 ? 1 : -1;
        shard.position.y = 1.55 * rise * (0.78 + (shardIndex % 3) * 0.1);
        shard.position.z = side * wallOffset;
        shard.position.x = -0.48 + (shardIndex / (slot.shards.length - 1)) * 0.96;
        shard.rotation.z = (shardIndex % 2 ? -1 : 1) * (0.13 + Math.sin(age * 11 + shardIndex) * 0.035);
        shard.scale.set(0.75 + (shardIndex % 3) * 0.08, rise * (0.8 + (shardIndex % 2) * 0.3), 0.7 + (shardIndex % 2) * 0.15);
      });
      slot.debris.forEach((piece, pieceIndex) => {
        const lane = pieceIndex / slot.debris.length;
        const side = pieceIndex % 2 ? 1 : -1;
        const flutter = age * (5 + pieceIndex % 4) + pieceIndex * 1.7;
        const flight = Math.sin(Math.min(1, age / 0.8) * Math.PI / 2) * Math.max(0, 1 - Math.max(0, age - 0.8) / 2.2);
        piece.position.set(-0.5 + lane + Math.sin(flutter) * 0.045 * flight,
          0.08 + flight * (0.38 + (pieceIndex % 4) * 0.08),
          side * (wallOffset + 0.1 + Math.cos(flutter * 1.3) * 0.09 * flight));
        piece.rotation.set(flutter * 0.7, flutter, flutter * 0.45);
        piece.scale.setScalar((0.45 + Math.abs(Math.sin(flutter * 0.8)) * 0.65) * rise);
        piece.material.color.set(pieceIndex % 3 ? '#8f785b' : '#c99b5e');
        piece.material.emissive.set(accent === '#ffb54f' ? '#a34318' : '#226b75');
        piece.material.opacity = (0.62 + Math.abs(Math.sin(flutter)) * 0.3) * fade;
      });
    }

  });

  return <>
    <primitive object={scene} dispose={null} />
    <EagleProjectile3D gameStateRef={gameStateRef} />
  </>;
}
