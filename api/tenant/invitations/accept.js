import { acceptSuperAdminInvitation } from '../../../src/server/organisation-invitation-acceptance.mjs';

function bearerToken(request) {
  const header = request.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token && !/\s/.test(token) ? token : null;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'method_not_allowed' });
  }

  const token = bearerToken(request);
  if (!token) return response.status(401).json({ error: 'unauthenticated' });

  try {
    const [{ platformAuth, platformDb }, { FieldValue }] = await Promise.all([
      import('../../../src/server/firebase-admin.js'),
      import('firebase-admin/firestore'),
    ]);
    const decoded = await platformAuth.verifyIdToken(token, true);
    if (decoded.email_verified !== true) {
      return response.status(403).json({ error: 'verified_account_required' });
    }

    const authenticatedUser = await platformAuth.getUser(decoded.uid);
    if (
      authenticatedUser.disabled
      || authenticatedUser.emailVerified !== true
      || typeof authenticatedUser.email !== 'string'
      || authenticatedUser.email.trim().toLowerCase() !== String(decoded.email ?? '').trim().toLowerCase()
    ) {
      return response.status(403).json({ error: 'verified_account_required' });
    }

    const result = await acceptSuperAdminInvitation({
      orgId: request.body?.orgId,
      invitationId: request.body?.invitationId,
      actorUid: decoded.uid,
      actorEmail: authenticatedUser.email,
      actorEmailVerified: authenticatedUser.emailVerified,
      database: platformDb,
      serverTimestamp: () => FieldValue.serverTimestamp(),
    });

    return response.status(200).json(result);
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : null;
    if (typeof code === 'string' && code.startsWith('auth/')) {
      return response.status(401).json({ error: 'unauthenticated' });
    }
    const clientErrors = new Map([
      ['invalid_invitation', 404],
      ['invitation_identity_mismatch', 403],
      ['verified_account_required', 403],
      ['invitation_unavailable', 409],
      ['invitation_expired', 410],
      ['invitation_conflict', 409],
      ['membership_conflict', 409],
      ['organisation_unavailable', 409],
      ['organisation_not_ready', 409],
    ]);
    const status = clientErrors.get(code);
    if (status) return response.status(status).json({ error: code });
    return response.status(503).json({ error: 'invitation_acceptance_unavailable' });
  }
}
