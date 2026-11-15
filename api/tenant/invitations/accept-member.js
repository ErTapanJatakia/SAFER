import { acceptTenantMemberInvitation, TenantInvitationAcceptanceError } from '../../../src/server/tenant-member-invitation-acceptance.mjs';

function bearerToken(request) {
  const header = request.headers?.authorization;
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
    let decoded;
    try {
      decoded = await platformAuth.verifyIdToken(token, true);
    } catch {
      return response.status(401).json({ error: 'unauthenticated' });
    }
    if (decoded?.email_verified !== true || typeof decoded.uid !== 'string') {
      return response.status(403).json({ error: 'verified_account_required' });
    }
    let user;
    try {
      user = await platformAuth.getUser(decoded.uid);
    } catch {
      return response.status(503).json({ error: 'identity_service_unavailable' });
    }
    if (!user || user.disabled || user.emailVerified !== true
      || typeof user.email !== 'string'
      || user.email.trim().toLowerCase() !== String(decoded.email ?? '').trim().toLowerCase()) {
      return response.status(403).json({ error: 'verified_account_required' });
    }
    const result = await acceptTenantMemberInvitation({
      orgId: request.body?.orgId,
      invitationId: request.body?.invitationId,
      actorUid: decoded.uid,
      actorEmail: user.email,
      actorEmailVerified: user.emailVerified,
      database: platformDb,
      serverTimestamp: () => FieldValue.serverTimestamp(),
    });
    return response.status(200).json(result);
  } catch (error) {
    if (error instanceof TenantInvitationAcceptanceError) {
      const statuses = new Map([
        ['invalid_invitation', 404],
        ['invitation_identity_mismatch', 403],
        ['verified_account_required', 403],
        ['organisation_unavailable', 409],
        ['invitation_unavailable', 409],
        ['invitation_expired', 410],
        ['membership_conflict', 409],
      ]);
      return response.status(statuses.get(error.code) ?? 503).json({ error: error.code });
    }
    if (typeof error?.code === 'string' && error.code.startsWith('auth/')) {
      return response.status(401).json({ error: 'unauthenticated' });
    }
    return response.status(503).json({ error: 'invitation_acceptance_unavailable' });
  }
}
