import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_GOAL_CELEBRATION_SETTINGS,
  GOAL_CELEBRATION_IDS,
  GOAL_CELEBRATION_OPTIONS,
  normalizeGoalCelebrationSettings,
  selectGoalCelebrationId,
} from './goalCelebrations.js';

test('lists the five ceremony IDs and labels in picker order', () => {
  assert.deepEqual(GOAL_CELEBRATION_IDS, ['siuuu', 'moonwalk', 'takeTheL', 'slickback', 'rko']);
  assert.deepEqual(GOAL_CELEBRATION_OPTIONS.map(({ id }) => id), GOAL_CELEBRATION_IDS);
  assert.deepEqual(GOAL_CELEBRATION_OPTIONS.map(({ label }) => label), ['SIUUU', '문워크', 'L을 가져가', '슬릭백', 'RKO']);
});

test('normalizes missing and malformed settings to a fresh random default', () => {
  for (const value of [null, undefined, [], {}, { mode: 'other' }, { mode: 'specific', ceremonyId: 'missing' }]) {
    assert.deepEqual(normalizeGoalCelebrationSettings(value), DEFAULT_GOAL_CELEBRATION_SETTINGS);
  }

  const normalized = normalizeGoalCelebrationSettings({ mode: 'random', ceremonyId: 'rko' });
  assert.deepEqual(normalized, { mode: 'random', ceremonyId: null });
  assert.notEqual(normalized, DEFAULT_GOAL_CELEBRATION_SETTINGS);
});

test('preserves every valid specific ceremony and selects it without using randomness', () => {
  for (const ceremonyId of GOAL_CELEBRATION_IDS) {
    assert.deepEqual(normalizeGoalCelebrationSettings({ mode: 'specific', ceremonyId }), {
      mode: 'specific', ceremonyId,
    });
    assert.equal(selectGoalCelebrationId({ mode: 'specific', ceremonyId }, () => {
      throw new Error('specific mode must not use randomness');
    }), ceremonyId);
  }
});

test('selects random ceremonies deterministically and clamps boundary samples', () => {
  assert.equal(selectGoalCelebrationId(DEFAULT_GOAL_CELEBRATION_SETTINGS, () => 0), 'siuuu');
  assert.equal(selectGoalCelebrationId(DEFAULT_GOAL_CELEBRATION_SETTINGS, () => 0.7), 'slickback');
  assert.equal(selectGoalCelebrationId(DEFAULT_GOAL_CELEBRATION_SETTINGS, () => 1), 'rko');
  assert.equal(selectGoalCelebrationId(DEFAULT_GOAL_CELEBRATION_SETTINGS, () => Number.NaN), 'siuuu');
});
