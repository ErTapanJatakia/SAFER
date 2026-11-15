import { listTenantAuditEvents } from '../../src/server/tenant-audit.mjs';
import { resolveTenantAuthorization, TenantAuthorizationError } from '../../src/server/tenant-authorization.mjs';

function bearerToken(req) {
  const value = req.headers?.authorization;
  if (typeof value !== 'string' || !value.startsWith('Bearer ')) return null;
  const token = value.slice(7).trim();
  return token && !/\s/.test(token) ? token : null;
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const token = bearerToken(req);
  if (!token) return res.status(401).json({ error: 'unauthenticated' });
  try {
    const { platformAuth, platformDb } = await import('../../src/server/firebase-admin.js');
    const authorization = await resolveTenantAuthorization({
      token, orgId: req.query?.orgId, action: 'audit:read',
      auth: platformAuth, database: platformDb,
    });
    const result = await listTenantAuditEvents({
      orgId: authorization.orgId, database: platformDb,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof TenantAuthorizationError || error?.code === 'invalid_request') {
      const status = error.status ?? (error.code === 'invalid_request' ? 400 : 403);
      return res.status(status).json({ error: error.code });
    }
    return res.status(503).json({ error: 'tenant_audit_service_unavailable' });
  }
}
