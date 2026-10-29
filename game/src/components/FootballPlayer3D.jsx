import { FIELD } from '../game/constants.js';
import { getPlayerKit } from '../game/playerKit.js';
import { MiiPlayerModel } from './MiiPlayerModel.jsx';

export { TEAM_KITS, getPlayerKit } from '../game/playerKit.js';

export function FootballPlayer3D({ player, selected = false, actorsRef, gameStateRef, teamBranding, paused = false, campaignSelectionCue = false }) {
  if (!player || player.dismissed) return null;

  const branding = gameStateRef?.current?.teamBranding ?? teamBranding;
  const kit = getPlayerKit(player, branding);
  const logoId = branding?.[player.team]?.logoId ?? (player.team === 'away' ? 'samsung' : 'dex');
  const isKeeper = player.role === 'goalkeeper';
  const facing = player.team === 'away' ? -Math.PI / 2 : Math.PI / 2;
  const x = (Number(player.x) || 0) / 80 - FIELD.width / 160;
  const z = ((Number(player.y) || FIELD.height / 2) - FIELD.height / 2) / 80;
  const registerActor = (actor) => {
    const players = actorsRef?.current?.players;
    if (!players) return;
    if (actor) players.set(player.id, actor);
    else players.delete(player.id);
  };
  const registerSelectedMarker = (marker) => {
    const markers = actorsRef?.current?.selectedMarkers;
    if (!markers) return;
    if (marker) markers.set(player.id, marker);
    else markers.delete(player.id);
  };

  return (
    <group ref={registerActor} position={[x, 0, z]} rotation={[0, facing, 0]}>
      <group ref={registerSelectedMarker} visible={selected}>
        {!campaignSelectionCue && (
          <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.21, 0.28, 32]} />
            <meshStandardMaterial color="#dfff75" emissive="#b9ef4d" emissiveIntensity={0.8} />
          </mesh>
        )}
        {campaignSelectionCue && (
          <group>
            <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.285, 0.46, 40]} />
              <meshStandardMaterial color="#17212a" emissive="#101820" emissiveIntensity={0.35} />
            </mesh>
            <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.32, 0.43, 40]} />
              <meshStandardMaterial color="#caff27" emissive="#a6ff00" emissiveIntensity={1.2} />
            </mesh>
            <group position={[0, 1.28, 0]}>
              <mesh position={[0, 0.105, 0]}>
                <cylinderGeometry args={[0.072, 0.072, 0.3, 10]} />
                <meshStandardMaterial color="#17212a" emissive="#101820" emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[0, -0.12, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.24, 0.37, 3]} />
                <meshStandardMaterial color="#17212a" emissive="#101820" emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[0, 0.11, 0]}>
                <cylinderGeometry args={[0.039, 0.039, 0.24, 10]} />
                <meshStandardMaterial color="#ffffff" emissive="#dceeff" emissiveIntensity={0.5} />
              </mesh>
              <mesh position={[0, -0.1, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.17, 0.29, 3]} />
                <meshStandardMaterial color="#ffffff" emissive="#dceeff" emissiveIntensity={0.5} />
              </mesh>
            </group>
          </group>
        )}
      </group>
      <MiiPlayerModel player={player} gameStateRef={gameStateRef} paused={paused} kit={kit} logoId={logoId} isKeeper={isKeeper} />
    </group>
  );
}
