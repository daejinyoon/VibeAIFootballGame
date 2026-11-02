# Current Context

## Active Plan
[Profile v8 API Compatibility](./plans/2026-11-02-profile-v8-api-compatibility.md)

## Active Phase
[P01 API Schema Fix](./phases/2026-11-02-profile-v8-api-compatibility/P01-api-schema-fix/phase.md) — in progress

## Active Task
[T02 Deploy Profile v8 Fix](./phases/2026-11-02-profile-v8-api-compatibility/P01-api-schema-fix/T02-deploy-profile-v8-fix.md)

## Status
- Confirmed cause: the frontend sends profile schema v8, but `game/api/src/profileValidation.js` accepted only v7, producing HTTP 400.
- Decision: accept both v7 and v8; preserve v7 shape and v8 `goalCelebration` settings.
- Azure API route, Entra identifiers, Cosmos connection, and `football/profiles` container were checked and are present.
- T01 is implemented; all 4 focused API validation tests pass, and the production Vite build succeeds.
- Separate pending item from the deployment plan: GitHub source repository visibility is public although the old deployment plan says private.

## Next Step (IMPORTANT)
Release the validated API fix to the latest `origin/master`, then verify the Azure workflow and production endpoints from T02.
