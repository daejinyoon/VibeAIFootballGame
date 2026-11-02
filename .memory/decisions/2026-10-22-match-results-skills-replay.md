# Decisions: Arcade Match Results, Skills, and Stage Replay

- Date: 2026-10-22
- Status: Confirmed
- Scope: Repair and extend the existing local React/Three.js arcade football campaign. Online multiplayer is out of scope.
- References: User screenshots `image-1.png` (match at 00:00 without a result transition) and `image-2.png` (neon skill cards).

## D01. Match end and result screen
- **Chosen**: When a terminal match event occurs, immediately leave the live match and show a clear arcade result screen with win, loss, or draw, final score, and the available next actions. A win proceeds to the skill reward draft; a draw follows the existing retry flow.
- **Rationale**: The supplied match screenshot shows 00:00 while the match remains on screen, and the user explicitly reports that the end screen is missing.
- **Existing behavior**: `ResultsScreen` and terminal event handling already exist in `App.jsx`; investigate and fix the runtime handoff rather than replacing the result system without need.

## D02. A, jump, and aerial contests
- **Chosen**: Keep `A` as lob pass/clearance while in possession and `Space` as the manual jump key. For an eligible descending aerial ball, only the nearest reachable AI field player auto-jumps; goalkeepers do not.
- **Rationale**: This preserves the previously confirmed controls and confines aerial contests to the closest player. The user reports that pressing A currently appears to make players jump indiscriminately, so verify and correct the actual runtime behavior.

## D03. Shot assistance
- **Chosen**: Use strong automatic goal-mouth correction at close range and reduce it quickly as shot distance increases. Keep goalkeeper saves and defender blocks active.
- **Rationale**: The user says scoring is too difficult and earlier specified stronger close-range scoring odds. This is the recommended interview answer, adopted as an assumption because no different preference was supplied.

## D04. Pass reception
- **Chosen**: Update the pass target using the receiver's movement and give the intended receiver a reliable first-touch collection when the ball reaches the target. Preserve interception when a defender crosses the actual pass path.
- **Rationale**: The current ground pass targets the receiver's launch-time coordinate and pickup radius is small, so a moving receiver can leave the stopped ball behind. This is the recommended interview answer, adopted as an assumption because no different preference was supplied.

## D05. Match timer
- **Chosen**: Start the existing 60-second regulation timer on the first actual kick from the opening kickoff. It does not count down while the kickoff taker is positioning or carrying the untouched center ball. Continue counting after the ball is kicked except during the existing pause state.
- **Rationale**: The user explicitly wants the timer to begin at the initial kickoff rather than when the game scene loads. The existing 30-second golden goal and draw/retry rules remain.

## D06. Skill reward cards and assignment
- **Chosen**: After every win, including replay wins, present the existing three-card skill offer. Choose one card, then assign it to a field player or leave it in inventory. Same-skill duplicates stack on that player up to three copies and increase only that player's uses per match.
- **Rationale**: This follows the established campaign rules and the user's clarification that a replayed Stage 1 can award a skill to use in another Stage 1 replay.

## D07. Skill card presentation and artwork
- **Chosen**: Use the attached neon skill-card reference as the selection-screen direction and create a distinct original arcade illustration for each skill, tied to its name and effect. Keep text, card identity, and selection/assignment interactions accessible.
- **Rationale**: User selected custom skill-specific illustrations over generic/vector-only icons or shared emoji icons.
- **Skills**: Eagle Shot, Tornado Shot, Power Tackle, Eulryongta, Vacuum Cleaner, and Rainbow Reflect.

## D08. Stage selection and replay progression
- **Chosen**: Both new campaigns and saved campaigns open a stage selection map. New campaigns begin with Stage 1 available; saved games indicate the current stage and allow selection among unlocked stages, including already-cleared stages.
- **Replay progression**: Winning a replay replaces that stage's prior result and proceeds to the next stage. Previously unlocked later stages remain unlocked and selectable. Each replay win offers a new skill reward.
- **Rationale**: The user wants to resume from a selected stage and replay Stage 1 after clearing it, including earning skills for further runs.

## D09. Skill-use effects
- **Chosen**: Give every skill a visible, skill-specific 3D arcade effect and preserve clear gameplay visibility.
- **Examples**: Eagle Shot uses a fiery eagle/trail; Tornado Shot a spinning wind trail; Power Tackle an energized charge and contact burst; Eulryongta a dragon/shockwave impact; Vacuum Cleaner a suction spiral drawing the ball; Rainbow Reflect a rainbow guard/return arc.
- **Rationale**: The user explicitly requested effects that match each skill name.

## D10. Validation and out-of-scope observations
- **Chosen**: Verify match-end transition in a real browser, control behavior, shot assistance and pass reception in game-state tests, timer kickoff timing, stage progression/replay/rewards, card rendering, and each skill effect in the 3D scene.
- **Existing baseline**: A results screen, generic skill-offer screen, five-stage campaign progression, and 2D canvas skill-effect code already exist. The selection artwork is generic rather than skill-specific, stage selection is missing, and skill effects are not yet rendered distinctly in the 3D match scene.
- **Non-goal**: Do not add online play or authentication as part of this task.
