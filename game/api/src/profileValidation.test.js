import assert from 'node:assert/strict';
import test from 'node:test';
import { readProfilePayload } from './profileValidation.js';

function profileRequest(profile) {
  const request = new Request('https://example.test/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  });
  return request;
}

function createProfile(schemaVersion = 7, extra = {}) {
  return {
    schemaVersion,
    nickname: 'Player',
    campaignSave: null,
    bestRecord: null,
    teamCustomization: { logoId: 'google', paletteId: 'royal-gold' },
    ...extra,
  };
}

test('schema v7 validation preserves existing profile fields and shape', async () => {
  const profile = createProfile();

  assert.deepEqual(await readProfilePayload(profileRequest(profile)), profile);
});

test('schema v8 validation preserves a random goal celebration preference', async () => {
  const profile = createProfile(8, {
    goalCelebration: { mode: 'random', ceremonyId: null },
  });

  assert.deepEqual(await readProfilePayload(profileRequest(profile)), profile);
});

test('schema v8 validation preserves a supported specific goal celebration', async () => {
  const profile = createProfile(8, {
    goalCelebration: { mode: 'specific', ceremonyId: 'moonwalk' },
  });

  assert.deepEqual(await readProfilePayload(profileRequest(profile)), profile);
});

test('profile validation rejects unsupported versions and malformed goal celebrations', async () => {
  const invalidProfiles = [
    createProfile(9),
    createProfile(8),
    createProfile(8, { goalCelebration: { mode: 'random', ceremonyId: 'siuuu' } }),
    createProfile(8, { goalCelebration: { mode: 'specific', ceremonyId: 'unknown' } }),
    createProfile(8, { goalCelebration: { mode: 'unknown', ceremonyId: null } }),
  ];

  for (const profile of invalidProfiles) {
    await assert.rejects(readProfilePayload(profileRequest(profile)), {
      status: 400,
      code: 'INVALID_PROFILE',
    });
  }
});
