const MAX_PROFILE_BYTES = 48 * 1024;
const SUPPORTED_PROFILE_VERSIONS = new Set([7, 8]);
const SUPPORTED_GOAL_CELEBRATION_IDS = new Set([
  'siuuu',
  'moonwalk',
  'takeTheL',
  'slickback',
  'rko',
]);

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

function isGoalCelebration(value) {
  if (!isPlainObject(value)) return false;
  if (value.mode === 'random') return value.ceremonyId === null;
  if (value.mode === 'specific') return SUPPORTED_GOAL_CELEBRATION_IDS.has(value.ceremonyId);
  return false;
}

/** Reads a { profile } request and returns only supported v7/v8 profile fields. */
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
  const schemaVersion = profile.schemaVersion;
  if (!SUPPORTED_PROFILE_VERSIONS.has(schemaVersion)
      || typeof profile.nickname !== 'string'
      || profile.nickname.length > 16
      || !(profile.campaignSave === null || isPlainObject(profile.campaignSave))
      || !(profile.bestRecord === null || isPlainObject(profile.bestRecord))
      || !isPlainObject(profile.teamCustomization)) {
    badRequest('The profile does not match the supported profile schema.');
  }

  if (schemaVersion === 8 && !isGoalCelebration(profile.goalCelebration)) {
    badRequest('The goal celebration preference does not match the supported profile schema.');
  }

  const validatedProfile = {
    schemaVersion,
    nickname: profile.nickname,
    campaignSave: profile.campaignSave,
    bestRecord: profile.bestRecord,
    teamCustomization: profile.teamCustomization,
  };

  if (schemaVersion === 8) {
    validatedProfile.goalCelebration = {
      mode: profile.goalCelebration.mode,
      ceremonyId: profile.goalCelebration.ceremonyId,
    };
  }

  return validatedProfile;
}
