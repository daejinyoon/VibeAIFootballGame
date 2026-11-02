# Plan: Cosmos DB Profile Storage

## Goal

Replace the football profile API's Azure Table Storage adapter with Azure Cosmos DB for NoSQL, using an isolated `football` database and `profiles` container in the existing Cosmos account while preserving all unrelated databases. Configure the Static Web App API with the server-side connection string and complete an authenticated profile-sync smoke check.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Migrate the profile API repository and runtime configuration from Azure Tables to Cosmos DB for NoSQL without changing the HTTP contract or account isolation. | [P01](../phases/2026-10-26-cosmos-profile-storage/P01-cosmos-api/phase.md) |
| P02 | `in_progress` | Add isolated Cosmos resources, configure the football Static Web App API settings, and verify hosted cloud saves. | [P02](../phases/2026-10-26-cosmos-profile-storage/P02-azure-configuration/phase.md) |

## Dependencies and constraints

- The selected account is the existing `maze-rescue-ms-b7af62a9` Cosmos DB for NoSQL account. Never edit, delete, migrate, or reuse `maze-rescue`, `fac-man`, or other existing databases/containers.
- Create/reuse only the football database `football` and its `profiles` container. The container partition key is `/tenantId`.
- Preserve `GET /api/profile`, `PUT /api/profile`, existing profile schema version 7, Entra bearer validation, first-login local migration, and account-specific reads/writes.
- Keep `COSMOS_CONNECTION_STRING` only in the Static Web App backend production environment settings and local ignored settings. Do not put it in Vite variables, GitHub Actions variables, source, logs, or chat.
- Use serverless if the existing account is serverless; otherwise choose the lowest capacity Azure permits for the new football data namespace. No throughput changes to existing resources.

## Supersession

This plan supersedes only the storage service and storage configuration parts of `2026-10-26-entra-login-cloud-save`. The Entra registration, frontend login, account-scoped sync behavior, and Static Web App target remain in effect.
