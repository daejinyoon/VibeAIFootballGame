# Current Context

## Active Plan
[Remove World Split](./plans/2026-10-26-remove-world-split.md)

## Active Phase
[P01 Skill and Save Removal](./phases/2026-10-26-remove-world-split/P01-skill-and-save-removal/phase.md)

## Active Task
[T02 Migrate Saved Skills](./phases/2026-10-26-remove-world-split/P01-skill-and-save-removal/T02-migrate-saved-skills.md)

## Status
- T01 is done and committed as `5921ade`; targeted tests and production build passed.
- T02 is active: migrate existing local saves to remove World Split while preserving all other campaign data.

## Next Step (IMPORTANT)
Read the active T02 blueprint, implement the schema-v7 migration in `game/src/storage/localProfile.js`, and validate it with `node --test src/storage/localProfile.test.js` from `game/`.
