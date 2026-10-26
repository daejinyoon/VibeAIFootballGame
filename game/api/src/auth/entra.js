import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';

const AUTHORITY_HOST = 'https://login.microsoftonline.com';
const REQUIRED_SCOPE = 'access_as_user';
const jwksByTenant = new Map();

export class EntraAuthError extends Error {
  constructor(status, code, message, details = undefined) {
    super(message);
    this.name = 'EntraAuthError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function reject(status, code, message, details) {
  throw new EntraAuthError(status, code, message, details);
}

function getJwks(tenantId, tokenVersion) {
  const cacheKey = `${tenantId}:${tokenVersion}`;
  if (!jwksByTenant.has(cacheKey)) {
    const discoveryPath = tokenVersion === '1.0' ? 'discovery/keys' : 'discovery/v2.0/keys';
    const uri = new URL(`${AUTHORITY_HOST}/${encodeURIComponent(tenantId)}/${discoveryPath}`);
    jwksByTenant.set(cacheKey, createRemoteJWKSet(uri));
  }
  return jwksByTenant.get(cacheKey);
}

function readBearerToken(request) {
  // Static Web Apps can attach its own auth context to API requests. Keep the
  // SPA's Entra API token in a dedicated header so it cannot be confused with
  // platform authentication metadata forwarded through Authorization.
  const authorization = request.headers.get('x-profile-access-token') ?? '';
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match) reject(401, 'AUTH_REQUIRED', 'A valid bearer token is required.');
  return match[1];
}

/**
 * Validates a DEX tenant access token and returns only the immutable account keys
 * used by the profile API. No identity value is read from request JSON.
 */
export async function requireEntraCaller(request, env = process.env) {
  // Entra tenant IDs are GUIDs, so compare them case-insensitively even if a
  // portal setting or token serializes the hexadecimal letters differently.
  const tenantId = env.ENTRA_TENANT_ID?.trim().toLowerCase();
  const clientId = env.ENTRA_CLIENT_ID?.trim();
  if (!tenantId || !clientId) {
    reject(500, 'AUTH_NOT_CONFIGURED', 'Entra API authentication is not configured.');
  }

  const token = readBearerToken(request);
  let untrustedClaims;
  try {
    untrustedClaims = decodeJwt(token);
  } catch {
    reject(401, 'INVALID_TOKEN', 'The bearer token is invalid.');
  }

  // Reject other tenants before verification. This is safe because it only denies;
  // an unverified claim can never authorize a caller.
  if (typeof untrustedClaims.tid !== 'string' || untrustedClaims.tid.toLowerCase() !== tenantId) {
    reject(403, 'TENANT_NOT_ALLOWED', 'The token tenant does not match the API tenant configuration.', {
      tokenTenantId: typeof untrustedClaims.tid === 'string' ? untrustedClaims.tid : null,
      configuredTenantId: tenantId,
    });
  }

  const tokenVersion = untrustedClaims.ver;
  if (tokenVersion !== '1.0' && tokenVersion !== '2.0') {
    reject(401, 'INVALID_TOKEN', 'The bearer token version is not supported.');
  }

  const tokenTenantId = untrustedClaims.tid;
  const issuer = tokenVersion === '1.0'
    ? `https://sts.windows.net/${tokenTenantId}/`
    : `${AUTHORITY_HOST}/${tokenTenantId}/v2.0`;
  let claims;
  try {
    ({ payload: claims } = await jwtVerify(token, getJwks(tenantId, tokenVersion), {
      issuer,
      algorithms: ['RS256'],
    }));
  } catch (error) {
    reject(401, 'INVALID_TOKEN', 'The bearer token could not be validated.', {
      reason: typeof error?.code === 'string' ? error.code : error?.name ?? 'unknown',
    });
  }

  const configuredApiAudience = env.ENTRA_API_AUDIENCE?.trim();
  const acceptedAudiences = tokenVersion === '1.0'
    ? [clientId, `api://${clientId}`, ...(configuredApiAudience ? [configuredApiAudience] : [])]
    : [clientId];
  const audienceMatches = acceptedAudiences.includes(claims.aud)
    || (Array.isArray(claims.aud) && claims.aud.some((audience) => acceptedAudiences.includes(audience)));
  if (!audienceMatches) {
    reject(403, 'AUDIENCE_NOT_ALLOWED', 'The token was not issued for this application.');
  }
  if (typeof claims.tid !== 'string' || claims.tid.toLowerCase() !== tenantId) {
    reject(403, 'TENANT_NOT_ALLOWED', 'The token tenant does not match the API tenant configuration.', {
      tokenTenantId: typeof claims.tid === 'string' ? claims.tid : null,
      configuredTenantId: tenantId,
    });
  }
  if (typeof claims.oid !== 'string' || !claims.oid.trim()) {
    reject(401, 'OBJECT_ID_REQUIRED', 'The token does not contain a usable account identifier.');
  }
  const scopes = typeof claims.scp === 'string' ? claims.scp.split(/\s+/) : [];
  if (!scopes.includes(REQUIRED_SCOPE)) {
    reject(403, 'SCOPE_NOT_ALLOWED', 'The token does not grant profile access.');
  }

  return { tenantId, objectId: claims.oid };
}
