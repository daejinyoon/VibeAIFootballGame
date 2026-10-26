# Task: T03 Azure Static Web App

## Status: pending

## Goal
Deploy the game publicly on Azure Static Web Apps Free, source it from the private GitHub repository, and verify pushes to `master` deploy the Vite app from `game/` to its public HTTPS URL.

## Decision Summary
- Azure Static Web Apps Free; GitHub Actions deployment; new private repository; branch `master`.
- Repository build settings: app location `game`, API location empty, output location `dist`, build command `npm run build`.
- Azure deployment token is stored only as a GitHub Actions secret named `AZURE_STATIC_WEB_APPS_API_TOKEN`.
- External prerequisites: user-created GitHub account, private repository, and Azure administrator permission to create/manage a Static Web App in the designated resource group. Do not request or paste access tokens in chat.

## Implementation

### I01. Connect the repository and configure automatic deployment

- Related Files:
  - `.github/workflows/azure-static-web-apps.yml` :: Azure Static Web Apps GitHub Actions workflow; new (the Azure portal may generate a filename with a unique suffix; keep its generated filename if so)
  - `game/package.json` :: `scripts.build`; read-only, verify `npm run build`
  - `game/vite.config.js` :: Vite output settings; read-only, verify `dist`

#### Details
- **Workflow schema**:
  - Trigger: `push` to branch `master` only, plus optional `workflow_dispatch` for a manual rerun.
  - Runner: `ubuntu-latest`.
  - Steps: `actions/checkout@v4`; `Azure/static-web-apps-deploy@v1` with `action: upload`.
  - Inputs: `azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}`, `repo_token: ${{ secrets.GITHUB_TOKEN }}`, `app_location: game`, `api_location: ""`, `output_location: dist`, and `app_build_command: npm run build`.
  - Do not add a committed token, API directory, database, or cloud save implementation.
- **Execution Flow / Logic**:
  1. Confirm the private GitHub repository contains the project root and `game/package.json`, and that branch `master` exists.
  2. Confirm the user has created the Azure Static Web App in the authorized resource group using the Free plan and linked the private repository, `master` branch, app location `game`, empty API location, and output `dist`; alternatively create it through the Azure portal if the user is signed in and permission is available.
  3. Store the Azure deployment token in the repository's Actions secrets under `AZURE_STATIC_WEB_APPS_API_TOKEN` (or keep the Azure-generated secret name and match the generated workflow). Never write the token to a tracked file or chat.
  4. Add/update the workflow at repository root, stage only this workflow and explicitly intended game files, and commit with the message below. Do not stage the entire dirty working tree.
  5. Push `master`; wait for the GitHub Actions run to succeed. Obtain the generated HTTPS URL from the Azure resource Overview and open it to confirm the game loads.
  6. Confirm that browser-local campaign saves still work and remain browser-local; no API or cloud save is part of this task.
- **Error & Exception Handling**: If GitHub cannot authorize the private repository, Azure permission is absent, the deployment secret is missing, or Actions fails, do not expose credentials or mark T03 done. Record the exact blocker in `.memory/current.md` and wait for the user/admin prerequisite.
- **State Transition & Return**: A successful workflow push deploys the built contents of `game/dist`; Azure provides the public site URL. No runtime service or API is added.

## Acceptance Criteria
- [ ] A private GitHub repository is connected to an Azure Static Web App on the Free plan.
- [ ] GitHub Actions builds from `game/` using `npm run build` and publishes `dist` on pushes to `master`.
- [ ] The public Azure HTTPS URL opens the game successfully after a green deployment.
- [ ] The token is stored only in GitHub/Azure secret storage; no cloud-save or API behavior is introduced.
- [ ] The production link and workflow run are recorded in the task completion note without including secrets.

## Validation
- `npm run build` from `game/` — confirms the application builds locally.
- GitHub Actions run for the push to `master` — must complete successfully.
- Open the generated Azure HTTPS URL in a browser and verify the start screen and a match load.

## Commit Message
```text
feat(azure): deploy football game with static web apps

Plan: 2026-10-26-world-split-player-facing-azure-hosting
Phase: P02-azure-deployment
Task: T03-azure-static-web-app

- Configure GitHub Actions to build the Vite app from game/ and deploy dist.
- Connect the private master branch to the Azure Static Web App and verify its public URL.
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
