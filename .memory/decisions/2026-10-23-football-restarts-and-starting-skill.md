# Decisions: Football Restarts and Starting Skill

- Date: 2026-10-23
- Status: Confirmed

## D01. Out-of-bounds restart behavior
- **Chosen**: Keep soccer-style restarts: throw-ins at the touchline and goal kicks/corners at the goal line. A valid home restart action pressed during the 0.35-second setup window is queued and carried out once the restart is ready. The away AI continues to restart automatically.
- **Rationale**: The user wants the ball to return to play without losing an early key press; they selected the existing football restart types instead of returning to a center kickoff.

## D02. Starting skill ownership and selection
- **Chosen**: Every new campaign gives the home team exactly one level-1 active skill, selected randomly from the non-passive skill IDs and stored in the shared ordered team deck. The opponent's stage-one deck remains empty. Later campaign rewards use the existing team deck and offer flow.
- **Rationale**: The user confirmed one shared skill owned by the home team and chose random selection for each new campaign.

## D03. Existing campaign preservation
- **Chosen**: Grant the starter skill only when creating a new campaign. Do not grant or replace skills in a campaign already saved before this change.
- **Rationale**: Existing campaign progress and team skill order must remain intact.
