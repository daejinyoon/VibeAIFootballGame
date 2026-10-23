import { FIELD } from '../game/constants.js';
import { MiiPlayerModel } from './MiiPlayerModel.jsx';

const KITS = {
  home: { jersey: '#12a9bd', trim: '#d7ff74', shorts: '#f4fff7', boots: '#f5ff81', keeper: '#d7f26b', glove: '#f0ffab' },
  away: { jersey: '#f36d62', trim: '#ffe083', shorts: '#fff3e5', boots: '#ffe083', keeper: '#ffcf70', glove: '#fff2a5' },
};

export function FootballPlayer3D({ player, selected = false, actorsRef, gameStateRef, paused = false }) {
  if (!player || player.dismissed) return null;

  const kit = KITS[player.team === 'away' ? 'away' : 'home'];
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
      <MiiPlayerModel player={player} gameStateRef={gameStateRef} paused={paused} kit={{ ...kit, jersey: isKeeper ? kit.keeper : kit.jersey }} isKeeper={isKeeper} />
    </group>
  );
}
