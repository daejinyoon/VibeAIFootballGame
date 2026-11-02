# Task: T01 Remove Unsupported Binding and Deploy

## Status: in_progress

## Diagnostic update
- Two successful deployments still returned a platform 404 for `/api/profile`.
- Temporarily register only the profile function to test whether importing the PvP HTTP module prevents managed API function registration. PvP room routes remain deferred during this profile-first probe.

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
