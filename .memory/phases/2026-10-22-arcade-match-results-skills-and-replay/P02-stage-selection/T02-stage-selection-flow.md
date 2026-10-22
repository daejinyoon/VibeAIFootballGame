# Task: T02 Stage Selection Flow

## Status: done

## Goal
Show a stage-selection map after starting a new campaign and when continuing a saved campaign, let the player launch any unlocked stage including cleared stages, and keep local save/reward/loadout flows intact.

## Decision Summary
- New and saved campaigns both route to the stage map; Stage 1 is the only initially unlocked stage.
- A save derives the available stages from currentStage and clearedStageResults; all earlier cleared stages and the next current stage are selectable.
- Selecting a stage makes it the current stage for the next match. A win proceeds to its next stage; previously unlocked higher stages remain available.
- Skill rewards are handled before returning to the map. Loadout can be opened from the map and returns to the map before launch.

## Implementation

### I01. Stage selection view
- Related Files:
  - game/src/components/StageSelectScreen.jsx :: new StageSelectScreen component
  - game/src/styles.css :: stage map/card layout and responsive states; modify
  - game/src/game/campaign.js :: getUnlockedStage; read-only from T01
- Component contract:
  - Props: campaign, stageResults, selectedStage, onSelectStage(stage:number), onStartStage(), onOpenLoadout(), onHome().
  - Render five stage cards for integer stages 1..STAGE_COUNT. A stage is selectable iff stage <= getUnlockedStage(campaign); later stages show a locked state and are disabled.
  - Show selected/current stage, clear status and prior result score for each cleared stage. Distinguish current continuation stage from replayable cleared stages.
  - Start button launches selectedStage. Team setup opens existing LoadoutScreen and returns to this map on confirmation.
  - Use semantic buttons, visible focus state, and responsive arcade presentation consistent with StartScreen and ResultsScreen.

### I02. App navigation and save progression
- Related Files:
  - game/src/App.jsx :: screen state, startNewCampaign, continueSavedCampaign, startStage, keepSkill, assignSkill, LoadoutScreen/StageSelectScreen routing; modify
  - game/src/components/StartScreen.jsx :: new campaign and continue callbacks; modify only if labels need to identify map routing
  - game/src/storage/localProfile.js :: createCampaignSave; read-only unless stage selection reveals a required persisted field
  - game/src/App.test.jsx or game/src/appFlow.test.js :: new pure flow helper tests only if an extracted navigation helper is needed
- State and flow:
  - Add screen value stageSelect and selectedStage: integer 1..5.
  - startNewCampaign creates a fresh campaign, clears prior save after confirmation, selects Stage 1, and opens stageSelect instead of starting the match immediately.
  - continueSavedCampaign restores the saved campaign. If pendingSkillOffer or pendingSkillAssignment exists, resume that reward/assignment screen first; otherwise select saved.currentStage and show stageSelect.
  - Stage card selection updates selectedStage. Start action writes campaign.currentStage = selectedStage and calls startStage with that campaign. startStage remains the only match constructor and creates state from the chosen campaign stage and skill stacks.
  - After reward assignment/keep or LoadoutScreen confirmation, route to stageSelect rather than automatically starting the next match. The map's start button launches the selected stage.
  - Save currentStage and results through createCampaignSave. Keep unlocked stages derived from campaign result state; no duplicate or lossy save field.
- Error handling: Invalid/locked selections are rejected and leave the player on the map with no state mutation. Resume without a save remains a no-op.

## Acceptance Criteria
- [x] New campaign opens a map with Stage 1 available and Stages 2-5 locked.
- [x] Continue opens a map with the saved stage selected and all unlocked/cleared stages replayable.
- [x] Selecting a cleared stage launches that stage and preserves inventory/loadout.
- [x] Winning a replay returns through result/reward and map; later unlocked stages stay selectable.
- [x] Pending reward/assignment state resumes before stage selection, without losing the selected campaign or duplicated cards.
- [x] Map works on narrow screens and with keyboard focus.

## Validation
- From game/: node --test src/game/campaign.test.js src/storage/localProfile.test.js
- From game/: npm run build
- Browser QA: new save, continue at Stage 3, choose Stage 1, clear it, claim/assign reward, and confirm Stage 2 becomes current while Stage 3 remains selectable.

## Commit Message
```text
feat(game): add campaign stage selection map

Plan: 2026-10-22-arcade-match-results-skills-and-replay
Phase: P02-stage-selection
Task: T02-stage-selection-flow

- Route new and saved campaigns through unlocked stage selection.
- Allow cleared-stage replay and preserve campaign rewards/loadout.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: `feat(game): add campaign stage selection map` (Plan: 2026-10-22-arcade-match-results-skills-and-replay)

## Execution Notes
- Added `StageSelectScreen` with five semantic stage buttons, prior scores, continuation/replay labels, locked states, team setup, home navigation, and a launch action. The layout adapts to two columns on narrow screens and gives keyboard focus a visible outline.
- New campaigns now open Stage 1 on the map. Continue restores the saved current stage and returns to the map unless a reward offer or assignment is pending, in which case that reward flow resumes first.
- Choosing a stage changes only the selection. Launch validates the unlock limit, sets `currentStage`, reactivates completed campaigns for replay, persists the campaign, and calls the existing match constructor. Loadout confirmation and post-reward assignment return to the map; a win preselects the next stage.
- Validation passed: campaign and local-profile tests (22/22), production build, and browser flow covering a fresh campaign, saved Stage 3 continuation, Stage 1 replay, live match win, reward assignment, updated Stage 2 selection with Stage 3 still selectable, pending reward resume, mobile layout, and keyboard focus. Browser reported no page errors.
- Build retains the existing Three.js chunk-size warning (>500 kB).
