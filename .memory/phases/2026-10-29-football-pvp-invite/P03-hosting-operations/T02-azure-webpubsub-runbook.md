# Task: T02 Azure Web PubSub Runbook

## Status: done

## Goal
Document how an operator reviews and deploys the Bicep resources, supplies server-only settings, and verifies a real two-browser PvP match without exposing connection secrets.

## Decision Summary
- Run Bicep from P03-T01 in the approved subscription and resource group. Resource deployment is a separate human-run operation after reviewing `what-if`.
- Hub `football-pvp` and upstream handler are provisioned by Bicep; the API secret remains manually configured on the existing `ydj-football` Static Web App API settings.
- Preserve `game/api/local.settings.json` for local secrets and do not add values to Vite variables, GitHub build variables, or committed files.

## Implementation

### I01. Local configuration, Bicep deployment, and operator checks

- Related Files:
  - `game/api/local.settings.example.json` :: `Values` — blank Web PubSub settings for local Functions; modify
  - `game/PVP_AZURE_SETUP.md` :: Bicep deployment, secret configuration, smoke test and rollback; new
  - `infra/pvp/main.bicep` :: resource outputs and parameters from T01; read-only
  - `.github/workflows/azure-static-web-apps.yml` :: current deployment workflow as reference; read-only
  - `game/public/staticwebapp.config.json` :: existing API navigation fallback exclusion; read-only
- **Data & Schema Fields**:
  - Add blank local-only `WEBPUBSUB_CONNECTION_STRING` and `WEBPUBSUB_HUB_NAME=football-pvp` entries to `Values`.
  - Production server settings use the exact same names, configured in Azure Static Web App `ydj-football` API configuration. Keep `COSMOS_CONNECTION_STRING`, `ENTRA_TENANT_ID`, and `ENTRA_CLIENT_ID` server-side as currently configured.
  - Do not place connection strings or keys in `game/.env.example`, `azure-static-web-apps.yml`, Bicep outputs, or parameter files.
- **Execution Flow / Logic**:
  1. Explain local setup: copy `game/api/local.settings.example.json` to ignored `game/api/local.settings.json`, then populate Web PubSub, Cosmos and Entra values in the local file only.
  2. Explain resource-group deployment to subscription `b7af62a9-9a10-4deb-95fa-1690f7bbd33d` and resource group `grill-me-edu`: first run `az bicep build`, select the subscription, run `az deployment group what-if`, review that only Web PubSub, its hub and `pvp` container are created, then run `az deployment group create` after the operator approves the diff. Never execute the deployment from application startup or GitHub CI.
  3. Explain that the `pvp` container uses autoscale `maxThroughput:1000`, matching the existing `profiles` container. Do not change throughput on the `football` database or `profiles` container.
  4. After resource deployment, configure `WEBPUBSUB_CONNECTION_STRING` by retrieving a Web PubSub key in Azure Portal and storing it only in `ydj-football` API settings. Configure `WEBPUBSUB_HUB_NAME=football-pvp`. Do not copy the key into chat, source, GitHub variables, or build output.
  5. Explain that Bicep configures the upstream URL `https://mango-rock-0a79acd00.3.azurestaticapps.net/api/pvp/events/{event}` for user event `pvp-input` and system event `disconnected`. The callback uses `WebPubSubContext` signature verification; managed Static Web Apps Functions only supports HTTP triggers and does not provide managed identity.
  6. Document a manual smoke check using two separately authenticated company browsers: create/copy code, join, select skills/ready, host starts, verify input/snapshot sync, confirm normal score on both clients, disconnect during play and verify automatic forfeit, then inspect wins leaderboard and verify campaign save is unchanged.
  7. Document Free_F1 limits (20 concurrent connections, 20,000 outbound messages per day per unit) and a review trigger: monitor service usage and obtain approval before changing to paid Standard tier.
  8. Safe rollback: disable the Web PubSub upstream handler and redeploy the last campaign-only web build. Do not delete the Cosmos `profiles` container or unrelated Azure resources.
- **Error & Exception Handling**:
  - List missing server settings, invalid hub name, failed upstream signature validation, missing Cosmos `pvp` container, and Web PubSub quota reached as blockers with diagnostic steps that do not print secrets.
  - A what-if diff affecting existing Cosmos resources or the Static Web App is a stop condition; do not proceed with the deployment.
- **Acceptance Criteria**:
  - [x] Sample local settings parse as JSON and names match API code.
  - [x] Runbook describes Bicep `build`, `what-if`, and reviewed `create` order with the approved target.
  - [x] Secret configuration is explicit and no secret enters source control or client bundle.
  - [x] Hub URL/event names, Cosmos partition key, Free-tier quota, smoke test, and rollback are documented.

## Validation
- `Get-Content game/api/local.settings.example.json | ConvertFrom-Json` — sample settings remain valid JSON.
- `az bicep build --file infra/pvp/main.bicep` — infrastructure template compiles.
- `npm --prefix game/api run check` — documented API setting names match source configuration.
- `npm --prefix game run build` — frontend bundle contains no server secret.

## Commit Message
```text
docs(pvp): document Bicep deployment and operations

Plan: 2026-10-29-football-pvp-invite
Phase: P03-hosting-operations
Task: T02-azure-webpubsub-runbook

- Document a reviewed Bicep deployment and server-only API settings
- Add quota, two-user smoke checks, and safe rollback instructions
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- Local settings example parses as JSON; Web PubSub setting names match the Functions code.
- `az bicep build --file infra/pvp/main.bicep --stdout` succeeds.
- `npm --prefix game/api run check` succeeds.
- `npm --prefix game run build` succeeds; generated assets contain no `WEBPUBSUB_CONNECTION_STRING` or `AccessKey=` markers. Vite reports its existing large-chunk advisory.
- Production Azure deployment, secret entry, and the two-browser smoke check remain operator-run steps documented in the runbook; no service key was read and no Azure resources were created.
- commit: recorded in Git history