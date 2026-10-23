import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FIELD } from '../game/constants.js';

const SEGMENTS = 40;
const STREAK_COUNT = 18;
const STRAND_COLORS = ['#50edff', '#b6ffff', '#7affd8'];
const WORLD_UP = new THREE.Vector3(0, 1, 0);

function worldX(x) {
  return Number(x) / 80 - FIELD.width / 160;
}

function worldZ(y) {
  return (Number(y) - FIELD.height / 2) / 80;
}

function makeRibbon(color, strandIndex) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((SEGMENTS + 1) * 2 * 3);
  const indices = [];
  for (let segment = 0; segment < SEGMENTS; segment += 1) {
    const first = segment * 2;
    indices.push(first, first + 2, first + 1, first + 1, first + 2, first + 3);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: strandIndex === 1 ? 0.88 : 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  });
  return { geometry, material, mesh: new THREE.Mesh(geometry, material), positions };
}

function makeScene() {
  const root = new THREE.Group();
  const stream = new THREE.Group();
  const nozzle = new THREE.Group();
  const ball = new THREE.Group();
  root.add(stream, nozzle, ball);

  const ribbons = STRAND_COLORS.map((color, index) => {
    const ribbon = makeRibbon(color, index);
    stream.add(ribbon.mesh);
    return ribbon;
  });

  const streaks = Array.from({ length: STREAK_COUNT }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: STRAND_COLORS[index % STRAND_COLORS.length],
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), material);
    stream.add(mesh);
    return { mesh, material, phase: index / STREAK_COUNT };
  });

  const intakeRings = Array.from({ length: 4 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: index % 2 ? '#d4ffff' : '#55e8ff',
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.022, 8, 40), material);
    nozzle.add(mesh);
    return { mesh, material, phase: index / 4 };
  });

  const canisterMaterial = new THREE.MeshStandardMaterial({ color: '#1a677f', emissive: '#0a526d', emissiveIntensity: 0.7, metalness: 0.42, roughness: 0.3 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: '#9afff0', emissive: '#42dfff', emissiveIntensity: 1.1, metalness: 0.22, roughness: 0.25 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: '#102638', emissive: '#071824', roughness: 0.48, metalness: 0.25 });
  const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.36, 12), canisterMaterial);
  canister.position.set(-0.4, 0.24, -0.15);
  nozzle.add(canister);
  const canisterTop = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), trimMaterial);
  canisterTop.scale.y = 0.35;
  canisterTop.position.set(-0.4, 0.44, -0.15);
  nozzle.add(canisterTop);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.045, 0.38, 12), canisterMaterial);
  tube.rotation.z = -Math.PI / 2;
  tube.position.set(-0.13, 0.34, 0);
  nozzle.add(tube);
  const intake = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 8, 24), trimMaterial);
  intake.rotation.y = Math.PI / 2;
  intake.position.set(0, 0.34, 0);
  nozzle.add(intake);
  const intakeDark = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20), darkMaterial);
  intakeDark.rotation.y = Math.PI / 2;
  intakeDark.position.set(0.008, 0.34, 0);
  nozzle.add(intakeDark);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.023, 6, 18, Math.PI), trimMaterial);
  handle.position.set(-0.4, 0.42, -0.15);
  handle.rotation.z = Math.PI / 2;
  nozzle.add(handle);

  const ballMaterial = new THREE.MeshStandardMaterial({ color: '#fff8df', emissive: '#66e9ff', emissiveIntensity: 0.42, roughness: 0.35 });
  const panelMaterial = new THREE.MeshStandardMaterial({ color: '#183343', roughness: 0.42 });
  const ballBody = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 16), ballMaterial);
  ballBody.position.y = 0.19;
  ball.add(ballBody);
  const panels = Array.from({ length: 6 }, (_, index) => {
    const panel = new THREE.Mesh(new THREE.DodecahedronGeometry(0.055, 0), panelMaterial);
    const angle = index * Math.PI / 3;
    panel.position.set(Math.cos(angle) * 0.125, 0.19 + (index % 2 ? 0.07 : -0.055), Math.sin(angle) * 0.125);
    panel.scale.set(0.8, 0.8, 0.8);
    ball.add(panel);
    return panel;
  });
  const ballHaloMaterial = new THREE.MeshBasicMaterial({ color: '#86f7ff', transparent: true, opacity: 0.82, depthWrite: false, toneMapped: false });
  const ballHalo = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.018, 6, 32), ballHaloMaterial);
  ballHalo.rotation.x = Math.PI / 2;
  ballHalo.position.y = 0.19;
  ball.add(ballHalo);

  root.visible = false;
  return {
    root, stream, nozzle, ball, ribbons, streaks, intakeRings,
    ballBody, panels, ballHalo,
    geometries: [canister.geometry, canisterTop.geometry, tube.geometry, intake.geometry, intakeDark.geometry,
      handle.geometry, ballBody.geometry, ...panels.map((panel) => panel.geometry), ballHalo.geometry],
    materials: [canisterMaterial, trimMaterial, darkMaterial, ballMaterial, panelMaterial, ballHaloMaterial],
  };
}

