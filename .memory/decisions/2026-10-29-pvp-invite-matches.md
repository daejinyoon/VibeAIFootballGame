# Decisions: Football PvP Invite Matches

- Date: 2026-10-29
- Status: Confirmed

## D01. Match access and invitations
- **Chosen**: Signed-in company users create or join a 1v1 match using an invite code. The invite room stays open until its creator cancels it; it accepts one opponent.
- **Rationale**: The game already requires a company Entra account, and the user chose invite-code rooms over automatic matchmaking.

## D02. Real-time connection
- **Chosen**: Add Azure Web PubSub for real-time room messages and game synchronization.
- **Rationale**: The current game uses Azure Functions for HTTP APIs, while a live match needs a persistent real-time connection.

## D03. Team control
- **Chosen**: Each participant controls one side and can switch the directly controlled player; the remaining teammates are AI controlled. The room creator is assigned home and the invitee away.
- **Rationale**: This reuses the existing match controls and gives both participants the same role. Home/away follows room creation order.

## D04. PvP skills
- **Chosen**: Each participant picks three skills from the full skill catalog for that match. All selected skills use the same standard level (Lv. 1); selection order follows the existing ordered skill deck.
- **Rationale**: The user wants direct skill selection, with a shared level to avoid campaign progression affecting PvP balance.

## D05. Ready and match start
- **Chosen**: Both participants confirm their loadout with Ready. Once both are ready, the room creator starts the match.
- **Rationale**: This lets both players finish their selection before play begins and keeps the room creator in control of the start.

## D06. Match simulation authority
- **Chosen**: The room creator's browser simulates the match and synchronizes inputs and state through Azure Web PubSub.
- **Rationale**: The user chose the simpler host-authoritative approach for internal friendly matches.

## D07. Disconnect handling
- **Chosen**: A participant disconnecting during a match immediately ends the match as a forfeit loss for that participant. No reconnect grace period is used.
- **Rationale**: The user chose immediate forfeit handling.

## D08. PvP progression and records
- **Chosen**: PvP does not grant campaign skills or change campaign progression. Store PvP win, loss, and draw totals separately.
- **Rationale**: The user chose PvP-only records without campaign rewards.

## D09. Result verification
- **Chosen**: For a normal match finish, count a match only when both participants submit matching final results. For a forfeit, record the result automatically when the server confirms the disconnect.
- **Rationale**: Mutual confirmation reduces incorrect host-submitted scores; a confirmed disconnect must still produce a record even though the disconnected player cannot submit a result.

## D10. Company leaderboard
- **Chosen**: Provide a company-wide PvP leaderboard, identify users by their Entra company account name, and rank by total wins. Equal win counts share the same ranking position.
- **Rationale**: The user chose the company leaderboard, company account names, and total wins as the ranking metric.
