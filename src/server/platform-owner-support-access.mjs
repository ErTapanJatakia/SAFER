import { randomBytes } from 'node:crypto';

const UID = /^[A-Za-z0-9_-]{1,128}$/;
const ORG_ID = /^org_[a-f0-9]{32}$/;
const SESSION_ID = /^[a-f0-9]{64}$/;
const ACTIONS = Object.freeze([
  'platform:tenant-data:read',
  'platform:tenant-data:write',
  'platform:tenant-data:export',
]);
const ACTION_SET = new Set(ACTIONS);

function requiredText(value, label, min, max) {
  if (typeof value !== 'string') throw new Error(`A valid ${label} is required.`);
  const text = value.trim();
  if (text.length < min || text.length > max || /[\u0000-\u001f\u007f]/.test(text)) {
    throw new Error(`A valid ${label} is required.`);
  }
  return text;
}

function validOwner(actorUid, principal) {
  return UID.test(actorUid ?? '')
    && principal?.uid === actorUid
    && principal?.role === 'platform_owner'
    && principal?.status === 'active';
}

function timestampMillis(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  return Number.NaN;
}

function auditReference(database) {
  return database.collection('platformAuditEvents').doc();
}

/**
 * Creates a narrowly scoped, time-limited Platform Owner support session.
 * The session is bound to one Owner, one active PMC and an explicit action set.
 */
export async function createPlatformSupportSession({
  actorUid, principal, orgId, purpose, changeReference, actions,
  durationMinutes = 15, database, serverTimestamp, now = Date.now(),
}) {
  if (!validOwner(actorUid, principal)) throw new Error('active_platform_owner_required');
  if (!ORG_ID.test(orgId ?? '')) throw new Error('invalid_support_organisation');
  const auditPurpose = requiredText(purpose, 'support purpose', 20, 500);
  const changeRef = requiredText(changeReference, 'change or ticket reference', 6, 100);
  if (!Array.isArray(actions) || actions.length < 1 || actions.length > ACTIONS.length
    || actions.some((action) => !ACTION_SET.has(action))
    || new Set(actions).size !== actions.length) {
    throw new Error('invalid_support_actions');
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 30) {
    throw new Error('invalid_support_duration');
  }
  if (!database?.runTransaction || typeof serverTimestamp !== 'function' || !Number.isFinite(now)) {
    throw new Error('support_access_unavailable');
  }

  const sessionId = randomBytes(32).toString('hex');
  const sessionRef = database.doc(`platformSupportSessions/${sessionId}`);
  const organisationRef = database.doc(`organisations/${orgId}`);
  const auditRef = auditReference(database);
  const expiresAt = new Date(now + durationMinutes * 60 * 1000);
  const timestamp = serverTimestamp();

  await database.runTransaction(async (transaction) => {
    const organisation = await transaction.get(organisationRef);
    const record = organisation.exists ? organisation.data() : null;
    if (!record || record.orgId !== orgId || record.status !== 'active') {
      throw new Error('active_support_organisation_required');
    }
    transaction.create(sessionRef, {
      sessionId, actorUid, orgId, purpose: auditPurpose, changeReference: changeRef,
      actions: [...actions].sort(), status: 'active', createdAt: timestamp,
      expiresAt, revokedAt: null, revokedByUid: null,
    });
    transaction.create(auditRef, {
      action: 'platform.support_access.activated', actorUid, targetOrgId: orgId,
      occurredAt: timestamp,
      details: {
        sessionReference: sessionId.slice(0, 12), purpose: auditPurpose,
        changeReference: changeRef, actions: [...actions].sort(),
        durationMinutes, expiresAt: expiresAt.toISOString(),
      },
    });
  });

  return Object.freeze({
    sessionId, orgId, actions: [...actions].sort(),
    expiresAt: expiresAt.toISOString(), durationMinutes,
  });
}

