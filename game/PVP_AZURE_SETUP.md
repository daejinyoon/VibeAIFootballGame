# Football PvP Azure Operations Runbook

This runbook provisions Azure Web PubSub and the isolated PvP Cosmos container, configures server-only API settings, and verifies a two-user match. It does not put service keys in the browser build or deploy infrastructure from GitHub Actions.

## Target and resources

- Subscription: `b7af62a9-9a10-4deb-95fa-1690f7bbd33d`
- Resource group: `grill-me-edu`
- Location: East Asia (`eastasia`)
- Static Web App: `ydj-football` (`mango-rock-0a79acd00.3.azurestaticapps.net`)
- New Web PubSub: the deterministic default name from `infra/pvp/main.bicep`, `Free_F1`, one unit
- Hub: `football-pvp`
- New Cosmos container: `maze-rescue-ms-b7af62a9` / `football` / `pvp`, partition key `/tenantId`, autoscale maximum 1000 RU/s, no TTL expiry

The template declares the existing Cosmos account and database as `existing` references. A what-if result that changes the account, database, `profiles` container, Static Web App, or any unrelated resource is a stop condition. The `pvp` container is separate from profile and campaign data.

## Deploy infrastructure after reviewing the diff

Run these commands from the repository root. The `create` command is an operator action; first inspect the entire what-if result and confirm that it contains exactly the three intended creates: the Web PubSub service, its hub, and the `pvp` container.

```powershell
az bicep build --file infra/pvp/main.bicep
az account set --subscription b7af62a9-9a10-4deb-95fa-1690f7bbd33d
az deployment group what-if `
  --subscription b7af62a9-9a10-4deb-95fa-1690f7bbd33d `
  --resource-group grill-me-edu `
  --template-file infra/pvp/main.bicep
```

After an operator reviews and approves that diff, deploy with:

```powershell
az deployment group create `
  --subscription b7af62a9-9a10-4deb-95fa-1690f7bbd33d `
  --resource-group grill-me-edu `
  --template-file infra/pvp/main.bicep
```

Do not run infrastructure deployment from application startup or GitHub Actions. The existing Cosmos `profiles` autoscale ceiling is 1000 RU/s; the new `pvp` container uses the same ceiling. Do not change throughput on the database or `profiles` container.

## Configure server-only settings

### Local Functions

Copy `game/api/local.settings.example.json` to the ignored `game/api/local.settings.json`, then populate the existing Cosmos and Entra settings and the Web PubSub connection string in that local file only. Keep `WEBPUBSUB_HUB_NAME` as `football-pvp`. The local settings file is ignored by Git. Never paste connection strings, keys, or access tokens into chat or terminal output.

```powershell
Copy-Item game/api/local.settings.example.json game/api/local.settings.json
```

### Production Static Web App API

After deployment, open Azure Portal → Static Web Apps → `ydj-football` → **Environment variables**, choose the production environment, and add/update:

| Name | Value |
| --- | --- |
| `WEBPUBSUB_CONNECTION_STRING` | Connection string retrieved from the Web PubSub service's Keys page. Treat it as a service password. |
| `WEBPUBSUB_HUB_NAME` | `football-pvp` |

Save/apply the API settings. Preserve the existing server settings `COSMOS_CONNECTION_STRING`, `ENTRA_TENANT_ID`, and `ENTRA_CLIENT_ID`; do not replace or remove them. Configure these values as Static Web App API environment variables, not GitHub build variables or `VITE_*` values. Do not use `az staticwebapp appsettings list` in a shared terminal because it prints setting values. Microsoft documents that Static Web App application settings are for its backend API and can be managed in the portal. See [Configure application settings for Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/application-settings).

The Bicep hub sends `pvp-input` user events and `disconnected` system events to:

```text
https://mango-rock-0a79acd00.3.azurestaticapps.net/api/pvp/events/{event}
```

