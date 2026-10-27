# Football Azure Deployment Target Correction

- Date: 2026-10-27
- Status: Confirmed by user request
- Supersedes: The Static Web App target in `2026-10-26-entra-login-cloud-save.md` and later task files that repeat it.

## Decision

- Deploy `daejinyoon/VibeAIFootballGame` to the dedicated Azure Static Web App `ydj-football` in subscription `b7af62a9-9a10-4deb-95fa-1690f7bbd33d`, resource group `grill-me-edu`, East Asia.
- Use the repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN_YDJ_FOOTBALL`. The old generic deployment secret has been removed. The active workflow must never use a token for `swa-grill-us-prod-d0d6`.
- The football Entra SPA redirect URI is `https://mango-rock-0a79acd00.3.azurestaticapps.net`; the old `orange-desert` URI was removed.
- The existing isolated `football/profiles` Cosmos DB namespace remains the football profile store. Its connection string belongs only in the `ydj-football` server-side settings.

## Existing app recovery

- `swa-grill-us-prod-d0d6` is another person's app. It was originally deployed with SwaCli and had no source repository linked. A football deployment linked this repository on 2026-10-26.
- The football repository's workflow no longer carries its deployment token, so later pushes target `ydj-football` only.
- Its original source or deployment package is not available from the current workspace or Azure resource history. The original content cannot be restored accurately until the owner supplies the source/package or reruns the original deployment. Do not replace it with a guessed project or placeholder.
