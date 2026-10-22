import { Canvas } from '@react-three/fiber';
import { FootballBall3D } from './FootballBall3D.jsx';
import { FootballPitch3D } from './FootballPitch3D.jsx';
import { FootballPlayer3D } from './FootballPlayer3D.jsx';
import { StadiumBackdrop3D } from './StadiumBackdrop3D.jsx';
import { TrackingCamera3D } from './TrackingCamera3D.jsx';

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

/** @param {{ children?: import('react').ReactNode, className?: string, players?: Array<object>, ball?: object, selectedPlayerId?: string }} props */
export default function Match3DCanvas({
  children,
  className = '',
  players = DEMO_PLAYERS,
  ball = DEMO_BALL,
  selectedPlayerId = 'home-fw',
}) {
  const classes = ['match-3d-canvas', className].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      role="img"
      aria-label="3D 축구 경기 장면"
      tabIndex={0}
    >
      <Canvas
        camera={{ position: [0, 12, 18], fov: 42, near: 0.1, far: 100 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
        shadows="basic"
      >
        <color attach="background" args={['#95dcf7']} />
        <hemisphereLight args={['#e9fbff', '#76a66b', 1.05]} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[-8, 16, 7]} color="#fff6d8" intensity={1.55} castShadow />
        <StadiumBackdrop3D />
        <FootballPitch3D />
        <TrackingCamera3D ball={ball} />
        {players.map((player) => (
          <FootballPlayer3D key={player.id} player={player} selected={player.id === selectedPlayerId} />
        ))}
        <FootballBall3D ball={ball} />
        {children}
      </Canvas>
    </div>
  );
}
