import { authorizePlatformOwner } from './platform-owner-auth.mjs';

export function createOwnerStatusHandler({ verifyIdToken, readAuthUser, readPlatformAdministrator, readPlatformSettings }) {
  return async function ownerStatusHandler(request, response) {
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Vary', 'Authorization');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return response.status(405).json({ error: 'method_not_allowed' });
    }

    const result = await authorizePlatformOwner({
      authorizationHeader: request.headers?.authorization,
      verifyIdToken,
      readAuthUser,
      readPlatformAdministrator,
      readPlatformSettings,
    });

    if (!result.ok) {
      return response.status(result.status).json({ error: result.code });
    }

    return response.status(200).json({
      authenticated: true,
      platformRole: 'platform_owner',
    });
  };
}
