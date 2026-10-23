import { useEffect, useRef, useState } from 'react';
import Match3DCanvas from './Match3DCanvas.jsx';
import { GameLoop3D } from './GameLoop3D.jsx';

export default function Match3DGame({ initialState, paused, onGameEvents, onStateChange }) {
  const gameStateRef = useRef(structuredClone(initialState));
  const initialStateRef = useRef(initialState);
  const actorsRef = useRef({ players: new Map(), selectedMarkers: new Map(), ball: null, ballBody: null });
  const previousPausedRef = useRef(paused);
  const canvasContainerRef = useRef(null);
  const [focused, setFocused] = useState(false);

  if (initialStateRef.current !== initialState) {
    initialStateRef.current = initialState;
    gameStateRef.current = structuredClone(initialState);
  }

  useEffect(() => {
    canvasContainerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (previousPausedRef.current && !paused) canvasContainerRef.current?.focus();
    previousPausedRef.current = paused;
  }, [paused]);

  const handleBlurCapture = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };

  return (
    <Match3DCanvas
      players={initialState.players}
      containerRef={canvasContainerRef}
      ball={initialState.ball}
      selectedPlayerId={initialState.controlledPlayerId}
      actorsRef={actorsRef}
      gameStateRef={gameStateRef}
      paused={paused}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={handleBlurCapture}
      onClick={(event) => event.currentTarget.focus()}
    >
      <GameLoop3D
        initialState={initialState}
        paused={paused}
        focused={focused}
        onGameEvents={onGameEvents}
        onStateChange={onStateChange}
        actorsRef={actorsRef}
        gameStateRef={gameStateRef}
      />
    </Match3DCanvas>
  );
}
