# Plan: Customization and Goal Ceremony Preview Fixes

## Goal
Make the selected home kit match its in-game appearance, let players preview every supported ceremony in team customization, remove Moonwalk while keeping old profiles usable, show goal celebrations clearly, and keep every player fixed until opening or post-goal kickoff is actually taken. Preserve the selected ceremony across all goals in one match.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Remove the unsupported ceremony, repair restart behavior, improve camera framing, and add accurate 3D previews | [P01](../phases/2026-11-02-customization-ceremony-preview-fixes/P01-customization-and-match-fixes/phase.md) |

## Dependencies and Constraints
- Decisions: `.memory/decisions/2026-11-02-customization-and-ceremony-previews.md`.
- Keep the four supplied audio clips and the rule that Random chooses once at match start and retains that ceremony for the match.
- Keep profile API acceptance of legacy `moonwalk`; client normalization maps old profiles to Random.
- Keep the match clock running during celebrations and retain five-second choreography.
- PvP celebration behavior is deferred.
- The last full game test run had unrelated Eulryongta possession and knockdown recovery failures. Record whether they remain; address only if they block acceptance.
