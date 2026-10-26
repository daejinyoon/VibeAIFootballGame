# Current Context

## Active Plan
[Entra Login and Cloud Save](./plans/2026-10-26-entra-login-cloud-save.md)

## Active Phase
[P03 Azure Configuration](./phases/2026-10-26-entra-login-cloud-save/P03-azure-configuration/phase.md)

## Active Task
[T01 Static Web Apps Deployment Config](./phases/2026-10-26-entra-login-cloud-save/P03-azure-configuration/T01-swa-deployment-config.md)

## Status
- P01 Profile API, P02-T01 Entra login, and P02-T02 account-scoped cloud sync are implemented and locally validated.
- Live Azure Table/API integration and Entra redirect verification need the app registration, environment IDs, and Azure resources; P03-T02 covers those checks.
- The existing SWA deployment task remains unfinished and is parked while this feature plan is executed.

## Parked Work
- Previous active task: [T03 Azure Static Web App](./phases/2026-10-26-world-split-player-facing-azure-hosting/P02-azure-deployment/T03-azure-static-web-app.md)
- Reason: deployment token was missing/invalid and the target Static Web App still needs confirmation. P03-T01/T02 of the active plan incorporate the required API workflow and deployment setup; do not mark the parked task complete until the public hosted deployment succeeds.

## Next Step (IMPORTANT)
Read P03-T01 completely, then configure the Static Web Apps workflow and route files to deploy the football game's authenticated Functions API.
