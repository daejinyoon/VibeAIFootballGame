# Decisions: Remaining Skill 3D VFX

- Date: 2026-10-23
- Status: Confirmed

## D01. Scope
- **Chosen**: Upgrade all five skills other than Eagle Shot with a dedicated 3D subject and distinctive motion: Tornado Shot, World Split, Eulryongta, Vacuum Cleaner, and Rainbow Reflect.
- **Rationale**: The user approved the recommended approach for every remaining skill, so the match makes each skill's identity immediately readable like the Eagle Shot model.

## D02. Visual treatment
- **Chosen**: Give each skill a recognizable 3D form, its own animation, and supporting light, particles, or trail where useful. Reuse procedural Three.js geometry and existing scene/rendering patterns where they fit.
- **Rationale**: The user wants similarly expressive, visible skill effects rather than effects represented only by a HUD/cut-in or a faint generic glow.

## D03. Preserve established gameplay decisions
- **Chosen**: Keep the existing simulation and visual rules: Tornado Shot visibly wraps and follows the ball; World Split makes a long fissure and impassable flanking walls aligned with the slide; Eulryongta knocks targets down with dizzy stars for its full duration; Vacuum Cleaner visibly pulls the ball along the ground; Rainbow Reflect visibly clears and transfers the status effect to the last opposing caster.
- **Rationale**: These behaviors were already confirmed and must not change as part of a visual upgrade.

## D04. Simulation and camera boundaries
- **Chosen**: Drive object positions and lifetimes from live game state; visuals do not decide hits, movement, score, or status. Keep the existing gameplay camera framing and avoid camera cuts.
- **Rationale**: Skill effects must stay aligned with gameplay while remaining presentation-only.

## D05. Preview behavior
- **Chosen**: Keep direct per-skill preview URLs and make each preview initialize the setup required for that skill to visibly activate, including a valid nearby target or status when its rules require one.
- **Rationale**: The user wants to see the changed skill immediately in a playable match preview.

## D06. Scope boundary
- **Chosen**: Focus this task on in-match 3D skill visuals and their preview setup. Do not redesign skill mechanics, loadout behavior, HUD, or card art unless an existing visual asset is required for the in-match effect.
- **Rationale**: The request is to bring the remaining skills' visible effects up to the Eagle Shot's level.
