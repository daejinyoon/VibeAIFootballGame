import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_IDS } from '../game/skills.js';
import { movePvpSkill, normalizePvpSkillIds, togglePvpSkill } from './pvpSkillSelection.js';

test('selection accepts only unique catalog skills and stops at three', () => {
  const firstThree = SKILL_IDS.slice(0, 3);
  assert.deepEqual(normalizePvpSkillIds([...firstThree, 'unknown', firstThree[0]]), firstThree);
  assert.deepEqual(togglePvpSkill(firstThree, SKILL_IDS[3]), firstThree);
  assert.deepEqual(togglePvpSkill(firstThree, firstThree[1]), [firstThree[0], firstThree[2]]);
});

test('selected skills can move earlier and later without changing catalog IDs', () => {
  const selected = SKILL_IDS.slice(0, 3);
  assert.deepEqual(movePvpSkill(selected, 2, -1), [selected[0], selected[2], selected[1]]);
  assert.deepEqual(movePvpSkill(selected, 0, 1), [selected[1], selected[0], selected[2]]);
  assert.deepEqual(movePvpSkill(selected, 0, -1), selected);
});