/** Revokes only a session owned by the currently authenticated Platform Owner. */
export async function revokePlatformSupportSession({
  actorUid, principal, sessionId, reason, changeReference,
  database, serverTimestamp,
}) {
  if (!validOwner(actorUid, principal)) throw new Error('active_platform_owner_required');
  if (!SESSION_ID.test(sessionId ?? '')) throw new Error('invalid_support_session');
  const revokeReason = requiredText(reason, 'revocation reason', 10, 500);
  const changeRef = requiredText(changeReference, 'change or ticket reference', 6, 100);
  if (!database?.runTransaction || typeof serverTimestamp !== 'function') {
    throw new Error('support_access_unavailable');
  }
  const sessionRef = database.doc(`platformSupportSessions/${sessionId}`);
  const auditRef = auditReference(database);
  const timestamp = serverTimestamp();

  await database.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);
    if (!snapshot.exists) throw new Error('support_session_not_found');
    const session = snapshot.data();
    if (session.actorUid !== actorUid) throw new Error('support_session_owner_mismatch');
    if (session.status !== 'active') throw new Error('support_session_not_active');
    transaction.update(sessionRef, {
      status: 'revoked', revokedAt: timestamp, revokedByUid: actorUid,
      revocationReason: revokeReason, revocationChangeReference: changeRef,
    });
    transaction.create(auditRef, {
      action: 'platform.support_access.revoked', actorUid,
      targetOrgId: session.orgId, occurredAt: timestamp,
      details: {
        sessionReference: sessionId.slice(0, 12), reason: revokeReason,
        changeReference: changeRef,
      },
    });
  });
  return { revoked: true };
}

/**
 * Checks a support session and appends an audit event in the same transaction
 * before the caller performs the requested cross-tenant data operation.
 */
export async function authorizePlatformSupportAccess({
  actorUid, principal, sessionId, orgId, action,
  database, serverTimestamp, now = Date.now(),
}) {
  if (!validOwner(actorUid, principal)) throw new Error('active_platform_owner_required');
  if (!SESSION_ID.test(sessionId ?? '') || !ORG_ID.test(orgId ?? '') || !ACTION_SET.has(action)) {
    throw new Error('invalid_support_access_request');
  }
  if (!database?.runTransaction || typeof serverTimestamp !== 'function' || !Number.isFinite(now)) {
    throw new Error('support_access_unavailable');
  }
  const sessionRef = database.doc(`platformSupportSessions/${sessionId}`);
  const organisationRef = database.doc(`organisations/${orgId}`);
  const auditRef = auditReference(database);
  const timestamp = serverTimestamp();
  let authorisedSession;

  await database.runTransaction(async (transaction) => {
    const [snapshot, organisation] = await Promise.all([
      transaction.get(sessionRef), transaction.get(organisationRef),
    ]);
    if (!snapshot.exists) throw new Error('support_session_not_found');
    const session = snapshot.data();
    if (session.actorUid !== actorUid) throw new Error('support_session_owner_mismatch');
    const expiry = timestampMillis(session.expiresAt);
    if (session.status !== 'active' || !Number.isFinite(expiry) || expiry <= now) {
      throw new Error('support_session_expired_or_revoked');
    }
    if (session.orgId !== orgId || !Array.isArray(session.actions) || !session.actions.includes(action)) {
      throw new Error('support_access_scope_mismatch');
    }
    const organisationRecord = organisation.exists ? organisation.data() : null;
    if (!organisationRecord || organisationRecord.orgId !== orgId || organisationRecord.status !== 'active') {
      throw new Error('active_support_organisation_required');
    }
    transaction.create(auditRef, {
      action: 'platform.support_access.action_authorized', actorUid,
      targetOrgId: orgId, occurredAt: timestamp,
      details: {
        sessionReference: sessionId.slice(0, 12), requestedAction: action,
        purpose: session.purpose, changeReference: session.changeReference,
      },
    });
    authorisedSession = Object.freeze({
      actorUid, orgId, actions: [...session.actions], purpose: session.purpose,
      changeReference: session.changeReference, expiresAt: session.expiresAt,
    });
  });

  return authorisedSession;
}

export const PLATFORM_SUPPORT_ACTIONS = ACTIONS;
