import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FIELD } from '../game/constants.js';
import { createInputController } from '../game/createInputController.js';
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
    const controller = createInputController(window);
    inputRef.current = controller;
    controller.setEnabled(true);
    return () => {
      controller.destroy();
      if (inputRef.current === controller) inputRef.current = null;
    };
  }, [focused, paused]);

  useFrame((_, delta) => {
    const state = gameStateRef.current;
    if (state.skillCutIn) {
      state.skillCutIn.elapsedSeconds += Math.max(0, delta);
      if (state.skillCutIn.elapsedSeconds >= state.skillCutIn.durationSeconds) {
        state.skillCutIn = null;
      }
    }
    if (paused) return;
    const presentationScale = state.skillCutIn ? 0.4 : 1;
    const simulationDelta = Math.min(delta, 0.05) * presentationScale;
    const events = stepGame(state, inputRef.current?.readFrame(), simulationDelta);

    for (const player of state.players) {
      const actor = actorsRef.current.players.get(player.id);
      if (!actor) continue;
      actor.visible = !player.dismissed;
      actor.position.set(worldX(player.x), 0, worldZ(player.y));
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
