import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyProfile } from './localProfile.js';
import { loadCloudProfile, saveCloudProfile } from './profileRepository.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test('cloud profile save and subsequent load preserve the selected team customization', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    requests.push(options);
    if (options.method === 'PUT') return { ok: true, status: 200 };
    return {
      ok: true,
      status: 200,
      json: async () => ({ profile: { ...savedProfile } }),
    };
  };

  const storage = createMemoryStorage();
  const account = { idTokenClaims: { tid: 'tenant-guid', oid: 'user-guid' } };
  const customization = { logoId: 'google', paletteId: 'royal-gold' };
  const savedProfile = { ...createEmptyProfile(), teamCustomization: customization };

  await saveCloudProfile({ account, profile: savedProfile, acquireToken: async () => 'test-token', storage });
  assert.deepEqual(JSON.parse(requests[0].body).profile.teamCustomization, customization);

  const loaded = await loadCloudProfile({ account, acquireToken: async () => 'test-token', storage });
  assert.deepEqual(loaded.profile.teamCustomization, customization);
  assert.equal(loaded.synced, true);
});
