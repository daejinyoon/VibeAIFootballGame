# Decisions: Football Tactics and Skill Flow

- Date: 2026-10-26
- Status: Confirmed

## D01. World Split wall visibility
- **Chosen**: Raise the barrier height from 72 to 90 field units.
- **Rationale**: Make the rocks and barrier visible while keeping players visible behind them.

## D02. World Split slide and barrier length
- **Chosen**: Set the skill's forward slide distance and barrier length to about 90 field units, with barrier length increasing modestly at higher campaign stages. Keep ordinary tackle contact range unchanged.
- **Rationale**: The wall should be about one and a half player heights long without making the skill reach excessively far; higher campaign stages can retain a gradual progression.

## D03. Eulryongta hit-ball behavior
- **Chosen**: If the knocked-down player owns the ball, drop it at that player's position as a loose ball so teammates can recover it.
- **Rationale**: The skill should disrupt possession instead of leaving the ball attached to an incapacitated player.

## D04. Eulryongta home-player selection
- **Chosen**: On a hit to the currently controlled home player, automatically control the nearest eligible field player to the ball, regardless of whether the home team is attacking or defending. Exclude the goalkeeper and incapacitated or recovering players.
- **Rationale**: Keep play controllable immediately after the hit and use one consistent selection rule in both possession states.

## D05. Base formations and passing options
- **Chosen**: Use dynamic triangular positioning in attack, defense, and opponent goal-kick situations. During home attacks, place a nearby link player and a forward support player on distinct diagonal lanes around the ball carrier.
- **Rationale**: The triangle is intended to give the ball carrier two meaningfully different passing options. The formation should move with play rather than remain rigid.

## D06. Skill reward auto-equip
- **Chosen**: Automatically equip a newly acquired skill in the next free slot when fewer than three skills are equipped. If all three slots are occupied, open the existing team loadout screen so the player can choose a replacement. A duplicate reward that only upgrades an already owned skill does not change the loadout automatically.
- **Rationale**: Reduce setup work for an available slot while preserving player choice when a replacement is necessary; upgrades should not unexpectedly change the lineup.

## D07. Goalkeeper skill use
- **Chosen**: Allow both home and opponent goalkeepers to use all team skills, subject to each skill's ordinary activation requirements, such as possession requirements.
- **Rationale**: Goalkeepers should share the team's skill access while retaining each skill's established rules.

## Code facts and implementation notes
- `WORLD_SPLIT_HEIGHT` is currently 72. World Split slide travel currently derives from speed 360 and duration 0.95 seconds (about 342 units); `WORLD_SPLIT_LENGTHS` is currently `[400, 500, 600]`, selected by skill level rather than campaign stage. The confirmed behavior should make barrier length depend on `state.stage`, with a modest increase from the 90-unit baseline. Ordinary tackle contact ranges are separate (26 or 39), so they should remain untouched.
- The World Split visual effect derives its wall height from `barrier.height`, so collision and rendering should be kept consistent when changing the height.
- Eulryongta currently marks its target as incapacitated without releasing an owned ball or changing `controlledPlayerId`. The home automatic defender selection runs on away-possession transitions, which does not cover a home player being hit while attacking.
- Home support logic already calculates a short outlet and a forward outlet, but their target geometry can converge or fail to read visually as two clear lanes. Refine the positioning targets while preserving role and field-boundary constraints.
- `applySkill` currently rejects every goalkeeper with `goalkeeperExcluded`; remove or replace that blanket restriction while retaining per-skill activation rules.
- `awardSkillCard` updates the skill inventory but does not equip it. `LoadoutScreen` already supports the three-slot loadout, and the stage reward flow currently returns to stage selection after the reward.

## Scope boundary
- This change covers World Split visibility and reach, Eulryongta possession/control recovery, formation support lanes, reward auto-equip/loadout navigation, and goalkeeper skill access.
- Previously completed skill-effect changes (pre-match activation guard, five-second Eulryongta stun, Eagle Shot trajectory, and tornado orientation) are not reopened by this task.
