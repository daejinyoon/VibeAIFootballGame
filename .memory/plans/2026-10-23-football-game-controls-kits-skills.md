# Plan: Football Game Controls, Kits, and Shared Skills

## Goal

Update the existing desktop 3D football game to provide nine clear home kit presets, predictable kickoff control, an accurate keyboard guide, and team-owned ordered skills with shared cooldowns and level-based effects. Preserve campaign progress and existing player/team identity when migrating saved data. Stage 1 remains the new-campaign starting stage.

## Confirmed Design

- Keep the existing four team logos and add nine named home kit palettes.
- Home team receives control of the kickoff taker after conceding; a successful home pass transfers control to its receiver.
- The start guide uses arrow keys for movement and puts `E` sprint in the movement row. Remove separate `SPRINT` and `AERIAL` rows.
- Team skills live in one ordered team collection. The player can place a new reward immediately and reorder skills later in team setup.
- `F` attempts the next usable active skill in order, skips unmet conditions, and advances only after successful activation. A successful skill starts a 10-second team-wide cooldown. Home and AI use the same rules and have unlimited uses.
- Duplicate rewards level eligible skills up to 3. Do not offer duplicate Vacuum Cleaner or Rainbow Reflect, and exclude max-level skills.
- Eagle Shot is worth 1/2/3 points by level and cannot be stopped by the goalkeeper.
- Tornado Shot keeps its shot in flight and lifts every other character, including both teams and keepers, for 5/6/7 seconds by level.
- Power Tackle immediately creates a solid wall in front of the user, blocks all characters, launches characters it hits, and lasts 3/4/5 seconds by level.
- Eulryongta shows the supplied soccer photo and a slap-like sound, knocks down 1/2/3 targets by level, and keeps each target down for 10 seconds.
- Vacuum Cleaner instantly pulls the ball to its user from anywhere. Rainbow Reflect stays automatic and cancels opposing skill effects, including walls, regardless of position.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Team presentation, shared skill ownership, simulation rules, and 3D skill feedback | [P01](../phases/2026-10-23-football-game-controls-kits-skills/P01-team-controls-and-skills/phase.md) |

## Execution Order

1. T01 updates kit choices, kickoff control, and the keyboard guide.
2. T02 replaces per-player/inventory ownership with an ordered team deck and migrates saved campaigns.
3. T03 implements the shared activation queue, cooldown, AI behavior, and skill gameplay effects (complete).
4. T04 connects the effects to the 3D presentation, skill cut-in, and sound (complete).

This stays in one phase because all four tasks change one feature area and share one campaign-to-match flow. The task boundary separates independently reviewable presentation, persistent data, deterministic simulation, and renderer/audio work while preserving a strict dependency order.

## Regressions and Risks to Verify

- Existing saved campaigns use player stacks and an inventory. Migration must retain ownership and levels without resetting stage, branding, nickname, or records.
- Kickoff control must not switch before the kickoff pass, and pass receiver selection must remain correct.
- AI must respect the same team-wide cooldown and ordered queue, rather than activating on every eligible frame.
- Aerial and knocked-down states must not leave players permanently disabled or interfere with goal resets.
- Rainbow Reflect must clear opposing timed effects and barriers without also canceling its own team effects.
- The supplied Eulryongta photo is copied into the public skills directory as `eulryongta-cutin.jpg`.
- Desktop is the target; responsive/mobile-specific work is outside this plan.

## Nearby Issues Outside This Plan

- Revisit Vacuum Cleaner duplicate upgrades later, as explicitly deferred in D07/D12.
- Broader AI movement, character animation, camera framing, and stadium redesign from the earlier overhaul are not part of this change.

## Status

- T01 kits, kickoff, and controls implemented and validated.
- T02 shared team deck, reward/setup flow, and profile v4 migration implemented and validated.
- T03 shared activation, team cooldown, AI behavior, and skill simulation implemented and validated.
- All tasks in P01 are implemented and validated.
