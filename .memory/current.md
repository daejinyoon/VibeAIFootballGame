# Current Context

## Active Plan
[Customization and Goal Ceremony Preview Fixes](./plans/2026-11-02-customization-ceremony-preview-fixes.md)

## Active Phase
[P01 Customization and Match Fixes](./phases/2026-11-02-customization-ceremony-preview-fixes/P01-customization-and-match-fixes/phase.md)

## Active Task
[T05 Customization 3D Previews](./phases/2026-11-02-customization-ceremony-preview-fixes/P01-customization-and-match-fixes/T05-customization-3d-previews.md)

## Status
- T01 through T04 are implemented. Repeated-goal and camera tests pass; full engine tests retain the two previously recorded unrelated failures. Camera production build succeeds with a large-chunk advisory. Confirmed decisions: `.memory/decisions/2026-11-02-customization-ceremony-preview-fixes.md`.
- The previous profile API v8 save fix and five-second cinematic camera work are already implemented; this plan adds the newer preview request and fixes reported in the confirmed decision record.
- Two unrelated full-game test failures were previously observed (Eulryongta possession and knockdown recovery); recheck during execution and only fix if they block acceptance.

## Next Step (IMPORTANT)
Read T05 and add the silent kit and ceremony preview scenes to `game/src/components/TeamCustomizationScreen.jsx`, reusing the shared match model and motion logic.
