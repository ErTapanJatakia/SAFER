const ORG_ID = /^org_[a-f0-9]{32}$/;
const UID = /^[A-Za-z0-9_-]{1,128}$/;
const ACTION = /^[a-z][a-z0-9_.:-]{1,127}$/;
const RESOURCE_ID_MAX = 256;

function safeTimestamp(value) {
  try {
    const date = value?.toDate?.();
    return date instanceof Date && Number.isFinite(date.getTime())
      ? date.toISOString()
      : null;
  } catch {
    return null;
  }
}

/** Return a deliberately minimized tenant audit view; never expose details or opaque invitation IDs. */
export async function listTenantAuditEvents({ orgId, database, limit = 100 }) {
  if (typeof orgId !== 'string' || !ORG_ID.test(orgId) || !database?.collection) {
    const error = new Error('invalid_request'); error.code = 'invalid_request'; throw error;
  }
  const requestedLimit = Number(limit);
  const boundedLimit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 100;
  const snapshot = await database.collection(`organisations/${orgId}/auditEvents`)
    .orderBy('occurredAt', 'desc').limit(boundedLimit + 1).get();
  const hasMore = snapshot.docs.length > boundedLimit;
  const events = snapshot.docs.slice(0, boundedLimit).flatMap((doc) => {
    const value = doc.data();
    const occurredAt = safeTimestamp(value?.occurredAt);
    if (value?.orgId !== orgId || !UID.test(value.actorUid ?? '')
      || typeof value.action !== 'string' || !ACTION.test(value.action)
      || !/^[A-Za-z0-9_-]{1,128}$/.test(doc.id ?? '') || !occurredAt) return [];
    const targetUid = value.targetUid == null ? null
      : UID.test(value.targetUid) ? value.targetUid : null;
    const targetResourceId = value.targetResourceId == null ? null
      : typeof value.targetResourceId === 'string'
        && value.targetResourceId.length <= RESOURCE_ID_MAX
        && !/[\\u0000-\\u001f\\u007f]/.test(value.targetResourceId)
        ? value.targetResourceId : null;
    return [{
      eventId: doc.id,
      action: value.action,
      actorUid: value.actorUid,
      targetUid,
      targetResourceId,
      occurredAt,
    }];
  });
  return { orgId, events, hasMore };
}
