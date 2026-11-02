# Plan: Entra Login and Cloud Save

## Goal

Require DEX Consulting Entra sign-in before entering the football game, and synchronize the complete account profile through an authenticated Azure API and a dedicated Azure Table Storage table. On the first login, claim the existing browser save for that account; on later logins, load the account's cloud profile as canonical. Never launch gameplay when the profile has not loaded or migrated successfully.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Create the server-side Entra token validation and account-scoped profile API backed by a dedicated Azure Table Storage table. | [P01](../phases/2026-10-26-entra-login-cloud-save/P01-profile-api/phase.md) |
| P02 | `done` | Add the same-tab Entra login gate and replace local-only profile persistence with cloud synchronization and first-login migration. | [P02](../phases/2026-10-26-entra-login-cloud-save/P02-frontend-auth-and-sync/phase.md) |
| P03 | `in_progress` | Configure Static Web Apps API deployment, Entra registration settings, server app settings, and deployment smoke checks. | [P03](../phases/2026-10-26-entra-login-cloud-save/P03-azure-configuration/phase.md) |

## Dependencies and known external inputs

- The app registration must be single-tenant, set `api.requestedAccessTokenVersion` to `2`, and expose a delegated API scope named `access_as_user`; its SPA platform must list `http://localhost:5173` and the final Static Web App origin as redirect URIs.
- `VITE_ENTRA_TENANT_ID` and `VITE_ENTRA_CLIENT_ID` are public build variables. The API also needs server-side `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, and `TABLE_STORAGE_CONNECTION_STRING` settings. Never put the storage connection string in Vite variables or Git.
- The dedicated Storage Account/Table and Static Web App settings require the user's Azure portal access. Do not reuse the maze-rescue Cosmos DB.
- The existing deployment workflow currently has an empty `api_location`, and a previous Azure deployment reported a missing/invalid Static Web Apps deployment token. P03 must configure `api_location: game/api` and use the deployment token for the actual football game's Static Web App before cloud smoke checks can pass.
- This plan supersedes the active pointer for implementation sequencing but does not mark the prior Azure deployment task complete. That task remains parked as an external prerequisite until the proper Static Web App token is configured.
