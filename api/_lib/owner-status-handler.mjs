import { authorizePlatformOwner } from './platform-owner-auth.mjs';

export function createOwnerStatusHandler({ verifyIdToken, readPlatformAdministrator }) {
  return async function ownerStatusHandler(request, response) {
    response.setHeader('Cache-Control', 'no-store, max-age=0');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Vary', 'Authorization');
    response.setHeader('X-Content-Type-Options', 'nosniff');

    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      return response.status(405).json({ error: 'method_not_allowed' });
    }

    const authorization = request.headers?.authorization;
    const result = await authorizePlatformOwner({
      authorizationHeader: authorization,
      verifyIdToken,
      readPlatformAdministrator,
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
