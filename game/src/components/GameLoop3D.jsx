import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { FIELD } from '../game/constants.js';
import { createInputController } from '../game/createInputController.js';
import { getPlayerFacingYaw } from '../game/playerOrientation.js';
import { playCrowdCheer } from '../game/matchAudio.js';
import { playSkillAudio, prepareSkillAudio } from '../game/skillAudio.js';
import { stepGame } from '../game/stepGame.js';
import { createPvpInputBuffer, serializeInputFrame } from '../pvp/pvpInput.js';

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
  crowdReactionRef,
  simulationMode = 'local',
  localTeam = 'home',
  remoteInputRef,
  snapshotRef,
  onSnapshot,
  onLocalInput,
}) {
  const localGameStateRef = useRef(structuredClone(initialState));
  const gameStateRef = sharedGameStateRef ?? localGameStateRef;
  const initialStateRef = useRef(initialState);
  const inputRef = useRef(null);
  const framesSinceSnapshotRef = useRef(0);
  const inputSequenceRef = useRef(0);
  const snapshotSequenceRef = useRef(-1);
  const remoteTerminalSentRef = useRef(false);
  const inputSendElapsedRef = useRef(0);
  const inputBufferRef = useRef(createPvpInputBuffer());
  const callbacksRef = useRef({ onGameEvents, onStateChange, onLocalInput, onSnapshot });

  if (initialStateRef.current !== initialState) {
    initialStateRef.current = initialState;
    gameStateRef.current = structuredClone(initialState);
    framesSinceSnapshotRef.current = 0;
    remoteTerminalSentRef.current = false;
  }
  callbacksRef.current = { onGameEvents, onStateChange, onLocalInput, onSnapshot };

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
    if (paused) return;
    if (simulationMode === 'host') {
      const packet = remoteInputRef?.current;
      if (packet) {
        if (inputBufferRef.current.push(packet)) remoteInputRef.current = null;
      }
    }
    if (simulationMode === 'remote') {
      const packet = snapshotRef?.current;
      if (packet && (!Number.isSafeInteger(packet.sequence) || packet.sequence <= snapshotSequenceRef.current)) {
        snapshotRef.current = null;
      }
      if (packet?.type === 'snapshot' && Number.isSafeInteger(packet.sequence)
          && packet.sequence > snapshotSequenceRef.current && packet.state
          && Array.isArray(packet.state.players) && packet.state.ball) {
        try {
          const snapshot = structuredClone(packet.state);
          if (snapshot.players.every((player) => player && typeof player.id === 'string'
              && Number.isFinite(player.x) && Number.isFinite(player.y))
              && Number.isFinite(snapshot.ball.x) && Number.isFinite(snapshot.ball.y)) {
            gameStateRef.current = snapshot;
            snapshotSequenceRef.current = packet.sequence;
            snapshotRef.current = null;
            callbacksRef.current.onStateChange?.(structuredClone(snapshot));
            if (snapshot.phase === 'finished' && !remoteTerminalSentRef.current) {
              remoteTerminalSentRef.current = true;
              const { home = 0, away = 0 } = snapshot.score ?? {};
              const outcome = home === away ? 'matchDraw'
                : (home > away) === (localTeam === 'home') ? 'matchWon' : 'matchLost';
              callbacksRef.current.onGameEvents?.([{ type: outcome, score: { home, away } }]);
            }
          }
        } catch { /* Ignore malformed snapshots; the next authoritative frame can recover. */ }
        if (snapshotRef.current === packet) snapshotRef.current = null;
      }
      const inputFrame = inputRef.current?.readFrame();
      if (inputFrame) {
        inputSendElapsedRef.current += Math.max(0, delta);
        const hasEdge = inputFrame.pressed.size > 0 || inputFrame.released.size > 0;
        if (hasEdge || inputSendElapsedRef.current >= 0.05) {
          const message = serializeInputFrame(inputFrame, inputSequenceRef.current++);
          if (message) callbacksRef.current.onLocalInput?.(message);
          inputSendElapsedRef.current = 0;
        }
      }
    }
    const state = gameStateRef.current;
    animationTimeRef.current += Math.max(0, delta);
    if (simulationMode !== 'remote' && state.skillCutIn) {
      state.skillCutIn.elapsedSeconds += Math.max(0, delta);
      if (state.skillCutIn.elapsedSeconds >= state.skillCutIn.durationSeconds) {
        state.skillCutIn = null;
      }
    }
    const presentationScale = state.skillCutIn ? 0.4 : 1;
    const simulationDelta = Math.min(delta, 0.05) * presentationScale;
    let events = [];
    if (simulationMode === 'host') {
      const localInput = inputRef.current?.readFrame() ?? { moveX: 0, moveY: 0, down: new Set(), pressed: new Set(), released: new Set() };
      const remoteInput = inputBufferRef.current.readFrame();
      const frames = localTeam === 'away' ? { home: remoteInput, away: localInput } : { home: localInput, away: remoteInput };
      events = stepGame(state, frames, simulationDelta, { controlledTeams: ['home', 'away'] });
    } else if (simulationMode !== 'remote') {
      events = stepGame(state, inputRef.current?.readFrame(), simulationDelta);
    }
    const crowdReaction = crowdReactionRef?.current;
    if (crowdReaction) {
      crowdReaction.elapsedSeconds += simulationDelta;
      if (crowdReaction.elapsedSeconds >= crowdReaction.durationSeconds) crowdReactionRef.current = null;
    }
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
      if (event.type === 'kickoff' || event.type === 'goal') void playCrowdCheer(event.type);
      if (event.type === 'goal' && crowdReactionRef) {
        crowdReactionRef.current = { elapsedSeconds: 0, durationSeconds: 1.8 };
      }
    }

    for (const player of state.players) {
      const actor = actorsRef.current.players.get(player.id);
      if (!actor) continue;
      actor.visible = !player.dismissed;
      const airborne = (player.airborneSecondsRemaining ?? 0) > 0;
      const spin = player.team === 'away' ? -1 : 1;
      actor.position.set(worldX(player.x), airborne ? 1.05 + Math.sin(animationTimeRef.current * 9 + player.x) * 0.12 : 0, worldZ(player.y));
      actor.rotation.y = getPlayerFacingYaw(player, state.ball)
        + (airborne ? animationTimeRef.current * 7 * spin : 0);
      const marker = actorsRef.current.selectedMarkers.get(player.id);
      if (marker) {
        const selectedId = simulationMode === 'local' ? state.controlledPlayerId
          : state.controlledPlayerIds?.[localTeam] ?? (localTeam === 'home' ? state.controlledPlayerId : null);
        marker.visible = !player.dismissed && player.id === selectedId;
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
    if (simulationMode === 'host' && framesSinceSnapshotRef.current >= 3) {
      framesSinceSnapshotRef.current = 0;
      const snapshot = { type: 'snapshot', sequence: snapshotSequenceRef.current + 1, state: structuredClone(state) };
      snapshotSequenceRef.current = snapshot.sequence;
      callbacksRef.current.onSnapshot?.(snapshot);
      if (!callbacksRef.current.onSnapshot && typeof snapshotRef?.current === 'function') snapshotRef.current(snapshot);
      else if (!callbacksRef.current.onSnapshot && snapshotRef) snapshotRef.current = snapshot;
      callbacksRef.current.onStateChange?.(structuredClone(state));
    } else if (simulationMode !== 'host' && simulationMode !== 'remote' && framesSinceSnapshotRef.current >= 6) {
      framesSinceSnapshotRef.current = 0;
      callbacksRef.current.onStateChange?.(structuredClone(state));
    }
  });

  return null;
}
