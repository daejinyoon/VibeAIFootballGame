# Plan: Memory File Names, Release History, and AI Kickoff Pass

## Goal
Make project history easier to scan, give the game a versioned patch-note archive that can grow with later releases, and make the away AI keep kickoff possession by passing to its own teammate.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Rename memory indexes, add versioned release history, and guarantee an away-team kickoff receiver | [P01](../phases/2026-11-02-memory-release-history-and-ai-kickoff/P01-organize-history-and-fix-kickoff/phase.md) |

## Decisions and Constraints
- Decisions: `.memory/decisions/2026-11-02-memory-release-history-ai-kickoff.md`.
- Keep the existing 1.0.0 patch-note content as historical release data; future releases add a version and date and render newest first.
- Do not correct the v1.0.0 company-PvP availability wording in this plan. The user asked to wait until PvP API routes are restored.
- Away kickoff passing applies to opening kickoff and each post-goal kickoff where the away team restarts. Use an active non-goalkeeper teammate; prefer a forward receiver and fall back to the nearest field teammate.
- Preserve kickoff lock, player freeze, half-line restriction, and the current user-controlled kickoff behavior.
- Existing profile cloud-save authentication/read-write verification remains a separate carry-over; do not lose its pending status while switching `.memory/current.md` to this plan.
- Stage only files listed by the active Task and its memory status files; leave unrelated dirty files untouched.