/** Shows the simulation's real vacuum ball path with a dedicated suction rig. */
export function VacuumCleaner3D({ gameStateRef }) {
  const scene = useMemo(makeScene, []);
  const points = useMemo(() => ({
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    side: new THREE.Vector3(),
    nozzlePosition: new THREE.Vector3(),
    towardBall: new THREE.Vector3(),
    radial: new THREE.Vector3(),
    width: new THREE.Vector3(),
    center: new THREE.Vector3(),
    edge: new THREE.Vector3(),
  }), []);

  useEffect(() => () => {
    for (const ribbon of scene.ribbons) {
      ribbon.geometry.dispose();
      ribbon.material.dispose();
    }
    for (const streak of scene.streaks) {
      streak.mesh.geometry.dispose();
      streak.material.dispose();
    }
    for (const ring of scene.intakeRings) {
      ring.mesh.geometry.dispose();
      ring.material.dispose();
    }
    for (const geometry of scene.geometries) geometry.dispose();
    for (const material of scene.materials) material.dispose();
  }, [scene]);

  useFrame((_, delta) => {
    const state = gameStateRef?.current;
    const visual = state?.vacuumPullVisual;
    const effect = state?.vacuumEffect;
    const player = effect && state?.players?.find((candidate) => candidate.id === effect.playerId);
    const start = visual?.from ?? effect?.startPosition;
    const ball = state?.ball;
    if (!visual || !effect || !player || player.dismissed
        || ![start?.x, start?.y, player.x, player.y, ball?.x, ball?.y].every(Number.isFinite)) {
      scene.root.visible = false;
      return;
    }

    const { from, to, direction, side, nozzlePosition, towardBall, radial, width, center, edge } = points;
    from.set(worldX(start.x), 0.15, worldZ(start.y));
    to.set(worldX(player.x), 0.15, worldZ(player.y));
    direction.subVectors(to, from);
    if (direction.lengthSq() < 0.0001) {
      scene.root.visible = false;
      return;
    }
    direction.normalize();
    side.set(-direction.z, 0, direction.x).normalize();
    nozzlePosition.copy(to);
    nozzlePosition.y = 0.34;
    scene.root.visible = true;

    const remaining = Math.max(0.001, Number(visual.durationSeconds) || 0.7);
    const progress = THREE.MathUtils.clamp((Number(visual.elapsedSeconds) || 0) / remaining, 0, 1);
    const time = Number(visual.elapsedSeconds) || 0;
    scene.stream.visible = true;
    scene.nozzle.visible = true;
    scene.ball.visible = true;
    scene.ball.position.set(worldX(ball.x), 0, worldZ(ball.y));
    scene.ball.rotation.set(time * 3.4, time * 6.2, time * 2.5);
    scene.ballHalo.rotation.z = time * 5.5;
    scene.ballHalo.material.opacity = 0.64 + Math.sin(time * 28) * 0.16;

    scene.nozzle.position.copy(to);
    scene.nozzle.position.y = 0;
    towardBall.copy(direction).negate();
    scene.nozzle.rotation.y = Math.atan2(-towardBall.z, towardBall.x);

    scene.ribbons.forEach((ribbon, strandIndex) => {
      const positions = ribbon.positions;
      const twist = time * (strandIndex % 2 ? -16 : 16) + strandIndex * Math.PI * 2 / 3;
      for (let segment = 0; segment <= SEGMENTS; segment += 1) {
        const t = segment / SEGMENTS;
        const angle = t * Math.PI * 7 + twist;
        const radius = 0.025 + Math.sin((1 - t) * Math.PI / 2) * (0.14 + (strandIndex % 2) * 0.055);
        radial.copy(side).multiplyScalar(Math.cos(angle)).addScaledVector(WORLD_UP, Math.sin(angle));
        center.copy(from).lerp(nozzlePosition, t).addScaledVector(radial, radius);
        center.y += Math.sin(t * Math.PI) * 0.05;
        width.copy(side).multiplyScalar(-Math.sin(angle)).addScaledVector(WORLD_UP, Math.cos(angle)).multiplyScalar(0.012 + (strandIndex === 1 ? 0.008 : 0));
        const left = segment * 6;
        const right = left + 3;
        edge.copy(center).add(width);
        positions[left] = edge.x; positions[left + 1] = edge.y; positions[left + 2] = edge.z;
        edge.copy(center).sub(width);
        positions[right] = edge.x; positions[right + 1] = edge.y; positions[right + 2] = edge.z;
      }
      ribbon.geometry.attributes.position.needsUpdate = true;
      ribbon.material.opacity = (strandIndex === 1 ? 0.88 : 0.72) * Math.min(1, progress * 8 + 0.2);
    });

    scene.streaks.forEach(({ mesh, material, phase }, index) => {
      const travel = (phase + progress * 2.8) % 1;
      const angle = travel * Math.PI * 10 + time * 20 + index * 1.9;
      const radius = 0.03 + (1 - travel) * 0.2;
      radial.copy(side).multiplyScalar(Math.cos(angle)).addScaledVector(WORLD_UP, Math.sin(angle));
      mesh.position.copy(from).lerp(nozzlePosition, travel).addScaledVector(radial, radius);
      mesh.scale.setScalar((0.36 + (index % 4) * 0.12) * Math.min(1, progress * 9 + 0.25));
      mesh.rotation.set(angle, angle * 1.3, angle * 0.7);
      material.opacity = 0.88 * Math.min(1, progress * 9 + 0.25);
    });

    scene.intakeRings.forEach(({ mesh, material, phase }, index) => {
      const pulse = 0.72 + (Math.sin(time * 27 - phase * Math.PI * 2) + 1) * 0.22;
      mesh.position.set(-index * 0.035, 0.34, 0);
      mesh.rotation.set(0, Math.PI / 2, 0);
      mesh.scale.setScalar(pulse * (0.76 + phase * 0.18));
      material.opacity = 0.82 * Math.min(1, progress * 9 + 0.25);
    });

    scene.ballBody.rotation.x += Math.max(0, delta) * (5 + progress * 12);
  });

  return <primitive object={scene.root} dispose={null} />;
}
