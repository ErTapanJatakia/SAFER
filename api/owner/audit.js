import { authorizePlatformOwner } from '../../src/server/platform-owner-auth.mjs';
import { authorizePlatformOwnerAction } from '../../src/server/tenant-rbac.mjs';
import { listPlatformAuditEvents } from '../../src/server/platform-audit.mjs';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Vary', 'Authorization');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({error: 'method_not_allowed'});
  }

  try {
    const {platformAuth, platformDb} = await import('../../src/server/firebase-admin.js');
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
    if (!authorization.ok) return response.status(authorization.status).json({error: authorization.code});
    const permission = authorizePlatformOwnerAction({
      actorUid: authorization.uid,
      principal: authorization.principal,
      action: 'platform:audit:read',
    });
    if (!permission.allowed) return response.status(403).json({error: permission.reason});
    const result = await listPlatformAuditEvents({database: platformDb});
    return response.status(200).json(result);
  } catch {
    return response.status(503).json({error: 'platform_audit_unavailable'});
  }
}
