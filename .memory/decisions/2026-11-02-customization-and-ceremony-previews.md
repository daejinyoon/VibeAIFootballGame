# Decisions: Uniform and Goal Ceremony Previews and Match Fixes

- Date: 2026-11-02
- Status: Confirmed

## D01. Match uniform consistency
- **Chosen**: Match players use the same selected team kit colors and logo shown by team customization. Verify and repair the existing path as needed.
- **Rationale**: The player should visibly wear the user's saved selection in matches.

## D02. Ceremony preview presentation
- **Chosen**: Add a silent, looping 3D preview below the ceremony choices. Use the same Mii player models, selected home kit, and logo as a match. Use three players for RKO.
- **Rationale**: A moving preview makes each celebration understandable before the user selects or saves it.

## D03. Preview behavior by selection mode
- **Chosen**: When a specific ceremony is selected, loop that ceremony. When Random is selected, rotate through every supported ceremony for five seconds each. Keep the preview silent.
- **Rationale**: Random mode has no single ceremony to preview, so a rotating sample shows the full available set.

## D04. Match celebration camera composition
- **Chosen**: Use a slightly off-axis three-quarter view from the scoring team's front. Keep the angle low and frame all participants head-to-toe, including their feet.
- **Rationale**: The existing near-frontal view makes the choreography difficult to distinguish; a slight angle should reveal limb and foot motion while preserving the scoring team's front view.

## D05. Freeze players until kickoff
- **Chosen**: Keep all players stationary in their kickoff formation until a kickoff is actually played, for the opening kickoff and every post-goal kickoff. A home kickoff starts when the user presses S; an away kickoff starts when the AI takes its automatic kick. Release the freeze and the half-line restriction when the ball has been kicked and moves clear.
- **Rationale**: Players should not drift before kickoff, while the AI must still be able to restart play when it has the kickoff.

## D06. Keep ceremonies enabled for later goals
- **Chosen**: Preserve the match's selected ceremony ID when rebuilding match state for a kickoff, so later goals in the same match continue to show the ceremony.
- **Rationale**: The current kickoff reset recreates state without passing `goalCelebrationId`, which clears the selection after the first goal.

## D07. Remove Moonwalk
- **Chosen**: Remove Moonwalk from the active ceremony picker, choreography, and supported in-game ceremony set. Convert an existing Moonwalk profile selection to Random automatically. Keep the profile API tolerant of the legacy Moonwalk ID so older clients or saved profile data do not produce cloud-save errors; the client normalizes it to Random on load and writes the normalized setting on the next save.
- **Rationale**: The user decided to remove Moonwalk because no audio was supplied. Existing profiles should remain usable after the option is removed.

## Existing Code Constraints and Findings
- `TeamCustomizationScreen` currently draws its kit preview with CSS shapes. Match players use `FootballPlayer3D` and `getPlayerKit`, which read the saved `teamBranding` palette and logo; the 3D preview should reuse the match model and kit path.
- `MiiPlayerModel` already reads `goalCelebration` from a game-state reference and uses the shared ceremony pose functions. The preview can drive a local presentation-only state without advancing match simulation.
- Random match selection is already defined to choose one ceremony at match start and retain that choice for the whole match. This task changes only how the Random option's preview is displayed.
- `createCampaignMatchState` chooses the ceremony once. `resetForKickoff` currently creates fresh state without forwarding `goalCelebrationId`, causing later goals to lose their ceremony.
- `releaseKickoffLockIfBallCleared` currently also releases the lock when the taker carries the ball a short distance. The local step loop continues AI movement while the lock is active. The kickoff update must keep players stationary until a user or AI kickoff action is taken.
- Moonwalk is still present in `GOAL_CELEBRATION_IDS`, the options, animation code, and tests, while `matchAudio.js` has no Moonwalk audio path. The local audio test already expects Moonwalk playback to return `false`.
- Profile schema v8 persists ceremony preferences. Client normalization maps unsupported specific IDs to the default Random setting; the API currently accepts Moonwalk in its supported-ID set.

## Out of Scope / Existing Issues to Report
- Keep the existing four supplied celebration audio clips and the previously confirmed one-random-ceremony-per-match behavior unchanged.
- PvP celebrations remain deferred as previously decided.
- The last full game test run had two unrelated failing tests in Eulryongta possession handling and knockdown recovery. Re-run the task-specific tests and report whether those failures remain; do not fix them unless they block this task.
