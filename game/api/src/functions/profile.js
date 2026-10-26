import { app } from '@azure/functions';
import { EntraAuthError, requireEntraCaller } from '../auth/entra.js';
import { ProfileValidationError, readProfilePayload } from '../profileValidation.js';
import { getProfile, putProfile } from '../storage/profileCosmos.js';

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function errorResponse(error) {
  if (error instanceof EntraAuthError || error instanceof ProfileValidationError) {
    return jsonResponse(error.status, {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }
  if (error?.status === 503 || error?.name === 'ProfileStorageError') {
    return jsonResponse(503, { code: 'PROFILE_STORAGE_UNAVAILABLE', message: 'Profile storage is unavailable. Please retry.' });
  }
  return jsonResponse(500, { code: 'PROFILE_REQUEST_FAILED', message: 'The profile request could not be completed.' });
}

export function createProfileHandler({
  authenticate = requireEntraCaller,
  readProfile = getProfile,
  writeProfile = putProfile,
} = {}) {
  return async function handleProfile(request) {
    try {
      const account = await authenticate(request);
      if (request.method === 'GET') {
        const result = await readProfile(account);
        if (!result) return jsonResponse(404, { code: 'PROFILE_NOT_FOUND' });
        return jsonResponse(200, result);
      }

      const profile = await readProfilePayload(request);
      const result = await writeProfile({ ...account, profile });
      return jsonResponse(200, { saved: true, updatedAt: result.savedAt });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

const handleProfile = createProfileHandler();

app.http('profile', {
  route: 'profile',
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  handler: handleProfile,
});
