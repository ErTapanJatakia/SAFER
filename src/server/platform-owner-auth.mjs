const INVALID_TOKEN_CODES = new Set([
  'auth/argument-error',
  'auth/invalid-id-token',
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/invalid-user-token',
]);

export function extractBearerToken(header) {
  if (typeof header !== 'string') return null;
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(header.trim());
  return match?.[1] ?? null;
}

/** Identity is verified before the authoritative platform principal is read. */
export async function authorizePlatformOwner({
  authorizationHeader,
  verifyIdToken,
  readPlatformAdministrator,
}) {
  const token = extractBearerToken(authorizationHeader);
  if (!token) return { ok: false, status: 401, code: 'unauthenticated' };

  let identity;
  try {
    identity = await verifyIdToken(token, true);
  } catch (error) {
    if (INVALID_TOKEN_CODES.has(error?.code)) {
      return { ok: false, status: 401, code: 'invalid_identity_token' };
    }
    return { ok: false, status: 503, code: 'identity_verification_unavailable' };
  }

  if (
    !identity
    || typeof identity.uid !== 'string'
    || identity.uid.length < 1
    || identity.uid.length > 128
  ) {
    return { ok: false, status: 401, code: 'invalid_identity_token' };
  }

  let principal;
  try {
    principal = await readPlatformAdministrator(identity.uid);
  } catch {
    return { ok: false, status: 503, code: 'platform_authority_unavailable' };
  }

  if (
    !principal
    || principal.uid !== identity.uid
    || principal.role !== 'platform_owner'
    || principal.status !== 'active'
  ) {
    return { ok: false, status: 403, code: 'platform_access_denied' };
  }

  return { ok: true, uid: identity.uid, role: 'platform_owner' };
}
