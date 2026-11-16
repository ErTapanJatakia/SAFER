const ORG_ID = /^org_[a-f0-9]{32}$/;
const EVENT_ID = /^[A-Za-z0-9_-]{1,128}$/;
const ACTION = /^[a-z][a-z0-9_.:-]{1,127}$/;
const DATE = /^\\d{4}-\\d{2}-\\d{2}$/;

function dateBound(value, exclusiveEnd = false) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !DATE.test(value)) {
    const error = new Error('invalid_request'); error.code = 'invalid_request'; throw error;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    const error = new Error('invalid_request'); error.code = 'invalid_request'; throw error;
  }
  if (exclusiveEnd) parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed;
}

/** Return a minimized tenant audit page; never expose details or invitation IDs. */
export async function listTenantAuditEvents({
  orgId, database, limit = 50, cursor = null, startDate = null, endDate = null,
}) {
  if (typeof orgId !== 'string' || !ORG_ID.test(orgId) || !database?.collection || !database?.doc) {
    const error = new Error('invalid_request'); error.code = 'invalid_request'; throw error;
  }
  const boundedLimit = Math.min(Math.max(Number.isInteger(Number(limit)) ? Number(limit) : 50, 1), 100);
  const start = dateBound(startDate);
  const end = dateBound(endDate, true);
  if (start && end && start >= end) {
    const error = new Error('invalid_request'); error.code = 'invalid_request'; throw error;
  }
  if (cursor !== null && (typeof cursor !== 'string' || !EVENT_ID.test(cursor))) {
    const error = new Error('invalid_request'); error.code = 'invalid_request'; throw error;
  }

  const collectionPath = `organisations/${orgId}/auditEvents`;
  let query = database.collection(collectionPath);
  if (start) query = query.where('occurredAt', '>=', start);
  if (end) query = query.where('occurredAt', '<', end);
  query = query.orderBy('occurredAt', 'desc');

  if (cursor) {
    const cursorSnapshot = await database.doc(`${collectionPath}/${cursor}`).get();
    const cursorData = cursorSnapshot.data();
    const cursorTime = cursorData?.occurredAt?.toDate?.();
    if (!cursorSnapshot.exists || cursorData?.orgId !== orgId
      || !(cursorTime instanceof Date) || !Number.isFinite(cursorTime.getTime())
      || (start && cursorTime < start) || (end && cursorTime >= end)) {
      const error = new Error('invalid_request'); error.code = 'invalid_request'; throw error;
    }
    query = query.startAfter(cursorSnapshot);
  }

  const snapshot = await query.limit(boundedLimit + 1).get();
  const hasMore = snapshot.docs.length > boundedLimit;
  const nextCursor = hasMore ? snapshot.docs[boundedLimit - 1]?.id ?? null : null;
  const events = snapshot.docs.slice(0, boundedLimit).flatMap((doc) => {
    const value = doc.data();
    if (value.orgId !== orgId || typeof value.actorUid !== 'string'
      || !ACTION.test(value.action ?? '')) return [];
    const occurredAt = value.occurredAt?.toDate?.();
    if (!(occurredAt instanceof Date) || !Number.isFinite(occurredAt.getTime())) return [];
    return [{
      eventId: doc.id,
      action: value.action,
      actorUid: value.actorUid,
      targetUid: typeof value.targetUid === 'string' ? value.targetUid : null,
      targetResourceId: typeof value.targetResourceId === 'string' ? value.targetResourceId : null,
      occurredAt: occurredAt.toISOString(),
    }];
  });
  return { orgId, events, hasMore, nextCursor };
}
