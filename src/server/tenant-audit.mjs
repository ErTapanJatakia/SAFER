const ORG_ID = /^org_[a-f0-9]{32}$/;
const ACTION = /^[a-z][a-z0-9_.:-]{1,127}$/;

/** Return a deliberately minimized tenant audit view; never expose details or opaque invitation IDs. */
export async function listTenantAuditEvents({ orgId, database, limit = 100 }) {
  if (typeof orgId !== 'string' || !ORG_ID.test(orgId) || !database?.collection) {
    const error = new Error('invalid_request'); error.code = 'invalid_request'; throw error;
  }
  const boundedLimit = Math.min(Math.max(Number(limit) || 100, 1), 100);
  const snapshot = await database.collection(`organisations/${orgId}/auditEvents`)
    .orderBy('occurredAt', 'desc').limit(boundedLimit + 1).get();
  const hasMore = snapshot.docs.length > boundedLimit;
  const events = snapshot.docs.slice(0, boundedLimit).flatMap((doc) => {
    const value = doc.data();
    if (value.orgId !== orgId || typeof value.actorUid !== 'string'
      || typeof value.action !== 'string' || !ACTION.test(value.action)) return [];
    return [{
      eventId: doc.id,
      action: value.action,
      actorUid: value.actorUid,
      targetUid: typeof value.targetUid === 'string' ? value.targetUid : null,
      targetResourceId: typeof value.targetResourceId === 'string' ? value.targetResourceId : null,
      occurredAt: value.occurredAt?.toDate?.()?.toISOString?.() ?? null,
    }];
  });
  return { orgId, events, hasMore };
}
