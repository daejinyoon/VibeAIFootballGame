# Plan: Football PvP Invite Matches

## Goal
Add a company-account-only 1v1 mode to the existing football game. Two users can create/join a code-based room, select three skills each, play with host-authoritative real-time simulation, and record mutually confirmed results in a company-wide wins leaderboard. PvP must not change campaign saves or rewards.

The current Azure Static Web Apps deployment uses managed Functions, which supports HTTP triggers only. The real-time service will therefore use HTTP Functions plus the Web PubSub context input binding for upstream events, while browser clients connect directly to Azure Web PubSub. This preserves the existing hosting model.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Authenticated room, result, leaderboard, and real-time transport APIs | [P01](../phases/2026-10-29-football-pvp-invite/P01-backend-realtime/phase.md)
| P02 | `done` | PvP lobby, loadout, two-sided control, match and leaderboard UI | [P02](../phases/2026-10-29-football-pvp-invite/P02-game-client/phase.md)
| P03 | `done` | Bicep provisioning for Web PubSub and PvP Cosmos container, plus deployment runbook | [P03](../phases/2026-10-29-football-pvp-invite/P03-hosting-operations/phase.md)

## Confirmed Constraints
- Invite-code room; creator is home, invitee is away; one guest per room. A waiting room remains until its creator cancels it.
- Each user controls one team and switches the active field player; all other players are AI controlled.
- Both users choose three skills from the full catalog. PvP fixes skill levels to Lv. 1.
- Both users set Ready; only the creator starts the match.
- Creator's browser simulates. A normal result is recorded only when both users submit matching scores. A confirmed disconnect during play is an immediate forfeit recorded automatically by the server.
- PvP records are separate from campaign progression. The company leaderboard displays Entra account names and ranks by total wins; equal totals share rank.

## External Setup Boundary
The repository has no existing Azure infrastructure-as-code. P03 adds a Bicep template for a new Free-tier Web PubSub service/hub and the `pvp` container under the existing `football` database, then documents deployment and app-setting steps. It must not change the existing Cosmos account, database, `profiles` container, Static Web App, or unrelated resources. Web PubSub connection strings remain manually configured as secrets in Static Web App API settings.
