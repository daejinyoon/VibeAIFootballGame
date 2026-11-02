# Plan: Local Development Login Bypass

## Goal
Allow the game to launch and save campaign/profile data in local Vite development without Entra login or cloud API calls, while preserving the current authentication and cloud profile behavior in production builds.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ✅` | Add a development-only local profile mode and keep production authentication unchanged | [P01](../phases/2026-10-29-local-dev-auth-bypass/P01-local-auth-and-profile/phase.md) |
