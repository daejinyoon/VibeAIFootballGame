# Current Context

## Active Plan
[Customization and Goal Ceremony Preview Fixes](./plans/2026-11-02-customization-ceremony-preview-fixes.md)

## Active Phase
[P01 Customization and Match Fixes](./phases/2026-11-02-customization-ceremony-preview-fixes/P01-customization-and-match-fixes/phase.md)

## Active Task
[T02 Freeze Until Kickoff](./phases/2026-11-02-customization-ceremony-preview-fixes/P01-customization-and-match-fixes/T02-freeze-until-kickoff.md)

## Status
- T01 is implemented and targeted validation passed. Confirmed decisions: `.memory/decisions/2026-11-02-customization-ceremony-preview-fixes.md`.
- The previous profile API v8 save fix and five-second cinematic camera work are already implemented; this plan adds the newer preview request and fixes reported in the confirmed decision record.
- Two unrelated full-game test failures were previously observed (Eulryongta possession and knockdown recovery); recheck during execution and only fix if they block acceptance.

## Next Step (IMPORTANT)
Read T02 and implement the kickoff movement lock in `game/src/game/stepGame.js`, preserving the home S kickoff and automatic away AI kick.
