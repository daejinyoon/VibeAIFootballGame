# Task: T01 Mii Player Motion and Appearance

## Status: done

## Goal
Replace identical static capsule players in the active 3D scene with varied, expressive Mii-style players whose limbs and body animate for movement and on-ball actions.

## Decision Summary
- Keep geometry procedural in React Three Fiber; no imported character-model dependency or bitmap portraits.
- Give each existing player ID a stable appearance variant, and animate from the live mutable game state rather than stale React props.

## Implementation

### I01. Reusable Mii-style model and deterministic variants
- Related Files:
  - `game/src/components/MiiPlayerModel.jsx` :: `MiiPlayerModel({ player, pose, scale })` ? reusable procedural geometry; new.
  - `game/src/components/FootballPlayer3D.jsx` :: `FootballPlayer3D()` ? scene wrapper and registered actor; modify.
  - `game/src/components/Match3DCanvas.jsx` :: player render map ? pass live `gameStateRef`; modify.
- Details
  - Extract the body meshes currently in `FootballPlayer3D.jsx` into `MiiPlayerModel`; inputs: `player: PlayerState`, `pose: 'field' | 'cutIn'`, `scale: number` (default `1`). Keep `FootballPlayer3D` responsible for world position, team rotation, selection ring, and actor refs.
  - Define a fixed array of at least eight face/hair variants in `MiiPlayerModel.jsx`, each with `{ skin: string, hair: string, hairStyle: 0|1|2, eyeColor: string }`. Select by stable hash of `player.id`; the same player must look identical on every render and save reload.
  - Make the face larger and rounded, retain simple eyes, add hair volume/shape differences, and preserve role/team kit colors supplied by the existing `KITS` until P04 branding integration.
  - Use shared model geometry for field and cut-in renders; do not duplicate a separate incompatible portrait style.

### I02. Live movement and action animation
- Related Files:
  - `game/src/components/FootballPlayer3D.jsx` :: `useFrame()` animation ? mutate child transforms; modify.
  - `game/src/components/MiiPlayerModel.jsx` :: limb/body refs ? expose animatable parts; new.
  - `game/src/components/GameLoop3D.jsx` :: actor transform sync ? provide current player state to actor map if needed; modify.
  - `game/src/game/stepGame.js` :: `moveByInput()`, `moveToward()`, pass/shot/tackle/header transitions ? emit correct `motionAction`; modify.
- Details
  - Read the current player object each animation frame from `gameStateRef.current.players` by ID. Do not animate using the initial `player` object passed at mount.
  - Add live animation parts for left/right arms, left/right legs, torso, and head. For `motionAction === 'run'`, alternate opposite arm/leg swings; use a small torso bob. When the live player state has `sprinting === true`, increase stride and lean forward by `25%` over run; do not require `motionAction` to encode sprint.
  - When the player owns the ball, use a dribble pose and synchronize a short alternating foot touch with the existing ball-owner position update; do not change ball physics.
  - On successful pass/shot/skill contact, transition the source player to a short action pose; preserve existing `knockdown` and `recover` semantics. Add `motionTimerSeconds` only if needed, default `0`, and reset it deterministically on action transitions.
  - When paused, freeze animation phase; when resumed, continue smoothly without resetting the model or actor refs.

## Acceptance Criteria
- [x] The four distinct players on each team have stable, visible Mii-like differences in face/hair.
- [x] Run, sprint, and dribble are visibly different; body parts move continuously without React re-rendering every frame.
- [x] Pass, shot, tackle, knockdown, recovery, and header actions use short poses without blocking simulation.
- [x] Player selection ring, team orientation, keeper identity, and actor registration still work.
- [x] No new character-model package or raster portrait assets are added.

## Validation
- `cd game; npm run build` ? R3F component bundle compiles.
- `cd game; npm test -- src/game/stepGame.test.js` ? existing simulation behavior and motion action states remain valid.

## Commit Message
```text
feat(visuals): animate varied Mii-style players

Plan: 2026-10-23-football-game-overhaul
Phase: P02-three-dimensional-presentation
Task: T01-mii-player-motion

- Add stable procedural face and hair variants
- Animate run, sprint, dribble, and action poses
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: created with this task blueprint
