# Decisions: 3D Arcade Football Match Polish

- Date: 2026-10-22
- Status: Confirmed

## D01. Scope and play mode
- **Chosen**: Polish the existing React 3D 4v4 football arcade campaign for local play. Keep local nickname/profile behavior for this work; defer Azure Entra ID authentication and online play.
- **Rationale**: The user wants to play the local game now and selected keeping the existing local nickname flow while redesigning its presentation.

## D02. Three-zone camera framing
- **Chosen**: Treat the pitch as left-half, central-midfield, and right-half camera zones. At kickoff, frame the central zone. During play, choose the zone from the ball's physical position, independent of team possession. In an outer zone, frame the entire corresponding half, including its goal, halfway line, and sidelines. Switch zones only after the ball passes a small buffer beyond the halfway boundary, and transition smoothly.
- **Rationale**: The user wants the currently active half enlarged while maintaining enough context to play, with kickoff framed around the center circle.

## D03. Opponent defensive AI
- **Chosen**: Keep one opponent as the presser until possession changes, or the presser is knocked down or can no longer reach the carrier. The other defenders keep their assigned attackers and passing lanes, adjusting only for a dangerous run.
- **Rationale**: The user wants coordinated defending without players indecisively changing roles or crowding the ball.

## D04. Home teammate attacking AI
- **Chosen**: The nearer off-ball teammate offers a short passing option; the farther teammate makes a forward run behind the defense. Keep their lanes distinct and retain their existing defensive, midfield, and forward roles. The controlled player remains directly controlled by the user.
- **Rationale**: The user wants useful passing options and penetration runs rather than all teammates clustering around the ball or advancing together.

## D05. Arcade visual direction
- **Chosen**: Apply a consistent, bright and refreshing comic-action arcade style to the start screen, in-match HUD, results, rewards, and loadout screens. Use vivid sky-blue and mint foundations with energetic comic impact treatment. Create original football-themed poster art for the start screen rather than using the supplied reference image as page artwork.
- **Rationale**: The user selected the supplied image as a style reference, wanted the look carried across the experience, and preferred bright colors with original game art.

## D06. Local start screen
- **Chosen**: Keep the local nickname/profile start flow and redesign it as part of the arcade presentation. Do not add Entra ID login in this task.
- **Rationale**: The user selected local play for this iteration and deferred Entra ID to separate work.

## D07. Match result and campaign reward flow
- **Chosen**: When a match ends, show a clear result screen with stage, score, and win/loss/draw outcome. A stage win must be shown before rewards. The player then claims a skill reward, chooses one of the offered cards, assigns it to a field player, and proceeds through loadout to the next stage. Losses and draws show their result and allow retry of the same stage without a clear reward.
- **Rationale**: The user explicitly wants to see the victory result first and receive the skill reward afterward; stage rewards are for cleared stages.

## D08. Kickoff circle restriction
- **Chosen**: At the opening kickoff and every post-goal kickoff, only the kicker may occupy the center circle until the ball is kicked. This restriction applies to both teams. Once kicked, players may enter freely.
- **Rationale**: The user wants a sole kicker in the circle and no other player, teammate or opponent, inside before the restart.

## Codebase findings to address during planning
- The existing start screen collects a local nickname; it is not an authentication login.
- The app already contains result, skill-reward, and loadout screens with a win-to-reward-to-next-stage flow. The user reports that this flow is not appearing during play, so implementation must trace and fix the end-event/UI transition rather than assume those screens need to be invented.
- The current camera follows the ball with a small pan but keeps a fixed camera distance.
- The defensive presser and cover assignments are recalculated during simulation updates, which can produce role switching.
