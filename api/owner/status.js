import { createOwnerStatusHandler } from '../../src/server/owner-status-handler.mjs';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const { platformAuth, platformDb } = await import('../../src/server/firebase-admin.js');
    const ownerStatusHandler = createOwnerStatusHandler({
      verifyIdToken: (token, checkRevoked) => platformAuth.verifyIdToken(token, checkRevoked),
      readPlatformAdministrator: async (uid) => {
        const snapshot = await platformDb.doc(`platformAdministrators/${uid}`).get();
        return snapshot.exists ? snapshot.data() : null;
      },
    });
    return await ownerStatusHandler(request, response);
  } catch {
    return response.status(503).json({ error: 'platform_identity_unavailable' });
  }
}
