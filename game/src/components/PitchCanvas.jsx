import { useEffect, useRef } from 'react';
import { FIELD } from '../game/constants.js';
import { createInputController } from '../game/createInputController.js';
import { drawGameFrame } from '../game/drawGameFrame.js';
import { stepGame } from '../game/stepGame.js';

function updateCamera(camera, ball, deltaSeconds) {
  const depth = Math.min(1, Math.max(0, ball.y / FIELD.height));
  const scale = 0.72 + 0.28 * depth;
  const projectedX = FIELD.width / 2 + (ball.x - FIELD.width / 2) * scale;
  const projectedY = 92 + depth ** 1.22 * 443;
  const ease = Math.min(1, Math.max(0, deltaSeconds) * 4);
  camera.x += (FIELD.width / 2 - projectedX - camera.x) * ease;
  camera.y += (313 - projectedY - camera.y) * ease;
}

export default function PitchCanvas({ initialState, score, timeLabel, onGameEvents, onStateChange, paused = false }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const cameraRef = useRef({ x: 0, y: 0 });
  const renderOptionsRef = useRef({ score, timeLabel });
  const inputRef = useRef(null);
  const onEventsRef = useRef(onGameEvents);
  const onStateChangeRef = useRef(onStateChange);
  onEventsRef.current = onGameEvents;
  onStateChangeRef.current = onStateChange;
  renderOptionsRef.current = { score, timeLabel };

  useEffect(() => {
    stateRef.current = structuredClone(initialState);
    cameraRef.current = { x: 0, y: 0 };
  }, [initialState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    if (!stateRef.current) stateRef.current = structuredClone(initialState);
    drawGameFrame(context, stateRef.current, {
      ...renderOptionsRef.current,
      cameraX: cameraRef.current.x,
      cameraY: cameraRef.current.y,
    });
    if (paused) return undefined;

    const input = createInputController(window);
    input.setEnabled(document.activeElement === canvas);
    inputRef.current = input;

    let frameId = 0;
    let lastTimestamp = null;
    let framesSinceSnapshot = 0;
    const animate = (timestamp) => {
      const deltaSeconds = lastTimestamp === null ? 0 : Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;
      const events = stepGame(stateRef.current, input.readFrame(), deltaSeconds);
      updateCamera(cameraRef.current, stateRef.current.ball, deltaSeconds);
      drawGameFrame(context, stateRef.current, {
        ...renderOptionsRef.current,
        cameraX: cameraRef.current.x,
        cameraY: cameraRef.current.y,
      });
      if (events.length > 0) onEventsRef.current?.(events);
      framesSinceSnapshot += 1;
      if (framesSinceSnapshot >= 6) {
        framesSinceSnapshot = 0;
        onStateChangeRef.current?.(structuredClone(stateRef.current));
      }
      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => {
      window.cancelAnimationFrame(frameId);
      input.destroy();
      inputRef.current = null;
    };
  }, [initialState, paused]);

  return (
    <canvas
      ref={canvasRef}
      className="pitch-canvas"
      width={FIELD.width}
      height={FIELD.height}
      tabIndex={0}
      autoFocus
      aria-label="방향키와 A, S, D 키로 조작하는 축구 경기장"
      onFocus={() => inputRef.current?.setEnabled(true)}
      onBlur={() => inputRef.current?.setEnabled(false)}
    />
  );
}
