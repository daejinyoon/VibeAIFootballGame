import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FIELD } from '../game/constants.js';
import { createInputController } from '../game/createInputController.js';
import { playEulryongtaImpact, prepareSkillAudio } from '../game/skillAudio.js';
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
    if (state.vacuumPullVisual) {
      state.vacuumPullVisual.elapsedSeconds += Math.max(0, delta);
      if (state.vacuumPullVisual.elapsedSeconds >= state.vacuumPullVisual.durationSeconds) state.vacuumPullVisual = null;
    }
    if (state.skillCutIn) {
      state.skillCutIn.elapsedSeconds += Math.max(0, delta);
      if (state.skillCutIn.elapsedSeconds >= state.skillCutIn.durationSeconds) {
        state.skillCutIn = null;
      }
    }
    const presentationScale = state.skillCutIn ? 0.4 : 1;
    const simulationDelta = Math.min(delta, 0.05) * presentationScale;
    const previousBallPosition = { x: state.ball.x, y: state.ball.y, height: state.ball.height ?? 0 };
    const events = stepGame(state, inputRef.current?.readFrame(), simulationDelta);
    for (const event of events) {
      if (event.type === 'skillUsed' && event.skillId === 'eulryongta') playEulryongtaImpact();
      if (event.type === 'skillUsed' && event.skillId === 'vacuumCleaner') {
        state.vacuumPullVisual = {
          from: previousBallPosition,
          to: { x: state.ball.x, y: state.ball.y, height: state.ball.height ?? 0 },
          sourcePlayerId: event.playerId,
          elapsedSeconds: 0,
          durationSeconds: 0.48,
        };
      }
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
    if (ballActor) ballActor.position.set(worldX(ball.x), 0, worldZ(ball.y));
    const ballBody = actorsRef.current.ballBody;
    if (ballBody) ballBody.position.y = Math.max(0, ball.height ?? 0) / 80 + 0.12;

    if (events.length > 0) callbacksRef.current.onGameEvents?.(events);
    framesSinceSnapshotRef.current += 1;
    if (framesSinceSnapshotRef.current >= 6) {
      framesSinceSnapshotRef.current = 0;
      callbacksRef.current.onStateChange?.(structuredClone(state));
    }
  });

  return null;
}
