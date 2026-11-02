# Decisions: Local Development Login Bypass

- Date: 2026-10-29
- Status: Confirmed

## D01. Development-only authentication bypass
- **Chosen**: Let the game start without Entra login only when Vite reports `import.meta.env.DEV`; keep Entra authentication required in production builds.
- **Rationale**: This allows direct local campaign testing without changing the deployed sign-in gate.

## D02. Local profile persistence
- **Chosen**: Read and write the local profile using the existing `readProfile` and `writeProfile` browser-storage functions while the development bypass is active.
- **Rationale**: Campaign progress, nickname, and team customization remain available after reload without calling the profile API.

## D03. Cloud and PvP scope
- **Chosen**: Do not authenticate against Entra or synchronize local development profile data with cloud APIs. PvP remains outside the local bypass scope.
- **Rationale**: The immediate goal is testing the campaign game locally without login or server setup; PvP remains deferred.

## D04. Browser origin behavior
- **Chosen**: Local browser storage remains scoped to the origin used to open the game.
- **Rationale**: `localhost` and `127.0.0.1` are distinct origins and therefore may have separate saved local test profiles.
