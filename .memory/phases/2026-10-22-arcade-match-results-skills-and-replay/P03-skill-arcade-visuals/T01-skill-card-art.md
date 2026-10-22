# Task: T01 Skill Card Art

## Status: done

## Goal
Replace category-level emoji skill icons with six distinct original arcade illustrations, and use the same named artwork in reward selection, selected-card assignment, and skill inventory.

## Decision Summary
- Use original art for all six SKILL_IDS, guided by the attached neon card reference while keeping the overall arcade palette vivid and readable.
- Artwork is icon art inside an HTML/CSS skill card frame; do not bake card text or UI borders into the image.
- Keep the existing three-offer choice, inventory count, assignment, and stacking behavior.

## Implementation

### I01. Generate and package skill illustrations
- Related Files:
  - game/public/images/skills/eagle-shot.png :: new transparent square image for Eagle Shot
  - game/public/images/skills/tornado-shot.png :: new transparent square image for Tornado Shot
  - game/public/images/skills/power-tackle.png :: new transparent square image for Power Tackle
  - game/public/images/skills/eulryongta.png :: new transparent square image for Eulryongta
  - game/public/images/skills/vacuum-cleaner.png :: new transparent square image for Vacuum Cleaner
  - game/public/images/skills/rainbow-reflect.png :: new transparent square image for Rainbow Reflect
- Asset contract:
  - Six 512x512 transparent PNGs, consistent illustrated arcade-game style, no words/letters/logos, centered readable silhouette, bright highlights with a subtle violet/neon edge echoing the supplied cards.
  - Each illustration depicts its own skill: eagle-shaped flaming shot; spiral tornado ball; charged tackle gauntlet/boot; dragon shockwave impact; suction vortex pulling a football; rainbow shield returning a shot.
- Use the image-generation tool for these original bitmap assets. Do not use emoji or a single image shared by all six skills.

### I02. Skill-to-art mapping and card rendering
- Related Files:
  - game/src/game/skills.js :: SKILLS entries; add artwork path per skill without changing skill IDs, type, description, or gameplay semantics
  - game/src/components/SkillRewardScreen.jsx :: reward and selected-reward card; replace category-only icon with skill-specific image
  - game/src/components/LoadoutScreen.jsx :: inventory card imagery; modify
  - game/src/styles.css :: reward-card-icon, selected-reward-card, inventory-gem and responsive image sizing; modify
  - game/src/game/skills.test.js :: skill metadata invariants; modify/add
- Data contract:
  - Each SKILLS[skillId] keeps name:string, type:'attack'|'defense'|'utility', description:string, and adds artwork:string URL matching one of the six assets.
  - Use an informative alt label derived from the skill name; decorative duplicate instances use empty alt text when the card name is adjacent.
- Preserve three-card selection, keyboard focus, player assignment, count, and card text. Images must not replace accessible skill names/descriptions.

## Acceptance Criteria
- [x] All six skill IDs map to a distinct existing artwork asset.
- [x] Reward offer cards, selected reward, and loadout inventory show the matching illustration.
- [x] Skill name, description, category, inventory count, selection and focus remain readable and operable.
- [x] Art is legible in desktop and narrow layouts and does not cause a large initial-game JS bundle increase (assets load as public images).

## Validation
- From game/: node --test src/game/skills.test.js
- From game/: npm run build
- Browser QA: inspect all six card artworks, selection/assignment states, and a narrow viewport.

## Commit Message
```text
feat(game): add illustrated arcade skill cards

Plan: 2026-10-22-arcade-match-results-skills-and-replay
Phase: P03-skill-arcade-visuals
Task: T01-skill-card-art

- Add original artwork for all six named skills.
- Reuse skill art in reward and inventory card screens.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: `453ccb6`

## Execution Notes
- Added six distinct 512x512 transparent skill illustrations under `game/public/images/skills/`; corrected the ball silhouettes to classic round association-football balls.
- Added the artwork URL to each existing `SKILLS` entry and rendered it in reward, selected-reward, and inventory cards without changing skill IDs or gameplay behavior.
- `node --test src/game/skills.test.js`: passed (14/14). `npm run build`: passed; Vite reports the existing large Three.js chunk warning (>500 kB).
- Browser QA confirmed all six images load at 512px, selection/assignment and skill labels remain present, and the reward and loadout layouts fit a 390px viewport without horizontal overflow. No browser errors.
