# Decisions: Remove Rainbow Reflect and Add a Team Skill Cooldown

- Date: 2026-10-26
- Status: Confirmed

## D01. Remove Rainbow Reflect
- **Chosen**: Remove Rainbow Reflect from gameplay, skill offers, equipment, opponent decks, presentation, and audio. When loading existing campaign saves, remove Rainbow Reflect references from owned skills, equipped skills, pending offers, and opponent skill sets while preserving the rest of the campaign and its progress.
- **Rationale**: The skill is no longer wanted, and existing saves should remain usable without retaining the removed skill or losing unrelated progress.

## D02. Prevent consecutive skill activations
- **Chosen**: Apply a shared 3-second cooldown per team after any skill successfully activates. During the cooldown that team cannot activate another skill, including a different skill. A failed activation does not start the cooldown. Keep the existing per-skill cooldowns.
- **Rationale**: Rapid repeated input should not chain multiple skills, while normal failed skill attempts should not impose a wait.

## D03. Apply the cooldown to both teams independently
- **Chosen**: Home and away have separate team cooldowns. A skill cast by one team does not block the other team.
- **Rationale**: Prevents each team's skill chain without coupling opposing teams' actions.

## D04. Show the shared cooldown
- **Chosen**: Show each team's remaining shared cooldown time in the skill HUD, such as “Team skills ready in 2.4s”.
- **Rationale**: Players can see why another skill is temporarily unavailable.
