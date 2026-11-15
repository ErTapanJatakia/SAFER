const INVALID_TOKEN_CODES = new Set([
  'auth/argument-error',
  'auth/invalid-id-token',
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/invalid-user-token',
]);
const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function extractBearerToken(header) {
  if (typeof header !== 'string') return null;
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(header.trim());
  return match?.[1] ?? null;
}

/**
 * A Platform Owner is valid only when Firebase identity, account state,
 * platform principal, and the one-time bootstrap pointer all agree.
 */
export async function authorizePlatformOwner({
  authorizationHeader,
  verifyIdToken,
  readAuthUser,
  readPlatformAdministrator,
  readPlatformSettings,
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

  if (!identity || !UID_PATTERN.test(identity.uid ?? '')) {
    return { ok: false, status: 401, code: 'invalid_identity_token' };
  }

  let user;
  let principal;
  let settings;
  try {
    [user, principal, settings] = await Promise.all([
      readAuthUser(identity.uid),
      readPlatformAdministrator(identity.uid),
      readPlatformSettings(),
    ]);
  } catch {
    return { ok: false, status: 503, code: 'platform_authority_unavailable' };
  }

  if (!user || user.uid !== identity.uid || user.disabled === true || user.emailVerified !== true) {
    return { ok: false, status: 403, code: 'platform_identity_ineligible' };
  }

  if (
    !principal
    || principal.uid !== identity.uid
    || principal.role !== 'platform_owner'
    || principal.status !== 'active'
    || !settings
    || settings.platformOwnerUid !== identity.uid
    || settings.ownerBootstrapStatus !== 'claimed'
  ) {
    return { ok: false, status: 403, code: 'platform_access_denied' };
  }

  return { ok: true, uid: identity.uid, role: 'platform_owner', principal };
}
