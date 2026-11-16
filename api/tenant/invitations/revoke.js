import { isRequestBodyTooLarge } from '../../../src/server/request-body-limit.mjs';
import {
  revokeTenantMemberInvitation,
  TenantMembershipError,
} from '../../../src/server/tenant-membership-admin.mjs';

function bearerToken(request) {
  const header = request.headers?.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token && !/\s/.test(token) ? token : null;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Vary', 'Authorization');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'method_not_allowed' });
  }
  if (isRequestBodyTooLarge(request)) {
    return response.status(413).json({ error: 'request_body_too_large' });
  }
  const token = bearerToken(request);
  if (!token) return response.status(401).json({ error: 'unauthenticated' });

  try {
    const [{ platformAuth, platformDb }, { FieldValue }] = await Promise.all([
      import('../../../src/server/firebase-admin.js'),
      import('firebase-admin/firestore'),
    ]);
    let decoded;
    try {
      decoded = await platformAuth.verifyIdToken(token, true);
    } catch {
      return response.status(401).json({ error: 'unauthenticated' });
    }
    if (!decoded?.uid || !/^[A-Za-z0-9_-]{1,128}$/.test(decoded.uid)) {
      return response.status(401).json({ error: 'unauthenticated' });
    }
    let user;
    try {
      user = await platformAuth.getUser(decoded.uid);
    } catch {
      return response.status(503).json({ error: 'identity_service_unavailable' });
    }
    if (!user || user.uid !== decoded.uid || user.disabled === true) {
      return response.status(403).json({ error: 'account_unavailable' });
    }

    const result = await revokeTenantMemberInvitation({
      orgId: request.body?.orgId,
      invitationId: request.body?.invitationId,
      reason: request.body?.reason,
      actorUid: decoded.uid,
      database: platformDb,
      serverTimestamp: () => FieldValue.serverTimestamp(),
    });
    return response.status(200).json(result);
  } catch (error) {
    if (error instanceof TenantMembershipError) {
      const statuses = new Map([
        ['invalid_request', 400],
        ['invalid_invitation_request', 400],
        ['unauthenticated', 401],
        ['tenant_membership_required', 403],
        ['active_tenant_membership_required', 403],
        ['active_organisation_required', 403],
        ['role_permission_denied', 403],
        ['role_delegation_denied', 403],
        ['invitation_not_found', 404],
        ['invitation_unavailable', 409],
        ['invitation_not_pending', 409],
        ['service_unavailable', 503],
      ]);
      return response.status(statuses.get(error.code) ?? 503).json({ error: error.code });
    }
    return response.status(503).json({ error: 'invitation_revocation_unavailable' });
  }
}
