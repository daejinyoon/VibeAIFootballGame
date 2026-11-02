import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { getGoalCelebrationPose } from '../game/goalCelebrationMotion.js';
import {
  GOAL_CELEBRATION_DURATION_SECONDS,
  GOAL_CELEBRATION_IDS,
  GOAL_CELEBRATION_OPTIONS,
} from '../game/goalCelebrations.js';
import {
  PREVIEW_PLAYER_IDS,
  PREVIEW_PLAYER_POSITIONS,
  RKO_PREVIEW_CAMERA,
  RKO_PREVIEW_ROLES,
} from '../game/goalCelebrationPreview.js';
import { getPlayerKit } from '../game/playerKit.js';
import { getTeamBranding } from '../game/teamBranding.js';
import { MiiPlayerModel } from './MiiPlayerModel.jsx';

const ceremonyLabel = (id) => GOAL_CELEBRATION_OPTIONS.find((option) => option.id === id)?.label ?? '세리머니';

function AimCamera({ targetY }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(0, targetY, 0);
    camera.updateProjectionMatrix();
  }, [camera, targetY]);

  return null;
}

function PreviewClock({ gameStateRef, ceremonyId }) {
  const elapsedSeconds = useRef(0);
  const previousCeremonyId = useRef(ceremonyId);

  useEffect(() => {
    previousCeremonyId.current = ceremonyId;
    elapsedSeconds.current = 0;
  }, [ceremonyId]);

  useFrame((_, delta) => {
    if (previousCeremonyId.current !== ceremonyId) {
      previousCeremonyId.current = ceremonyId;
      elapsedSeconds.current = 0;
    } else {
      elapsedSeconds.current = (elapsedSeconds.current + Math.max(0, delta))
        % GOAL_CELEBRATION_DURATION_SECONDS;
    }
    const celebration = gameStateRef.current?.goalCelebration;
    if (celebration) {
      celebration.ceremonyId = ceremonyId;
      celebration.elapsedSeconds = elapsedSeconds.current;
    }
  });

  return null;
}

function PreviewField() {
  return (
    <mesh position={[0, -0.025, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[5, 2.5]} />
      <meshStandardMaterial color="#4fae70" roughness={1} />
    </mesh>
  );
}

export function Customization3DPreview({
  ceremonyId,
  palette,
  logoId,
  rotateRandom = false,
  mode = 'ceremony',
}) {
  const [randomIndex, setRandomIndex] = useState(0);
  const branding = useMemo(
    () => getTeamBranding(1, { logoId, paletteId: palette?.id }),
    [logoId, palette?.id],
  );
  const players = useMemo(() => PREVIEW_PLAYER_IDS.map((id) => ({
    id,
    team: 'home',
    role: 'forward',
    x: 480,
    y: 270,
    vx: 0,
    vy: 0,
    renderMovementSpeed: 0,
    sprinting: false,
    motionAction: 'idle',
    slideSeconds: 0,
  })), []);
  const activeCeremonyId = rotateRandom
    ? GOAL_CELEBRATION_IDS[randomIndex]
    : ceremonyId ?? GOAL_CELEBRATION_IDS[0];
  const isKitPreview = mode === 'kit';
  const participantIds = PREVIEW_PLAYER_IDS;
  const goalCelebration = useMemo(() => (isKitPreview ? null : {
    ceremonyId: activeCeremonyId,
    team: 'home',
    participantIds,
    elapsedSeconds: 0,
    durationSeconds: GOAL_CELEBRATION_DURATION_SECONDS,
    rkoRoles: activeCeremonyId === 'rko' ? RKO_PREVIEW_ROLES : null,
  }), [activeCeremonyId, isKitPreview]);
  const gameStateRef = useRef(null);
  gameStateRef.current = {
    players,
    teamBranding: branding,
    ball: { ownerId: null },
    goalCelebration,
  };

  useEffect(() => {
    if (!rotateRandom) {
      setRandomIndex(0);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setRandomIndex((current) => (current + 1) % GOAL_CELEBRATION_IDS.length);
    }, GOAL_CELEBRATION_DURATION_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [rotateRandom]);

  const positionSet = isKitPreview ? 'kit' : activeCeremonyId === 'rko' ? 'rko' : 'group';
  const positions = PREVIEW_PLAYER_POSITIONS[positionSet];
  const displayCount = isKitPreview ? 1 : players.length;
  const isRkoPreview = !isKitPreview && activeCeremonyId === 'rko';
  const homeBranding = branding.home;
  const kitLabel = `${homeBranding.displayName} 로고, ${palette?.name ?? '선택된'} 유니폼 3D 미리보기`;
  const previewLabel = rotateRandom
    ? `랜덤 미리보기: ${ceremonyLabel(activeCeremonyId)}`
    : `${ceremonyLabel(activeCeremonyId)} 세리머니 미리보기`;

  return (
    <div className={`customization-3d-preview customization-3d-preview-${mode}`}>
      {!isKitPreview && <span className="customization-3d-preview-label" aria-live="polite" aria-atomic="true">{previewLabel}</span>}
      <Canvas
        aria-hidden="true"
        tabIndex={-1}
        dpr={[1, 1.5]}
        camera={isKitPreview
          ? { position: [0, 1.02, 3.25], fov: 32 }
          : isRkoPreview
            ? { position: RKO_PREVIEW_CAMERA.position, fov: RKO_PREVIEW_CAMERA.fov }
            : { position: [0, 2.35, 6.8], fov: 28 }}
        gl={{ alpha: true, antialias: true }}
        style={{ pointerEvents: 'none' }}
      >
        <AimCamera targetY={isRkoPreview ? RKO_PREVIEW_CAMERA.target[1] : isKitPreview ? 0.74 : 0.76} />
        <ambientLight intensity={1.55} />
        <directionalLight position={[-2.5, 4.5, 5]} color="#fff4dd" intensity={2.25} />
        <directionalLight position={[3, 2.5, -2]} color="#b6f2ff" intensity={0.55} />
        {!isKitPreview && <PreviewField />}
        {!isKitPreview && <PreviewClock gameStateRef={gameStateRef} ceremonyId={activeCeremonyId} />}
        {players.slice(0, displayCount).map((player, index) => (
          <group key={player.id} position={positions[index]}>
            <MiiPlayerModel
              player={player}
              gameStateRef={gameStateRef}
              kit={getPlayerKit(player, branding)}
              logoId={homeBranding.logoId}
              isKeeper={false}
            />
          </group>
        ))}
      </Canvas>
      {isKitPreview && (
        <span className="sr-only" role="img" aria-label={kitLabel} />
      )}
    </div>
  );
}
