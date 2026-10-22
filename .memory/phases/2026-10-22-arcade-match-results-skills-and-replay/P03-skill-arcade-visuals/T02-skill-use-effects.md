# Task: T02 Skill Use Effects

## Status: done

## Goal
Show a distinct, readable 3D arcade effect when each of the six skills is used, with visuals anchored to the relevant player or ball and timed to the actual skill behavior.

## Decision Summary
- Effects must correspond to the existing skill and use event; they cannot claim a hit/save/shot that gameplay did not produce.
- Preserve visibility of players, ball, pitch, and HUD. Use existing Three.js/R3F dependencies only.
- Skill IDs remain eagleShot, tornadoShot, powerTackle, eulryongta, vacuumCleaner, and rainbowReflect.

## Implementation

### I01. Transient effect state and lifecycle
- Related Files:
  - game/src/game/createInitialGameState.js :: createInitialGameState; add transient effect state
  - game/src/game/skills.js :: launchSkillShot, applySkill, applyAutomaticRainbowReflect; create corresponding effect cues
  - game/src/game/stepGame.js :: maybeUseAiSkill, applySkill event integration, timer advancement/cleanup; modify
  - game/src/game/stepGame.test.js :: skill-use effect state and expiration; modify/add
  - game/src/game/skills.test.js :: manual/automatic skill cases; modify/add
- Data schema:
  - state.skillEffects: SkillEffect[]; empty on new match and reset for a fresh match, never included in campaignSave.
  - SkillEffect = {id:number, skillId:SkillId, team:'home'|'away', sourcePlayerId:string, targetPlayerId:string|null, elapsedSeconds:number, durationSeconds:number}.
  - SkillId is the existing six-string union. Initial next effect ID is 1 and increments per created cue for stable rendering keys.
- Lifecycle:
  1. Add an effect only after the corresponding skill succeeds or an automatic skill actually begins/returns.
  2. Expire skillEffects using non-negative simulation delta; remove completed cues and never let expired effects survive into the next match.
  3. Anchor player/target effects by IDs and shot/ball effects by current ball position. Missing/dismissed entities cleanly remove or detach the effect.
  4. Keep existing gameplay state authoritative for duration: Power Tackle follows powerTackleSeconds; Eulryongta burst starts on target knockdown; Vacuum Cleaner follows vacuumEffect; Rainbow Reflect follows rainbowReflection and its return shot; Eagle/Tornado follow the corresponding skill-shot ball.

### I02. Three-dimensional effect renderer
- Related Files:
  - game/src/components/SkillEffects3D.jsx :: new effect scene component using Three.js primitives and useFrame
  - game/src/components/Match3DCanvas.jsx :: mount SkillEffects3D inside Canvas with gameStateRef
  - game/src/components/Match3DGame.jsx :: ensure the shared mutable gameStateRef is passed to the effect renderer; modify only if the existing prop path is insufficient
  - game/src/styles.css :: no changes unless a non-canvas effect label is required
- Rendering contract:
  - Read transient game state through gameStateRef; update Three.js refs in useFrame without forcing a React render on every simulation tick.
  - Use FIELD coordinate conversion identical to FootballBall3D/FootballPlayer3D: x/80 - FIELD.width/160 and (y - FIELD.height/2)/80.
  - Render six distinct motifs: Eagle Shot fiery wing/trail around skill-shot ball; Tornado Shot rotating wind spiral around its ball; Power Tackle energized ring/aura around source player and brief contact burst; Eulryongta dragon/shockwave burst around knocked-down target; Vacuum Cleaner suction spiral between user and ball; Rainbow Reflect curved rainbow shield/return arc around reflector and outgoing ball.
  - Team tint: home cyan/lime, away coral/gold; effect opacity/intensity peaks on activation and fades by elapsedSeconds/durationSeconds. Keep VFX above the turf and below score HUD; avoid covering the ball for longer than the brief impact cue.
  - Use shared geometries/materials or dispose per-effect allocations; do not add a rendering dependency.

## Acceptance Criteria
- [x] Successful use of each of the six skills produces its named, distinguishable 3D effect.
- [x] Failed skill attempts produce no success effect and do not consume/animate a use.
- [x] AI skills show the same relevant effects as player skills.
- [x] Effects follow moving players/ball, fade/expire, and do not persist across a new match.
- [x] Core play remains readable; players, ball, and field lines stay visible during effects.

## Validation
- From game/: node --test src/game/skills.test.js src/game/stepGame.test.js
- From game/: npm run build
- Browser QA: activate each skill for home and AI where applicable; inspect the live 3D result, anchor, fade, and overlap on desktop/narrow viewports.

## Commit Message
```text
feat(game): add skill-specific 3d match effects

Plan: 2026-10-22-arcade-match-results-skills-and-replay
Phase: P03-skill-arcade-visuals
Task: T02-skill-use-effects

- Track short-lived skill cues in match state.
- Render distinct gameplay-anchored 3D effects for every skill.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: `9f8441b`

## Execution Notes
- Added transient effect state with stable per-match IDs. Successful player and AI skill uses create cues; Rainbow Reflect adds activation and return cues, and Power Tackle contact adds a short impact cue.
- Added pooled Three.js motifs anchored to the live ball or relevant players. Headless Chrome visual QA rendered all six skills in the match scene; players, ball, and field markings remain visible.
- `node --test src/game/skills.test.js src/game/stepGame.test.js`: passed (79/79). `npm run build` and `git diff --check` passed. Build retains the existing Three.js chunk warning (>500 kB).
- Updated stale simulation test expectations to match immediate shots, player-directed restarts, fully out-of-play boundary checks, and severity-based discipline.
- No known task-specific validation failures remain.
