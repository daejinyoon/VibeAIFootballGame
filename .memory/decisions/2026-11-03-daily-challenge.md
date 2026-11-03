# Decisions: Daily Challenge

- Date: 2026-11-03
- Status: Confirmed

## D01. Feature direction
- **Chosen**: Add a daily challenge mode to make matches feel different and encourage repeat play.
- **Rationale**: The game already has a five-stage campaign with skill-card progression, personal campaign records, and company PvP. A daily challenge adds a replay loop alongside those existing modes.

## D02. Challenge length and schedule
- **Chosen**: Each daily challenge is one match. Every player gets the same challenge for a given day, and only the current day's leaderboard is shown.
- **Rationale**: A single match is a quick session, while shared daily conditions make the results comparable.

## D03. Daily match rules
- **Chosen**: Each challenge combines a shorter match time and stronger AI. Use a curated, rotating list of presets with approachable and difficult combinations, roughly 45–30 seconds and AI stages 2–5.
- **Rationale**: Both existing match time and AI stage are already adjustable. Combining them makes each preset feel distinct; a curated list keeps combinations intentional and understandable.

## D04. Challenge loadout
- **Chosen**: Everyone uses the same three skills each day: Eagle Shot (`eagleShot`), Tornado Shot (`tornadoShot`), and Eul-yong Ta (`eulryongta`). Each skill is level 1 with one use. The loadout stays the same each day.
- **Rationale**: Equal skill access prevents campaign unlocks and upgrades from affecting the leaderboard. The selected trio covers attack and defense while respecting the existing three-skill limit.

## D05. Results and leaderboard
- **Chosen**: Provide a global company leaderboard. Rank wins ahead of draws, and draws ahead of losses; then compare goal difference. Exact ties share a rank. Each account may retry; only its best result for that day counts.
- **Rationale**: The shared challenge invites direct competition, the match can end in a draw after overtime, and the existing game already records match scores. Retries allow practice without adding multiple rows per player per day.

## D06. Rewards
- **Chosen**: Challenge participation grants no campaign or cosmetic rewards; the record and rank are the reward.
- **Rationale**: This keeps the first version focused on daily competition and avoids changing campaign progression or cosmetic unlocks.

## D07. Daily boundary
- **Chosen**: The challenge changes at 00:00 Korea Standard Time (KST).
- **Rationale**: This matches the user's current environment and gives all players one shared daily boundary.

## D08. Score submission and trust
- **Chosen**: Accept authenticated client-submitted match results on the server with basic input bounds. Do not simulate the full match on the server in this version.
- **Rationale**: This follows the current client-simulated game architecture and keeps implementation proportionate to a casual company leaderboard. Submitted scores can be manipulated, so the leaderboard is not intended as a high-stakes competitive ranking.

## D09. Existing-system integration
- **Chosen**: Use the existing Entra-authenticated account identity for leaderboard entries, store one best result per account and KST date, and determine the active challenge date and preset on the server.
- **Rationale**: The project already uses Entra authentication and Cosmos-backed PvP records. Server-side date selection keeps users on the same challenge even if their device timezone differs.

## D10. Automatic decisions from code review
- **Chosen**: Keep the challenge separate from campaign save/progression. Use the existing match engine, stage-based AI tuning, skill IDs, and three-skill loadout constraint. Preserve the user's team customization for presentation because it does not change match strength.
- **Rationale**: These are existing codebase conventions; reusing them avoids creating a second match simulation or changing campaign save behavior.
