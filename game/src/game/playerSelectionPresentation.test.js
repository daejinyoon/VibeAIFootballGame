import assert from 'node:assert/strict';
import test from 'node:test';
import { didControlledPlayerChange, getSelectionPulseScale } from './playerSelectionPresentation.js';

test('controlled-player transition only starts for a distinct non-null player ID', () => {
  assert.equal(didControlledPlayerChange('home-fw', 'home-fw'), false);
  assert.equal(didControlledPlayerChange('home-fw', null), false);
  assert.equal(didControlledPlayerChange(null, null), false);
  assert.equal(didControlledPlayerChange('home-fw', 'home-def-1'), true);
  assert.equal(didControlledPlayerChange(null, 'home-def-1'), true);
});

test('selection pulse has the specified boundaries and remains within its scale range', () => {
  assert.equal(getSelectionPulseScale(0), 1);
  assert.equal(getSelectionPulseScale(0.4), 1.35);
  assert.equal(getSelectionPulseScale(0.8), 1);
  assert.equal(getSelectionPulseScale(-0.01), 1);
  assert.equal(getSelectionPulseScale(Number.NaN), 1);
  for (let elapsed = 0; elapsed < 0.8; elapsed += 0.01) {
    assert.ok(getSelectionPulseScale(elapsed) <= 1.35);
    assert.ok(getSelectionPulseScale(elapsed) >= 1);
  }
});
