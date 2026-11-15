import { createOrganisationWithSuperAdminInvitation } from '../../src/server/organisation-provisioning.mjs';

function bearerToken(request) {
  const header = request.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
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
    const { platformAuth, platformDb } = await import('../../src/server/firebase-admin.js');
    const decoded = await platformAuth.verifyIdToken(token, true);
    const [administratorSnapshot, settingsSnapshot] = await Promise.all([
      platformDb.doc(`platformAdministrators/${decoded.uid}`).get(),
      platformDb.doc('platform/settings').get(),
    ]);
    const administrator = administratorSnapshot.exists ? administratorSnapshot.data() : null;
    const settings = settingsSnapshot.exists ? settingsSnapshot.data() : null;

    if (
      !administrator
      || administrator.uid !== decoded.uid
      || administrator.role !== 'platform_owner'
      || administrator.status !== 'active'
      || !settings
      || settings.platformOwnerUid !== decoded.uid
      || settings.ownerBootstrapStatus !== 'claimed'
    ) {
      return response.status(403).json({ error: 'platform_owner_required' });
    }

    const result = await createOrganisationWithSuperAdminInvitation({
      displayName: request.body?.displayName,
      superAdminEmail: request.body?.superAdminEmail,
      actorUid: decoded.uid,
      database: platformDb,
      authAdmin: platformAuth,
      serverTimestamp: () => (await import('firebase-admin/firestore')).FieldValue.serverTimestamp(),
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
