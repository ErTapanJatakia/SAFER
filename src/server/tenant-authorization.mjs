/**
 * Trusted server boundary for tenant API authorization.
 *
 * Firebase identity, membership and organisation state are loaded here from
 * authoritative server-side sources. Request body, URL and custom claims are
 * never accepted as role or membership evidence.
 */
import { authorizeTenantAction } from './tenant-rbac.mjs';

const ORG_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export class TenantAuthorizationError extends Error {
  constructor(code, status = 403) {
    super(code);
    this.name = 'TenantAuthorizationError';
    this.code = code;
    this.status = status;
  }
}

export async function resolveTenantAuthorization({
  token,
  orgId,
  action,
  auth,
  database,
  resourceOwnerUid,
  assignedToUid,
  targetUid,
  targetCurrentRole,
  targetRole,
}) {
  if (typeof token !== 'string' || !token.trim() || /\s/.test(token.trim())) {
    throw new TenantAuthorizationError('unauthenticated', 401);
  }
  if (typeof orgId !== 'string' || !ORG_ID_PATTERN.test(orgId)
    || !auth || typeof auth.verifyIdToken !== 'function'
    || typeof auth.getUser !== 'function'
    || !database || typeof database.doc !== 'function') {
    throw new TenantAuthorizationError('invalid_authorization_request', 400);
  }

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token.trim(), true);
  } catch {
    throw new TenantAuthorizationError('unauthenticated', 401);
  }
  if (!decoded || typeof decoded.uid !== 'string' || !decoded.uid) {
    throw new TenantAuthorizationError('unauthenticated', 401);
  }

  let user;
  try {
    user = await auth.getUser(decoded.uid);
  } catch {
    throw new TenantAuthorizationError('identity_service_unavailable', 503);
  }

  if (!user || user.uid !== decoded.uid || user.disabled === true) {
    throw new TenantAuthorizationError('account_unavailable', 403);
  }

  let membershipSnapshot;
  let organisationSnapshot;
  try {
    [membershipSnapshot, organisationSnapshot] = await Promise.all([
      database.doc(`organisations/${orgId}/members/${decoded.uid}`).get(),
      database.doc(`organisations/${orgId}`).get(),
    ]);
  } catch {
    throw new TenantAuthorizationError('tenant_authority_unavailable', 503);
  }

  if (!membershipSnapshot?.exists || !organisationSnapshot?.exists) {
    throw new TenantAuthorizationError('tenant_membership_required', 403);
  }

  const membership = membershipSnapshot.data();
  const organisation = organisationSnapshot.data();
  const decision = authorizeTenantAction({
    actorUid: decoded.uid,
    membership,
    organisation,
    requestedOrgId: orgId,
    action,
    resourceOwnerUid,
    assignedToUid,
    targetUid,
    targetCurrentRole,
    targetRole,
  });

  if (!decision.allowed) {
    const status = decision.reason === 'invalid_authorization_context' ? 400 : 403;
    throw new TenantAuthorizationError(decision.reason, status);
  }

  return Object.freeze({
    uid: decoded.uid,
    orgId,
    role: membership.role,
    membership,
    organisation,
    action,
  });
}
