import { randomBytes } from 'node:crypto';

const ORG_ID = /^org_[a-f0-9]{32}$/;
const UID = /^[A-Za-z0-9_-]{1,128}$/;
const TRANSFER_ID = /^[A-Za-z0-9_-]{40,50}$/;
const LOWER_ROLES = new Set(['tenant_admin', 'tenant_manager', 'tenant_employee', 'tenant_auditor']);

export class OwnershipTransferError extends Error {
  constructor(code) { super(code); this.name = 'OwnershipTransferError'; this.code = code; }
}
const fail = (code) => { throw new OwnershipTransferError(code); };
const emailOf = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const millis = (value) => value instanceof Date ? value.getTime()
  : typeof value?.toMillis === 'function' ? value.toMillis()
  : typeof value?.toDate === 'function' ? value.toDate().getTime() : NaN;

/**
 * Two-party Super Admin succession. The incumbent remains authoritative until
 * the verified nominee accepts. Acceptance changes both memberships and the
 * organisation owner pointer in one Firestore transaction.
 */
export async function proposeOrganisationOwnershipTransfer({
  orgId, actorUid, targetEmail, database, authAdmin, serverTimestamp, now = Date.now(),
}) {
  if (!ORG_ID.test(orgId ?? '') || !UID.test(actorUid ?? '')) fail('invalid_request');
  const email = emailOf(targetEmail);
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('invalid_request');
  if (!database?.runTransaction || !database?.doc || typeof serverTimestamp !== 'function'
    || !authAdmin?.getUserByEmail) fail('service_unavailable');

  let nominee;
  try { nominee = await authAdmin.getUserByEmail(email); }
  catch (error) {
    if (error?.code === 'auth/user-not-found') fail('nominee_not_found');
    fail('identity_service_unavailable');
  }
  if (!nominee || nominee.disabled || nominee.emailVerified !== true
    || emailOf(nominee.email) !== email || !UID.test(nominee.uid ?? '')
    || nominee.uid === actorUid) fail('verified_nominee_required');

  const transferId = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now + 72 * 60 * 60 * 1000);
  const orgRef = database.doc(`organisations/${orgId}`);
  const actorRef = database.doc(`organisations/${orgId}/members/${actorUid}`);
  const nomineeRef = database.doc(`organisations/${orgId}/members/${nominee.uid}`);
  const transferRef = database.doc(`organisations/${orgId}/ownershipTransfers/${transferId}`);
  const auditRef = database.doc(`organisations/${orgId}/auditEvents/${randomBytes(16).toString('hex')}`);
  const timestamp = serverTimestamp();

  await database.runTransaction(async (tx) => {
    const [orgSnap, actorSnap, nomineeSnap] = await Promise.all([
      tx.get(orgRef), tx.get(actorRef), tx.get(nomineeRef),
    ]);
    if (!orgSnap.exists || !actorSnap.exists) fail('active_super_admin_required');
    const org = orgSnap.data(); const actor = actorSnap.data();
    if (org.orgId !== orgId || org.status !== 'active' || org.ownerUid !== actorUid
      || actor.uid !== actorUid || actor.orgId !== orgId || actor.role !== 'tenant_super_admin'
      || actor.status !== 'active' || actor.schemaVersion !== 1) fail('active_super_admin_required');
    if (nomineeSnap.exists) {
      const member = nomineeSnap.data();
      if (member.uid !== nominee.uid || member.orgId !== orgId || member.status !== 'active'
        || !LOWER_ROLES.has(member.role) || member.schemaVersion !== 1) fail('nominee_membership_conflict');
    }
    tx.create(transferRef, {
      transferId, orgId, fromUid: actorUid, toUid: nominee.uid, toEmail: email,
      status: 'pending', createdAt: timestamp, expiresAt, createdByUid: actorUid,
      schemaVersion: 1,
    });
    tx.create(auditRef, {
      orgId, action: 'organisation.ownership_transfer.proposed', actorUid,
      targetUid: nominee.uid, occurredAt: timestamp,
      details: { transferId, expiresAt: expiresAt.toISOString() },
    });
  });
  return { orgId, transferId, status: 'pending', expiresAt: expiresAt.toISOString() };
}

