# Task: T03 Three-Zone Camera

## Status: done

## Goal
Frame the central third at kickoff, then smoothly show the full left or right half based only on the ball's physical x-position.

## Decision Summary
- Camera zones are left half, central midfield, and right half; outer zones include the full relevant half from goal line through halfway line and both touchlines.
- Use a 24-game-unit hysteresis buffer around the one-third and two-thirds zone boundaries so the camera does not flicker when the ball rolls near a boundary.
- Keep a wide responsive framing on narrow viewports if the full outer half cannot fit at the same zoom.

## Implementation

### I01. Zone selection and camera framing
- Related Files:
  - game/src/components/TrackingCamera3D.jsx :: TrackingCamera3D, useFrame; modify
  - game/src/components/Match3DCanvas.jsx :: Canvas camera and TrackingCamera3D props; modify only if responsive framing requires camera configuration
  - game/src/game/constants.js :: FIELD; read-only
- Details
  - Remove getAttackDirection and the current possession-based attackAnchorX selection.
  - Define three x regions in game coordinates: left outer zone x < FIELD.width / 3; center zone FIELD.width / 3 through FIELD.width * 2 / 3; right outer zone x > FIELD.width * 2 / 3. Initialize the zone as center at a fresh kickoff.
  - Keep the current zone until the ball passes 24 units beyond a boundary. For example, from center to left require x < FIELD.width / 3 - 24; from left to center require x > FIELD.width / 3 + 24. Apply symmetric conditions at the right boundary.
  - Convert the active-zone frame center to Three.js x using x / 80 - FIELD.width / 160. For the center zone, center on FIELD.width / 2. For an outer zone, center on the midpoint of that entire half: [0, FIELD.width / 2] or [FIELD.width / 2, FIELD.width].
  - Use a smaller camera distance than the current z≈16 for an outer zone, with a framing calculation that fits the entire half, both touchlines, goal, and halfway line. The center zone must show the center circle and players at kickoff.
  - Keep smooth interpolation for both camera position and look target; use a delta-time-stable exponential interpolation rather than a per-frame jump.
  - Adapt camera distance or FOV to viewport aspect ratio so portrait/narrow screens retain the full active half. The camera must track ball y-position without allowing the pitch edges to clip.
- Acceptance Criteria
  - At kickoff the center circle is framed in the central zone.
  - Ball position selects the view; possession changes alone do not.
  - After a hysteresis crossing the correct outer half is enlarged and fully visible.
  - Returning across the boundary restores the corresponding central/other-half view without rapid oscillation.
  - Desktop and narrow viewports keep the ball, selected player, goal, halfway line, and touchlines in frame.
- Validation
  - npm run build
  - Manually inspect kickoff, each boundary crossing, both outer halves, and a narrow browser viewport.
- Commit Message
  feat(game): add three-zone attack camera

  Plan: 2026-10-22-arcade-3d-match-polish
  Phase: P01-arcade-match-polish
  Task: T03-three-zone-camera

  - Frame the center at kickoff and the ball's active half during play.
  - Use hysteresis and responsive zoom to keep the complete half visible.
- Progress
- [x] Implementation complete
- [x] Production build passed
- [ ] Manual visual inspection completed (no local browser executable is available in this environment)
- commit: 67c69ab

## Execution Notes
- Replaced possession-based framing with physical ball-x zones: left, center, and right.
- Added 24-unit boundary hysteresis and a responsive framing calculation that fits the outer half and touchlines on narrow viewports.
- `npm run build` passed. Browser inspection at kickoff, boundaries, outer halves, and portrait viewport could not be performed because no browser executable is available here.

