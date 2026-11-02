# Current Context

## Active Plan
[Customization and Goal Ceremony Preview Fixes](./plans/2026-11-02-customization-ceremony-preview-fixes.md)

## Active Phase
[P01 Customization and Match Fixes](./phases/2026-11-02-customization-ceremony-preview-fixes/P01-customization-and-match-fixes/phase.md)

## Active Task
[T04 Three-Quarter Celebration Camera](./phases/2026-11-02-customization-ceremony-preview-fixes/P01-customization-and-match-fixes/T04-three-quarter-celebration-camera.md)

## Status
- T01 through T03 are implemented. The repeated-goal and campaign-selection tests pass; the full engine test run retains the two previously recorded unrelated failures. Confirmed decisions: `.memory/decisions/2026-11-02-customization-ceremony-preview-fixes.md`.
- The previous profile API v8 save fix and five-second cinematic camera work are already implemented; this plan adds the newer preview request and fixes reported in the confirmed decision record.
- Two unrelated full-game test failures were previously observed (Eulryongta possession and knockdown recovery); recheck during execution and only fix if they block acceptance.

## Next Step (IMPORTANT)
Read T04 and adjust `getGoalCelebrationCameraFrame` in `game/src/game/goalCelebrationCamera.js` for a low three-quarter front composition that keeps participants' full bodies in view.
