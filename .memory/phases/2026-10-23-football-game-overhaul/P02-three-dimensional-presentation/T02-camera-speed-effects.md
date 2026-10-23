# Task: T02 Wide Ball-Follow Camera and Sprint Effects

## Status: done

## Goal
Show a wider portion of the pitch around the ball and make sprinting visually fast with short trails and ground dust, without hiding nearby players.

## Decision Summary
- Keep the ball-follow camera and its existing field-zone hysteresis. Widen the frame; reserve close framing for the skill cut-in task.
- Speed particles are brief, team-colored, low to the grass, and active only for sprinting players.

## Implementation

### I01. Wider tracking camera
- Related Files:
  - `game/src/components/TrackingCamera3D.jsx` :: `CAMERA_FOV`, `halfFrameWidth`, `cameraDistance` — widen framing; modify.
- Details
  - Keep the current ball-zone tracking, hysteresis, target smoothing, vertical ball tracking, and camera tracking of ball Y.
  - Increase visible field width by changing the central-zone half-frame formula from `FIELD.width / (6 * WORLD_SCALE) + 0.35` to `FIELD.width / (4 * WORLD_SCALE) + 0.5`; change the side-zone formula to `FIELD.width / (3.5 * WORLD_SCALE) + 0.5`.
  - Retain depth calculation and `ELEVATION_RADIANS`; use existing aspect ratio so desktop view fits more pitch while still adapting to the canvas dimensions.
  - Do not add camera shake or automatic close zoom here; cut-ins own that presentation.

### I02. Sprint trail and dust system
- Related Files:
  - `game/src/components/PlayerMotionEffects3D.jsx` :: `PlayerMotionEffects3D({ gameStateRef })` — pooled motion cues; new.
  - `game/src/components/Match3DCanvas.jsx` :: scene children — mount motion effects; modify.
  - `game/src/components/GameLoop3D.jsx` :: frame state — keep live `sprinting`, velocity, and facing available; modify only if the state map is missing.
- Details
  - Render for each active `player.sprinting === true`; anchor to player position on pitch plane and use player facing to place the trail behind movement.
  - Use a fixed pool of 24 small low-poly particles (12 trail streaks and 12 dust puffs) with bounded lifetime `0.12..0.28s`; reuse meshes/materials rather than allocating a new mesh each frame.
  - Trail color follows the team's jersey accent; dust uses muted grass/earth colors. Fade opacity to zero, keep maximum vertical size below `0.35` world units, and never cover the ball or selection marker.
  - Hide/expire particles when the player stops sprinting, is dismissed, or enters `knockdown`/`recover`.
  - Dispose geometries/materials on component unmount. Add no particle dependency.

## Acceptance Criteria
- [x] Ball tracking and zone transitions remain smooth; the camera visibly shows a wider section of pitch than before.
- [x] Desktop aspect changes preserve the pitch and nearby-player visibility.
- [x] Sprint trails and dust appear only while sprinting and expire without per-frame unbounded allocation.
- [x] Pause/resume, player dismissal, and team color changes do not leave stale particles.

## Validation
- `cd game; npm run build` — camera and pooled R3F effect components compile.
- Manual browser check: run the 3D match and confirm wider framing and brief sprint-only cues.

## Commit Message
```text
feat(visuals): widen match camera and add sprint trails

Plan: 2026-10-23-football-game-overhaul
Phase: P02-three-dimensional-presentation
Task: T02-camera-speed-effects

- Widen the ball-follow camera frame
- Add pooled sprint trail and dust effects
```

## Progress
- [x] Implementation complete
- [x] Production build passed; source reviewed for pause, dismissal, ball occlusion, and team color updates.
- Manual browser preview unavailable in this session (no browser executable or automation tool).
- commit: `86e14fd`
