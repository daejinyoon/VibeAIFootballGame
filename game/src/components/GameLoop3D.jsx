import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FIELD } from '../game/constants.js';
import { createInputController } from '../game/createInputController.js';
import { playSkillAudio, prepareSkillAudio } from '../game/skillAudio.js';
import { stepGame } from '../game/stepGame.js';

function worldX(x) {
  return x / 80 - FIELD.width / 160;
}

function worldZ(y) {
  return (y - FIELD.height / 2) / 80;
}

export function GameLoop3D({
  initialState,
  paused,
  focused,
  onGameEvents,
  onStateChange,
  actorsRef,
  gameStateRef: sharedGameStateRef,
}) {
  const localGameStateRef = useRef(structuredClone(initialState));
  const gameStateRef = sharedGameStateRef ?? localGameStateRef;
  const initialStateRef = useRef(initialState);
  const inputRef = useRef(null);
  const callbacksRef = useRef({ onGameEvents, onStateChange });
  const framesSinceSnapshotRef = useRef(0);

  if (initialStateRef.current !== initialState) {
    initialStateRef.current = initialState;
    gameStateRef.current = structuredClone(initialState);
    framesSinceSnapshotRef.current = 0;
  }
  callbacksRef.current = { onGameEvents, onStateChange };

  useEffect(() => {
    if (!focused || paused) return undefined;
    const controller = createInputController(window, { onSkillInput: prepareSkillAudio });
    inputRef.current = controller;
    controller.setEnabled(true);
    return () => {
      controller.destroy();
      if (inputRef.current === controller) inputRef.current = null;
    };
  }, [focused, paused]);

  const animationTimeRef = useRef(0);
  useFrame((_, delta) => {
    const state = gameStateRef.current;
    if (paused) return;
    animationTimeRef.current += Math.max(0, delta);
    if (state.skillCutIn) {
      state.skillCutIn.elapsedSeconds += Math.max(0, delta);
      if (state.skillCutIn.elapsedSeconds >= state.skillCutIn.durationSeconds) {
        state.skillCutIn = null;
      }
    }
    const presentationScale = state.skillCutIn ? 0.4 : 1;
    const simulationDelta = Math.min(delta, 0.05) * presentationScale;
    const events = stepGame(state, inputRef.current?.readFrame(), simulationDelta);
    const vacuumEffect = state.vacuumEffect;
    const vacuumPlayer = vacuumEffect && state.players.find((player) => player.id === vacuumEffect.playerId);
    if (vacuumEffect && vacuumPlayer && !vacuumPlayer.dismissed) {
      const from = vacuumEffect.startPosition;
      state.vacuumPullVisual = from && [from.x, from.y, vacuumPlayer.x, vacuumPlayer.y].every(Number.isFinite)
        ? {
          from: { x: from.x, y: from.y, height: 0 },
          to: { x: vacuumPlayer.x, y: vacuumPlayer.y, height: 0 },
          sourcePlayerId: vacuumPlayer.id,
          elapsedSeconds: vacuumEffect.elapsedSeconds,
          durationSeconds: vacuumEffect.durationSeconds,
        }
        : null;
    } else {
      delete state.vacuumPullVisual;
    }
    for (const event of events) {
      if (event.type === 'skillUsed' && !event.automatic) playSkillAudio(event.skillId);
      if (event.type === 'skillReflected') playSkillAudio('rainbowReflect');
    }

    for (const player of state.players) {
      const actor = actorsRef.current.players.get(player.id);
      if (!actor) continue;
      actor.visible = !player.dismissed;
      const airborne = (player.airborneSecondsRemaining ?? 0) > 0;
      const spin = player.team === 'away' ? -1 : 1;
      actor.position.set(worldX(player.x), airborne ? 1.05 + Math.sin(animationTimeRef.current * 9 + player.x) * 0.12 : 0, worldZ(player.y));
      actor.rotation.y = (player.team === 'away' ? -Math.PI / 2 : Math.PI / 2)
        + (airborne ? animationTimeRef.current * 7 * spin : 0);
      const marker = actorsRef.current.selectedMarkers.get(player.id);
      if (marker) {
        marker.visible = !player.dismissed && player.id === state.controlledPlayerId;
        marker.position.y = 0.035;
      }
    }

    const { ball } = state;
    const ballActor = actorsRef.current.ball;
    if (ballActor) {
      ballActor.position.set(worldX(ball.x), 0, worldZ(ball.y));
      // The animated eagle is the ball during every phase of Eagle Shot.
      ballActor.visible = !state.eagleVolley && !state.vacuumEffect;
    }
    const ballBody = actorsRef.current.ballBody;
    if (ballBody) {
      ballBody.position.y = Math.max(0, ball.height ?? 0) / 80 + 0.12;
      ballBody.visible = !state.eagleVolley && !state.vacuumEffect;
    }

    if (events.length > 0) callbacksRef.current.onGameEvents?.(events);
    framesSinceSnapshotRef.current += 1;
    if (framesSinceSnapshotRef.current >= 6) {
      framesSinceSnapshotRef.current = 0;
      callbacksRef.current.onStateChange?.(structuredClone(state));
    }
  });

  return null;
}
