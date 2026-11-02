# Cloud Profile API 404 Recovery

## Context
- The production game's `GET /api/profile` and `PUT /api/profile` both return a platform 404.
- Deployment logs show the `game/api` package is built and uploaded.
- The managed API entry point registers a Web PubSub Context input binding. Azure Static Web Apps managed APIs support HTTP triggers and bindings only.

## Decision
- Prioritize restoring profile cloud save and other HTTP API routes on the existing Static Web App managed API.
- Remove registration of the Web PubSub Context callback from the managed Functions app. Keep the domain handler code available for a future supported backend integration.
- PvP upstream real-time event forwarding remains unavailable until it is moved to a separate Functions backend.
- Do not provision or link an additional Azure resource in this fix.

## Verification
- Run the API tests and syntax checks.
- Deploy via the existing workflow.
- Confirm `/api/profile` reaches the function by checking that an unauthenticated request returns the API's 401 response rather than the platform 404.
