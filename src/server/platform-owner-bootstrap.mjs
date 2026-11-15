function requireNonEmpty(value, label, minimum = 1) {
  if (typeof value !== 'string' || value.trim().length < minimum) {
    throw new Error(`A valid ${label} is required.`);
  }
  return value.trim();
}

function validateUid(uid) {
  const value = requireNonEmpty(uid, 'Firebase Auth UID');
  if (value.length > 128 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error('The Firebase Auth UID is invalid.');
  }
  return value;
}

/**
 * One-time bootstrap. The shared platform/settings document is the atomic
 * single-owner lock; the client cannot access either document through rules.
 */
export async function provisionFirstPlatformOwner({
  uid,
  changeReference,
  operatorReference,
  reason,
  authAdmin,
  database,
  serverTimestamp,
}) {
  const ownerUid = validateUid(uid);
  const changeRef = requireNonEmpty(changeReference, 'change reference');
  const operatorRef = requireNonEmpty(operatorReference, 'operator reference');
  const auditReason = requireNonEmpty(reason, 'provisioning reason', 20);

  const user = await authAdmin.getUser(ownerUid);
  if (user.uid !== ownerUid || user.emailVerified !== true) {
    throw new Error('The intended Firebase identity could not be verified.');
  }

  const settingsRef = database.doc('platform/settings');
  const administratorRef = database.doc(`platform/administrators/${ownerUid}`);

  await database.runTransaction(async (transaction) => {
    const [settings, administrator] = await Promise.all([
      transaction.get(settingsRef),
      transaction.get(administratorRef),
    ]);

    if (
      settings.exists
      && (settings.get('platformOwnerUid') || settings.get('ownerBootstrapStatus') === 'claimed')
    ) {
      throw new Error('Platform Owner bootstrap has already been consumed.');
    }
    if (administrator.exists) {
      throw new Error('A platform administrator record already exists for this UID.');
    }

    const timestamp = serverTimestamp();
    transaction.set(settingsRef, {
      platformOwnerUid: ownerUid,
      ownerBootstrapStatus: 'claimed',
      ownerProvisionedAt: timestamp,
      ownerProvisionedByReference: operatorRef,
      ownerProvisioningChangeReference: changeRef,
      ownerProvisioningReason: auditReason,
    }, { merge: true });
    transaction.create(administratorRef, {
      uid: ownerUid,
      role: 'platform_owner',
      status: 'active',
      provisionedAt: timestamp,
      operatorReference: operatorRef,
      changeReference: changeRef,
      reason: auditReason,
    });
  });

  return { uid: ownerUid, role: 'platform_owner', status: 'active' };
}

export async function revokePlatformOwner({
  uid,
  changeReference,
  operatorReference,
  reason,
  database,
  serverTimestamp,
}) {
  const ownerUid = validateUid(uid);
  const changeRef = requireNonEmpty(changeReference, 'change reference');
  const operatorRef = requireNonEmpty(operatorReference, 'operator reference');
  const auditReason = requireNonEmpty(reason, 'revocation reason', 20);
  const settingsRef = database.doc('platform/settings');
  const administratorRef = database.doc(`platform/administrators/${ownerUid}`);

  await database.runTransaction(async (transaction) => {
    const [settings, administrator] = await Promise.all([
      transaction.get(settingsRef),
      transaction.get(administratorRef),
    ]);

    if (
      !settings.exists
      || settings.get('platformOwnerUid') !== ownerUid
      || !administrator.exists
      || administrator.get('uid') !== ownerUid
      || administrator.get('role') !== 'platform_owner'
      || administrator.get('status') !== 'active'
    ) {
      throw new Error('The active Platform Owner record could not be verified.');
    }

    const timestamp = serverTimestamp();
    transaction.update(administratorRef, {
      status: 'revoked',
      revokedAt: timestamp,
      revokedByReference: operatorRef,
      revocationChangeReference: changeRef,
      revocationReason: auditReason,
    });
    transaction.set(settingsRef, {
      ownerBootstrapStatus: 'revoked',
      ownerRevokedAt: timestamp,
      ownerRevokedByReference: operatorRef,
      ownerRevocationChangeReference: changeRef,
      ownerRevocationReason: auditReason,
    }, { merge: true });
  });

  return { uid: ownerUid, role: 'platform_owner', status: 'revoked' };
}
