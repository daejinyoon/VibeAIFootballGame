# Cloud Profile API 404 Recovery

## Context
- The production game's `GET /api/profile` and `PUT /api/profile` both return a platform 404.
- Deployment logs show the `game/api` package is built and uploaded.
- The managed API entry point registers a Web PubSub Context input binding. Azure Static Web Apps managed APIs support HTTP triggers and bindings only.

## Decision
- Prioritize restoring profile cloud save on the existing Static Web App managed API.
- Keep the managed API profile-only while the PvP HTTP module's effect on route registration is investigated. The profile-only deployment changed `/api/profile` from platform 404 to the function's expected 401.
- Keep PvP room APIs and upstream real-time event forwarding unavailable until the module can be safely re-enabled; Web PubSub handlers still require a separate supported Functions backend.
- Do not provision or link an additional Azure resource in this fix.

## Verification
- Run the API tests and syntax checks.
- Deploy via the existing workflow.
- Confirm `/api/profile` reaches the function by checking that an unauthenticated request returns the API's 401 response rather than the platform 404. Authenticated Cosmos reads/writes still need an in-game smoke check.
