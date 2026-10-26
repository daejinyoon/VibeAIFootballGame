# Current Context

## Active Plan
[Entra Login and Cloud Save](./plans/2026-10-26-entra-login-cloud-save.md)

## Active Phase
[P02 Frontend Authentication and Sync](./phases/2026-10-26-entra-login-cloud-save/P02-frontend-auth-and-sync/phase.md)

## Active Task
[T01 Entra Login Gate](./phases/2026-10-26-entra-login-cloud-save/P02-frontend-auth-and-sync/T01-entra-login-gate.md)

## Status
- P01 Profile API phase is implemented and validated with an in-memory HTTP-handler smoke check; live Azure Table/API integration is pending P03-T02.
- The existing SWA deployment task remains unfinished and is parked while this feature plan is executed.

## Parked Work
- Previous active task: [T03 Azure Static Web App](./phases/2026-10-26-world-split-player-facing-azure-hosting/P02-azure-deployment/T03-azure-static-web-app.md)
- Reason: deployment token was missing/invalid and the target Static Web App still needs confirmation. P03-T01/T02 of the active plan incorporate the required API workflow and deployment setup; do not mark the parked task complete until the public hosted deployment succeeds.

## Next Step (IMPORTANT)
Read P02-T01 completely, then add MSAL same-tab redirect initialization and gate all app entry paths in `game/src/main.jsx` and `game/src/App.jsx`.
