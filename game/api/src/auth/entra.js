import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';

const AUTHORITY_HOST = 'https://login.microsoftonline.com';
const REQUIRED_SCOPE = 'access_as_user';
const jwksByTenant = new Map();

export class EntraAuthError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'EntraAuthError';
    this.status = status;
    this.code = code;
  }
}

function reject(status, code, message) {
  throw new EntraAuthError(status, code, message);
}

function getJwks(tenantId) {
  if (!jwksByTenant.has(tenantId)) {
    const uri = new URL(`${AUTHORITY_HOST}/${encodeURIComponent(tenantId)}/discovery/v2.0/keys`);
    jwksByTenant.set(tenantId, createRemoteJWKSet(uri));
  }
  return jwksByTenant.get(tenantId);
}

function readBearerToken(request) {
  const authorization = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match) reject(401, 'AUTH_REQUIRED', 'A valid bearer token is required.');
  return match[1];
}

/**
 * Validates a DEX tenant access token and returns only the immutable account keys
 * used by the profile API. No identity value is read from request JSON.
 */
export async function requireEntraCaller(request, env = process.env) {
  const tenantId = env.ENTRA_TENANT_ID?.trim();
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
  if (untrustedClaims.tid !== tenantId) {
    reject(403, 'TENANT_NOT_ALLOWED', 'This tenant is not allowed to use the profile API.');
  }

  const issuer = `${AUTHORITY_HOST}/${tenantId}/v2.0`;
  let claims;
  try {
    ({ payload: claims } = await jwtVerify(token, getJwks(tenantId), {
      issuer,
      algorithms: ['RS256'],
    }));
  } catch {
    reject(401, 'INVALID_TOKEN', 'The bearer token could not be validated.');
  }

  const audienceMatches = claims.aud === clientId
    || (Array.isArray(claims.aud) && claims.aud.includes(clientId));
  if (!audienceMatches) {
    reject(403, 'AUDIENCE_NOT_ALLOWED', 'The token was not issued for this application.');
  }
  if (claims.tid !== tenantId) {
    reject(403, 'TENANT_NOT_ALLOWED', 'This tenant is not allowed to use the profile API.');
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
