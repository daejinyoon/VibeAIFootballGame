# Task: T01 Restore 3D Scene Visibility

## Status: done

## Goal
Render the 3D pitch, goals, active players, selected-player marker, and a clearly visible ball during kickoff and live play. The current browser reproduction shows the match UI and timer above a solid sky-blue canvas with none of these scene objects visible.

## Decision Summary
- Preserve the 3D arcade game, bright palette, three-zone tracking camera, center-circle kickoff, and current match rules.
- Keep game simulation coordinates unchanged: `FIELD.width = 960`, `FIELD.height = 540`; Three.js uses 80 game units per world unit, mapping the field to 12 by 6.75 units.
- Make the physical ball high-contrast and large enough to see against alternating green turf at kickoff and during play.

## Implementation

### I01. Fix camera and scene visibility
- Related Files:
  - `game/src/components/TrackingCamera3D.jsx` :: `TrackingCamera3D`; modify
  - `game/src/components/Match3DCanvas.jsx` :: `Match3DCanvas`; modify
  - `game/src/components/GameLoop3D.jsx` :: `GameLoop3D`; inspect and modify only if actor transforms are not synchronized to the visible scene
  - `game/src/components/FootballPitch3D.jsx` :: `FootballPitch3D`; inspect and modify only if pitch meshes/materials are hidden by the corrected camera or renderer settings
  - `game/src/components/FootballPlayer3D.jsx` :: `FootballPlayer3D`; inspect and modify only if player meshes/materials are hidden by the corrected camera or renderer settings
  - `game/src/game/constants.js` :: `FIELD`; read-only
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState`; read-only
- Details
  - **Relevant types and values**:
    ```ts
    type Field = { width: 960; height: 540 };
    type MatchBall = { x: number; y: number; height: number; ownerId: string | null; flightKind: string };
    type TrackingZone = 'left' | 'center' | 'right';
    const WORLD_SCALE = 80;
    ```
  - The live kickoff state starts with the ball at `{ x: FIELD.width / 2, y: FIELD.height / 2, height: 0, ownerId: 'home-fw', flightKind: 'ground' }`. The canvas receives this state through `Match3DGame` and `Match3DCanvas`.
  - Convert all actor positions consistently: `worldX(x) = x / WORLD_SCALE - FIELD.width / (2 * WORLD_SCALE)` and `worldZ(y) = (y - FIELD.height / 2) / WORLD_SCALE`. Confirm the camera target and actor positions use this same mapping; do not mix `y` with Three.js vertical height.
  - Inspect the rendered camera after its first frames, not only its initial `Canvas` camera prop. It must look toward the field target, keep the ground-plane pitch in its view frustum, use a positive aspect ratio after resize, and stay within its near/far clipping planes. Preserve the current left/center/right zone choice and 24-game-unit hysteresis.
  - Derive camera distance from the visible world-space bounds and `size.width / size.height`, including the current zone's field width and both touchlines. Clamp invalid dimensions and non-finite camera values. Keep the camera interpolation delta-time stable.
  - Confirm that `GameLoop3D` mutates the same registered actor objects created by `FootballPlayer3D` and `FootballBall3D`. If actor registration is missing or stale, correct ref registration/cleanup so player and ball transforms update without remounting the whole scene.
  - Keep the visible stadium, pitch, player kits, and sky in the bright arcade palette. Do not replace the Three.js scene with the older 2D `PitchCanvas`.
- **Execution Flow / Logic**:
  1. Reproduce kickoff in Chrome at the local Vite app and inspect the canvas, post-frame camera transform, scene object visibility, and actor positions.
  2. Correct the renderer/camera/actor-transform defect that prevents the scene from appearing; do not solve a camera issue by moving the simulation or changing field coordinates.
  3. Verify the center-circle kickoff view shows the ball, kickoff players, and selected marker. Confirm all 8 actors are registered; the center-zone camera is not expected to show both goalkeepers at once. Verify that ball x positions in the left and right thirds move the camera toward the matching half.
  4. Resize between desktop landscape and a narrow viewport; recompute framing from the new canvas dimensions.

### I02. Improve ball visibility
- Related Files:
  - `game/src/components/FootballBall3D.jsx` :: `FootballBall3D`; modify
  - `game/src/components/GameLoop3D.jsx` :: ball actor synchronization; read-only unless T01 finds a transform defect
- Details
  - Keep a round sphere as the ball silhouette and its current position/height mapping.
  - Increase the sphere radius from `0.145` to at least `0.19` world units; scale panel geometry and shadow proportionally.
  - Use a warm-white shell (`#fff7df`) and dark navy panels (`#263747`) with enough surface contrast under stadium lighting. Preserve the orange emissive treatment for `flightKind === 'skill-shot'`.
  - Keep airborne height and rotation updates working; do not render the shadow at the ball's elevated height.

## Acceptance Criteria
- [x] Chrome shows the green 3D pitch, field markings, kickoff players, ball, and selected-player marker in the center-zone camera at kickoff; the canvas is not a uniform blue rectangle. Outer-zone camera framing retains the active half and its goal.
- [x] The ball is visibly distinct from the turf at kickoff; its sphere and shadow scale remain mapped to the live ball height.
- [x] Kickoff player and ball actors render continuously and remain synchronized by the existing frame loop.
- [x] The center-zone camera distance is within the 100-unit far plane, and desktop/narrow viewports render the active field area without a blank canvas.
- [x] The match timer, controls, score HUD, and bright arcade presentation remain unchanged.

## Validation
- `cd game; npm run build` — production bundle compiles.
- Manual Chrome check at `http://127.0.0.1:5175/` — start a campaign and inspect kickoff on desktop and narrow viewports. A browser-side match-state probe places the loose ball in the left and right thirds and confirms the camera follows the matching half.

## Commit Message
`	ext
fix(game): restore visible 3d match scene

Plan: 2026-10-22-3d-scene-visibility
Phase: P01-rendering-repair
Task: T01-scene-visibility

- Correct camera and actor visibility for the full match scene.
- Increase football contrast and visibility on the turf.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending

## Execution Notes
- Root cause: `halfFrameWidth` was calculated in 960-unit simulation coordinates while camera distance expects Three.js world units. It produced a camera distance around 215 units, beyond `far: 100`, clipping the full scene. Converting by `WORLD_SCALE` keeps the camera near the pitch (about 7 world units at desktop kickoff).
- Increased the football sphere radius from 0.145 to 0.19 world units, scaled the dark panels and ground shadow, and changed the base shell to warm white.
- `npm run build` passed (the existing Three.js bundle-size warning remains). Manual Chrome inspection confirmed the kickoff scene, football, and narrow viewport render. Browser-side ball-position probes moved camera x toward both outer halves. Camera state at desktop kickoff was approximately `(0, 4.51, 6.28)` with `far: 100`.

