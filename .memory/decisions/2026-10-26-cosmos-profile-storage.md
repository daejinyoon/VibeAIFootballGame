# Decisions: Cosmos DB Profile Storage

- Date: 2026-10-26
- Status: Confirmed
- Supersedes: The dedicated Azure Table Storage choice in `2026-10-26-entra-login-cloud-save.md` for the football profile backend only.

## D01. Azure data service
- **Chosen**: Reuse the existing `maze-rescue-ms-b7af62a9` Azure Cosmos DB for NoSQL account, without reading, modifying, or migrating the `maze-rescue` database or any other existing game database/container.
- **Rationale**: The user chose the existing account to avoid touching maze-rescue data and to add isolated football-game storage.

## D02. Football data namespace
- **Chosen**: Use a new Cosmos DB database named `football` and a new container named `profiles`.
- **Rationale**: Separate database and container names keep football profiles isolated from the existing apps and make the target unambiguous.

## D03. Cost and throughput
- **Chosen**: Use the lowest-cost capacity mode supported by the existing account: no provisioned throughput for a serverless account; otherwise, the lowest throughput setting Azure permits for the new football database/container. Do not change existing databases or add a higher/dedicated throughput tier without a new user decision.
- **Rationale**: The user explicitly selected the lowest-cost approach. Cosmos DB serverless charges by consumed request units; provisioned accounts have minimum RU/s requirements.

## D04. Profile document model
- **Chosen**: Use `/tenantId` as the container partition key. Store one document per verified Entra account with `id = objectId`, `tenantId`, `profile`, and ISO-8601 `updatedAt` fields.
- **Rationale**: This preserves the existing API's account keying by Entra `tid` and `oid`, isolates accounts, and avoids trusting browser-supplied identity values.

## D05. API configuration and secret handling
- **Chosen**: Use the `@azure/cosmos` JavaScript SDK and a server-side Static Web App setting named `COSMOS_CONNECTION_STRING`. Keep `ENTRA_TENANT_ID` and `ENTRA_CLIENT_ID` as existing API settings. Never expose the Cosmos connection string to Vite, GitHub build variables, the browser, or chat.
- **Rationale**: The shown Cosmos account is for NoSQL, while the current `@azure/data-tables` repository targets the Azure Tables protocol. A Cosmos SDK is required for the selected account/API.

## D06. Existing cloud saves
- **Chosen**: Do not import or alter data from maze-rescue, fac-man, or any other existing database. The existing first-login browser-to-cloud migration remains the only profile bootstrap path for this football app.
- **Rationale**: Existing game data has a different owner and schema; account profile migration is already implemented in the football client.
