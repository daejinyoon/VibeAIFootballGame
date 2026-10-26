# Current Context

## Active Plan
[Entra Login and Cloud Save](./plans/2026-10-26-entra-login-cloud-save.md)

## Active Phase
[P01 Profile API](./phases/2026-10-26-entra-login-cloud-save/P01-profile-api/phase.md)

## Active Task
[T02 Account Profile Table API](./phases/2026-10-26-entra-login-cloud-save/P01-profile-api/T02-profile-table-api.md)

## Status
- P01-T01 Entra API bootstrap and token validator are implemented and validated.
- The existing SWA deployment task remains unfinished and is parked while this feature plan is executed.

## Parked Work
- Previous active task: [T03 Azure Static Web App](./phases/2026-10-26-world-split-player-facing-azure-hosting/P02-azure-deployment/T03-azure-static-web-app.md)
- Reason: deployment token was missing/invalid and the target Static Web App still needs confirmation. P03-T01/T02 of the active plan incorporate the required API workflow and deployment setup; do not mark the parked task complete until the public hosted deployment succeeds.

## Next Step (IMPORTANT)
Read P01-T02 completely, then implement `GET /api/profile` and `PUT /api/profile` with account-scoped Azure Table Storage persistence in `game/api/src/storage/profileTable.js` and `game/api/src/functions/profile.js`.
