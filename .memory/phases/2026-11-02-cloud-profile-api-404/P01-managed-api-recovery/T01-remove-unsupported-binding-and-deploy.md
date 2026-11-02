# Task: T01 Remove Unsupported Binding and Deploy

## Status: done

## Diagnostic update
- Two successful deployments still returned a platform 404 for `/api/profile`.
- Register only the profile function to test whether importing the PvP HTTP module prevents managed API function registration. The profile-only deployment changed unauthenticated `GET /api/profile` to the function's JSON 401, confirming the managed API route is now reached.
- The root cause is narrowed to importing/registering the PvP HTTP module (or one of its imports/routes); the precise failing registration is not isolated yet. PvP room routes remain unavailable until that module can be re-enabled safely.
- This verifies routing only. Authenticated Cosmos reads/writes have not been tested.

## Goal
Allow Azure Static Web Apps managed Functions to index the profile and other HTTP functions by not registering its unsupported Web PubSub Context binding.

## Implementation
- `game/api/src/index.js`: keep only the profile function imported during hosted route isolation; do not import the PvP HTTP or real-time modules until profile routing is confirmed.
- `game/api/src/functions/pvpRealtime.js`: remove the `pvpEvents` registration that declares `webPubSubContext`; keep the pure handler for a future standalone Functions backend.
- `game/PVP_AZURE_SETUP.md`: document the managed API limitation and defer the upstream callback until an external supported Functions backend is configured.
- Keep all unrelated dirty working tree files untouched.

## Validation
- `cd game/api; npm test`
- `cd game/api; npm run check`
- `cd game; npm run build`
- Deploy by pushing the focused commit to `master`.
- Smoke-check `GET /api/profile` with no token; it must return API `401`, not platform `404`.

## Commit Message
```text
fix(api): restore profile endpoints on static web apps

Plan: 2026-11-02-cloud-profile-api-404
Phase: P01-managed-api-recovery
Task: T01-remove-unsupported-binding-and-deploy

- Keep the managed API HTTP-only so profile routes can load
- Defer Web PubSub upstream handling to a supported backend
```

## Result
- Commit: `c85c93746b7fb4cc20f7121d0951f408ce34bd51` (`master`)
- GitHub Actions deployment run `41399321332`: success.
- `npm test`: 21/21 passed; `npm run check`: passed; frontend production build: passed.
- Hosted unauthenticated `GET /api/profile`: 401 JSON from the function, replacing platform 404.
