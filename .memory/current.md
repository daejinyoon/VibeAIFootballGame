# Current Context

## Active Plan
[Memory File Names, Release History, and AI Kickoff Pass](./plans/2026-11-02-memory-release-history-ai-kickoff.md)

## Active Phase
[P01 Organize Project History and Fix Kickoff](./phases/2026-11-02-memory-release-history-and-ai-kickoff/P01-organize-history-and-fix-kickoff/phase.md)

## Active Task
[T03 Make the Away AI Pass to a Teammate at Kickoff](./phases/2026-11-02-memory-release-history-and-ai-kickoff/P01-organize-history-and-fix-kickoff/T03-away-kickoff-teammate-pass.md)

## Status
- T01 is done: 46 plan files and 53 decision files were renamed, and 33 Markdown files had their path references updated.
- Previous follow-up preserved: authenticated profile cloud-save read/write remains unverified. Its renamed plan is `.memory/plans/2026-11-02-profile-api-routing.md`.
- T02 is done: patch notes now use dated release records and render newest first while keeping the app at v1.0.0.
- T03 is active: make the away AI pass to an eligible teammate at opening and post-goal kickoffs.

## Next Step (IMPORTANT)
Read T03's complete blueprint. Update only the away AI kickoff branch in `game/src/game/stepGame.js` so it prefers an existing forward receiver and falls back to the nearest active away field player; preserve home kickoff controls, freeze rules, and lock release behavior.
