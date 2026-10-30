# Decisions: Goal Celebrations

- Date: 2026-10-30
- Status: Confirmed

## D01. Initial celebration roster
- **Chosen**: Include at least five ceremonies: `SIUUU`, `문워크`, `L을 가져가`, `슬릭백`, and a team `RKO` sequence.
- **Rationale**: The user requested several distinctive options, including the named dances and a coordinated team move.

## D02. Celebration selection modes
- **Chosen**: Let the user choose either a specific ceremony or random selection. Random mode chooses one ceremony at match start and keeps that choice for the match. New or migrated profiles default to random.
- **Rationale**: This supports both predictable and varied celebrations without changing the choice mid-match.

## D03. Settings location and persistence
- **Chosen**: Put celebration settings in `TeamCustomizationScreen` alongside kit customization and persist them in the user's profile.
- **Rationale**: The user wanted the choice easy to find with team presentation settings and retained between sessions.

## D04. Initial game mode scope
- **Chosen**: Implement celebrations for campaign matches first; defer PvP.
- **Rationale**: The user selected campaign as the first supported mode.

## D05. Participants and coordinated celebration
- **Chosen**: The scoring team's three field players celebrate together; goalkeepers do not participate. For `RKO`, assign the three field players distinct random roles each time: player A receives the move, player B strikes A in the abdomen, A bends forward holding their stomach and lowers their head, then player C performs the RKO on A.
- **Rationale**: The user specified this exact three-player sequence and clarified the role order.

## D06. Celebration duration and match clock
- **Chosen**: Each celebration lasts 3 seconds while match time continues to advance.
- **Rationale**: The user explicitly chose three seconds and asked for the match clock to keep running.

## D07. Overtime goal flow
- **Chosen**: If a goal ends overtime, play the 3-second celebration before showing the result screen.
- **Rationale**: The user chose to preserve the celebration before the match result.

## D08. Multi-goal Eagle Shot
- **Chosen**: After one Eagle Shot volley scores multiple goals, play the celebration once after the volley finishes, then continue the match flow.
- **Rationale**: The user selected one celebration for the single skill activation rather than repeating it for every goal.

## Existing code constraints and findings
- `scoreGoal` in `game/src/game/stepGame.js` currently sets `phaseSeconds` to 1 and emits goal events without a scorer ID; overtime goals immediately finish the match.
- Eagle Shot can emit multiple goal events during one volley (up to three), while its volley resolves.
- `GameLoop3D.jsx` currently handles goal events for crowd audio; `MiiPlayerModel.jsx` already has procedural pose animation support.
- Profile data is version 7 and is normalized/migrated in `localProfile.js`; profile persistence supports browser storage and cloud sync.
- `TeamCustomizationScreen` already stores kit customization, so it is the selected place to expose ceremony settings.

## Out of scope
- PvP celebration support is deferred.
- The user will define any additional original ceremonies later; no extra ceremony names or motions are assumed here.

## D09. Ceremony audio
- **Chosen**: Use user-supplied audio for local play only; do not deploy or redistribute the clips. Moonwalk is silent. The RKO file contains both the slam and commentary:
  - `SIUUU`: the genuine `SIUUU` shout.
  - `슬릭백`: the supplied Slickback track.
  - `L을 가져가`: the supplied Take the L audio.
  - `RKO`: one supplied clip with the slam effect and WWE commentary shouting `RKO!`.
- **Rationale**: The user wants recognizable local audio for personal play and supplies the clips.