The intended callback endpoint is `POST /api/pvp/events/{event}`. The real-time PvP module uses a Functions `WebPubSubContext` input binding to validate signed upstream requests, but Azure Static Web Apps managed Functions only support HTTP triggers and bindings. The real-time PvP module is therefore not imported by the managed API app; this also leaves `/api/pvp/negotiate` unavailable. While isolating the hosted profile 404, the PvP room-management HTTP module is also temporarily excluded, so only profile endpoints are deployed. Re-enable room-management HTTP APIs after profile route registration is verified. Move the real-time module to a standalone Azure Functions backend before enabling upstream event forwarding or real-time negotiation again. See [Azure Static Web Apps API support](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions) and [Azure Web PubSub bindings for Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-web-pubsub).

## Two-user production smoke check

Use two separate company accounts in separate browser profiles or devices. Do not share an account or copy an access token between browsers.

1. Sign in to the game from both browsers. Confirm each can reach the company PvP lobby.
2. In browser A, create a room and share only its six-character invite code. In browser B, join with that code. Confirm both users and the same room status appear in both clients.
3. Select and save three skills in each browser. Mark both players ready. Confirm the host can start only after both are ready, and starts the match once.
4. Play several minutes. Move and use skills from both clients; confirm remote input and match snapshots update on both. Finish a normal match and verify both clients show the same final score and result confirmation completes.
5. Start another match, then close one browser/tab during play. Confirm the remaining client receives the forfeit result, the disconnected player is recorded as the loser, and the match appears once in the PvP leaderboard.
6. Verify the campaign/profile save still contains its previous values; PvP results use the separate `pvp` container.
7. Check browser developer tools and frontend build artifacts for absence of `WEBPUBSUB_CONNECTION_STRING`, `AccessKey=`, and other service keys. Do not print or screenshot API setting values.

Record pass/fail, approximate time, browser/device pair, and non-sensitive error codes only. Never include names, tokens, connection strings, or raw authorization headers in a ticket or log.

## Limits, troubleshooting, and rollback

The `Free_F1` tier is limited to 20 concurrent connections and 20,000 outbound messages per day per unit. Monitor use and obtain approval before changing to paid Standard. See Microsoft's [Azure subscription service limits](https://learn.microsoft.com/en-gb/azure/azure-resource-manager/management/azure-subscription-service-limits).

| Symptom | Check without exposing secrets |
| --- | --- |
| Negotiate/API returns `PVP_REALTIME_UNAVAILABLE` or `PVP_STORAGE_UNAVAILABLE` | Confirm the two setting **names** exist in the production API environment; confirm `football-pvp` exactly matches the hub and the Cosmos `pvp` container exists. Do not display setting values. |
| API returns `AUTH_NOT_CONFIGURED` / sign-in or membership errors | Confirm existing Entra API settings are present and the two users belong to the allowed company tenant; re-authenticate rather than sharing credentials. |
| WebSocket connects but input does not relay | Confirm both clients joined the same playing room, the handler URL/event names match (`pvp-input`, `disconnected`), and inspect redacted status/error codes. A signature validation failure means the Function binding's connection setting does not match the deployed service. |
| Disconnect does not record a forfeit | Confirm the `disconnected` system event is enabled on `football-pvp`, the endpoint is reachable, the Cosmos container is available, and inspect redacted Function error codes. The handler persists a forfeit once and broadcasts it. |
| New rooms/results fail on storage | Check that the `pvp` container exists under `football`, uses `/tenantId`, and has available throughput. Do not alter `profiles` or database-level throughput as a quick fix. |
| Service quota reached | Check Web PubSub usage and active connections. Pause broader rollout and obtain approval for a paid tier before scaling. |

For rollback, disable the `football-pvp` hub's upstream event handler and redeploy the last campaign-only web build. Keep the Cosmos `pvp` and `profiles` containers and unrelated Azure resources; do not delete or redeploy the Cosmos account/database. Re-enable PvP only after settings, callback validation, and a two-user smoke check pass.
