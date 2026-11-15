import { authorizePlatformOwner } from '../../src/server/platform-owner-auth.mjs';
import { activateProvisionedOrganisation, OrganisationActivationError } from '../../src/server/organisation-activation.mjs';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Vary', 'Authorization');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
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
    const result = await activateProvisionedOrganisation({
      orgId: request.body?.orgId,
      actorUid: authorization.uid,
      database: platformDb,
      serverTimestamp: () => FieldValue.serverTimestamp(),
    });
    return response.status(200).json(result);
  } catch (error) {
    if (error instanceof OrganisationActivationError) {
      const status = new Map([
        ['invalid_request', 400], ['organisation_not_found', 404],
        ['organisation_not_ready', 409], ['super_admin_membership_unavailable', 409],
        ['service_unavailable', 503],
      ]).get(error.code) ?? 503;
      return response.status(status).json({ error: error.code });
    }
    return response.status(503).json({ error: 'organisation_activation_unavailable' });
  }
}
