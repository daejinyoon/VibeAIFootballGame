import React from 'react';
import { FIELD } from '../game/constants.js';

const FIELD_WIDTH = 12;
const FIELD_DEPTH = (FIELD.height / FIELD.width) * FIELD_WIDTH;
const HALF_WIDTH = FIELD_WIDTH / 2;
const HALF_DEPTH = FIELD_DEPTH / 2;
const LINE_COLOR = '#e5f4cd';

function PitchLine({ position, size, color = LINE_COLOR }) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.08} />
    </mesh>
  );
}

function Goal({ side, accent }) {
  const direction = side === 'left' ? -1 : 1;
  const mouthX = direction * (HALF_WIDTH + 0.11);
  const backX = direction * (HALF_WIDTH + 0.72);
  const halfMouth = (FIELD.goalBottom - FIELD.goalTop) / FIELD.width * FIELD_WIDTH / 2;
  const postHeight = 0.76;
  const postRadius = 0.055;
  const netColor = side === 'left' ? '#bce9ff' : '#ffe0ac';

  return (
    <group>
      {[-halfMouth, halfMouth].map((z) => (
        <mesh key={`post-${z}`} position={[mouthX, postHeight / 2, z]} castShadow>
          <cylinderGeometry args={[postRadius, postRadius, postHeight, 8]} />
          <meshStandardMaterial color="#f4f6e9" metalness={0.18} roughness={0.28} />
        </mesh>
      ))}
      <mesh position={[mouthX, postHeight, 0]} castShadow>
        <boxGeometry args={[postRadius * 2, postRadius * 2, halfMouth * 2]} />
        <meshStandardMaterial color="#f4f6e9" metalness={0.18} roughness={0.28} />
      </mesh>

      {[-halfMouth, halfMouth].map((z) => (
        <React.Fragment key={`net-side-${z}`}>
          <PitchLine position={[(mouthX + backX) / 2, postHeight, z]} size={[Math.abs(backX - mouthX), 0.025, 0.025]} color={netColor} />
          <PitchLine position={[backX, postHeight / 2, z]} size={[0.025, postHeight, 0.025]} color={netColor} />
        </React.Fragment>
      ))}
      <PitchLine position={[backX, postHeight, 0]} size={[0.025, 0.025, halfMouth * 2]} color={netColor} />
      <PitchLine position={[(mouthX + backX) / 2, 0.035, 0]} size={[Math.abs(backX - mouthX), 0.025, halfMouth * 2]} color={netColor} />
      {[-0.5, 0, 0.5].map((z) => (
        <PitchLine key={`net-roof-${z}`} position={[(mouthX + backX) / 2, postHeight, z * halfMouth * 1.7]} size={[Math.abs(backX - mouthX), 0.018, 0.018]} color={netColor} />
      ))}
      <mesh position={[mouthX + direction * 0.1, 0.045, 0]}>
        <boxGeometry args={[0.06, 0.035, halfMouth * 1.85]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

export function FootballPitch3D() {
  const stripes = Array.from({ length: 10 }, (_, index) => ({
    x: -HALF_WIDTH + (index + 0.5) * (FIELD_WIDTH / 10),
    color: index % 2 === 0 ? '#267c50' : '#2d8957',
  }));
  const boxWidth = FIELD_WIDTH * (165 / FIELD.width);
  const boxDepth = FIELD_DEPTH * (300 / FIELD.height);
  const smallBoxWidth = FIELD_WIDTH * (55 / FIELD.width);
  const smallBoxDepth = FIELD_DEPTH * (180 / FIELD.height);
  const lineThickness = 0.035;
  const cornerRadius = 0.18;

  return (
    <group>
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[FIELD_WIDTH + 0.5, 0.16, FIELD_DEPTH + 0.5]} />
        <meshStandardMaterial color="#153d2c" roughness={0.95} />
      </mesh>

      {stripes.map(({ x, color }) => (
        <mesh key={x} position={[x, 0, 0]} receiveShadow>
          <boxGeometry args={[FIELD_WIDTH / 10 + 0.005, 0.035, FIELD_DEPTH]} />
          <meshStandardMaterial color={color} roughness={0.88} />
        </mesh>
      ))}

      <PitchLine position={[0, 0.028, -HALF_DEPTH]} size={[FIELD_WIDTH, lineThickness, lineThickness]} />
      <PitchLine position={[0, 0.028, HALF_DEPTH]} size={[FIELD_WIDTH, lineThickness, lineThickness]} />
      <PitchLine position={[-HALF_WIDTH, 0.028, 0]} size={[lineThickness, lineThickness, FIELD_DEPTH]} />
      <PitchLine position={[HALF_WIDTH, 0.028, 0]} size={[lineThickness, lineThickness, FIELD_DEPTH]} />
      <PitchLine position={[0, 0.03, 0]} size={[lineThickness, lineThickness, FIELD_DEPTH]} />

      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.83, 0.87, 64]} />
        <meshStandardMaterial color={LINE_COLOR} emissive={LINE_COLOR} emissiveIntensity={0.08} />
      </mesh>
      <mesh position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.055, 20]} />
        <meshStandardMaterial color={LINE_COLOR} />
      </mesh>

      {[-1, 1].map((side) => {
        const goalX = side * HALF_WIDTH;
        return (
          <React.Fragment key={`box-${side}`}>
            <PitchLine position={[goalX - side * boxWidth / 2, 0.03, 0]} size={[lineThickness, lineThickness, boxDepth]} />
            <PitchLine position={[goalX - side * boxWidth, 0.03, -boxDepth / 2]} size={[boxWidth, lineThickness, lineThickness]} />
            <PitchLine position={[goalX - side * boxWidth, 0.03, boxDepth / 2]} size={[boxWidth, lineThickness, lineThickness]} />
            <PitchLine position={[goalX - side * smallBoxWidth / 2, 0.034, 0]} size={[lineThickness, lineThickness, smallBoxDepth]} />
            <PitchLine position={[goalX - side * smallBoxWidth, 0.034, -smallBoxDepth / 2]} size={[smallBoxWidth, lineThickness, lineThickness]} />
            <PitchLine position={[goalX - side * smallBoxWidth, 0.034, smallBoxDepth / 2]} size={[smallBoxWidth, lineThickness, lineThickness]} />
            <mesh position={[side * (HALF_WIDTH - 1.2), 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.045, 16]} />
              <meshStandardMaterial color={LINE_COLOR} />
            </mesh>
          </React.Fragment>
        );
      })}

      {[-1, 1].flatMap((xSide) => [-1, 1].map((zSide) => (
        <mesh
          key={`corner-${xSide}-${zSide}`}
          position={[xSide * (HALF_WIDTH - cornerRadius / 2), 0.034, zSide * (HALF_DEPTH - cornerRadius / 2)]}
          rotation={[-Math.PI / 2, 0, xSide === zSide ? 0 : Math.PI / 2]}
        >
          <ringGeometry args={[cornerRadius - 0.025, cornerRadius, 20, 1, 0, Math.PI / 2]} />
          <meshStandardMaterial color={LINE_COLOR} />
        </mesh>
      )))}

      <Goal side="left" accent="#58c8ff" />
      <Goal side="right" accent="#ff9a54" />
    </group>
  );
}
