import { platformAuth, platformDb } from '../_lib/firebase-admin.js';
import { createOwnerStatusHandler } from '../_lib/owner-status-handler.mjs';

const handler = createOwnerStatusHandler({
  verifyIdToken: (token, checkRevoked) => platformAuth.verifyIdToken(token, checkRevoked),
  readPlatformAdministrator: async (uid) => {
    const snapshot = await platformDb.doc(`platform/administrators/${uid}`).get();
    return snapshot.exists ? snapshot.data() : null;
  },
});

export default handler;
