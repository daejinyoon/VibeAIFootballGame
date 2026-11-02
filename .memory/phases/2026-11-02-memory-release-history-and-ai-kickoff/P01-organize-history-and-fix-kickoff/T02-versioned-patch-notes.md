# Task: T02 Build Versioned Patch-Note History

## Status: done

## Goal
Turn the current single-version patch-note list into a release history that preserves v1.0.0 and visibly displays version and release date for each entry, ordered newest first.

## Decision Summary
- Use one structured data source in `releaseNotes.js`; each release has a semantic version, ISO date, and existing titled sections with Korean bullet items.
- Preserve every current v1.0.0 section and item verbatim, including the company-PvP text. The user explicitly deferred correcting that availability wording until PvP APIs are restored.
- Keep the current app version at `1.0.0` for this structure-only change. Do not create a `1.0.1` entry or add the kickoff behavior as a patch item now.
- Keep the existing `RELEASE_NOTES` export as a compatibility alias to the newest release's sections so existing consumers/tests do not break.

## Implementation

### I01. Release history data model
- Related Files:
  - `game/src/game/releaseNotes.js` :: `APP_VERSION`, `APP_VERSION_LABEL`, `RELEASE_NOTES` — define `RELEASE_HISTORY` and derive current version exports; modify.
  - `game/package.json` :: `version` — read-only; must remain synchronized with the latest release.

#### Details
- **Signatures & Types**:
  ```js
  // ReleaseSection
  // { title: string, items: readonly string[] }
  // ReleaseRecord
  // { version: string, date: string, sections: readonly ReleaseSection[] }
  // RELEASE_HISTORY: readonly ReleaseRecord[]; newest record at index 0
  // CURRENT_RELEASE: ReleaseRecord; APP_VERSION: string; APP_VERSION_LABEL: string
  // RELEASE_NOTES: readonly ReleaseSection[]; compatibility view of CURRENT_RELEASE.sections
  ```
- **Data and schema**:
  - Add a v1.0.0 entry with `date: '2026-11-02'` and the five current sections in their current order and text.
  - `version` is a semantic version string such as `1.0.0`; `date` is `YYYY-MM-DD`.
  - `sections` contains `title: string` and a non-empty `items: readonly string[]`.
  - New releases are inserted at array index 0; prior entries are retained and never overwritten.
  - Derive `CURRENT_RELEASE = RELEASE_HISTORY[0]`, `APP_VERSION = CURRENT_RELEASE.version`, and `APP_VERSION_LABEL = `v${APP_VERSION}``. Keep `game/package.json` version equal to `APP_VERSION` whenever a new release is recorded.
  - Keep `RELEASE_NOTES = CURRENT_RELEASE.sections` so the existing `releaseNotes.test.js` assertions continue to inspect the v1.0.0 section data without requiring test-file edits.
- **Execution flow / logic**:
  1. Convert the current five-section `RELEASE_NOTES` data into `RELEASE_HISTORY[0].sections` without changing item text.
  2. Derive the app version exports from the newest record rather than maintaining a second version constant.
  3. Preserve frozen outer array and nested record/sections/items conventions used by the current module.

### I02. Version/date presentation in the dialog
- Related Files:
  - `game/src/components/ReleaseNotesDialog.jsx` :: `ReleaseNotesDialog` — render all release records newest first; modify.
  - `game/src/game/releaseNotes.js` :: `RELEASE_HISTORY` — read-only consumer.

#### Details
- Import `APP_VERSION_LABEL` and `RELEASE_HISTORY`.
- Keep the main-screen button and modal interaction unchanged.
- Change the generic dialog heading to `게임 패치 노트`; keep the header label showing the current app version.
- Render every release in array order. For each release, show `v{version}` and `date` before its titled sections, then render each section title and item list.
- Use stable keys based on version/date for releases and section title for sections. Add a visible date in an accessible `<time dateTime={date}>` element.
- Keep the dialog's existing keyboard focus trap, Escape behavior, and close behavior unchanged.

## Acceptance Criteria
- [ ] v1.0.0 retains all existing section titles and text and displays its release date.
- [ ] Later release entries can be added at the top without removing older entries; the dialog displays them newest first.
- [ ] The app's displayed version is derived from the newest release and matches `game/package.json`.
- [ ] The current app and package versions remain `1.0.0`; no new release entry is created in this task.
- [ ] Existing `RELEASE_NOTES` consumers remain compatible; the patch-note button behavior is unchanged.
- [ ] Do not correct the deferred v1.0.0 PvP availability wording in this task.

## Validation
- `cd game; npm run build` — dialog and release-history imports compile.
- `git diff --check` — no whitespace errors.
- Read-only inspect `game/src/game/releaseNotes.test.js` — its existing version and section assertions remain satisfied by the compatibility export; do not add or run tests unless separately requested.

## Commit Message
```text
feat(release-notes): add versioned patch-note history

Plan: 2026-11-02-memory-release-history-and-ai-kickoff
Phase: P01-organize-history-and-fix-kickoff
Task: T02-versioned-patch-notes

- Preserve v1.0.0 and add dated release records
- Display all releases newest first in the patch-note dialog
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm run build`, `git diff --check`)
- commit: completed (task commit)
