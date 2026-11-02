# Task: T04 Three-Quarter Celebration Camera

## Status: done

## Goal
Make each celebration readable from a low, slightly off-axis three-quarter front view that keeps every participant's head and feet in frame.

## Decision Summary
- The scoring team's front remains visible and flips for home versus away.
- Use a 20-degree azimuth offset from that front and retain the existing low 24-degree elevation.

## Implementation

### I01. Camera composition and fit
- Related Files:
  - `game/src/game/goalCelebrationCamera.js` :: `getGoalCelebrationCameraFrame` and framing constants — modify.
  - `game/src/components/TrackingCamera3D.jsx` :: celebration frame branch in `useFrame` — inspect; modify only if needed to apply the computed frame smoothly and return to ball tracking.
  - `game/src/game/goalCelebrationCamera.test.js` :: camera orientation and fit tests — modify.
- Details
  - **Signatures & Types**:
    ```js
    export function getGoalCelebrationCameraFrame({
      players: Array<{ id: string; x: number; y: number }>,
      participantIds: string[],
      team: 'home' | 'away',
      aspect?: number,
    }): null | {
      target: { x: number; y: number; z: number },
      position: { x: number; y: number; z: number },
    };
    ```
  - **Data & Schema Fields**: Keep world scale `80`, vertical FOV `42°`, `participantIds`, and team inputs. Add no persistent state.
  - **Execution Flow / Logic**:
    1. Keep existing input validation and participant-centroid target; return null for invalid team, missing participant, or malformed coordinate.
    2. Set front X direction to `+1` for home and `-1` for away. Add a perpendicular Z component equal to `tan(20°)` times front-axis distance, on a consistent pitch side for both teams.
    3. Retain 24-degree elevation. Calculate required distance as the maximum of the current minimum, the horizontal-spread distance including 0.45 world-unit margin for the actual aspect ratio, and the vertical-fit distance. Require at least 1.0 world unit of visible half-height around the target to include the approximate 1.6-unit Mii model and its feet.
    4. Keep target near current torso height and include vertical margin. `TrackingCamera3D` continues lerping during celebration and resumes ball follow when `goalCelebration` becomes null.
    5. Test both team front signs, nonzero Z offset/20-degree azimuth, full-height margin, narrow aspect, and three-person RKO group.

### I02. Camera unit cases
- Related Files:
  - `game/src/game/goalCelebrationCamera.test.js` :: current centering, team-front, narrow viewport, invalid-input tests — modify.
- Details
  - Preserve centroid and invalid-input assertions.
  - For home and away assert correct front X sign and Z/front component ratio matching 20 degrees.
  - At aspect `16/9` and `0.5`, assert at least `1.0` visible vertical half-span and horizontal group half-width plus `0.45` margin.

## Acceptance Criteria
- [ ] The camera flips toward each scoring team's attacking front while preserving the same three-quarter azimuth.
- [ ] Full player bodies including feet fit at desktop and narrow aspect ratios.
- [ ] Camera transition remains smooth and normal ball-follow resumes after celebration.

## Validation
- `cd game; npm test -- src/game/goalCelebrationCamera.test.js` — composition/fit tests pass.
- `cd game; npm run build` — camera integration builds for production.

## Commit Message
```text
fix(game): show full celebration from three-quarter view

Plan: 2026-11-02-customization-ceremony-preview-fixes
Phase: P01-customization-and-match-fixes
Task: T04-three-quarter-celebration-camera

- Offset celebration camera to a low three-quarter front angle
- Fit participant width and full character height in frame
```

## Progress
- [x] Implementation complete
- [x] Validation passed (production build reports existing large-chunk advisory)
- commit: pending
