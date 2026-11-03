# Plan: Daily Challenge Storage Recovery

## Goal
Fix the hosted daily challenge storage error without provisioning or depending on PvP resources. Store daily result documents in the existing Cosmos `football/profiles` container while preserving profile documents.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Replace the daily API's PvP-container dependency with isolated result documents in the existing profiles container, validate, and deploy. | [P01](../phases/2026-11-03-daily-challenge-storage-recovery/P01-existing-profile-container/phase.md) |

## Scope Notes
- User-selected storage target: existing `football/profiles` container, partition key `/tenantId`.
- Daily result IDs remain `daily:${challengeDate}:${objectId}` and documents remain tagged `kind: 'dailyChallengeResult'`; profile IDs remain the Entra object ID.
- No PvP services, hubs, containers, or Azure resource deployments are part of this fix.
- Preserve all profile API behavior and profile documents; daily results are separate Cosmos documents.
- Authenticated production verification requires the user's DEX Entra browser session; never request or record tokens or profile contents.
