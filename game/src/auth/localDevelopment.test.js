import assert from 'node:assert/strict';
import test from 'node:test';
import { isLocalDevelopmentMode } from './localDevelopment.js';

test('local development mode is enabled only by a boolean Vite DEV flag', () => {
  assert.equal(isLocalDevelopmentMode({ DEV: true }), true);
  assert.equal(isLocalDevelopmentMode({ DEV: false }), false);
  assert.equal(isLocalDevelopmentMode({ DEV: 'true' }), false);
  assert.equal(isLocalDevelopmentMode(null), false);
  assert.equal(isLocalDevelopmentMode(undefined), false);
});
