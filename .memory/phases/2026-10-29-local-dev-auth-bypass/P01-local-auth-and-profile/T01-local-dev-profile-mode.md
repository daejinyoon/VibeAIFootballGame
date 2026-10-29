# Task: T01 Local Development Profile Mode

## Status: done

## Goal
Let a developer open the game under Vite's local development server and enter the campaign without Entra login, while campaign/profile changes persist in that browser's existing local storage and production deployments continue requiring Entra authentication and cloud profiles.

## Decision Summary
- Gate the bypass exclusively on Vite's `import.meta.env.DEV`; do not use a manually editable environment flag or change the Entra configuration.
- In development, skip Entra bootstrap and cloud profile load/save, use existing `readProfile`/`writeProfile`, label the session as local, and hide company PvP entries that require the cloud API. Keep all production branches unchanged.
- Local storage is per origin, so `http://localhost:5173` and `http://127.0.0.1:5173` have separate test profiles.

## Implementation

### I01. Define and test the development-only mode check

- Related Files:
  - `game/src/auth/localDevelopment.js` :: `isLocalDevelopmentMode` — explicit pure guard for the Vite development flag; new
  - `game/src/auth/localDevelopment.test.js` :: development/production guard regressions; new
  - `game/src/main.jsx` :: `main` — bypass Entra bootstrap only in development; modify

#### Details
- **Signatures & Types**:
  ```js
  /** @param {{ DEV?: boolean } | undefined} environment */
  export function isLocalDevelopmentMode(environment)
  ```
  Return `true` only when `environment?.DEV === true`; return `false` for missing environment, false, or any non-boolean truthy value.
- **Data & Schema Fields**:
  - Do not add a profile field, fake Entra token, fake tenant claim, API setting, or storage key.
  - Keep Vite's compile-time `DEV` flag as the sole bypass condition; it is false in production builds.
- **Execution Flow / Logic**:
  1. Add `isLocalDevelopmentMode(import.meta.env)` in `main.jsx`.
  2. When true, pass `{ account: null, configurationError: '', authError: '' }` to `App` without calling `initializeEntraAuth()`.
  3. When false, await `initializeEntraAuth()` exactly as today and pass its result unchanged.
  4. Unit-test true only for `{ DEV: true }`; test false for `{ DEV: false }`, `{ DEV: 'true' }`, `null`, and `undefined`.
- **Error & Exception Handling**:
  - Do not catch or suppress production Entra initialization errors differently from current behavior.
  - Do not expose tenant/client IDs or credentials in local UI or logs.
- **State Transition & Return**: A development build renders `App` without initiating the MSAL redirect/session bootstrap; production continues through the current Entra initialization path.

### I02. Load and save profile locally while preserving production and PvP behavior

- Related Files:
  - `game/src/App.jsx` :: `App`, profile initialization, authenticated profile effect, `saveProfile`, account header, `StartScreen` props — local-only branch; modify
  - `game/src/storage/localProfile.js` :: `readProfile`, `writeProfile` — existing browser-local schema-v7 serializer; read-only
  - `game/src/storage/localProfile.test.js` :: existing schema normalization and browser storage coverage; read-only unless a regression is exposed
  - `game/src/components/StartScreen.jsx` :: `StartScreen` — optionally render cloud-only company PvP entries; modify

#### Details
- **Signatures & Types**:
  ```js
  // App derives localDevelopmentMode from isLocalDevelopmentMode(import.meta.env).
  // StartScreen adds an optional prop:
  StartScreen({ ..., showCompanyPvpActions = true })
  ```
- **Data & Schema Fields**:
  - Use the current `readProfile()` and `writeProfile(profile)` APIs and existing `STORAGE_KEY`; do not change schema version 7 or profile shape.
  - Local display identity is presentation-only (`로컬 테스트`); it must never be passed to an API as a real account or token.
- **Execution Flow / Logic**:
  1. In `App`, derive `localDevelopmentMode` through the new guard. In that mode, use a presentation-only local account label and treat the local app as playable; in production, retain the existing validated Entra tenant/object-ID check.
  2. Initialize React profile state from `readProfile()` only in local development; preserve `createEmptyProfile` initialization for production until the authenticated cloud load completes.
  3. Set initial `profileLoading` to false for local development. Make the cloud profile load effect return immediately in local mode; do not call `loadCloudProfile` or request an API token.
  4. At the top of `saveProfile`, when local mode is active, normalize and persist via `writeProfile(nextProfile)`, update React profile state with the normalized return value, clear prior save errors, and return a resolved promise. If local storage throws, set the existing profile error UI and return a rejected promise. Do not enqueue a cloud request in local mode.
  5. Guard the auth-only return so development bypass reaches the campaign screens. Show `로컬 테스트` in the account header and hide sign-out locally; keep production account display and sign-out unchanged.
  6. Pass `showCompanyPvpActions={!localDevelopmentMode}` to `StartScreen`, whose default remains true. Hide both `회사 사용자 대전` and `회사 PvP 순위 보기` buttons only for local development because those routes require authenticated APIs and PvP remains deferred.
  7. Keep local campaign, customization, nickname, and personal best-record flows using the existing `saveProfile` call sites so their data persists after reload.
- **Error & Exception Handling**:
  - A browser storage failure must remain visible through profile error UI; it must not silently switch to cloud auth or lose the unsaved profile.
  - No local bypass may be enabled by `VITE_*` values, URL query parameters, or a production runtime value other than Vite's compile-time `DEV === true`.
  - Do not alter cloud sync, Entra login, production sign-out, or company PvP API behavior for non-development builds.
- **State Transition & Return**: Local Vite opens directly at the normal start screen, reads/writes the existing browser profile, and can start/continue campaign without network authentication. Production continues to show the existing sign-in/profile-loading flow.

## Acceptance Criteria
- [x] `npm run dev` opens the campaign start screen without redirecting to Entra, even when local Entra environment values are present.
- [x] Nickname, selected team customization, and campaign progress survive a reload in the same browser origin using the existing profile schema.
- [x] Local development makes no Entra bootstrap, cloud profile GET/PUT, or company PvP API request.
- [x] Company PvP and PvP leaderboard entry buttons are hidden only in local development.
- [x] A production build still requires the existing Entra account validation and uses cloud profile loading/saving.
- [x] No fake access token, tenant ID, or account claim is created or sent to the API.

## Validation
- `npm --prefix game test -- src/auth/localDevelopment.test.js src/storage/localProfile.test.js` — development guard tests and existing local profile serialization tests pass.
- `npm --prefix game run build` — production client build succeeds with `DEV` compiled false.
- Manual local check — open `http://localhost:5173`, confirm no sign-in screen, save nickname/customization, start or continue a campaign, reload and confirm saved values; verify local PvP entries are absent.
- Manual production regression — confirm deployed build still presents Entra login to signed-out visitors; do not deploy as part of this task.

## Commit Message
```text
feat(dev): allow local campaign testing without login

Plan: 2026-10-29-local-dev-auth-bypass
Phase: P01-local-auth-and-profile
Task: T01-local-dev-profile-mode

- Bypass Entra and cloud profile sync only in Vite development
- Persist local test progress with the existing browser profile
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- Manual browser reload/customization check not performed in this turn; the existing Vite development server picked up the change and automated checks passed.
- commit: recorded in git history
