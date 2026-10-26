# Task: T02 Azure Resource Setup

## Status: pending

## Goal

Configure the DEX single-tenant Entra app registration, a football-game-only Azure Table Storage table, the target Static Web App API settings, and GitHub deployment secret; then verify sign-in, account isolation, and profile sync on the hosted site.

## Decision Summary

- Use the existing target football Static Web App only after its resource name/domain are confirmed; do not assume the similarly named maze-rescue app is the target.
- Azure storage connection strings and deployment tokens are secrets and must be entered directly in Azure/GitHub settings, never pasted into chat or source.

## Implementation

### I01. Configure the Entra app registration

- Related Files:
  - `game/.env.example` :: names for public Vite configuration; read-only
  - `.github/workflows/azure-static-web-apps.yml` :: build variable names; read-only

#### Details

- Register/select one single-tenant app for DEX Consulting. In the app manifest, set `api.requestedAccessTokenVersion` to `2`; Microsoft Entra otherwise defaults a null value to v1 access tokens, which this API validator rejects. Under **Expose an API**, set Application ID URI to `api://<client-id>` and add delegated scope `access_as_user` with admin consent as required by tenant policy.
- Under **Authentication > Add a platform > Single-page application**, register `http://localhost:5173` and the final football Static Web App origin (no path). Do not create a client secret for the SPA.
- Provide `VITE_ENTRA_TENANT_ID` and `VITE_ENTRA_CLIENT_ID` to the GitHub workflow's build environment from repository variables or secrets. Do not store user credentials.

### I02. Configure dedicated Table Storage and Static Web App settings

- Related Files:
  - `game/api/local.settings.example.json` :: local key names; read-only
  - Azure resource `footballprofiles` table :: new in a football-game-dedicated Storage Account
  - Target Static Web App environment variables :: configure in Azure Portal
  - GitHub repository Actions secret `AZURE_STATIC_WEB_APPS_API_TOKEN` :: configure for target app

#### Details

- Create a dedicated general-purpose v2 Storage Account in the same approved subscription/resource group and a Table named `footballprofiles`. Do not reuse the maze-rescue Cosmos DB or unrelated Storage Account.
- In the football Static Web App's production **Environment variables**, set `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, and `TABLE_STORAGE_CONNECTION_STRING`. The first two must match the SPA registration; the storage connection string stays server-side.
- In the GitHub repository settings, set the deployment token secret from the target football Static Web App's deployment-token screen. Never expose the token in command output, chat, workflow logs, or commits.
- Resolve the earlier failed token by confirming that the Static Web App connected to `daejinyoon/VibeAIFootballGame` is the target resource; do not use `maze-rescue-ms-game` token.
- Trigger the workflow and confirm build/deploy succeeds. If Azure role permissions prevent creating storage or configuring settings, capture the exact portal error and request a resource-group-scoped permission from the Azure owner.

### I03. Verify hosted user and data flows

- Related Files:
  - Hosted football Static Web App URL :: manual smoke verification
  - GitHub Actions deployment run :: deployment evidence

#### Details

- Verify unauthenticated visit shows the login gate; DEX account redirects back; wrong-tenant account cannot enter.
- Verify a first-login profile migrates, a later device loads cloud data, another account does not see the first account's save, and API calls without a valid bearer token fail.
- Verify reload after nickname, team customization, skill/loadout, and campaign checkpoint changes retains the server profile.
- Confirm the public source or chat output contains no storage string, app secret, or deployment token.

## Acceptance Criteria

- [ ] Entra registration is single-tenant, has the delegated scope and both redirect origins, and no SPA secret.
- [ ] `footballprofiles` table exists in a dedicated Storage Account and the API receives server-side settings.
- [ ] GitHub Actions deploys both static files and API to the confirmed football Static Web App.
- [ ] Hosted sign-in, first-login migration, cross-device load, second-account separation, and save persistence work end to end.
- [ ] All credentials remain out of the repository and chat.

## Validation

- Successful GitHub Actions workflow run for `master`
- Manual browser and API smoke checks listed in I03
- Azure portal check that API environment variables are attached to the production environment

## Commit Message

```text
ops(azure): configure Entra cloud saves for football game

Plan: 2026-10-26-entra-login-cloud-save
Phase: P03-azure-configuration
Task: T02-azure-resource-setup

- Configure tenant app, dedicated profile table, and SWA settings
- Verify hosted login and account-scoped save synchronization
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
