# Task: T01 Version and Patch Notes

## Status: done

## Goal
Set the game package to version 1.0.0, replace the BETA label with a v1.0.0 label, and provide an accessible 1.0 patch notes dialog opened by a button on the main screen.

## Decision Summary
- The player opens release notes manually from the main screen; do not auto-open or persist read state.
- Release highlights: 4v4 five-stage campaign, skill rewards, team branding/uniform customization, four goal celebrations with coordinated sound/camera, company PvP, and improved kickoff behavior.
- Keep patch notes in Korean and show the visible app version as `v1.0.0`.

## Implementation

### I01. Version and release note data
- Related Files:
  - `game/package.json` :: `version` — modify to `1.0.0`.
  - `game/package-lock.json` :: root and package metadata `version` — update to `1.0.0` only.
  - `game/src/game/releaseNotes.js` :: `APP_VERSION`, `APP_VERSION_LABEL`, `RELEASE_NOTES` — new.
  - `game/src/game/releaseNotes.test.js` :: version and release-note data — new.
- Release note sections should describe campaign/skills, team kit and logo, SIUUU/Take the L/Slickback/RKO ceremonies and audio, company PvP/records, and kickoff controls.

### I02. Main-screen entry and accessible dialog
- Related Files:
  - `game/src/components/StartScreen.jsx` :: `StartScreen` — replace BETA badge, add an always-visible patch notes button, and expose `onOpenPatchNotes` callback.
  - `game/src/components/ReleaseNotesDialog.jsx` :: `ReleaseNotesDialog` — new accessible overlay with heading, release sections, close button, Escape close, and backdrop close.
  - `game/src/App.jsx` :: `App` — own open/close state, pass the callback to `StartScreen`, and render the dialog when open.
  - `game/src/styles.css` :: release badge, button, dialog, and responsive styles — modify.
- Keep dialog opening under explicit player action; do not add automatic display or local-storage behavior.

## Acceptance Criteria
- [x] Package metadata reports `1.0.0` and the main screen shows `v1.0.0` instead of BETA.
- [x] The main screen includes a patch notes button that opens the v1.0 notes.
- [x] The dialog can be closed by its button, Escape, or backdrop and has responsive width/scroll behavior.
- [x] Release notes accurately describe included game features in Korean.

## Validation
- `cd game; node --test src/game/releaseNotes.test.js`
- `cd game; npm test` — 271/278 passed; seven failures are in untouched skill/campaign knockdown tests, outside this UI/version task.
- `cd game; npm run build`

## Commit Message
```text
release: prepare DEX Football Arcade v1.0

Plan: 2026-11-02-football-v1-release
Phase: P01-release-ui
Task: T01-version-and-patch-notes

- Set package version to 1.0.0 and replace the beta label
- Add a player-opened Korean release notes dialog
```

## Progress
- [x] Implementation complete
- [x] Targeted release-notes test and production build passed; full-suite failures recorded above.
- commit: pending
