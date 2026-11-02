# Task: T02 Publish and Verify

## Status: in_progress

## Goal
Publish the committed v1.0.0 build to Azure Static Web Apps through the existing `master` workflow and verify that the live site loads with its patch notes button.

## Decision Summary
- Preserve remote history without force-pushing; merge the remote deployment branch into local release history while retaining the fully featured local game tree.
- Push the resulting release commit to `master` only after the user resolves the public repository visibility mismatch.
- Verify the Azure deployment action and production site before reporting release complete.

## Implementation

### I01. Safe history reconciliation and deployment
- Related Files/Systems:
  - Git repository `daejinyoon/VibeAIFootballGame`, branch `master` — merge/push after the visibility decision.
  - `.github/workflows/azure-static-web-apps.yml` — read-only, existing Azure deployment workflow.
- Details:
  1. Fetch `origin/master` and confirm the target SHA has not advanced since preparation.
  2. Create a merge commit that records the remote branch as an ancestor while preserving the local release tree; never force-push.
  3. Push the release commit to `origin/master` only after the public/private source choice is confirmed.
  4. Observe the GitHub Actions run for the pushed SHA until success or a concrete failure.

### I02. Live release verification
- Related Systems:
  - Azure Static Web App `ydj-football`, known URL `https://mango-rock-0a79acd00.3.azurestaticapps.net` — read-only verification.
- Details:
  - Confirm the workflow succeeds for the release SHA.
  - Fetch the production URL and verify the app shell loads; fetch a built asset and check HTTP 200.
  - Report version, URL, workflow status, and any remaining visibility constraint.

## Acceptance Criteria
- [ ] Release commit is published to `master` without rewriting remote history.
- [ ] Azure workflow completes successfully for the release commit.
- [ ] Production URL serves the v1.0.0 game and its patch notes button.
- [ ] No secrets are exposed.

## Validation
- `git status --short` — ensure no unintended files are staged.
- `game` build/tests from T01.
- GitHub Actions run for the release SHA succeeds.
- Production URL and one built asset return HTTP 200.

## Commit Message
```text
deploy: publish DEX Football Arcade v1.0

Plan: 2026-11-02-football-v1-release
Phase: P02-publish
Task: T02-publish-and-verify

- Reconcile release history without force-pushing
- Publish and verify the Azure v1.0.0 deployment
```

## Progress
- [ ] History reconciled
- [ ] User resolved source visibility and release pushed
- [ ] Azure deployment verified
- commit: pending

## Current Blocker
- The remote GitHub repository is public. The earlier hosting plan specified private source and explicitly deferred closing deployment until the visibility mismatch was resolved. The v1.0 release is built locally; do not push until the user confirms the public-source deployment or the repository is made private.
