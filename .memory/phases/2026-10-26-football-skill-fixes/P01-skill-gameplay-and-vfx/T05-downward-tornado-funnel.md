# Task: T05 Point the Tornado Funnel Downward

## Status: done

## Goal
Change the moving Tornado Shot visual so its cone points down to the ground and animated wind bands form a narrow ground tip that widens above it.

## Decision Summary
- Apply D05 to the existing Tornado Shot visual only; preserve gameplay contact, ball flight, duration, colors, and attachment to the moving ball.
- Orient the transparent cone and adjust wind-band radius together; keep ground rings and debris behavior unless they contradict the new funnel silhouette.

## Implementation

### I01. Invert the cone and taper wind bands from ground upward
- Related Files:
  - `game/src/components/TornadoShot3D.jsx` :: `createStorm`, `createWindBand`, `TornadoShot3D` frame update — point the cone down and widen bands with height; modify

#### Details
- **Signatures & Types**:
  ```js
  function createWindBand() // builds one animated BufferGeometry band and transparent material
  function createStorm() // creates cone, wind bands, rings, debris, and trail
  export function TornadoShot3D({ gameStateRef }) // attaches the effect to the active tornado skill-shot ball
  ```
- **Data & Schema Fields**:
  - `FUNNEL_GEOMETRY` is `new THREE.ConeGeometry(1.18, 2.48, 36, 1, true)`; default tip points along local positive Y.
  - Cone center remains at local `y = 1.24`, placing its 2.48-unit body between ground and top after a 180-degree X rotation.
  - Wind-band vertices use `progress = segment / BAND_SEGMENTS`, local height `.12 + progress * 2.3`, and a computed radius.
- **Execution Flow / Logic**:
  1. Rotate the cone by `Math.PI` around local X, or equivalent, so its tip is at local ground height and wide base above; preserve center height and material behavior.
  2. Replace the current symmetric `Math.sin(progress * Math.PI)` radius envelope with a monotonically widening ground-to-top envelope, such as `0.08 + progress * 0.8`, retaining only small bounded pulses so the tip remains narrow and top wider.
  3. Keep both counter-rotating bands, colors, animation speed, rings, debris, trail, ball-following position, and width scaling intact.
  4. Do not change skill simulation or tornado contact behavior.

### I02. Validate the visual component and production bundle
- Related Files:
  - `game/src/components/TornadoShot3D.jsx` :: rendered effect — compile and bundle the final component; modify
  - `game/package.json` :: `build` script — use the existing Vite build; read-only

#### Details
- Run the production build to catch JSX, Three.js API, and bundling errors.
- Keep the existing component in the bundle; add no gameplay dependency or new package.

## Acceptance Criteria
- [x] The transparent cone has its point at ground level and wide end above.
- [x] Wind bands narrow near ground and widen with height throughout animation.
- [x] Tornado position, movement, duration, contact rules, and other visual layers remain unchanged.
- [x] Production build succeeds.

## Validation
- `npm run build` from `game/` — Vite production build succeeds.

## Commit Message
```text
fix(vfx): point Tornado Shot funnel toward the ground

Plan: 2026-10-26-football-skill-fixes
Phase: P01-skill-gameplay-and-vfx
Task: T05-downward-tornado-funnel

- Flip the Tornado Shot cone to point at ground level
- Widen animated wind bands from the ground tip upward
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: recorded in Git history
