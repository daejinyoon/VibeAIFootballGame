# Task: T01 Skill Preview Activation

## Status: done

## Goal
Make every `?skillPreview=<skillId>` URL start with a successful, visible activation of that skill, including the nearby target or transferable status required by its gameplay rules.

## Decision Summary
- Keep previews isolated behind `campaign.isSkillPreview`; ordinary campaigns and matches retain their normal kickoff state.
- Do not weaken skill validation to make a preview work. Construct a legal preview state before calling `applySkill`.

## Implementation

### I01. Preview-state setup
- Related Files:
  - `game/src/App.jsx` :: `makeMatchState`, `createSkillPreviewCampaign`; modify
  - `game/src/game/skills.js` :: `applySkill`; read-only, legality contract
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState`; read-only, initial player and ball fields

#### Details
- **Signatures & Types**:
  ```js
  function makeMatchState(campaign, teamCustomization): GameState
  function createSkillPreviewCampaign(skillId: string): Campaign | null
  applySkill(state: GameState, input: {
    team: 'home', sourcePlayerId: string, skillId: SkillId, level: number
  }): { ok: boolean, reason: string | null, events: SkillEvent[] }
  ```
- **Data & Schema Fields**:
  - Preview query: `window.location.search` parameter `skillPreview`; valid IDs come from `SKILL_IDS`.
  - Read existing fields only: `players[].x/y/facingX/facingY/stunnedSeconds/statusDurationSeconds`, `ball.x/y/ownerId/flightKind`, `possessionTeam`, and `lastSkillCasterByTeam.away`.
- **Execution Flow / Logic**:
  1. Preserve the existing `createSkillPreviewCampaign` validation and preview-only branch.
  2. Keep home forward as caster and orient it toward the away goal before activation.
  3. For Eagle Shot and Tornado Shot, retain the caster as ball owner with home possession.
  4. For World Split, use the ordinary legal caster state and orient toward a clear field lane.
  5. For Eulryongta, move one active away field player into the caster's forward arc within `findEulryongtaTargets`' 140-unit range; keep the other players outside the demonstration lane.
  6. For Vacuum Cleaner, place the unowned ordinary ball at a visible open-field point separated from the caster; clear `ownerId` and `possessionTeam` before activation.
  7. For Rainbow Reflect, put a transferable `stunned` state and finite duration on the controlled player and record an active away field player in `lastSkillCasterByTeam.away`.
  8. Call `applySkill` once after preconditions are ready and inspect `{ ok, reason }` while manually validating each route; correct its setup if activation is rejected.
  9. Do not change ordinary ball/reset, cooldown, status-transfer, kickoff, or score rules.
- **Error & Exception Handling**: Invalid skill IDs continue to load the normal start screen. Do not bypass gameplay validation for missing targets/status; fix preview setup until each valid route activates successfully.
- **State Transition & Return**: Return the fully initialized preview `GameState`; other campaigns have no preview-only marker and keep the prior state shape.

### I02. Validation
- Related Files:
  - `game/src/App.jsx` :: preview branch in `makeMatchState`; validate through direct URLs
- Manually open all six `SKILL_IDS` previews; confirm each activation is legal and visibly underway. Open `/` and a normal match to verify preview setup does not leak.

## Acceptance Criteria
- [x] Every valid skill preview URL activates its requested skill on initial match state.
- [x] Eulryongta and Rainbow Reflect have valid target/status preconditions; Vacuum starts with a visible unowned ball.
- [x] Invalid preview IDs and ordinary campaign starts retain their existing navigation and game behavior.

## Validation
- `cd game; npm run build` — preview state compiles.
- Manual: open all six `?skillPreview=<skillId>` routes and the normal `/` route.

## Commit Message
```text
fix(preview): activate every skill preview legally

Plan: 2026-10-23-remaining-skill-3d-vfx
Phase: P01-remaining-skill-effects
Task: T01-skill-preview-activation

- Prepare legal target, ball, and status state for each skill preview
- Validate legal activation preconditions on every supported preview route
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm run build`; six preview routes return HTTP 200; all six `applySkill` preconditions return `ok`)
- commit: recorded in Git history after validation
