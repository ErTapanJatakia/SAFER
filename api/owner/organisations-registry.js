import { isRequestBodyTooLarge } from '../../src/server/request-body-limit.mjs';
import { authorizePlatformOwner } from '../../src/server/platform-owner-auth.mjs';
import {
  changeOrganisationStatus,
  listPlatformOrganisations,
} from '../../src/server/organisation-registry.mjs';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Vary', 'Authorization');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (!['GET', 'PATCH'].includes(request.method)) {
    response.setHeader('Allow', 'GET, PATCH');
    return response.status(405).json({ error: 'method_not_allowed' });
  }

  if (isRequestBodyTooLarge(request)) return response.status(413).json({ error: 'request_body_too_large' });
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

    if (request.method === 'GET') {
      const organisations = await listPlatformOrganisations({ database: platformDb });
      return response.status(200).json({ organisations });
    }

    const result = await changeOrganisationStatus({
      database: platformDb,
      orgId: request.body?.orgId,
      nextStatus: request.body?.status,
      actorUid: authorization.uid,
      serverTimestamp: () => FieldValue.serverTimestamp(),
    });
    return response.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('required') || message.includes('supported') || message.includes('not permitted')) {
      return response.status(400).json({ error: 'invalid_lifecycle_transition' });
    }
    if (message.includes('not found')) return response.status(404).json({ error: 'organisation_not_found' });
    return response.status(503).json({ error: 'organisation_registry_unavailable' });
  }
}

