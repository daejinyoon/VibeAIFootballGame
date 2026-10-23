import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FIELD } from '../game/constants.js';

const BAND_SEGMENTS = 42;
const TRAIL_CAPACITY = 24;
const TORNADO_COLORS = {
  home: { wind: '#48dff5', edge: '#d9ffff', glow: '#7df5ff', debris: '#a9f8ff' },
  away: { wind: '#ff805e', edge: '#ffe7bd', glow: '#ffb15c', debris: '#ffd08a' },
};
const FUNNEL_GEOMETRY = new THREE.ConeGeometry(1.18, 2.48, 36, 1, true);
const RING_GEOMETRY = new THREE.TorusGeometry(0.48, 0.035, 8, 36);
const DEBRIS_GEOMETRY = new THREE.DodecahedronGeometry(0.075, 0);

function createWindBand() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((BAND_SEGMENTS + 1) * 2 * 3);
  const indices = [];
  for (let segment = 0; segment < BAND_SEGMENTS; segment += 1) {
    const first = segment * 2;
    indices.push(first, first + 1, first + 2, first + 1, first + 3, first + 2);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({
    color: '#48dff5', transparent: true, opacity: 0.64,
    side: THREE.DoubleSide, depthWrite: false, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return { geometry, material, mesh };
}

function createTrail() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_CAPACITY * 3), 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({
    color: '#7df5ff', transparent: true, opacity: 0.92,
    depthWrite: false, toneMapped: false,
  });
  const line = new THREE.Line(geometry, material);
  line.frustumCulled = false;
  return { geometry, material, line, count: 0, lastX: NaN, lastZ: NaN };
}

function createStorm() {
  const root = new THREE.Group();
  const funnelMaterial = new THREE.MeshBasicMaterial({
    color: '#48dff5', transparent: true, opacity: 0.23,
    side: THREE.DoubleSide, depthWrite: false, toneMapped: false,
  });
  const funnel = new THREE.Mesh(FUNNEL_GEOMETRY, funnelMaterial);
  funnel.position.y = 1.24;
  root.add(funnel);

  const bands = [createWindBand(), createWindBand()];
  bands.forEach(({ mesh }) => root.add(mesh));

  const rings = Array.from({ length: 5 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: index % 2 ? '#d9ffff' : '#48dff5', transparent: true,
      opacity: 0.9, depthWrite: false, toneMapped: false,
    });
    const ring = new THREE.Mesh(RING_GEOMETRY, material);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12 + index * 0.43;
    root.add(ring);
    return { mesh: ring, material };
  });

  const groundRingMaterial = new THREE.MeshBasicMaterial({
    color: '#7df5ff', transparent: true, opacity: 0.9,
    depthWrite: false, toneMapped: false,
  });
  const groundRing = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.04, 8, 48), groundRingMaterial);
  groundRing.rotation.x = Math.PI / 2;
  groundRing.position.y = 0.055;
  root.add(groundRing);

  const innerGroundRingMaterial = new THREE.MeshBasicMaterial({
    color: '#e6ffff', transparent: true, opacity: 0.74,
    depthWrite: false, toneMapped: false,
  });
  const innerGroundRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.022, 6, 40), innerGroundRingMaterial);
  innerGroundRing.rotation.x = Math.PI / 2;
  innerGroundRing.position.y = 0.065;
  root.add(innerGroundRing);

  const debris = Array.from({ length: 16 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: '#a9f8ff', transparent: true, opacity: 0.92,
      depthWrite: false, toneMapped: false,
    });
    const mesh = new THREE.Mesh(DEBRIS_GEOMETRY, material);
    mesh.userData.phase = index * 2.399;
    root.add(mesh);
    return { mesh, material };
  });

  const trail = createTrail();
  return {
    root, funnel, funnelMaterial, bands, rings,
    groundRing, groundRingMaterial, innerGroundRing, innerGroundRingMaterial,
    debris, trail,
  };
}

function worldX(x) {
  return Number(x) / 80 - FIELD.width / 160;
}

function worldZ(y) {
  return (Number(y) - FIELD.height / 2) / 80;
}

function clearTrail(trail) {
  trail.count = 0;
  trail.lastX = NaN;
  trail.lastZ = NaN;
  trail.geometry.setDrawRange(0, 0);
  trail.geometry.attributes.position.needsUpdate = true;
}

