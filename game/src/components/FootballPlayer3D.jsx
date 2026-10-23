import { FIELD } from '../game/constants.js';
import { getPlayerKit } from '../game/playerKit.js';
import { MiiPlayerModel } from './MiiPlayerModel.jsx';

export { TEAM_KITS, getPlayerKit } from '../game/playerKit.js';

export function FootballPlayer3D({ player, selected = false, actorsRef, gameStateRef, teamBranding, paused = false }) {
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
      <mesh ref={registerSelectedMarker} visible={selected} position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.21, 0.28, 32]} />
        <meshStandardMaterial color="#dfff75" emissive="#b9ef4d" emissiveIntensity={0.8} />
      </mesh>
      <MiiPlayerModel player={player} gameStateRef={gameStateRef} paused={paused} kit={kit} logoId={logoId} isKeeper={isKeeper} />
    </group>
  );
}
