# Plan: Cloud Profile API 404 Recovery

## Goal
Restore the Static Web App managed API routes so profile cloud saves reach the profile HTTP function.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Remove unsupported Web PubSub binding registration, validate, deploy, and smoke-check profile API routing | [P01](../phases/2026-11-02-cloud-profile-api-404/P01-managed-api-recovery/phase.md) |

## Constraints
- Decision: `.memory/decisions/2026-11-02-cloud-profile-api-404.md`.
- Preserve profile and other HTTP APIs.
- Do not provision extra Azure resources or expose secrets.
- PvP upstream event forwarding is deferred until a separate Functions backend exists.
- Stage only the planned files; unrelated worktree changes must remain untouched.
