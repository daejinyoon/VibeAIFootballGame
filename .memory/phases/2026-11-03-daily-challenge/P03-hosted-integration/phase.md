# Phase: P03 Hosted Integration

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | Register the supported PvP room-management HTTP routes in the Static Web Apps API and verify the profile and daily routes still load. | [T01](./T01-register-pvp-http-routes.md) |
| T02 | `pending` | Verify authenticated profile cloud reads and writes on the hosted game and apply the user's requested nickname. | [T02](./T02-verify-hosted-profile-sync.md) |

## Progress
- done: 1/2 (T02 pending; deferred while the user-reported daily challenge storage issue is resolved)
- 2026-11-03: deployment #31 succeeded; unauthenticated profile, daily challenge, PvP leaderboard, and PvP room probes all returned application JSON 401. Authenticated profile GET/PUT and refresh persistence remain for T02.
- 2026-11-03 01:35 UTC: rechecked anonymous `/api/profile` as JSON 401. Code inspection confirms saving a nickname invokes `saveProfile`; authenticated GET/PUT and refresh persistence remain manual checks in the signed-in company account. The user authorized a new nickname; verify other profile fields remain unchanged.
- 2026-11-03: Azure CLI could not acquire the app's delegated API scope (`AADSTS65001`); no token was issued and no profile data was accessed or changed. The app's interactive browser sign-in still needs user-session verification.
