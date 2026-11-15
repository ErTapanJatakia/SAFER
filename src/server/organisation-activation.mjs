import { randomUUID } from 'node:crypto';

const ORG_ID = /^org_[a-f0-9]{32}$/;
const UID = /^[A-Za-z0-9_-]{1,128}$/;
const MEMBERSHIP_FIELDS = [
  'uid', 'orgId', 'role', 'status', 'createdAt', 'createdByUid',
  'updatedAt', 'updatedByUid', 'schemaVersion',
].sort();

export class OrganisationActivationError extends Error {
  constructor(code) { super(code); this.name = 'OrganisationActivationError'; this.code = code; }
}
const fail = (code) => { throw new OrganisationActivationError(code); }

/** Owner-controlled activation after exact initial Super Admin acceptance. */
export async function activateProvisionedOrganisation({
  orgId, actorUid, database, serverTimestamp,
}) {
  if (!ORG_ID.test(orgId ?? '') || !UID.test(actorUid ?? '')) fail('invalid_request');
  if (!database?.runTransaction || !database?.doc || typeof serverTimestamp !== 'function') fail('service_unavailable');
  const orgRef = database.doc(`organisations/${orgId}`);
  const timestamp = serverTimestamp();
  const auditRef = database.doc(`platformAuditEvents/${cryptoRandomId()}`);

  return database.runTransaction(async (tx) => {
    const orgSnap = await tx.get(orgRef);
    if (!orgSnap.exists) fail('organisation_not_found');
    const org = orgSnap.data();
    if (org.orgId !== orgId || org.status !== 'provisioning'
      || org.lifecycleStage !== 'super_admin_invitation_accepted'
      || !UID.test(org.ownerUid ?? '')) {
      fail('organisation_not_ready');
    }
    const ownerUid = org.ownerUid;
    const memberRef = database.doc(`organisations/${orgId}/members/${ownerUid}`);
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists) fail('super_admin_membership_unavailable');
    const member = memberSnap.data();
    const fields = Object.keys(member ?? {}).sort();
    if (fields.length !== MEMBERSHIP_FIELDS.length
      || fields.some((field, index) => field !== MEMBERSHIP_FIELDS[index])
      || member.uid !== ownerUid || member.orgId !== orgId
      || member.role !== 'tenant_super_admin' || member.status !== 'pending_activation'
      || member.schemaVersion !== 1 || typeof member.createdByUid !== 'string'
      || typeof member.updatedByUid !== 'string' || !member.createdAt || !member.updatedAt) {
      fail('super_admin_membership_unavailable');
    }
    tx.update(memberRef, { status: 'active', updatedAt: timestamp, updatedByUid: actorUid });
    tx.update(orgRef, {
      status: 'active', lifecycleStage: 'active',
      updatedAt: timestamp, updatedByUid: actorUid, activatedAt: timestamp, activatedByUid: actorUid,
    });
    tx.create(auditRef, {
      action: 'organisation.activated', actorUid, targetOrgId: orgId,
      targetUid: ownerUid, details: { lifecycleStage: 'active' }, occurredAt: timestamp,
    });
    return { orgId, status: 'active', superAdminUid: ownerUid };
  });
}

function cryptoRandomId() {
  return randomUUID();
}
