import { FIELD } from '../game/constants.js';

const KITS = {
  home: { jersey: '#12a9bd', trim: '#d7ff74', shorts: '#f4fff7', boots: '#f5ff81', keeper: '#d7f26b', glove: '#f0ffab' },
  away: { jersey: '#f36d62', trim: '#ffe083', shorts: '#fff3e5', boots: '#ffe083', keeper: '#ffcf70', glove: '#fff2a5' },
};

function Limb({ position, length, color, rotation = [0, 0, 0], radius = 0.045 }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <capsuleGeometry args={[radius, length, 3, 8]} />
      <meshStandardMaterial color={color} roughness={0.62} />
    </mesh>
  );
}

export function FootballPlayer3D({ player, selected = false, actorsRef }) {
  if (!player || player.dismissed) return null;

  const kit = KITS[player.team === 'away' ? 'away' : 'home'];
  const isKeeper = player.role === 'goalkeeper';
  const jersey = isKeeper ? kit.keeper : kit.jersey;
  const jumpHeight = Math.max(0, Number(player.jumpHeight) || 0) / 80;
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
    <group ref={registerActor} position={[x, jumpHeight, z]} rotation={[0, facing, 0]}>
      <mesh ref={registerSelectedMarker} visible={selected} position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.21, 0.28, 32]} />
          <meshStandardMaterial color="#dfff75" emissive="#b9ef4d" emissiveIntensity={0.8} />
      </mesh>

      <group scale={1.3}>
        <mesh position={[0, 0.33, 0]} castShadow>
          <capsuleGeometry args={[0.125, 0.15, 4, 10]} />
          <meshStandardMaterial color={jersey} roughness={0.58} />
        </mesh>
        <mesh position={[0, 0.415, 0.103]}>
          <boxGeometry args={[0.105, 0.11, 0.018]} />
          <meshStandardMaterial color={kit.trim} roughness={0.5} />
        </mesh>

        <Limb position={[-0.17, 0.34, 0]} length={0.17} color={jersey} rotation={[0, 0, -0.2]} radius={0.042} />
        <Limb position={[0.17, 0.34, 0]} length={0.17} color={jersey} rotation={[0, 0, 0.2]} radius={0.042} />
        <mesh position={[-0.235, 0.235, 0.015]}>
          <sphereGeometry args={[0.055, 10, 8]} />
          <meshStandardMaterial color={isKeeper ? kit.glove : '#f6c9a0'} roughness={0.68} />
        </mesh>
        <mesh position={[0.235, 0.235, 0.015]}>
          <sphereGeometry args={[0.055, 10, 8]} />
          <meshStandardMaterial color={isKeeper ? kit.glove : '#f6c9a0'} roughness={0.68} />
        </mesh>

        <Limb position={[-0.07, 0.145, 0]} length={0.16} color={kit.shorts} radius={0.042} />
        <Limb position={[0.07, 0.145, 0]} length={0.16} color={kit.shorts} radius={0.042} />
        <mesh position={[-0.07, 0.035, 0.035]} rotation={[0.06, 0, 0]}>
          <boxGeometry args={[0.09, 0.055, 0.17]} />
          <meshStandardMaterial color={kit.boots} roughness={0.45} />
        </mesh>
        <mesh position={[0.07, 0.035, 0.035]} rotation={[-0.06, 0, 0]}>
          <boxGeometry args={[0.09, 0.055, 0.17]} />
          <meshStandardMaterial color={kit.boots} roughness={0.45} />
        </mesh>

        <mesh position={[0, 0.58, 0]} castShadow>
          <sphereGeometry args={[0.13, 14, 12]} />
          <meshStandardMaterial color="#f4c49b" roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.665, -0.015]} scale={[1.04, 0.58, 1.04]}>
          <sphereGeometry args={[0.13, 12, 8]} />
          <meshStandardMaterial color={player.team === 'home' ? '#4e7864' : '#785b50'} roughness={0.88} />
        </mesh>
        {[-0.043, 0.043].map((eyeX) => (
          <mesh key={eyeX} position={[eyeX, 0.59, 0.116]}>
            <sphereGeometry args={[0.012, 8, 6]} />
            <meshBasicMaterial color="#273440" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