/** A live, layered storm that follows a Tornado Shot ball without changing play. */
export function TornadoShot3D({ gameStateRef }) {
  const storm = useMemo(createStorm, []);

  useEffect(() => () => {
    storm.funnelMaterial.dispose();
    for (const { geometry, material } of storm.bands) {
      geometry.dispose();
      material.dispose();
    }
    for (const { material } of storm.rings) material.dispose();
    storm.groundRing.geometry.dispose();
    storm.groundRingMaterial.dispose();
    storm.innerGroundRing.geometry.dispose();
    storm.innerGroundRingMaterial.dispose();
    for (const { material } of storm.debris) material.dispose();
    storm.trail.geometry.dispose();
    storm.trail.material.dispose();
  }, [storm]);

  useFrame(() => {
    const state = gameStateRef?.current;
    const effect = state?.tornadoShotEffect;
    const ball = state?.ball;
    const ballX = Number(ball?.x);
    const ballZ = Number(ball?.y);
    const isActive = Boolean(effect && ball?.flightKind === 'skill-shot'
      && ball?.skillId === 'tornadoShot'
      && Number.isFinite(ballX) && Number.isFinite(ballZ));

    if (!isActive) {
      storm.root.visible = false;
      clearTrail(storm.trail);
      return;
    }

    const team = effect.team === 'away' ? 'away' : 'home';
    const colors = TORNADO_COLORS[team];
    const elapsed = Math.max(0, Number(effect.elapsedSeconds) || 0);
    const width = THREE.MathUtils.clamp((Number(effect.pathWidth) || 42) / 42, 0.9, 2.1);
    const x = worldX(ballX);
    const z = worldZ(ballZ);
    const height = Math.max(0, Number(ball.height) || 0) / 80;
    storm.root.visible = true;
    storm.root.position.set(x, 0, z);
    storm.root.scale.set(width, 1, width);

    storm.funnelMaterial.color.set(colors.wind);
    storm.funnelMaterial.opacity = 0.2 + (Math.sin(elapsed * 8) + 1) * 0.055;

    storm.bands.forEach(({ geometry, material }, bandIndex) => {
      const positions = geometry.attributes.position.array;
      const direction = bandIndex === 0 ? 1 : -1;
      const time = elapsed * direction * 4.2 + bandIndex * Math.PI;
      for (let segment = 0; segment <= BAND_SEGMENTS; segment += 1) {
        const progress = segment / BAND_SEGMENTS;
        const angle = progress * Math.PI * 7 + time;
        const radius = (0.42 + Math.sin(progress * Math.PI) * 0.67) * (0.85 + Math.sin(elapsed * 9 + progress * 12 + bandIndex) * 0.08);
        const halfAngle = 0.23 + Math.sin(elapsed * 13 + progress * 18 + bandIndex) * 0.035;
        const localHeight = 0.12 + progress * 2.3;
        const left = segment * 6;
        const right = left + 3;
        positions[left] = Math.cos(angle - halfAngle) * radius;
        positions[left + 1] = localHeight;
        positions[left + 2] = Math.sin(angle - halfAngle) * radius;
        positions[right] = Math.cos(angle + halfAngle) * radius;
        positions[right + 1] = localHeight;
        positions[right + 2] = Math.sin(angle + halfAngle) * radius;
      }
      geometry.attributes.position.needsUpdate = true;
      material.color.set(bandIndex ? colors.edge : colors.wind);
      material.opacity = 0.52 + (Math.sin(elapsed * 14 + bandIndex) + 1) * 0.09;
    });

    storm.rings.forEach(({ mesh, material }, index) => {
      const cycle = (elapsed * (0.48 + index * 0.035) + index / storm.rings.length) % 1;
      mesh.position.y = 0.08 + cycle * 2.35;
      const radius = 0.34 + (1 - cycle) * 0.55;
      mesh.scale.set(radius, radius, radius);
      mesh.rotation.y = elapsed * (index % 2 ? -3.5 : 3.5);
      material.color.set(index % 2 ? colors.edge : colors.glow);
      material.opacity = 0.35 + (1 - cycle) * 0.55;
    });

    storm.debris.forEach(({ mesh, material }, index) => {
      const phase = mesh.userData.phase;
      const angle = phase + elapsed * (index % 2 ? -5.7 : 5.7);
      const localHeight = 0.14 + (index % 8) / 7 * 2.08;
      const radius = 0.45 + localHeight * 0.31 + Math.sin(elapsed * 9 + phase) * 0.09;
      mesh.position.set(Math.cos(angle) * radius, localHeight, Math.sin(angle) * radius);
      mesh.rotation.set(elapsed * 3 + phase, elapsed * 4.5, elapsed * 2.7 - phase);
      mesh.scale.setScalar(0.7 + (index % 4) * 0.19);
      material.color.set(index % 3 ? colors.debris : colors.edge);
      material.opacity = 0.64 + (Math.sin(elapsed * 12 + phase) + 1) * 0.16;
    });

    const pulse = 0.88 + (Math.sin(elapsed * 15) + 1) * 0.12;
    storm.groundRing.scale.setScalar(width * pulse);
    storm.groundRing.rotation.y = elapsed * 1.6;
    storm.groundRingMaterial.color.set(colors.glow);
    storm.innerGroundRing.scale.setScalar(0.86 + Math.sin(elapsed * 12) * 0.08);
    storm.innerGroundRing.rotation.y = -elapsed * 2.4;
    storm.innerGroundRingMaterial.color.set(colors.edge);

    const trail = storm.trail;
    const movedEnough = !Number.isFinite(trail.lastX)
      || (x - trail.lastX) ** 2 + (z - trail.lastZ) ** 2 >= 0.0025;
    if (movedEnough) {
      const positions = trail.geometry.attributes.position.array;
      positions.copyWithin(0, 3, trail.count * 3);
      const offset = Math.min(trail.count, TRAIL_CAPACITY - 1) * 3;
      positions[offset] = x;
      positions[offset + 1] = 0.075 + height * 0.12;
      positions[offset + 2] = z;
      trail.count = Math.min(TRAIL_CAPACITY, trail.count + 1);
      trail.lastX = x;
      trail.lastZ = z;
      trail.geometry.setDrawRange(0, trail.count);
      trail.geometry.attributes.position.needsUpdate = true;
    }
    trail.material.color.set(colors.glow);
    trail.material.opacity = 0.78;
  });

  return <>
    <primitive object={storm.root} dispose={null} />
    <primitive object={storm.trail.line} dispose={null} />
  </>;
}
