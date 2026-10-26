# Task: T01 Entra Login Gate

## Status: pending

## Goal

Add single-tenant Entra sign-in using the public Vite tenant/client settings and require an authenticated DEX Consulting account before initializing the start screen, game, or skill-preview route.

## Decision Summary

- Use `@azure/msal-browser` with `loginRedirect`/`handleRedirectPromise` and return to the same origin.
- The browser requests `api://{VITE_ENTRA_CLIENT_ID}/access_as_user`; frontend authentication alone does not authorize data access, which remains protected by the API from P01.

## Implementation

### I01. Add MSAL configuration and redirect lifecycle

- Related Files:
  - `game/package.json` :: MSAL browser dependency; modify
  - `game/src/auth/entraAuth.js` :: MSAL client configuration and auth operations; new
  - `game/src/main.jsx` :: initialize redirect processing before mounting App; modify
  - `game/.env.example` :: public environment variable names; new or modify

#### Details

- Install `@azure/msal-browser`; pin it through `game/package-lock.json`.
- Read `VITE_ENTRA_TENANT_ID` and `VITE_ENTRA_CLIENT_ID` from `import.meta.env`; use authority `https://login.microsoftonline.com/${tenantId}`, `redirectUri: window.location.origin`, `postLogoutRedirectUri: window.location.origin`, cache location `sessionStorage`, and login scopes `openid`, `profile`, `api://${clientId}/access_as_user`.
- Export one `PublicClientApplication`, `initializeEntraAuth()`, `beginEntraLogin()`, `beginEntraLogout()`, `getEntraAccount()`, and `getProfileApiToken()`; `getProfileApiToken()` uses `acquireTokenSilent()` for the selected account and scopes `api://${clientId}/access_as_user`.
- `initializeEntraAuth()` must await `initialize()` then `handleRedirectPromise()`, set the returned/current account as active, and return `{ account, configurationError }`. If tenant/client configuration is missing, return a configuration error state; do not fall back to anonymous play.
- For account validation, require ID token claim `tid` equal to configured tenant and an `oid`; never key profile data by email or display name.
- `.env.example` contains empty `VITE_ENTRA_TENANT_ID=` and `VITE_ENTRA_CLIENT_ID=` placeholders only.

### I02. Add the blocking sign-in/loading/error shell

- Related Files:
  - `game/src/App.jsx` :: top-level loading/authenticated render and existing game initialization; modify
  - `game/src/components/SignInScreen.jsx` :: sign-in, retry, configuration, and API error states; new
  - `game/src/styles.css` :: sign-in shell styles; modify

#### Details

- Do not call `readProfile()`, evaluate `skillPreview`, create a campaign, or render `StartScreen` until `initializeEntraAuth()` resolves to a valid account.
- UI states: `authLoading`, `signedOut`, `profileLoading`, `ready`, and `profileError`. `signedOut` provides one button calling `beginEntraLogin()`. `profileError` provides retry and sign-out. A small account/sign-out control remains available after entry.
- Validate configured tenant claim again in the top-level app before mounting the game. If the account is absent or belongs to another tenant, render signed-out/error UI only.
- Keep redirect query and hash through the auth return so `skillPreview` remains present only after authenticated initialization; the route is still not allowed to start before the account and cloud profile load.

## Acceptance Criteria

- [ ] Unauthenticated visits show only the sign-in/loading shell; the start screen and direct skill previews cannot render.
- [ ] Redirect sign-in returns to the same origin and the configured DEX tenant account becomes active.
- [ ] Missing configuration, failed redirect, and wrong-tenant account show actionable errors without guest fallback.
- [ ] Sign-out returns to the sign-in shell and does not clear another account's cloud data.

## Validation

- `npm --prefix game run build`
- `npm --prefix game test`
- Manual browser flow: unauthenticated visit, redirect round-trip, wrong-tenant rejection, refresh after login, direct `?skillPreview=eulryongta`, and sign-out.

## Commit Message

```text
feat(auth): require DEX Entra sign-in before game entry

Plan: 2026-10-26-entra-login-cloud-save
Phase: P02-frontend-auth-and-sync
Task: T01-entra-login-gate

- Initialize MSAL redirect flow from Vite public configuration
- Gate normal and direct-entry game routes behind tenant validation
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
