# Task: T04 Correct Center Camera Framing

## Status: done

## Goal
At 800x600, the live match canvas must show the center play zone without cutting off the goalkeepers at the left and right edges. Preserve the existing responsive field size, HUD, input, pause, and camera tracking behavior.

## Decision Summary
- [D04 of the desktop responsive layout decisions](../../../decisions/2026-10-27-desktop-responsive-layout.md) requires the field and players to remain visible as the canvas aspect ratio changes.
- A live React `GameScreen` check at 800x600 showed both goalkeepers partly clipped. The current center-zone camera fit allows only one half of the field plus a small margin, while its minimum distance hides the error at wider ratios.
- Extend the existing aspect-aware distance calculation to include the whole field width in the center zone. Keep the left/right zone follow logic and all other camera behavior.

## Implementation

### I01. Fit the center zone horizontally

- Related Files:
  - `game/src/components/TrackingCamera3D.jsx` :: `TrackingCamera3D`, `halfFrameWidth` center-zone branch — modify
  - `game/src/components/Match3DCanvas.jsx` :: renderer and DPR cap — read-only; preserve unrelated uncommitted changes
  - `game/src/styles.css` :: responsive canvas dimensions — read-only

#### Details
- **Signatures & Types**: No props, state, model, or API change. In `TrackingCamera3D`, set the center-zone horizontal half-frame requirement to `FIELD.width / (2 * WORLD_SCALE) + 0.8` world units. Keep the left/right-zone expression and `cameraDistance = Math.max(7, distanceForWidth, distanceForDepth)`.
- **Execution Flow / Logic**: Existing `useThree().size` updates the canvas aspect ratio. The width term increases camera distance only when necessary; all other tracking and smoothing remain unchanged.
- **Exceptions**: Do not add resize listeners, alter FOV, change React Three Fiber DPR, or edit game rules. The UI may still scroll vertically at short browser heights.

## Acceptance Criteria
- [x] At 800x600, both center-zone goalkeepers fit within the 3D canvas without edge clipping.
- [x] At 1280x720 and 1920x1080, the goals, players, scoreboard, audio button, and minimap remain visible with no horizontal overflow.
- [x] Resizing an active match keeps the same canvas and allows pause/resume and audio toggle; no match reset or focus loss.
- [x] Only `TrackingCamera3D.jsx` and this Task's memory state are included in the implementation commit.

## Validation
- `npm --prefix game run build` — production bundle succeeds.
- Run the temporary live `GameScreen` browser harness at 800x600, 1280x720, and 1920x1080, inspect screenshots and layout metrics, resize during play, and exercise pause/resume and audio toggle. Remove the temporary harness files afterward.

## Commit Message
```text
fix(match): keep center-zone players in camera frame

Plan: 2026-10-27-desktop-responsive-layout
Phase: P01-desktop-responsive-ui
Task: T04-correct-center-camera-framing

- Fit the full field width when the ball is in the center zone
- Preserve camera tracking and responsive match controls
```

## Progress
- [x] Implementation complete
- [x] Validation passed for production build and live React component checks
- The live `GameScreen` rendered WebGL at 800x600, 1280x720, 1920x1080, 2560x1440, and 3440x1440. Screenshots showed both goalkeepers inside the 800x600 frame. All five sizes had no horizontal overflow, HUD/audio overlap, or minimap overflow. Resize preserved the same canvas; pause/resume, audio toggle, focus, and scrolling worked. The only browser console 404 was `/favicon.ico` on each page navigation. Entra-authenticated end-to-end testing was unavailable in the fresh browser session.
- commit: committed with this Task blueprint
