import {
  proposeOrganisationOwnershipTransfer,
  acceptOrganisationOwnershipTransfer,
  OwnershipTransferError,
} from '../../src/server/organisation-ownership-transfer.mjs';

function bearerToken(request) {
  const header = request.headers?.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token && !/\\s/.test(token) ? token : null;
}

function statusFor(code) {
  return new Map([
    ['invalid_request', 400], ['unauthenticated', 401],
    ['verified_account_required', 403], ['active_super_admin_required', 403],
    ['verified_nominee_required', 403], ['transfer_identity_mismatch', 403],
    ['nominee_not_found', 404], ['transfer_unavailable', 409],
    ['nominee_membership_conflict', 409], ['ownership_changed', 409],
    ['incumbent_membership_unavailable', 409], ['transfer_expired', 410],
    ['identity_service_unavailable', 503], ['service_unavailable', 503],
  ]).get(code) ?? 503;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Vary', 'Authorization');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'method_not_allowed' });
  }
  const token = bearerToken(request);
  if (!token) return response.status(401).json({ error: 'unauthenticated' });

  try {
    const [{ platformAuth, platformDb }, { FieldValue }] = await Promise.all([
      import('../../src/server/firebase-admin.js'),
      import('firebase-admin/firestore'),
    ]);
    let decoded;
    try { decoded = await platformAuth.verifyIdToken(token, true); }
    catch { return response.status(401).json({ error: 'unauthenticated' }); }
    if (typeof decoded?.uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(decoded.uid)) {
      return response.status(401).json({ error: 'unauthenticated' });
    }
    let user;
    try { user = await platformAuth.getUser(decoded.uid); }
    catch { return response.status(503).json({ error: 'identity_service_unavailable' }); }
    if (!user || user.uid !== decoded.uid || user.disabled) {
      return response.status(403).json({ error: 'account_unavailable' });
    }

    const common = {
      orgId: request.body?.orgId,
      actorUid: decoded.uid,
      database: platformDb,
      serverTimestamp: () => FieldValue.serverTimestamp(),
    };
    const action = request.body?.action;
    let result;
    if (action === 'propose') {
      result = await proposeOrganisationOwnershipTransfer({
        ...common,
        targetEmail: request.body?.targetEmail,
        authAdmin: platformAuth,
      });
    } else if (action === 'accept') {
      if (decoded.email_verified !== true || user.emailVerified !== true
        || typeof user.email !== 'string'
        || user.email.trim().toLowerCase() !== String(decoded.email ?? '').trim().toLowerCase()) {
        return response.status(403).json({ error: 'verified_account_required' });
      }
      result = await acceptOrganisationOwnershipTransfer({
        ...common,
        transferId: request.body?.transferId,
        actorEmail: user.email,
        actorEmailVerified: user.emailVerified,
      });
    } else {
      return response.status(400).json({ error: 'invalid_request' });
    }
    return response.status(action === 'propose' ? 201 : 200).json(result);
  } catch (error) {
    if (error instanceof OwnershipTransferError) {
      return response.status(statusFor(error.code)).json({ error: error.code });
    }
    return response.status(503).json({ error: 'ownership_transfer_unavailable' });
  }
}
