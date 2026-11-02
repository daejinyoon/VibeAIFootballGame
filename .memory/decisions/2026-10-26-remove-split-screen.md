# Remove World Split

## Goal

Remove the World Split (`powerTackle`) skill from the football game because its rock wall is not visible reliably and the user no longer wants the skill.

## Confirmed decisions

- Remove World Split from the playable skill set, including skill selection/loadouts, reward pools, opponent skill generation, match effects, audio, and skill-specific artwork/references.
- Keep ordinary tackling and its controls, animations, and collision behavior. Only World Split-specific behavior is removed.
- Migrate existing local saves without compensation: remove World Split from owned skills, equipped loadouts, pending/reward lists, and other persisted skill collections while retaining all unrelated profile and campaign data.
- If World Split was equipped, leave that position empty and preserve the order of all remaining equipped skills.
- Do not replace the removed skill or grant a substitute reward.

## Implementation notes

- Use a profile migration so existing saves are sanitized before validation; preserve other skills and their levels/order.
- Remove the `powerTackle` skill-specific barrier and powered-slide paths without changing normal tackle resolution.
- Update tests and documentation that assert the skill remains available.

## Acceptance criteria

- World Split cannot be selected, earned, generated for opponents, or activated.
- Existing saves load successfully with all World Split entries removed and other data intact; removed equipped entries leave empty slots.
- Normal tackles continue to work.
- Relevant tests and production build pass.
