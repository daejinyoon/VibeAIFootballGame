# Plan: Football Beta Feedback

## Goal
Respond to the confirmed football-game feedback by fixing the known player-render exception and measuring the reported Chrome/Edge stall and input latency, making ordinary-shot trajectories vary smoothly with distance, identifying beta and goal-kick UI, adding event-driven crowd reaction and licensed cheering, and playing a newly composed arcade entrance cue on the selected pre-match screens. Do not add a shot gauge or address the deferred leg-clipping report.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `implementation_done` | Game stability, shot simulation, match UI, crowd audio/animation, and pre-match cue; manual browser checks pending | [P01](../phases/2026-10-27-football-beta-feedback/P01-game-stability-and-polish/phase.md) |

## Confirmed Constraints
- Display `BETA` on the start screen only; keep `game/package.json` at `0.1.0`.
- Do not add a charge gauge. Keep `D` as an immediate shot action.
- Defer the player's clipped-leg/UI report.
- Keep existing goal-kick rules. Improve recognition and instructions only.
- Animate the crowd on goals only. Play one selected recorded cheer on kickoff and goal; increase volume for goals.
- Use the selected OpenGameArt clip `Strong cheering - II - Short` by Gregor Quendel and preserve its CC BY 4.0 attribution.
- Do not use UEFA Champions League/Europa League music, a recognizable adaptation, or hidden/background YouTube playback. Create a new original arcade fanfare in Web Audio.
- Play the fanfare on both team customization and stage selection, continue across the transition between them, loop while either is active, and fade it out when leaving those screens for a match or another screen.

## Deferred
- Player-leg clipping remains outside this plan at the user's request.
- The reported tab freeze has no event-specific reproduction. T01 must record whether a confirmed five-minute desktop-browser soak reproduces it; do not claim the known tackle-render exception is the sole cause without evidence.
