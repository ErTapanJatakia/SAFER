import { isRequestBodyTooLarge } from '../../src/server/request-body-limit.mjs';
import { authorizePlatformOwner } from '../../src/server/platform-owner-auth.mjs';
import { createOrganisationWithSuperAdminInvitation } from '../../src/server/organisation-provisioning.mjs';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Vary', 'Authorization');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
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

    const result = await createOrganisationWithSuperAdminInvitation({
      displayName: request.body?.displayName,
      superAdminEmail: request.body?.superAdminEmail,
      actorUid: authorization.uid,
      database: platformDb,
      authAdmin: platformAuth,
      serverTimestamp: () => FieldValue.serverTimestamp(),
    });
    return response.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('No user record') || message.includes('user-not-found')) {
      return response.status(422).json({ error: 'super_admin_account_not_found' });
    }
    if (message.includes('verify their email') || message.includes('account is disabled')) {
      return response.status(422).json({ error: 'super_admin_account_not_eligible' });
    }
    if (message.includes('required') || message.includes('valid')) {
      return response.status(400).json({ error: 'invalid_organisation_request' });
    }
    return response.status(503).json({ error: 'organisation_provisioning_unavailable' });
  }
}

