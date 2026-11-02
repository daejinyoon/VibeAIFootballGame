# Decisions: Memory File Names, Release History, and AI Kickoff Pass

- Date: 2026-11-02
- Status: Confirmed

## D01. Plan and decision filenames
- **Chosen**: Rename every Markdown file in `.memory/plans/` and `.memory/decisions/` using its existing date prefix and a short, readable English title. Update links and path references throughout the repository.
- **Rationale**: The user wants the entire plan and decision lists to be easy to scan; the date prefix keeps entries sortable and English names avoid Korean filename handling concerns.

## D02. Ongoing game patch notes
- **Chosen**: Keep the current app at v1.0.0 and preserve its release history. Build the versioned-history structure now, then add future releases with a version and date, displayed newest first, with titled sections and short Korean bullet items. Use one structured source consumed by the existing patch-note dialog.
- **Rationale**: The user wants easy ongoing maintenance and visible history, while leaving this change unversioned until a later release decision.

## D03. Opponent kickoff pass
- **Chosen**: Whenever the away AI kicks off, including the opening kickoff and kickoffs after the home team scores, it should make a short ground pass to an active field-player teammate. Prefer a teammate ahead of the taker; when none is available, pass to the nearest eligible field teammate. Never target a home player or goalkeeper.
- **Rationale**: The opponent should retain possession at kickoff and use a teammate as the receiver even when formation leaves no forward passing option.

## Code findings and constraints
- `.memory/plans/` currently contains 46 pre-plan files and `.memory/decisions/` contains 53 files. Renaming requires updating links in the rest of `.memory` and any repository references.
- The active plan/task pointers are stored in `.memory/current.md`; preserve their meaning while updating paths.
- The current game patch-note source is `game/src/game/releaseNotes.js`; it has one v1.0.0 list without per-release dates. `ReleaseNotesDialog.jsx` renders the list, and tests assert the current version and v1.0.0 sections.
- Away kickoff currently calls `releasePass` without a receiver override. The general forward-only receiver selector may return `null`; only the user-controlled kickoff path has a nearest-teammate fallback.
- Preserve the existing kickoff lock, player freeze, and half-line enforcement behavior.
