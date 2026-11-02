# Plan: Football 1.0 Release

## Goal
Prepare DEX Football Arcade as version 1.0.0, give players a main-screen button for release notes, and publish the verified release to Azure Static Web Apps after resolving the existing public-source visibility mismatch.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Set version 1.0.0 and implement the player-facing patch notes | [P01](../phases/2026-11-02-football-v1-release/P01-release-ui/phase.md) |
| P02 | `in_progress` | Reconcile deployment history, publish the release, and verify the live app | [P02](../phases/2026-11-02-football-v1-release/P02-publish/phase.md) |

## Dependencies and Constraints
- Decisions: `.memory/decisions/2026-11-02-football-v1-release.md`.
- The current production workflow deploys `master` to Azure Static Web Apps.
- Current local `master` contains the complete game feature set and is divergent from the remote deployment branch. Preserve both histories without force-pushing; retain the current local game tree when reconciling the deployment branch.
- The GitHub repository is public but the earlier hosting plan specified private source. Do not push or publish until the user explicitly resolves that visibility mismatch.
- Do not stage unrelated dirty working-tree files.
