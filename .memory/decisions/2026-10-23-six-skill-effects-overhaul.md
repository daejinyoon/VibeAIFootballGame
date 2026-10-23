# Decisions: Six Skill Effects Overhaul

- Date: 2026-10-23
- Status: Confirmed

## D01. Scope
- **Chosen**: Review gameplay mechanics and presentation for all six existing skills: Eagle Shot, Tornado Shot, Power Tackle, Eulryongta, Vacuum Cleaner, and Rainbow Reflect. Add distinct sound effects for each skill.
- **Rationale**: The user wants the skill set to feel more expressive both visually and in play.

## D02. Eagle Shot
- **Chosen**: On activation, the ball rises vertically, transforms into a stylized glowing energy eagle, then flies toward goal while the normal gameplay camera stays in place. It stays high over most of the field and makes a steep downward dive into the goal on its final approach, rather than cruising horizontally at a fixed height. The ball and transformation effect receive stronger visual emphasis without a camera cut.
- **Chosen**: Fire one eagle at level 1, two at level 2, and three at level 3. Fire them in quick succession and fan them across different goal angles. Award one point per eagle that enters the goal; resolve the volley as one scoring play and perform one kickoff afterward.
- **Chosen**: Goalkeepers cannot block Eagle Shot. World Split collision uses the projectile's actual height and trajectory, so an eagle may clear the wall if it is high enough.
- **Chosen**: After scoring, the ball shown for the next restart returns to its ordinary soccer-ball appearance.
- **Rationale**: The rising transformation and multiple angled eagles make the skill's level and scoring effect visible.

## D03. Tornado Shot
- **Chosen**: A visible tornado forms around the shot ball, follows its path toward goal, and leaves a moving wind path. Only players touched by the tornado are lifted; the user is excluded, while teammates, opponents, and goalkeepers can be affected.
- **Chosen**: Airborne duration is fixed at 5 seconds at every skill level. The wind path starts about two player-widths wide at level 1, then grows by about 25% at level 2 and 50% at level 3 relative to level 1.
- **Chosen**: A low, direct Tornado Shot can be stopped by World Split when their paths intersect.
- **Rationale**: Contact with a visible moving tornado explains who is affected and makes the skill readable.

## D04. Power Tackle renamed to World Split
- **Chosen**: Display the skill as “세계의 분리” (World Split). Update both its skill-card artwork and in-match 3D effect. Use the supplied fractured-earth barrier as visual reference: jagged rocks rise along a ground fissure with a blue-violet dimensional glow.
- **Chosen**: The user performs a short real forward slide. The fissure and impassable jagged barrier rise sequentially along the slide path. The barrier lasts 3 seconds at all levels. Its game-space length is 220 at level 1, about 275 at level 2, and about 330 at level 3.
- **Chosen**: The barrier blocks player movement, passes, ordinary shots, and skill shots when their actual trajectory intersects its physical height. A high descending Eagle Shot can pass over it when its height clears the wall; a low direct shot is blocked. Characters struck by the wall are launched; only the skill user is excluded, and either team’s players and goalkeepers can be struck.
- **Rationale**: The user wants the terrain itself to form from the sliding path and behave as a real obstacle.

## D05. Eulryongta
- **Chosen**: Nearby eligible targets perform a fall/knockdown motion. Apply the effect to 1, 2, or 3 targets at levels 1, 2, or 3; each remains down for 10 seconds at every level.
- **Existing target rule**: Use the current nearest-target rule: opponents in front within the existing 140-unit range; this includes the opposing goalkeeper.
- **Chosen**: Show a dizzy, rotating-stars effect above a knocked-down target for the full 10 seconds, then remove it as the target recovers. Keep the supplied soccer-photo cut-in and add a slap-like hit sound.
- **Rationale**: The fall plus sustained dizzy indicator makes the stun and its duration clear.

## D06. Vacuum Cleaner
- **Chosen**: Keep the instant full-field ball pull and defer level upgrades. Show a swirling wind path between the ball and the user as the ball rapidly travels along the ground. The pull ignores World Split barriers.
- **Rationale**: The user previously deferred its upgrade design and chose a clear suction trail for this pass.

## D07. Rainbow Reflect
- **Chosen**: Keep it automatic and global. When an opposing skill is used, reflect it back toward its original source regardless of player position. Redirect shots toward the opposing goal, return status effects to their caster, and reverse terrain effects toward the opposing side.
- **Chosen**: At the reflected skill's location, show a brief rainbow shield and the returning effect. Add a distinct reflection sound.
- **Rationale**: This matches the user's description of reversing opponent skills and terrain effects.

## D08. Skill reward filtering
- **Chosen**: Skills that cannot gain another level must not appear in later skill reward choices.
- **Code finding**: This behavior already exists in `isSkillRewardEligible` and `createSkillCardOffer`; tests cover max-level and non-upgradeable skills. Keep the behavior and regression coverage.
- **Rationale**: Reward choices should remain usable.

## D09. Audio
- **Chosen**: Add a distinct sound effect for each skill: eagle flight, tornado wind, ground split/rock impact, Eulryongta slap, suction, and rainbow reflection.
- **Rationale**: Skill identity should be recognizable through sound as well as visuals.
