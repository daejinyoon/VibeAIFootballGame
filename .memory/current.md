# Current Context

## Active Plan
[Cloud Profile API 404 Recovery](./plans/2026-11-02-cloud-profile-api-404.md)

## Active Phase
[P01 Managed API Recovery](./phases/2026-11-02-cloud-profile-api-404/P01-managed-api-recovery/phase.md)

## Active Task
[T01 Remove Unsupported Binding and Deploy](./phases/2026-11-02-cloud-profile-api-404/P01-managed-api-recovery/T01-remove-unsupported-binding-and-deploy.md)

## Status
- Production profile API routes return 404. The API package is uploaded, but the managed Function app registers an unsupported Web PubSub Context input binding. User chose profile-save recovery first; remove that registration, deploy, and verify the profile route returns an API response.

## Next Step (IMPORTANT)
Complete T01. Keep PvP upstream event forwarding deferred until a separate Functions backend is configured.