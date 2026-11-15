import { authorizePlatformOwner } from '../../src/server/platform-owner-auth.mjs';
import { getPlatformTenantOperationalSummary, PlatformTenantDataError } from '../../src/server/platform-owner-tenant-data.mjs';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Vary', 'Authorization, X-Support-Session');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'method_not_allowed' });
  }

  const sessionId = request.headers?.['x-support-session'];
  if (typeof sessionId !== 'string' || !/^[a-f0-9]{64}$/.test(sessionId)) {
    return response.status(400).json({ error: 'invalid_support_session' });
  }

  try {
    const [{ platformAuth, platformDb }, { FieldValue }] = await Promise.all([
      import('../../src/server/firebase-admin.js'),
      import('firebase-admin/firestore'),
    ]);
    const authorization = await authorizePlatformOwner({
      authorizationHeader: request.headers?.authorization,
      verifyIdToken: (token, checkRevoked) => platformAuth.verifyIdToken(token, checkRevoked),
      readAuthUser: (uid) => platformAuth.getUser(uid),
      readPlatformAdministrator: async (uid) => {
        const snapshot = await platformDb.doc(`platformAdministrators/${uid}`).get();
        return snapshot.exists ? snapshot.data() : null;
      },
      readPlatformSettings: async () => {
        const snapshot = await platformDb.doc('platform/settings').get();
        return snapshot.exists ? snapshot.data() : null;
      },
    });
    if (!authorization.ok) return response.status(authorization.status).json({ error: authorization.code });

    const orgId = request.method === 'GET' ? request.query?.orgId : request.body?.orgId;
    const action = request.method === 'GET' ? 'platform:tenant-data:read' : 'platform:tenant-data:export';
    const result = await getPlatformTenantOperationalSummary({
      actorUid: authorization.uid,
      principal: authorization.principal,
      sessionId,
      orgId,
      action,
      database: platformDb,
      serverTimestamp: () => FieldValue.serverTimestamp(),
    });
    return response.status(200).json(result);
  } catch (error) {
    if (error instanceof PlatformTenantDataError) {
      const status = error.code === 'invalid_request' ? 400 : 503;
      return response.status(status).json({ error: error.code });
    }
    return response.status(503).json({ error: 'platform_tenant_data_unavailable' });
  }
}
