# Phase: P03 Hosted Integration

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | Register the supported PvP room-management HTTP routes in the Static Web Apps API and verify the profile and daily routes still load. | [T01](./T01-register-pvp-http-routes.md) |
| T02 | `in_progress 🔵` | Verify authenticated profile cloud reads and writes on the hosted game without changing the user's saved profile values. | [T02](./T02-verify-hosted-profile-sync.md) |

## Progress
- done: 1/2 (active: T02)
- 2026-11-03: deployment #31 succeeded; unauthenticated profile, daily challenge, PvP leaderboard, and PvP room probes all returned application JSON 401. Authenticated profile GET/PUT and refresh persistence remain for T02.
