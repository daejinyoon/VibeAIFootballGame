# Task: T01 Static Web Apps Deployment Config

## Status: pending

## Goal

Configure the existing GitHub Actions workflow to build the game with Entra public variables and deploy the managed Functions API from `game/api` with SPA routing enabled.

## Decision Summary

- The workflow deploys the football app from `game`, with static output at `dist`, and the API source at repository-relative `game/api`.
- The existing Azure token error remains a deployment prerequisite: use the token from the football game's actual Static Web App, never a token from the maze-rescue app.

## Implementation

### I01. Add SWA routing/runtime configuration and deploy the API

- Related Files:
  - `game/staticwebapp.config.json` :: SPA fallback and managed API runtime; new
  - `.github/workflows/azure-static-web-apps.yml` :: API location and build variables; modify
  - `game/api/package.json` :: Node package scripts/runtime; read-only except build compatibility

#### Details

- `game/staticwebapp.config.json` includes `platform.apiRuntime: "node:20"` if supported by the selected managed Functions runtime; otherwise use the newest supported Node runtime and align `game/api/package.json` engines. Add `navigationFallback` rewrite `/index.html`, excluding `/assets/*`, `/images/*`, and `/api/*`.
- Modify the existing workflow's deploy step: `app_location: game`, `api_location: game/api`, `output_location: dist`, `app_build_command: npm run build`, `api_build_command: npm install` (or the minimum build command required by the Functions v4 package), and retain `action: upload`.
- Provide `VITE_ENTRA_TENANT_ID` and `VITE_ENTRA_CLIENT_ID` to the app build using GitHub Actions `vars` or `secrets` (public IDs can be vars). Do not place `TABLE_STORAGE_CONNECTION_STRING` in the workflow or frontend build environment.
- Keep `AZURE_STATIC_WEB_APPS_API_TOKEN` sourced only from the GitHub secret of the target football Static Web App. Do not print or commit it.
- Update GitHub workflow path filters only if needed to ensure changes under `game/**` and the workflow itself trigger deployment; preserve the existing `master` branch behavior.

## Acceptance Criteria

- [ ] SWA output contains a correct SPA fallback and the `/api/profile` route is not rewritten to `index.html`.
- [ ] The workflow builds both `game` and `game/api` and points to their correct repository-relative paths.
- [ ] Public Entra IDs are injected only at frontend build time; storage credentials remain API-only.
- [ ] The workflow fails visibly if required Entra build variables are missing rather than deploying a non-working login screen.

## Validation

- `npm --prefix game run build` with placeholder-format local env values
- `npm --prefix game/api run check`
- Review rendered workflow YAML and confirm `game/staticwebapp.config.json` parses as JSON.

## Commit Message

```text
build(azure): deploy Entra profile API with the football app

Plan: 2026-10-26-entra-login-cloud-save
Phase: P03-azure-configuration
Task: T01-swa-deployment-config

- Point Static Web Apps at game/api
- Add SPA fallback and public Entra build configuration
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
