# Decisions: Daily Challenge Storage Recovery

- Date: 2026-11-03
- Status: Confirmed

## D01. Daily challenge record storage
- **Chosen**: Store daily challenge result documents in the existing `football/profiles` Cosmos container, isolated from profile documents by a distinct deterministic item ID and `kind: 'dailyChallengeResult'`.
- **Rationale**: The `profiles` container already exists and uses the same `/tenantId` partition key and server-only Cosmos setting. This avoids provisioning PvP infrastructure or any new Azure resource.

## D02. Profile isolation
- **Chosen**: Keep profile documents keyed by Entra object ID and write daily results as separate documents with IDs prefixed `daily:`; never upsert a daily result over a profile document.
- **Rationale**: The existing container supports multiple documents within a tenant partition, and the prefixed IDs do not collide with profile item IDs.

## D03. Migration and operational scope
- **Chosen**: Do not migrate existing daily result data or provision an additional container; the target PvP container is absent, so no daily records have been stored there.
- **Rationale**: The production error is caused by targeting an unprovisioned container. Reusing the existing container is the smallest change and leaves Azure resources untouched.
