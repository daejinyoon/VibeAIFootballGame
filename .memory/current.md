# Current Context

## Active Plan
[Cosmos DB Profile Storage](./plans/2026-10-26-cosmos-profile-storage.md)

## Active Phase
[P02 Azure Configuration](./phases/2026-10-26-cosmos-profile-storage/P02-azure-configuration/phase.md)

## Active Task
[T01 Cosmos Azure Configuration](./phases/2026-10-26-cosmos-profile-storage/P02-azure-configuration/T01-cosmos-azure-configuration.md)

## Status
- Entra login, account-scoped profile sync, and Static Web App deployment are already implemented and live.
- The profile API now uses Cosmos DB for NoSQL; hosted sync still needs the isolated Cosmos database/container and production connection-string setting.
- The user selected the existing Cosmos DB for NoSQL account with a new isolated `football` database and `profiles` container; use the account's lowest-cost supported capacity mode.

## Superseded Work
- The Azure Table Storage backend/settings in [Entra Login and Cloud Save](./plans/2026-10-26-entra-login-cloud-save.md) are superseded by [Cosmos DB Profile Storage](./plans/2026-10-26-cosmos-profile-storage.md). Keep its Entra and frontend-sync decisions.
- The earlier SWA deployment task remains historical; the production football Static Web App is confirmed as `swa-grill-us-prod-d0d6`.

## Next Step (IMPORTANT)
Read P02-T01 completely, then configure the isolated `football/profiles` Cosmos namespace and production `COSMOS_CONNECTION_STRING` setting with the user. Do not modify existing game databases.
