import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FIELD } from '../game/constants.js';

const PARTICLES_PER_KIND = 12;
const EMIT_INTERVAL = 0.035;
const DEFAULT_JERSEY_ACCENTS = { home: '#d7ff74', away: '#ffe083' };
const DUST_COLORS = ['#9a9a65', '#8a8060', '#a0926b', '#78805d'];

function worldX(x) {
  return (Number(x) || 0) / 80 - FIELD.width / 160;
}

function worldZ(y) {
  return ((Number(y) || FIELD.height / 2) - FIELD.height / 2) / 80;
}

function makeParticle(geometry, color, opacity) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false;
  return { mesh, material, ownerId: null, elapsed: 0, lifetime: 0.2, phase: 0 };
}

function clearParticle(particle) {
  particle.ownerId = null;
  particle.mesh.visible = false;
  particle.material.opacity = 0;
}

function findPlayer(players, playerId) {
  for (const player of players) {
    if (player.id === playerId) return player;
  }
  return null;
}

function makePool() {
  const trailGeometry = new THREE.BoxGeometry(0.3, 0.025, 0.045);
  const dustGeometry = new THREE.TetrahedronGeometry(0.12, 0);
  const trails = Array.from({ length: PARTICLES_PER_KIND }, (_, index) => ({
    ...makeParticle(trailGeometry, '#d7ff74', 0.58),
    phase: index / PARTICLES_PER_KIND,
  }));
  const dust = Array.from({ length: PARTICLES_PER_KIND }, (_, index) => ({
    ...makeParticle(dustGeometry, DUST_COLORS[index % DUST_COLORS.length], 0.42),
    phase: index / PARTICLES_PER_KIND,
  }));
  const scene = new THREE.Group();
  for (const particle of [...trails, ...dust]) scene.add(particle.mesh);
  return { scene, trailGeometry, dustGeometry, trails, dust };
}

/** Reuse a bounded pool of low grass-level cues for players who are sprinting. */
export function PlayerMotionEffects3D({ gameStateRef, paused = false }) {
  const pool = useMemo(makePool, []);
  const cursors = useRef({ trail: 0, dust: 0, emitTimer: 0, playerCursor: 0 });

  useEffect(() => () => {
    pool.trailGeometry.dispose();
    pool.dustGeometry.dispose();
    for (const particle of [...pool.trails, ...pool.dust]) particle.material.dispose();
  }, [pool]);

  useFrame((_, delta) => {
    const state = gameStateRef?.current;
    const players = state?.players ?? [];
    const cursor = cursors.current;
    const frameDelta = Math.min(Math.max(0, delta), 0.05);
    if (paused || !state) {
      cursor.emitTimer = 0;
      for (const particle of pool.trails) clearParticle(particle);
      for (const particle of pool.dust) clearParticle(particle);
      return;
    }

    cursor.emitTimer += frameDelta;
    while (cursor.emitTimer >= EMIT_INTERVAL) {
      cursor.emitTimer -= EMIT_INTERVAL;
      let emitter = null;
      for (let offset = 0; offset < players.length; offset += 1) {
        const index = (cursor.playerCursor + offset) % players.length;
        const candidate = players[index];
        const action = candidate.motionAction;
        if (candidate.sprinting && !candidate.dismissed
            && action !== 'knockdown' && action !== 'recover') {
          emitter = candidate;
          cursor.playerCursor = (index + 1) % players.length;
          break;
        }
      }
      if (!emitter) {
        cursor.emitTimer = 0;
        break;
      }

      const team = emitter.team === 'away' ? 'away' : 'home';
      const jerseyAccent = state.teamBranding?.[team]?.kit?.trim
        ?? DEFAULT_JERSEY_ACCENTS[team];
      const facingLength = Math.hypot(emitter.facingX || 0, emitter.facingY || 0) || 1;
      const facingX = (emitter.facingX || (team === 'home' ? 1 : -1)) / facingLength;
      const facingZ = (emitter.facingY || 0) / facingLength;
      const backOffset = 0.48;
      const sideOffset = 0.12;
      const baseX = worldX(emitter.x) - facingX * backOffset - facingZ * sideOffset;
      const baseZ = worldZ(emitter.y) - facingZ * backOffset + facingX * sideOffset;
      const ballClose = Math.hypot(baseX - worldX(state.ball?.x), baseZ - worldZ(state.ball?.y)) < 0.42;

      const trail = pool.trails[cursor.trail];
      cursor.trail = (cursor.trail + 1) % pool.trails.length;
      trail.ownerId = emitter.id;
      trail.elapsed = 0;
      trail.lifetime = 0.18 + (trail.phase * 0.1);
      trail.mesh.position.set(baseX, 0.035, baseZ);
      trail.mesh.rotation.set(0, -Math.atan2(facingZ, facingX), 0);
      trail.material.color.set(jerseyAccent);
      trail.mesh.visible = !ballClose;

      const puff = pool.dust[cursor.dust];
      cursor.dust = (cursor.dust + 1) % pool.dust.length;
      puff.ownerId = emitter.id;
      puff.elapsed = 0;
      puff.lifetime = 0.12 + (puff.phase * 0.16);
      puff.mesh.position.set(baseX + facingZ * 0.13, 0.045, baseZ - facingX * 0.13);
      puff.mesh.rotation.set(puff.phase * Math.PI, puff.phase * Math.PI * 2, 0);
      puff.material.color.set(DUST_COLORS[Math.floor(puff.phase * DUST_COLORS.length) % DUST_COLORS.length]);
      puff.mesh.visible = !ballClose;
    }

    const ballX = worldX(state.ball?.x);
    const ballZ = worldZ(state.ball?.y);
    for (const particle of pool.trails) {
      if (particle.ownerId === null) continue;
      const owner = findPlayer(players, particle.ownerId);
      const action = owner?.motionAction;
      if (!owner || !owner.sprinting || owner.dismissed
          || action === 'knockdown' || action === 'recover') {
        clearParticle(particle);
        continue;
      }

      particle.elapsed += frameDelta;
      if (particle.elapsed >= particle.lifetime) {
        clearParticle(particle);
        continue;
      }
      const progress = particle.elapsed / particle.lifetime;
      const fade = 1 - progress;
      const nearBall = Math.hypot(particle.mesh.position.x - ballX, particle.mesh.position.z - ballZ) < 0.42;
      particle.mesh.visible = !nearBall;
      particle.material.opacity = 0.58 * fade;
      particle.mesh.scale.set(0.55 + fade * 0.45, 1, 1);
    }
    for (const particle of pool.dust) {
      if (particle.ownerId === null) continue;
      const owner = findPlayer(players, particle.ownerId);
      const action = owner?.motionAction;
      if (!owner || !owner.sprinting || owner.dismissed
          || action === 'knockdown' || action === 'recover') {
        clearParticle(particle);
        continue;
      }

      particle.elapsed += frameDelta;
      if (particle.elapsed >= particle.lifetime) {
        clearParticle(particle);
        continue;
      }
      const progress = particle.elapsed / particle.lifetime;
      const fade = 1 - progress;
      const nearBall = Math.hypot(particle.mesh.position.x - ballX, particle.mesh.position.z - ballZ) < 0.42;
      particle.mesh.visible = !nearBall;
      particle.material.opacity = 0.42 * fade;
      const puffScale = 0.5 + progress * 0.72;
      particle.mesh.scale.setScalar(puffScale);
      particle.mesh.position.y = 0.045 + progress * 0.07;
    }
  });

  return <primitive object={pool.scene} dispose={null} />;
}
