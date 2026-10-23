import { Component, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { FootballBall3D } from './FootballBall3D.jsx';
import { FootballPitch3D } from './FootballPitch3D.jsx';
import { FootballPlayer3D } from './FootballPlayer3D.jsx';
import { PlayerMotionEffects3D } from './PlayerMotionEffects3D.jsx';
import { SkillEffects3D } from './SkillEffects3D.jsx';
import { StadiumBackdrop3D } from './StadiumBackdrop3D.jsx';
import { TrackingCamera3D } from './TrackingCamera3D.jsx';
import { TornadoShot3D } from './TornadoShot3D.jsx';

const DEMO_PLAYERS = [
  { id: 'home-gk', team: 'home', role: 'goalkeeper', x: 55, y: 270 },
  { id: 'home-def-1', team: 'home', role: 'defender', x: 205, y: 165 },
  { id: 'home-def-2', team: 'home', role: 'defender', x: 205, y: 375 },
  { id: 'home-fw', team: 'home', role: 'forward', x: 390, y: 270 },
  { id: 'away-gk', team: 'away', role: 'goalkeeper', x: 905, y: 270 },
  { id: 'away-def-1', team: 'away', role: 'defender', x: 755, y: 165 },
  { id: 'away-def-2', team: 'away', role: 'defender', x: 755, y: 375 },
  { id: 'away-fw', team: 'away', role: 'forward', x: 570, y: 270 },
];
const DEMO_BALL = { x: 480, y: 270, height: 0, flightKind: 'ground' };

const SUPPORT_MESSAGE = '이 브라우저에서는 3D 경기를 표시할 수 없습니다. 최신 Chrome 또는 Edge에서 WebGL 2를 켜고 다시 접속해 주세요.';

function canCreateWebGL2Context() {
  if (typeof document === 'undefined') return false;
  const probe = document.createElement('canvas');
  let context;
  try {
    context = probe.getContext('webgl2');
  } catch {
    return false;
  }
  if (!context) return false;
  context.getExtension('WEBGL_lose_context')?.loseContext();
  return true;
}

function RendererStatus({ status }) {
  const isLoading = status === 'loading';
  const message = isLoading
    ? '3D 경기장을 준비하고 있어요…'
    : status === 'context-lost'
      ? `3D 그래픽 연결이 끊겼어요. ${SUPPORT_MESSAGE}`
      : SUPPORT_MESSAGE;

  return (
    <div className={`match-3d-unavailable${isLoading ? ' is-loading' : ''}`} role={isLoading ? 'status' : 'alert'}>
      {isLoading ? <span className="match-3d-status-spinner" aria-hidden="true" /> : <span className="match-3d-status-icon" aria-hidden="true">!</span>}
      <div>
        <strong>{isLoading ? '잠시만 기다려 주세요' : '3D 경기를 표시할 수 없어요'}</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}

class RendererErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    this.props.onError?.(error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/** @param {{ children?: import('react').ReactNode, className?: string, players?: Array<object>, ball?: object, selectedPlayerId?: string }} props */
export default function Match3DCanvas({
  children,
  className = '',
  players = DEMO_PLAYERS,
  ball = DEMO_BALL,
  selectedPlayerId = 'home-fw',
  actorsRef,
  gameStateRef,
  teamBranding,
  paused = false,
  containerRef,
  onFocusCapture,
  onBlurCapture,
  onClick,
}) {
  const classes = ['match-3d-canvas', className].filter(Boolean).join(' ');
  const [webglSupported, setWebglSupported] = useState(null);
  const [rendererStatus, setRendererStatus] = useState('loading');
  const [rendererCanvas, setRendererCanvas] = useState(null);

  useEffect(() => {
    const supported = canCreateWebGL2Context();
    setWebglSupported(supported);
    if (!supported) setRendererStatus('unsupported');
  }, []);

  useEffect(() => {
    if (!rendererCanvas) return undefined;
    const handleContextLost = (event) => {
      event.preventDefault();
      setRendererStatus('context-lost');
    };
    const handleContextRestored = () => setRendererStatus('ready');
    rendererCanvas.addEventListener('webglcontextlost', handleContextLost, false);
    rendererCanvas.addEventListener('webglcontextrestored', handleContextRestored, false);
    return () => {
      rendererCanvas.removeEventListener('webglcontextlost', handleContextLost, false);
      rendererCanvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
    };
  }, [rendererCanvas]);

  const handleRendererCreated = ({ gl }) => {
    const context = gl.getContext();
    const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined'
      && context instanceof WebGL2RenderingContext;
    if (!isWebGL2) {
      setRendererStatus('unsupported');
      setRendererCanvas(null);
      return;
    }
    setRendererCanvas(gl.domElement);
    setRendererStatus('ready');
  };

  const unavailableFallback = <RendererStatus status={rendererStatus === 'loading' ? 'error' : rendererStatus} />;
  const showRenderer = webglSupported === true && rendererStatus !== 'unsupported' && rendererStatus !== 'error';

  return (
    <div
      className={classes}
      ref={containerRef}
      role="img"
      aria-label="3D 축구 경기 장면"
      tabIndex={0}
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
      onClick={onClick}
    >
      {showRenderer && (
        <RendererErrorBoundary
          onError={() => setRendererStatus('error')}
          fallback={unavailableFallback}
        >
          <Canvas
            camera={{ position: [0, 12, 18], fov: 42, near: 0.1, far: 100 }}
            dpr={[1, 1.75]}
            gl={{ antialias: true, alpha: false }}
            shadows="basic"
            onCreated={handleRendererCreated}
          >
            <color attach="background" args={['#95dcf7']} />
            <hemisphereLight args={['#e9fbff', '#76a66b', 1.05]} />
            <ambientLight intensity={0.45} />
            <directionalLight position={[-8, 16, 7]} color="#fff6d8" intensity={1.55} castShadow />
            <StadiumBackdrop3D />
            <FootballPitch3D />
            <TrackingCamera3D ball={ball} gameStateRef={gameStateRef} />
            {players.map((player) => (
              <FootballPlayer3D key={player.id} player={player} selected={player.id === selectedPlayerId} actorsRef={actorsRef} gameStateRef={gameStateRef} teamBranding={teamBranding} paused={paused} />
            ))}
            <FootballBall3D ball={ball} actorsRef={actorsRef} />
            {gameStateRef && <PlayerMotionEffects3D gameStateRef={gameStateRef} paused={paused} />}
            {gameStateRef && <SkillEffects3D gameStateRef={gameStateRef} />}
            {gameStateRef && <TornadoShot3D gameStateRef={gameStateRef} />}
            {children}
          </Canvas>
        </RendererErrorBoundary>
      )}
      {rendererStatus !== 'ready' && <RendererStatus status={rendererStatus} />}
    </div>
  );
}
