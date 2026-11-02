# Current Context

## Active Plan
[Football 1.0 Release](./plans/2026-11-02-football-v1-release.md)

## Active Phase
[P02 Publish](./phases/2026-11-02-football-v1-release/P02-publish/phase.md)

## Active Task
[T02 Publish and Verify](./phases/2026-11-02-football-v1-release/P02-publish/T02-publish-and-verify.md)

## Status
- Version 1.0.0 and main-screen patch notes are implemented. The targeted test and build passed; full tests have seven failures in untouched skill/campaign knockdown cases. Deployment is prepared but public source visibility must be resolved before pushing.

## Next Step (IMPORTANT)
Do not push the release commit until the user confirms that deploying from the public GitHub repository is acceptable or the repository has been made private; then reconcile `origin/master`, push without force, and verify the Azure workflow and live URL.
