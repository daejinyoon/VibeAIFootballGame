const SEAT_COLORS = ['#4db8ef', '#d5f185', '#e87f61', '#b78bff', '#83d4ac'];

function SideStand({ side }) {
  const tiers = Array.from({ length: 4 }, (_, index) => index);
  const seats = Array.from({ length: 23 }, (_, index) => index);
  const accent = side < 0 ? '#4db8ef' : '#ff9a54';

  return (
    <group position={[0, 0, side * 4.15]}>
      {tiers.map((tier) => {
        const rise = 0.35 + tier * 0.38;
        const setback = side * tier * 0.48;
        return (
          <group key={`tier-${tier}`} position={[0, rise, setback]}>
            <mesh position={[0, -0.1, 0]} castShadow receiveShadow>
              <boxGeometry args={[19, 0.22, 0.5]} />
              <meshStandardMaterial color={tier % 2 ? '#26364a' : '#303f50'} roughness={0.78} />
            </mesh>
            {seats.map((seat) => {
              const x = -8.8 + seat * 0.8;
              const color = SEAT_COLORS[(seat + tier + (side > 0 ? 2 : 0)) % SEAT_COLORS.length];
              return (
                <mesh key={`seat-${tier}-${seat}`} position={[x, 0.12, side * 0.1]} castShadow>
                  <boxGeometry args={[0.42, 0.28, 0.3]} />
                  <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.09} roughness={0.7} />
                </mesh>
              );
            })}
          </group>
        );
      })}

      <mesh position={[0, 0.78, -side * 0.1]}>
        <boxGeometry args={[18, 0.07, 0.07]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[-4.45, 0.94, -side * 0.1]}>
        <boxGeometry args={[8.9, 0.26, 0.12]} />
        <meshStandardMaterial color={side < 0 ? '#143d52' : '#522b2a'} emissive={accent} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[4.45, 0.94, -side * 0.1]}>
        <boxGeometry args={[8.9, 0.26, 0.12]} />
        <meshStandardMaterial color={side < 0 ? '#143d52' : '#522b2a'} emissive={accent} emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function EndStand({ side, color }) {
  return (
    <group position={[side * 8.15, 0.9, 0]}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[0.5, 2.1, 8.9]} />
        <meshStandardMaterial color="#233341" roughness={0.8} />
      </mesh>
      {[-3.1, -1.55, 0, 1.55, 3.1].map((z, index) => (
        <mesh key={`end-seat-${index}`} position={[side * -0.3, 0.3 + (index % 2) * 0.2, z]}>
          <boxGeometry args={[0.18, 0.22, 0.9]} />
          <meshStandardMaterial color={index % 2 ? color : '#8fc5ca'} emissive={color} emissiveIntensity={0.16} />
        </mesh>
      ))}
      <mesh position={[side * -0.3, 2.0, 0]}>
        <boxGeometry args={[0.2, 0.14, 8.9]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} />
      </mesh>
    </group>
  );
}

export function StadiumBackdrop3D() {
  return (
    <group>
      <mesh position={[0, -0.3, 0]} receiveShadow>
        <boxGeometry args={[23, 0.2, 16]} />
        <meshStandardMaterial color="#192638" roughness={0.96} />
      </mesh>

      <SideStand side={-1} />
      <SideStand side={1} />
      <EndStand side={-1} color="#4db8ef" />
      <EndStand side={1} color="#ff9a54" />

      {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
        <group key={`floodlight-${xSide}-${zSide}`} position={[xSide * 9.1, 0, zSide * 5.7]}>
          <mesh position={[0, 2.65, 0]} castShadow>
            <boxGeometry args={[0.18, 5.3, 0.18]} />
            <meshStandardMaterial color="#647286" metalness={0.55} roughness={0.36} />
          </mesh>
          <mesh position={[0, 5.35, 0]}>
            <boxGeometry args={[1.25, 0.3, 0.3]} />
            <meshStandardMaterial color="#e7f5ff" emissive={zSide < 0 ? '#89d9ff' : '#ffe2b6'} emissiveIntensity={2.2} />
          </mesh>
          <pointLight position={[0, 5.1, -zSide * 0.6]} color={zSide < 0 ? '#8ddaff' : '#ffe0ae'} intensity={30} distance={11} decay={2} />
        </group>
      )))}

      <mesh position={[0, 1.7, -6.8]}>
        <boxGeometry args={[7.8, 0.42, 0.18]} />
        <meshStandardMaterial color="#18242f" emissive="#55bdff" emissiveIntensity={0.32} />
      </mesh>
      <mesh position={[0, 1.7, 6.8]}>
        <boxGeometry args={[7.8, 0.42, 0.18]} />
        <meshStandardMaterial color="#2d2021" emissive="#ff9859" emissiveIntensity={0.32} />
      </mesh>
    </group>
  );
}
