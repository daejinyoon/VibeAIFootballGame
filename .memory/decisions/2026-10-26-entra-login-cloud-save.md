# Entra Login and Cloud Save

## Goal

Require DEX Consulting Entra accounts to enter the football game and sync each account's game profile through Azure so it is available across devices.

## Confirmed decisions

- **Tenant scope:** Single tenant; only accounts in the DEX Consulting Entra tenant may sign in.
- **Login gate:** Require sign-in before showing the game start screen or allowing gameplay. Direct-entry paths such as skill previews must also be behind the gate.
- **Login flow:** Use a same-tab redirect flow and return to the game after authentication.
- **Configuration:** Read `VITE_ENTRA_TENANT_ID` and `VITE_ENTRA_CLIENT_ID` from build-time environment configuration. These are public client configuration, not secrets. Register the SPA redirect URIs for local development and the final Static Web App domain.
- **API token format:** Expose the delegated `access_as_user` scope and set the Entra app manifest `api.requestedAccessTokenVersion` to `2` so the API receives the v2 tokens it validates.
- **Data synced:** Sync the complete existing profile: nickname, campaign progress and skills, best record, and team customization.
- **Storage:** Use a dedicated Azure Table Storage table for this football game. Do not reuse the unrelated maze-rescue Cosmos DB.
- **Static Web App target (superseded 2026-10-27):** The earlier selection of `swa-grill-us-prod-d0d6` was incorrect. That resource belongs to another application. The football game now deploys to the dedicated `ydj-football` resource in `grill-me-edu`; see `2026-10-27-ydj-football-azure-target.md`.
- **API boundary:** Put data access behind an Azure Static Web Apps managed Functions API. The API must validate the Entra caller and derive the storage key from verified tenant/object identifiers; never trust a user ID supplied by the browser. Keep the Table Storage credential in server-side application settings.
- **First login migration:** If the signed-in account has no cloud profile, upload the current browser's local profile to that account. Preserve the local data until the upload succeeds.
- **Existing cloud profile:** When the account already has a cloud profile, the cloud version is canonical and replaces this device's local profile after it is fetched successfully.
- **Unavailable cloud storage:** Do not enter the game until the account profile has loaded or the first-login upload has succeeded. Show an actionable retry state so unsynced saves are not silently overwritten.
- **Identity and save separation:** Each Entra account gets its own profile. The server must not allow one caller to read or overwrite another account's row.

## Implementation implications

- Add MSAL browser authentication and an authenticated loading/sign-in screen before the current app initialization can launch the game, including `skillPreview` query paths.
- Replace direct local-only profile writes with a profile repository that uses the authenticated API and local storage as a migration/cache layer.
- Add a managed Functions API for reading/upserting the caller's profile and validate the Entra access token on the server.
- Add environment examples and deployment configuration without committing tenant IDs, client secrets, or storage keys. Tenant/client IDs may be supplied as public build variables; storage credentials must remain server-side.
- Configure the Entra app registration as a single-tenant SPA with local and deployed redirect URIs. The exact deployed URI and tenant/client IDs must be provided/configured during setup.
- Cloud sync deployment depends on an Azure Static Web App with its managed API enabled and permission to configure server-side app settings and a dedicated Table Storage resource.

## Out of scope

- Public/shared leaderboard service. The current best record remains part of the account's private profile.
- Reusing or migrating data from the maze-rescue Cosmos DB.
- Guest mode or offline play when the cloud profile cannot be loaded.
