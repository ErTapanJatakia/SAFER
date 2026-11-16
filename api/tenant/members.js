import { isRequestBodyTooLarge } from '../../src/server/request-body-limit.mjs';
import {
  inviteTenantMember,
  manageTenantMember,
  TenantMembershipError,
} from '../../src/server/tenant-membership-admin.mjs';
import { resolveTenantAuthorization, TenantAuthorizationError } from '../../src/server/tenant-authorization.mjs';

function bearerToken(request) {
  const header = request.headers?.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token && !/\s/.test(token) ? token : null;
}

function responseError(error) {
  const code = error?.code;
  const clientErrors = new Map([
    ['invalid_request', 400],
    ['invalid_authorization_request', 400],
    ['invalid_invitation_request', 400],
    ['unauthenticated', 401],
    ['active_tenant_membership_required', 403],
    ['active_organisation_required', 403],
    ['role_permission_denied', 403],
    ['role_delegation_denied', 403],
    ['target_membership_not_manageable', 403],
    ['tenant_membership_required', 403],
    ['membership_not_found', 404],
    ['invitee_not_found', 404],
    ['verified_invitee_required', 403],
    ['membership_conflict', 409],
    ['service_unavailable', 503],
    ['identity_service_unavailable', 503],
  ]);
  return clientErrors.get(code) ?? 503;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (!['GET', 'POST', 'PATCH'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST, PATCH');
    return response.status(405).json({ error: 'method_not_allowed' });
  }

  if (isRequestBodyTooLarge(request)) return response.status(413).json({ error: 'request_body_too_large' });
  const token = bearerToken(request);
  if (!token) return response.status(401).json({ error: 'unauthenticated' });

  try {
    const [{ platformAuth, platformDb }, { FieldValue }] = await Promise.all([
      import('../../src/server/firebase-admin.js'),
      import('firebase-admin/firestore'),
    ]);
    let decoded;
    try {
      decoded = await platformAuth.verifyIdToken(token, true);
    } catch {
      return response.status(401).json({ error: 'unauthenticated' });
    }
    if (!decoded?.uid || typeof decoded.uid !== 'string') {
      return response.status(401).json({ error: 'unauthenticated' });
    }
    let authenticatedUser;
    try {
      authenticatedUser = await platformAuth.getUser(decoded.uid);
    } catch {
      return response.status(503).json({ error: 'identity_service_unavailable' });
    }
    if (!authenticatedUser || authenticatedUser.uid !== decoded.uid || authenticatedUser.disabled) {
      return response.status(403).json({ error: 'account_unavailable' });
    }

    const orgId = request.method === 'GET' ? request.query?.orgId : request.body?.orgId;
    const common = {
      orgId,
      actorUid: decoded.uid,
      database: platformDb,
      serverTimestamp: () => FieldValue.serverTimestamp(),
    };
    if (request.method === 'GET') {
      const authorization = await resolveTenantAuthorization({
        token,
        orgId,
        action: 'members:read',
        auth: platformAuth,
        database: platformDb,
      });
      const snapshot = await platformDb.collection(`organisations/${orgId}/members`)
        .orderBy('createdAt', 'desc').limit(101).get();
      const hasMore = snapshot.docs.length > 100;
      const members = snapshot.docs.slice(0, 100).flatMap((document) => {
        const value = document.data();
        const roles = [
          'tenant_super_admin', 'tenant_admin', 'tenant_manager',
          'tenant_employee', 'tenant_auditor',
        ];
        const expectedFields = [
          'uid', 'orgId', 'role', 'status', 'createdAt', 'createdByUid',
          'updatedAt', 'updatedByUid', 'schemaVersion',
        ].sort();
        const fields = Object.keys(value).sort();
        if (fields.length !== expectedFields.length
          || fields.some((field, index) => field !== expectedFields[index])
          || value.uid !== document.id || value.orgId !== orgId
          || !roles.includes(value.role)
          || !['active', 'suspended'].includes(value.status)
          || value.schemaVersion !== 1) return [];
        return [{
          uid: value.uid,
          role: value.role,
          status: value.status,
          createdAt: value.createdAt?.toDate?.()?.toISOString?.() ?? null,
          updatedAt: value.updatedAt?.toDate?.()?.toISOString?.() ?? null,
        }];
      });
      return response.status(200).json({ orgId: authorization.orgId, members, hasMore });
    }
    if (request.method === 'POST') {
      const result = await inviteTenantMember({
        ...common,
        email: request.body?.email,
        role: request.body?.role,
        authAdmin: platformAuth,
      });
      return response.status(201).json(result);
    }

    const action = request.body?.action;
    if (!['members:suspend', 'members:role:assign'].includes(action)) {
      return response.status(400).json({ error: 'invalid_request' });
    }
    const result = await manageTenantMember({
      ...common,
      targetUid: request.body?.targetUid,
      action,
      targetRole: request.body?.targetRole,
    });
    return response.status(200).json(result);
  } catch (error) {
    if (error instanceof TenantMembershipError || error instanceof TenantAuthorizationError) {
      return response.status(responseError(error)).json({ error: error.code });
    }
    return response.status(503).json({ error: 'tenant_membership_service_unavailable' });
  }
}

