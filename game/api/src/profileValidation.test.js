import assert from 'node:assert/strict';
import test from 'node:test';
import { readProfilePayload } from './profileValidation.js';

test('schema v7 validation preserves the selected logo and kit palette', async () => {
  const profile = {
    schemaVersion: 7,
    nickname: 'Player',
    campaignSave: null,
    bestRecord: null,
    teamCustomization: { logoId: 'google', paletteId: 'royal-gold' },
  };
  const request = new Request('https://example.test/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  });

  assert.deepEqual(await readProfilePayload(request), profile);
});
