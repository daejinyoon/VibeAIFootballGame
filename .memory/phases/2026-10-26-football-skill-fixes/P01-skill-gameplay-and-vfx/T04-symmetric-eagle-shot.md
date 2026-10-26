# Task: T04 Make Eagle Shot Trajectories Symmetric

## Status: done

## Goal
Make away Eagle Shot projectiles follow the 180-degree rotational counterpart of the home cycloid trajectory around field center, while preserving each side's goal endpoint and existing vertical rise and dive.

## Decision Summary
- Apply D04: mirror the complete path in field X/Y coordinates around `(FIELD.width / 2, FIELD.height / 2)` for opposite attack directions.
- Keep above-ground `height`, launch timing, scoring, and Eagle Shot level behavior unchanged.

## Implementation

### I01. Mirror away volley goal targets
- Related Files:
  - `game/src/game/skills.js` :: `eagleTargetYs`, `launchEagleVolley`, `createEagleProjectile` — reflect away target positions around field center; modify
  - `game/src/game/stepGame.js` :: `advanceEagleVolley` — preserve rotational symmetry during cycloid interpolation; modify only if required

#### Details
- **Signatures & Types**:
  ```js
  function eagleTargetYs(level) // level: integer 1..3; returns number[] goal Y coordinates
  function createEagleProjectile(state, volley, targetY) // targetY: number in field Y units
  function launchEagleVolley(state, player, level) // initializes a volley for player.team
  function advanceEagleVolley(state, deltaSeconds) // advances projectile field position and above-ground height
  ```
- **Data & Schema Fields**:
  - `volley.team`: `'home' | 'away'`.
  - `volley.targetYs`: ordered numbers inside `[FIELD.goalTop + BALL_RADIUS, FIELD.goalBottom - BALL_RADIUS]`.
  - `projectile.x`, `projectile.y`, `projectile.targetY`: field-space coordinates; `projectile.height`: above-ground field units.
- **Execution Flow / Logic**:
  1. Keep `eagleTargetYs(level)` as the canonical home target ordering.
  2. For away volleys, reflect each target with `FIELD.height - targetY`, preserving index correspondence and reversing the lateral fan order.
  3. Preserve source-derived launch position, team-specific goal X plane, launch interval, scoring, and collision behavior.
  4. Ensure paired projectiles from rotationally mirrored launch positions satisfy `awayX = FIELD.width - homeX` and `awayY = FIELD.height - homeY` at equal flight progress. Keep paired above-ground `height` equal.

### I02. Add rotational-symmetry regression coverage
- Related Files:
  - `game/src/game/skills.test.js` :: Eagle Shot volley tests — compare paired level 2 home and away projectiles; modify

#### Details
- Activate level 2 home and away volleys from source positions related by `(x, y) -> (FIELD.width - x, FIELD.height - y)` and opposing horizontal facing.
- Advance both states through ascent and into flight; compare matching projectile indices at equal elapsed flight progress.
- Assert paired X/Y coordinates sum to `FIELD.width`/`FIELD.height`, paired above-ground heights are equal, and away target Ys are reflections of corresponding home targets.
- Preserve existing home scoring, goal entry, cycloid rise/dive, and goalkeeper-bypass coverage.

## Acceptance Criteria
- [x] Paired home/away projectile positions are 180-degree rotational counterparts at equal flight progress.
- [x] Away volley targets use the reflected lateral fan order.
- [x] Vertical height, launch interval, scoring, and home trajectory remain unchanged.

## Validation
- `node --test src/game/skills.test.js` from `game/` — Eagle Shot simulation and symmetry tests pass.

## Commit Message
```text
fix(skills): mirror Eagle Shot paths by attack direction

Plan: 2026-10-26-football-skill-fixes
Phase: P01-skill-gameplay-and-vfx
Task: T04-symmetric-eagle-shot

- Reflect away Eagle Shot targets and paths around field center
- Cover paired projectile positions and heights at equal flight progress
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: recorded in Git history
