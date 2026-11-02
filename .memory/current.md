# Current Context

## Active Plan
[Memory File Names, Release History, and AI Kickoff Pass](./plans/2026-11-02-memory-release-history-ai-kickoff.md)

## Active Phase
[P01 Organize Project History and Fix Kickoff](./phases/2026-11-02-memory-release-history-and-ai-kickoff/P01-organize-history-and-fix-kickoff/phase.md)

## Active Task
[T02 Build Versioned Patch-Note History](./phases/2026-11-02-memory-release-history-and-ai-kickoff/P01-organize-history-and-fix-kickoff/T02-versioned-patch-notes.md)

## Status
- T01 is done: 46 plan files and 53 decision files were renamed, and 33 Markdown files had their path references updated.
- Previous follow-up preserved: authenticated profile cloud-save read/write remains unverified. Its renamed plan is `.memory/plans/2026-11-02-profile-api-routing.md`.
- T02 is active: add version/date records and newest-first rendering while keeping the app at v1.0.0.

## Next Step (IMPORTANT)
Read T02's complete blueprint. Update `game/src/game/releaseNotes.js` and `game/src/components/ReleaseNotesDialog.jsx` to render the preserved v1.0.0 release record with its date and support future releases newest first; keep `game/package.json` at `1.0.0` and preserve the old `RELEASE_NOTES` export.
