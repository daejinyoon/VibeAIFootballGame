# Task: T01 Entra API Bootstrap

## Status: done

## Goal

Create the Node.js Azure Functions managed API app under `game/api`, including a reusable validator for Entra v2 access tokens issued to the football game API. The validator must accept only tokens from the configured DEX Consulting tenant for the configured client/API audience with the `access_as_user` delegated scope.

## Decision Summary

- The browser uses MSAL redirect authentication and requests `api://{clientId}/access_as_user`.
- The Functions API validates the bearer token itself; it does not trust browser-supplied account identifiers or rely on an unverified `x-ms-client-principal` header.
- Runtime configuration is read from `ENTRA_TENANT_ID` and `ENTRA_CLIENT_ID`. No client secret is required for this SPA/API design.

## Implementation

### I01. Add the Functions API bootstrap and Entra token validator

- Related Files:
  - `game/api/package.json` :: API dependencies, Node engine, and `check` script; new
  - `game/api/host.json` :: Azure Functions host configuration; new
  - `game/api/src/index.js` :: Azure Functions v4 app registration entry point; new
  - `game/api/src/auth/entra.js` :: JWT validation and verified caller extraction; new
  - `game/api/local.settings.example.json` :: safe local configuration template containing empty placeholders only; new
  - `.gitignore` :: exclude `game/api/local.settings.json`; modify

#### Details

- **Dependencies:** use ESM with `@azure/functions`, `jose`, and `@azure/data-tables`; set Node engine to `>=20`. Pin resolved dependency versions in `game/api/package-lock.json`.
- **Runtime files:** `host.json` uses Functions host schema version `2.0`. Set the frontend's SWA config in P03 to managed API runtime `node:20` if that runtime is available for the selected SWA plan at execution time; if Azure reports it unsupported, use the newest Node runtime supported by managed SWA Functions and adjust `engines` to match.
- **Validator signature:** `export async function requireEntraCaller(request, env = process.env): Promise<{ tenantId: string, objectId: string }>`; reject if env config is missing.
- **JWT checks:** require `Authorization: Bearer <token>`; validate signature using the Microsoft tenant v2 JWKS from `https://login.microsoftonline.com/{ENTRA_TENANT_ID}/discovery/v2.0/keys`; require issuer `https://login.microsoftonline.com/{ENTRA_TENANT_ID}/v2.0`, audience equal to `ENTRA_CLIENT_ID`, unexpired token, `tid === ENTRA_TENANT_ID`, a non-empty `oid`, and `scp` containing the exact delegated scope `access_as_user`.
- **Errors:** missing/invalid/expired bearer token returns 401; valid token from another tenant, wrong audience, or missing required scope returns 403; missing server configuration returns 500. Never return decoded token claims or token text to the client.
- **Function registration:** use the Azure Functions v4 `app.http()` programming model. Keep the API route under `/api`; the concrete profile handler is added in T02.
- **Local settings:** example values are empty strings for `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, and `TABLE_STORAGE_CONNECTION_STRING`; include `FUNCTIONS_WORKER_RUNTIME: node` and `AzureWebJobsStorage: UseDevelopmentStorage=true`. The real `local.settings.json` stays ignored.
- **Check script:** `npm run check` runs `node --check` on all JavaScript files under `src` without adding a test suite.

### I02. Make local API configuration safe

- Related Files:
  - `game/api/local.settings.example.json` :: template; new
  - `.gitignore` :: local secret exclusion; modify

#### Details

- The example must contain no tenant ID, client ID, table name tied to a real account, storage key, or deployment token.
- Confirm `.env` behavior remains unchanged and `game/api/local.settings.json` cannot be staged accidentally.

## Acceptance Criteria

- [ ] API dependencies install reproducibly and `npm run check` succeeds.
- [ ] The validator derives `{ tenantId, objectId }` only from a validated token and never accepts these identifiers from request JSON.
- [ ] Missing bearer token, wrong tenant/audience/scope, and invalid signature map to the specified HTTP errors.
- [ ] The local settings example is safe to commit and the actual local settings file is ignored.

## Validation

- `npm install` (working directory: `game/api`)
- `npm run check` (working directory: `game/api`)
- `git check-ignore game/api/local.settings.json`

## Commit Message

```text
feat(auth): bootstrap Entra validated Functions API

Plan: 2026-10-26-entra-login-cloud-save
Phase: P01-profile-api
Task: T01-entra-api-bootstrap

- Add Node Functions API and Entra v2 token validation
- Keep local API settings out of Git
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: recorded in Git history
