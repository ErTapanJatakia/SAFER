import {
  changeOrganisationStatus,
  listPlatformOrganisations,
} from '../../src/server/organisation-registry.mjs';

function bearerToken(request) {
  const header = request.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token && !/\s/.test(token) ? token : null;
}

async function requirePlatformOwner(token) {
  const [{ platformAuth, platformDb }, { FieldValue }] = await Promise.all([
    import('../../src/server/firebase-admin.js'),
    import('firebase-admin/firestore'),
  ]);
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
    || settings?.platformOwnerUid !== decoded.uid
    || settings?.ownerBootstrapStatus !== 'claimed'
  ) return null;

  return { uid: decoded.uid, database: platformDb, serverTimestamp: () => FieldValue.serverTimestamp() };
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (!['GET', 'PATCH'].includes(request.method)) {
    response.setHeader('Allow', 'GET, PATCH');
    return response.status(405).json({ error: 'method_not_allowed' });
  }

  const token = bearerToken(request);
  if (!token) return response.status(401).json({ error: 'unauthenticated' });

  try {
    const owner = await requirePlatformOwner(token);
    if (!owner) return response.status(403).json({ error: 'platform_owner_required' });

    if (request.method === 'GET') {
      const organisations = await listPlatformOrganisations({ database: owner.database });
      return response.status(200).json({ organisations });
    }

    const result = await changeOrganisationStatus({
      database: owner.database,
      orgId: request.body?.orgId,
      nextStatus: request.body?.status,
      actorUid: owner.uid,
      serverTimestamp: owner.serverTimestamp,
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
