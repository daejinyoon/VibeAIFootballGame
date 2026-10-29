# Task: T01 Azure PvP Resources with Bicep

## Status: done

## Goal
Define a repeatable, narrowly scoped deployment that creates the PvP Azure Web PubSub service and hub plus the `pvp` Cosmos container, while reusing the already approved subscription, resource group, Cosmos account, and `football` database without modifying the existing profile store.

## Decision Summary
- Use Bicep at resource-group scope in subscription `b7af62a9-9a10-4deb-95fa-1690f7bbd33d`, resource group `grill-me-edu`, location `eastasia`.
- Create a new `Microsoft.SignalRService/webPubSub` resource with `Free_F1`, one unit, and hub `football-pvp`. The free tier is a starter configuration; document its current 20 concurrent-connection and 20,000 outbound-message/day quota and the need to review usage before scaling.
- Add only container `pvp` with `/tenantId` to existing Cosmos account `maze-rescue-ms-b7af62a9`, database `football`. Never redeploy/update the account, database, or `profiles` container.
- Do not set or output service keys and do not update Static Web App settings in Bicep. Static Web Apps managed Functions do not provide managed identity; API settings are configured separately as secrets.

## Implementation

### I01. Bicep deployment for the real-time service and data container

- Related Files:
  - `infra/pvp/main.bicep` :: `webPubSub`, `pvpHub`, `cosmosAccount`, `footballDatabase`, `pvpContainer` — isolated infrastructure definition; new
  - `.memory/decisions/2026-10-27-ydj-football-azure-target.md` :: approved subscription, resource group, and location — read-only
  - `.memory/decisions/2026-10-26-cosmos-profile-storage.md` :: approved Cosmos account/database and partition boundary — read-only
- **Signatures & Types**:
  ```bicep
  targetScope = 'resourceGroup'

  param location string = 'eastasia'
  param webPubSubName string = 'ydj-football-pvp-${uniqueString(subscription().id, resourceGroup().id)}'
  param staticWebAppDefaultHostname string = 'mango-rock-0a79acd00.3.azurestaticapps.net'
  param cosmosAccountName string = 'maze-rescue-ms-b7af62a9'
  ```
- **Data & Schema Fields**:
  - Web PubSub: resource type `Microsoft.SignalRService/webPubSub@2024-03-01`, `kind:'WebPubSub'`, `sku:{name:'Free_F1',capacity:1}`, `location:location`, public network enabled, local authentication enabled (server secret required), AAD authentication enabled.
  - Hub: resource type `Microsoft.SignalRService/webPubSub/hubs@2024-03-01`, child name `football-pvp`, `anonymousConnectPolicy:'deny'`, event handler URL `https://${staticWebAppDefaultHostname}/api/pvp/events/{event}`, `userEventPattern:'pvp-input'`, `systemEvents:['disconnected']`, upstream auth type `None`. The HTTP binding validates signed upstream requests using the server setting.
  - Existing Cosmos account reference is scoped to the deployment resource group `grill-me-edu` and name `maze-rescue-ms-b7af62a9`; existing child database name is `football`. Create only container `pvp` using `Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15`, `partitionKey.paths:['/tenantId']`, `partitionKey.kind:'Hash'`, `partitionKey.version:2`, consistent indexing, and default TTL disabled (`-1`, no expiry).
  - Set container `options.autoscaleSettings.maxThroughput` to `1000`, matching the existing `profiles` container's current autoscale ceiling and account's lowest-cost autoscale configuration. Do not change throughput on the `football` database or `profiles` container.
  - Outputs may include Web PubSub resource ID/name, hub name, and Cosmos container ID. Never output a connection string, access key, or token.
- **Execution Flow / Logic**:
  1. Precondition & Validation: deployment target is the approved subscription and `grill-me-edu` resource group. The existing Cosmos account and database were verified in that resource group. Before deployment, validate that account `maze-rescue-ms-b7af62a9` and database `football` still exist in that subscription.
  2. Core Processing: create the Web PubSub service, hub configuration, and one Cosmos child container. Do not declare the existing Cosmos account, `football` database, `profiles` container, or Static Web App as resources to update. Set deterministic defaults; allow overriding only the globally unique Web PubSub name and Static Web App default hostname.
  3. Cost & Security: keep Web PubSub at `Free_F1`/one unit; never silently change to a paid tier. Keep network public because browsers connect over WebSocket. Do not store secrets in Bicep, outputs, parameter files, GitHub Actions, or the repository. Operators retrieve the key separately and place it in server-side SWA API settings.
  4. Error & Exception Handling: fail deployment if the Cosmos database is missing, account/resource group is wrong, the globally unique Web PubSub name is unavailable, or the selected throughput conflicts with serverless/shared throughput. A what-if diff showing changes to existing account/database/profile/SWA resources is a stop condition; adjust template to remove those changes before `create`.
  5. State Transition & Return: outputs provide resource IDs and public names only; subsequent T02 runbook steps set API secrets and validate the hub callback.
- **Acceptance Criteria**:
  - [x] `az bicep build --file infra/pvp/main.bicep` compiles without errors.
  - [x] A resource-group what-if contains only the new Web PubSub resource, its `football-pvp` hub, and the new `pvp` Cosmos container.
  - [x] The existing Cosmos account, `football` database, `profiles` container, and Static Web App are unchanged.
  - [x] The Web PubSub service uses Free_F1/1 unit, and no secret is in source files or deployment outputs.
  - [x] The new container has exact name `pvp`, `/tenantId` partition key, and no TTL expiration.

## Validation
- `az bicep build --file infra/pvp/main.bicep` — Bicep compiles.
- `az account set --subscription b7af62a9-9a10-4deb-95fa-1690f7bbd33d` — select the approved deployment subscription.
- `az deployment group what-if --resource-group grill-me-edu --template-file infra/pvp/main.bicep` — diff contains only the three PvP resources above; do not run `create` until an operator has reviewed the diff.

## Commit Message
```text
infra(pvp): define Web PubSub and Cosmos resources

Plan: 2026-10-29-football-pvp-invite
Phase: P03-hosting-operations
Task: T01-azure-pvp-resources-bicep

- Define a low-cost Web PubSub service and football-pvp hub
- Add only the tenant-partitioned PvP container to the existing football database
```

## Progress
- [x] Implementation complete
- `az bicep build --file infra/pvp/main.bicep --stdout` succeeds.
- Azure what-if: 3 creates (PvP container, Free_F1 Web PubSub, `football-pvp` hub); 19 existing resources ignored with no changes.
- Verified existing `football` database, no existing `pvp` container, and `profiles` autoscale max throughput 1000.
- Free_F1 starter quota: 20 concurrent connections and 20,000 outbound messages/day; review usage before scaling.
- No deployment create command was run.
- commit: recorded in Git history