const UID = /^[A-Za-z0-9_-]{1,128}$/;
const ORG_ID = /^org_[a-f0-9]{32}$/;
const ACTION = /^[a-z][a-z0-9_.:-]{1,127}$/;

function isoTimestamp(value) {
  try {
    const date = value instanceof Date ? value
      : value && typeof value.toDate === 'function' ? value.toDate()
      : null;
    return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
  } catch {
    return null;
  }
}

/**
 * Return a bounded, metadata-only Platform Owner audit view.
 * Free-form details, reasons, opaque invitation IDs and support-session
 * references are intentionally never returned.
 */
export async function listPlatformAuditEvents({database, limit = 100}) {
  if (!database?.collection) throw new Error('platform_audit_unavailable');
  const boundedLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 100;
  const snapshot = await database.collection('platformAuditEvents')
    .orderBy('occurredAt', 'desc')
    .limit(boundedLimit + 1)
    .get();
  const hasMore = snapshot.docs.length > boundedLimit;
  const events = snapshot.docs.slice(0, boundedLimit).flatMap((document) => {
    const value = document.data();
    const occurredAt = isoTimestamp(value?.occurredAt);
    if (!value || typeof value.action !== 'string' || !ACTION.test(value.action) || !occurredAt) return [];
    const actorUid = typeof value.actorUid === 'string' && UID.test(value.actorUid) ? value.actorUid : null;
    const actorReference = typeof value.actorReference === 'string'
      && value.actorReference.length > 0 && value.actorReference.length <= 100
      && !/[\u0000-\u001f\u007f]/.test(value.actorReference)
      ? value.actorReference : null;
    if (!actorUid && !actorReference) return [];
    return [{
      eventId: typeof document.id === 'string' ? document.id : null,
      action: value.action,
      actorUid,
      actorReference,
      targetOrgId: typeof value.targetOrgId === 'string' && ORG_ID.test(value.targetOrgId)
        ? value.targetOrgId : null,
      targetUid: typeof value.targetUid === 'string' && UID.test(value.targetUid)
        ? value.targetUid : null,
      occurredAt,
    }];
  });
  return {events, hasMore};
}
