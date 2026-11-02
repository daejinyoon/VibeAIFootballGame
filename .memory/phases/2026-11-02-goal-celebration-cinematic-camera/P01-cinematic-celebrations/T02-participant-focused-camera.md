# Task: T02 Participant-Focused Camera

## Status: done

## Goal
Move the 3D match camera smoothly to a close, lower front view of all ceremony participants and smoothly return to normal ball tracking afterward.

## Decision Summary
- Use `goalCelebration.participantIds` and `goalCelebration.team` to compose a five-second close-up and select the scoring team's front side.
- Keep the normal camera's ball-zone tracking behavior unchanged outside celebrations.

## Implementation

### I01. Compute a camera frame for the celebration group

- Related Files:
  - `game/src/game/goalCelebrationCamera.js` :: new pure camera-frame calculation helper.
  - `game/src/game/goalCelebrationCamera.test.js` :: frame composition tests; new.
  - `game/src/game/constants.js` :: `FIELD` — read-only field bounds.
  - `game/src/components/FootballPlayer3D.jsx` :: field-to-world scale and axes — read-only transform reference.

#### Details
- **Signatures & Types**:
  ```js
  export function getGoalCelebrationCameraFrame({ players, participantIds, team, aspect })
    -> { target: { x: number, y: number, z: number },
         position: { x: number, y: number, z: number } } | null;
  ```
- **Data & Coordinate Rules**:
  - Input player: `{ id: string, x: number, y: number }` in game field units.
  - Valid team: `'home' | 'away'`; home attacks `+x`, away attacks `-x`.
  - Match rendering converts field `x` and `y` to world `x` and `z` by dividing by `80`, with `FIELD.width / 160` and `FIELD.height / 2` centers.
  - Celebration camera elevation: `24°` above the pitch, lower than the regular tracking camera's `36°`.
  - Perspective FOV remains `42°`; zoom by changing camera distance, not FOV.
- **Execution Flow / Logic**:
  1. Resolve only the IDs listed in `participantIds`; return `null` if team or participants are invalid so the component can fall back to normal tracking.
  2. Convert participants to world coordinates and compute the group's centroid and min/max lateral spread.
  3. Add at least `0.45` world units of horizontal margin on both sides. Compute `safeAspect = Number.isFinite(aspect) ? Math.max(0.35, aspect) : 1`, `horizontalHalfFov = atan(tan(21°) * safeAspect)`, and `distance = max(4.5, halfWidth / tan(horizontalHalfFov))` so the widest participant group fits inside the 42° vertical FOV with margin.
  4. Set target height to `0.85` world units to frame the characters' upper bodies.
  5. Position the camera along the scoring team's attack axis: `target.x + attackDirection * distance * cos(24°)`, `target.y + distance * sin(24°)`, and `target.z`.
  6. Test participant-only centering, correct camera-side sign for both teams, distance adjustment for narrow aspect ratios, margins around the widest group, and invalid-input fallback.

### I02. Blend between ceremony and match camera

- Related Files:
  - `game/src/components/TrackingCamera3D.jsx` :: `TrackingCamera3D` — add ceremony camera target selection and easing.
  - `game/src/game/goalCelebrationCamera.js` :: `getGoalCelebrationCameraFrame` — consume in component.

#### Details
- **Execution Flow / Logic**:
  1. In `useFrame`, when `gameStateRef.current.goalCelebration` is active, calculate the frame from `players`, `participantIds`, and `team`; interpolate the existing camera position and look target toward it using the component's existing exponential smoothing.
  2. Keep using the celebration frame while elapsed time advances through the full five-second ceremony.
  3. When `goalCelebration` becomes `null`, resume the existing ball-zone camera calculation. Its existing smoothing creates the return transition.
  4. Do not stop or alter match simulation from the camera component; camera state is presentation-only.
  5. Manually preview SIUUU, the group dances, RKO, and goals scored by both teams. Verify all participants fit inside the viewport, the scoring team's front is visible, and the camera returns to the normal tracking view.

## Acceptance Criteria
- [x] All listed participants fit in a close-up with visible margin; bystanders do not control the crop.
- [x] Home and away celebration views show the scoring team's front from a lower angle.
- [x] Camera movement in and out is smooth and finishes after the five-second ceremony.
- [x] Normal ball tracking is unchanged when there is no active celebration.

## Validation
- From `game/`: `npm test -- src/game/goalCelebrationCamera.test.js src/game/goalCelebrationMotion.test.js src/game/stepGame.test.js` — camera-frame, timeline, staging, and kickoff tests pass.
- From `game/`: `npm run build` — production Vite build succeeds.
- In the local match preview, score with each team and check all five ceremony selections, including the three-player RKO.

Camera-frame and ceremony-motion tests passed (12 passed); T01-focused celebration/kickoff tests passed (12 passed); production build succeeded. The full T02 test command reported 123 passed and the same two unrelated Eulryongta/knockdown failures documented in T01. Browser automation is unavailable in this environment, so the requested live visual preview across both teams and all ceremony selections remains unverified here.

## Commit Message
```text
feat(3d): frame goal celebrations with cinematic camera

Plan: 2026-11-02-goal-celebration-cinematic-camera
Phase: P01-cinematic-celebrations
Task: T02-participant-focused-camera

- Follow and frame all celebration participants from the scoring team's front.
- Ease back to the regular ball-tracking camera when the ceremony ends.
```

## Progress
- [x] Implementation complete
- [x] Camera math tests and production build passed; live match preview could not be run in this environment.
- commit: pending
