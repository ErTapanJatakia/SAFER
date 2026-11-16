import { authorizePlatformOwner } from '../../src/server/platform-owner-auth.mjs';
import {
  createPlatformSupportSession,
  revokePlatformSupportSession,
} from '../../src/server/platform-owner-support-access.mjs';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Vary', 'Authorization');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (!['POST', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'POST, DELETE');
    return response.status(405).json({ error: 'method_not_allowed' });
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

    const common = {
      actorUid: authorization.uid,
      principal: authorization.principal,
      database: platformDb,
      serverTimestamp: () => FieldValue.serverTimestamp(),
    };
    if (request.method === 'POST') {
      const result = await createPlatformSupportSession({
        ...common,
        orgId: request.body?.orgId,
        purpose: request.body?.purpose,
        changeReference: request.body?.changeReference,
        actions: request.body?.actions,
        durationMinutes: request.body?.durationMinutes ?? 15,
      });
      return response.status(201).json(result);
    }

    const result = await revokePlatformSupportSession({
      ...common,
      sessionId: request.body?.sessionId,
      reason: request.body?.reason,
      changeReference: request.body?.changeReference,
    });
    return response.status(200).json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'active_platform_owner_required') return response.status(403).json({ error: code });
    if (code === 'support_session_not_found') return response.status(404).json({ error: code });
    if (code.includes('support_session') || code.includes('support_access_scope') || code.includes('active_support_organisation')) {
      return response.status(409).json({ error: code });
    }
    if (code.startsWith('invalid_') || code.includes('required')) {
      return response.status(400).json({ error: code });
    }
    return response.status(503).json({ error: 'support_access_unavailable' });
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
