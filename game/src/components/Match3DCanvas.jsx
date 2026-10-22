import { Canvas } from '@react-three/fiber';
import { FootballPitch3D } from './FootballPitch3D.jsx';
import { StadiumBackdrop3D } from './StadiumBackdrop3D.jsx';

/** @param {{ children?: import('react').ReactNode, className?: string }} props */
export default function Match3DCanvas({ children, className = '' }) {
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
        <color attach="background" args={['#14251c']} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[-8, 14, 7]} intensity={2} castShadow />
        <StadiumBackdrop3D />
        <FootballPitch3D />
        {children}
      </Canvas>
    </div>
  );
}
