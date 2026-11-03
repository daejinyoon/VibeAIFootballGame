# Plan: Daily Challenge

## Goal
Add a one-match daily challenge to YDJ Football 3D. All authenticated company users receive the same KST-dated match settings and fixed level-one skill deck, can retry freely, and appear once on that day's company leaderboard using their best result. The leaderboard ranks wins above draws above losses, then goal difference; exact ties share rank.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Add the deterministic daily challenge rules, authenticated result API, and Cosmos-backed daily records. | [P01](../phases/2026-11-03-daily-challenge/P01-server-api/phase.md) |
| P02 | `done` | Add the challenge match setup, client API flow, and player-facing challenge and leaderboard screens. | [P02](../phases/2026-11-03-daily-challenge/P02-gameplay-and-ui/phase.md) |
| P03 | `in_progress` | Re-register supported company PvP HTTP routes and verify hosted profile cloud reads and writes. | [P03](../phases/2026-11-03-daily-challenge/P03-hosted-integration/phase.md) |

## Scope Notes
- Challenge rows initially targeted `football/pvp`; production recovery now moves them to separate `daily:` documents in the existing `football/profiles` container with the same `/tenantId` partition key. Only current-day rows are queried for display.
- P01 registers the daily challenge function. P03 later registers the supported company PvP room-management HTTP routes after the challenge API is complete.
- P03 does not re-enable Web PubSub upstream event forwarding or `/api/pvp/negotiate`; Azure Static Web Apps does not support the required WebPubSubContext binding. A standalone Functions backend is still required for real-time PvP.
- P03 includes the previously pending authenticated profile cloud-save smoke check. It does not repeat the already completed profile-only routing deployment.
- Scores are authenticated client submissions with bounds checks, not server-replayed simulations; this matches the confirmed casual-ranking trust model.
- Challenge presets use a seven-entry authored cycle: `(45s, AI 2)`, `(45s, AI 3)`, `(40s, AI 3)`, `(40s, AI 4)`, `(35s, AI 4)`, `(30s, AI 5)`, `(35s, AI 5)`. The date-derived index is stable across API instances.
