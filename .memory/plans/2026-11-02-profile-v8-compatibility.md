# Plan: Profile v8 API Compatibility

## Goal
Allow cloud profile saves to accept the current v8 profile, including goal celebration preferences, while preserving existing v7 clients and saved profiles.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Update API validation and release it to Azure Static Web Apps | [P01](../phases/2026-11-02-profile-v8-api-compatibility/P01-api-schema-fix/phase.md) |

## Dependencies
- Current frontend profile schema is v8 and includes `goalCelebration`.
- The API currently accepts only schema v7, causing HTTP 400 on v8 saves.
- Azure Static Web Apps deploys `game/api` from `master` using the existing GitHub Actions workflow.
