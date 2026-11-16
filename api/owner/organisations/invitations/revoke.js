import { isRequestBodyTooLarge } from '../../../../src/server/request-body-limit.mjs';
import { authorizePlatformOwner } from '../../../../src/server/platform-owner-auth.mjs';
import { revokeSuperAdminInvitation } from '../../../../src/server/organisation-provisioning.mjs';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Vary', 'Authorization');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'method_not_allowed' });
  }
  if (isRequestBodyTooLarge(request)) {
    return response.status(413).json({ error: 'request_body_too_large' });
  }

  try {
    const [{ platformAuth, platformDb }, { FieldValue }] = await Promise.all([
      import('../../../../src/server/firebase-admin.js'),
      import('firebase-admin/firestore'),
    ]);
    const authorization = await authorizePlatformOwner({
      authorizationHeader: request.headers?.authorization,
      verifyIdToken: (token, checkRevoked) => platformAuth.verifyIdToken(token, checkRevoked),
      readAuthUser: (uid) => platformAuth.getUser(uid),
      readPlatformAdministrator: async (uid) => {
        const snapshot = await platformDb.doc('platformAdministrators/' + uid).get();
        return snapshot.exists ? snapshot.data() : null;
      },
      readPlatformSettings: async () => {
        const snapshot = await platformDb.doc('platform/settings').get();
        return snapshot.exists ? snapshot.data() : null;
      },
    });
    if (!authorization.ok) return response.status(authorization.status).json({ error: authorization.code });

    const result = await revokeSuperAdminInvitation({
      orgId: request.body?.orgId,
      invitationId: request.body?.invitationId,
      reason: request.body?.reason,
      actorUid: authorization.uid,
      database: platformDb,
      serverTimestamp: () => FieldValue.serverTimestamp(),
    });
    return response.status(200).json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const statuses = new Map([
      ['invalid_super_admin_invitation_request', 400],
      ['super_admin_invitation_not_found', 404],
      ['super_admin_invitation_unavailable', 409],
      ['super_admin_invitation_not_pending', 409],
    ]);
    return response.status(statuses.get(code) ?? 503).json({
      error: statuses.has(code) ? code : 'organisation_invitation_revocation_unavailable',
    });
  }
}
