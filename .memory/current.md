# Current Context

## Active Plan
[Profile v8 API Compatibility](./plans/2026-11-02-profile-v8-api-compatibility.md)

## Active Phase
[P01 API Schema Fix](./phases/2026-11-02-profile-v8-api-compatibility/P01-api-schema-fix/phase.md) — complete

## Active Task
None; all tasks in P01 are complete.

## Status
- Confirmed cause: the frontend sends profile schema v8, but `game/api/src/profileValidation.js` accepted only v7, producing HTTP 400.
- Decision: accept both v7 and v8; preserve v7 shape and v8 `goalCelebration` settings.
- Azure API route, Entra identifiers, Cosmos connection, and `football/profiles` container were checked and are present.
- T01 is implemented and committed as `91e928a`; all 4 focused API validation tests pass, and the production Vite build succeeds.
- T02 was deployed as commit `563e374`; GitHub Actions run #20 succeeded, production returned HTTP 200, and the unauthenticated profile API returned the expected 401.
- The user should reload the production app and retry saving to confirm their authenticated profile now persists. If authorization errors appear, investigate the Entra delegated consent grant, which was not present during read-only inspection.
- Separate pending item from the deployment plan: GitHub source repository visibility is public although the old deployment plan says private.

## Next Step (IMPORTANT)
Ask the user to reload the production app and retry saving. Separately, resolve the source-repository visibility mismatch from the Azure deployment plan if the user wants to continue that task.
