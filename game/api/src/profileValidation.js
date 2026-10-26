const MAX_PROFILE_BYTES = 48 * 1024;

export class ProfileValidationError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ProfileValidationError';
    this.status = status;
    this.code = code;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function badRequest(message) {
  throw new ProfileValidationError(400, 'INVALID_PROFILE', message);
}

/** Reads a { profile } request and returns only the supported v7 profile fields. */
export async function readProfilePayload(request) {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_PROFILE_BYTES) {
    throw new ProfileValidationError(413, 'PROFILE_TOO_LARGE', 'The profile exceeds the 48 KiB limit.');
  }

  let bodyText;
  try {
    bodyText = await request.text();
  } catch {
    badRequest('The request body could not be read.');
  }

  if (Buffer.byteLength(bodyText, 'utf8') > MAX_PROFILE_BYTES) {
    throw new ProfileValidationError(413, 'PROFILE_TOO_LARGE', 'The profile exceeds the 48 KiB limit.');
  }

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    badRequest('The request body must be valid JSON.');
  }

  if (!isPlainObject(body) || !isPlainObject(body.profile)) {
    badRequest('The request must contain a profile object.');
  }

  const profile = body.profile;
  if (profile.schemaVersion !== 7
      || typeof profile.nickname !== 'string'
      || profile.nickname.length > 16
      || !(profile.campaignSave === null || isPlainObject(profile.campaignSave))
      || !(profile.bestRecord === null || isPlainObject(profile.bestRecord))
      || !isPlainObject(profile.teamCustomization)) {
    badRequest('The profile does not match the supported profile schema.');
  }

  return {
    schemaVersion: 7,
    nickname: profile.nickname,
    campaignSave: profile.campaignSave,
    bestRecord: profile.bestRecord,
    teamCustomization: profile.teamCustomization,
  };
}
