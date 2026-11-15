const ALLOWED_TRANSITIONS = Object.freeze({
  active: new Set(['suspended', 'closed']),
  suspended: new Set(['active', 'closed']),
  provisioning: new Set(['suspended']),
});

function validOrgId(value) {
  return typeof value === 'string' && /^org_[a-f0-9]{32}$/.test(value);
}

/**
 * Owner-only registry operations. All lifecycle changes are transactional and
 * append a platform audit event. Provisioning tenants cannot be activated here.
 */
export async function listPlatformOrganisations({ database, limit = 100 }) {
  const boundedLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 100;
  const snapshot = await database.collection('organisations')
    .orderBy('createdAt', 'desc')
    .limit(boundedLimit)
    .get();

  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      orgId: data.orgId,
      displayName: data.displayName,
      status: data.status,
      lifecycleStage: data.lifecycleStage ?? null,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
    };
  });
}

export async function changeOrganisationStatus({
  database,
  orgId,
  nextStatus,
  actorUid,
  serverTimestamp,
}) {
  if (!validOrgId(orgId)) throw new Error('A valid organisation identifier is required.');
  if (!['active', 'suspended', 'closed'].includes(nextStatus)) {
    throw new Error('A supported organisation status is required.');
  }
  if (typeof actorUid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(actorUid)) {
    throw new Error('A valid Platform Owner identity is required.');
  }

  const organisationRef = database.doc(`organisations/${orgId}`);
  const auditRef = database.collection('platformAuditEvents').doc();
  const timestamp = serverTimestamp();

  return database.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(organisationRef);
    if (!snapshot.exists) throw new Error('Organisation not found.');
    const current = snapshot.data();
    const allowed = ALLOWED_TRANSITIONS[current.status];
    if (!allowed || !allowed.has(nextStatus)) {
      throw new Error('The requested organisation lifecycle transition is not permitted.');
    }

    transaction.update(organisationRef, {
      status: nextStatus,
      updatedAt: timestamp,
      updatedByUid: actorUid,
      ...(nextStatus === 'closed' ? { closedAt: timestamp, closedByUid: actorUid } : {}),
    });
    transaction.create(auditRef, {
      action: 'organisation.status_changed',
      actorUid,
      targetOrgId: orgId,
      details: { previousStatus: current.status, nextStatus },
      occurredAt: timestamp,
    });

    return { orgId, previousStatus: current.status, status: nextStatus };
  });
}