export async function acceptOrganisationOwnershipTransfer({
  orgId, transferId, actorUid, actorEmail, actorEmailVerified,
  database, serverTimestamp, now = Date.now(),
}) {
  if (!ORG_ID.test(orgId ?? '') || !TRANSFER_ID.test(transferId ?? '') || !UID.test(actorUid ?? '')) fail('invalid_request');
  const email = emailOf(actorEmail);
  if (!actorEmailVerified || !email) fail('verified_account_required');
  if (!database?.runTransaction || !database?.doc || typeof serverTimestamp !== 'function') fail('service_unavailable');

  const orgRef = database.doc(`organisations/${orgId}`);
  const transferRef = database.doc(`organisations/${orgId}/ownershipTransfers/${transferId}`);
  const nomineeRef = database.doc(`organisations/${orgId}/members/${actorUid}`);
  const auditRef = database.doc(`organisations/${orgId}/auditEvents/${randomBytes(16).toString('hex')}`);
  const timestamp = serverTimestamp();

  return database.runTransaction(async (tx) => {
    const [orgSnap, transferSnap, nomineeSnap] = await Promise.all([
      tx.get(orgRef), tx.get(transferRef), tx.get(nomineeRef),
    ]);
    if (!orgSnap.exists || !transferSnap.exists) fail('transfer_unavailable');
    const org = orgSnap.data(); const transfer = transferSnap.data();
    if (transfer.transferId !== transferId || transfer.orgId !== orgId
      || transfer.toUid !== actorUid || emailOf(transfer.toEmail) !== email
      || transfer.schemaVersion !== 1) fail('transfer_identity_mismatch');
    if (transfer.status !== 'pending') fail('transfer_unavailable');
    if (!Number.isFinite(millis(transfer.expiresAt)) || millis(transfer.expiresAt) <= now) fail('transfer_expired');
    if (org.status !== 'active' || org.ownerUid !== transfer.fromUid) fail('ownership_changed');
    if (nomineeSnap.exists) {
      const member = nomineeSnap.data();
      if (member.uid !== actorUid || member.orgId !== orgId || member.status !== 'active'
        || !LOWER_ROLES.has(member.role) || member.schemaVersion !== 1) fail('nominee_membership_conflict');
    }
    const incumbentRef = database.doc(`organisations/${orgId}/members/${transfer.fromUid}`);
    const incumbentSnap = await tx.get(incumbentRef);
    if (!incumbentSnap.exists) fail('incumbent_membership_unavailable');
    const incumbent = incumbentSnap.data();
    if (incumbent.uid !== transfer.fromUid || incumbent.orgId !== orgId
      || incumbent.role !== 'tenant_super_admin' || incumbent.status !== 'active'
      || incumbent.schemaVersion !== 1) fail('incumbent_membership_unavailable');

    if (nomineeSnap.exists) {
      tx.update(nomineeRef, { role: 'tenant_super_admin', updatedAt: timestamp, updatedByUid: actorUid });
    } else {
      tx.create(nomineeRef, {
        uid: actorUid, orgId, role: 'tenant_super_admin', status: 'active',
        createdAt: timestamp, createdByUid: transfer.fromUid,
        updatedAt: timestamp, updatedByUid: actorUid, schemaVersion: 1,
      });
    }
    tx.update(incumbentRef, { role: 'tenant_admin', updatedAt: timestamp, updatedByUid: actorUid });
    tx.update(orgRef, { ownerUid: actorUid, updatedAt: timestamp, updatedByUid: actorUid });
    tx.update(transferRef, { status: 'accepted', acceptedAt: timestamp, acceptedByUid: actorUid });
    tx.create(auditRef, {
      orgId, action: 'organisation.ownership_transfer.accepted', actorUid,
      targetUid: transfer.fromUid, occurredAt: timestamp,
      details: { transferId, previousSuperAdminUid: transfer.fromUid, newSuperAdminUid: actorUid },
    });
    return { orgId, status: 'accepted', previousSuperAdminUid: transfer.fromUid, superAdminUid: actorUid };
  });
}
