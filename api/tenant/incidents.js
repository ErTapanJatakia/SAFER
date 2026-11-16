import {
  listTenantIncidents, createTenantIncident, updateTenantIncident, TenantIncidentError,
} from '../../src/server/tenant-incidents.mjs';
import { resolveTenantAuthorization, TenantAuthorizationError } from '../../src/server/tenant-authorization.mjs';

function bearerToken(req) {
  const value = req.headers?.authorization;
  if (typeof value !== 'string' || !value.startsWith('Bearer ')) return null;
  const token = value.slice(7).trim();
  return token && !/\s/.test(token) ? token : null;
}
function statusFor(error) {
  const code = error?.code;
  if (code === 'unauthenticated') return 401;
  if (['invalid_request','invalid_authorization_request','invalid_incident_data'].includes(code)) return 400;
  if (['role_permission_denied','active_tenant_membership_required','active_organisation_required','tenant_membership_required'].includes(code)) return 403;
  if (code === 'incident_not_found') return 404;
  return 503;
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET','POST','PATCH'].includes(req.method)) {
    res.setHeader('Allow','GET, POST, PATCH');
    return res.status(405).json({ error:'method_not_allowed' });
  }
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error:'unauthenticated' });
  try {
    const [{ platformAuth, platformDb }, { FieldValue }] = await Promise.all([
      import('../../src/server/firebase-admin.js'), import('firebase-admin/firestore'),
    ]);
    let decoded;
    try { decoded = await platformAuth.verifyIdToken(token, true); }
    catch { return res.status(401).json({ error:'unauthenticated' }); }
    if (!decoded?.uid) return res.status(401).json({ error:'unauthenticated' });
    const orgId = req.method === 'GET' ? req.query?.orgId : req.body?.orgId;
    if (req.method === 'GET') {
      const identity = await resolveTenantAuthorization({
        token, orgId, action: 'organisation:read', auth: platformAuth, database: platformDb,
      });
      // Employee access is authorized only against the authenticated UID and
      // the query itself is constrained to records reported by that UID.
      const authorization = identity.role === 'tenant_employee'
        ? await resolveTenantAuthorization({
            token, orgId, action: 'incidents:read:own',
            resourceOwnerUid: identity.uid, auth: platformAuth, database: platformDb,
          })
        : await resolveTenantAuthorization({
            token, orgId, action: 'incidents:read',
            auth: platformAuth, database: platformDb,
          });
      const result = await listTenantIncidents({
        orgId, actorUid: authorization.uid, role: authorization.role, database: platformDb,
      });
      return res.status(200).json(result);
    }
    if (req.method === 'POST') {
      const authorization = await resolveTenantAuthorization({
        token, orgId, action: 'incidents:create', auth: platformAuth, database: platformDb,
      });
      const result = await createTenantIncident({
        orgId, actorUid: authorization.uid, input: req.body, database: platformDb,
        serverTimestamp: () => FieldValue.serverTimestamp(),
      });
      return res.status(201).json(result);
    }
    const authorization = await resolveTenantAuthorization({
      token, orgId, action: 'incidents:update', auth: platformAuth, database: platformDb,
    });
    const result = await updateTenantIncident({
      orgId, actorUid: authorization.uid, incidentId: req.body?.incidentId,
      patch: req.body?.patch, database: platformDb,
      serverTimestamp: () => FieldValue.serverTimestamp(),
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof TenantIncidentError || error instanceof TenantAuthorizationError) {
      return res.status(statusFor(error)).json({ error: error.code });
    }
    return res.status(503).json({ error:'tenant_incident_service_unavailable' });
  }
}

// Bound parsed JSON payloads before authorization or business logic runs.
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '64kb',
    },
  },
};
