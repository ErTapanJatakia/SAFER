import { randomBytes, randomUUID } from 'node:crypto';

const ORG_NAME_MAX = 120;
const EMAIL_MAX = 254;

function requiredText(value, label, maxLength) {
  if (typeof value !== 'string') throw new Error(`A valid ${label} is required.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error(`A valid ${label} is required.`);
  }
  return normalized;
}

function normalizeEmail(value) {
  const email = requiredText(value, 'Super Admin email', EMAIL_MAX).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid Super Admin email is required.');
  return email;
}

/**
 * Creates an organisation registry record and a pending Super Admin invitation.
 * It deliberately does not create an active membership or grant tenant data access.
 * Invitation acceptance and tenant API activation are separate security milestones.
 */
export async function createOrganisationWithSuperAdminInvitation({
  displayName,
  superAdminEmail,
  actorUid,
  database,
  authAdmin,
  serverTimestamp,
}) {
  const name = requiredText(displayName, 'organisation name', ORG_NAME_MAX);
  const email = normalizeEmail(superAdminEmail);
  const actor = requiredText(actorUid, 'authenticated Platform Owner UID', 128);
  if (!/^[A-Za-z0-9_-]+$/.test(actor)) throw new Error('The authenticated Platform Owner identity is invalid.');

  if (!authAdmin?.getUserByEmail || !database?.runTransaction || !database?.doc
    || !database?.collection || typeof serverTimestamp !== 'function') {
    throw new Error('Organisation provisioning is unavailable.');
  }
  const invitedUser = await authAdmin.getUserByEmail(email);
  if (!invitedUser || invitedUser.disabled === true || invitedUser.emailVerified !== true
    || typeof invitedUser.uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(invitedUser.uid)
    || typeof invitedUser.email !== 'string'
    || invitedUser.email.trim().toLowerCase() !== email) {
    throw new Error('The nominated Super Admin account is not eligible.');
  }

  const orgId = `org_${randomUUID().replace(/-/g, '')}`;
  const invitationId = randomBytes(32).toString('base64url');
  const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const orgRef = database.doc(`organisations/${orgId}`);
  const invitationRef = database.doc(`organisations/${orgId}/invitations/${invitationId}`);
  const auditRef = database.collection('platformAuditEvents').doc();
  const timestamp = serverTimestamp();

  await database.runTransaction(async (transaction) => {
    const existing = await transaction.get(orgRef);
    if (existing.exists) throw new Error('The generated organisation identifier already exists. Retry the request.');
    transaction.create(orgRef, {
      orgId,
      displayName: name,
      status: 'provisioning',
      lifecycleStage: 'super_admin_invitation_pending',
      createdAt: timestamp,
      createdByUid: actor,
      updatedAt: timestamp,
    });
    transaction.create(invitationRef, {
      invitationId,
      uid: invitedUser.uid,
      email,
      orgId,
      role: 'tenant_super_admin',
      status: 'pending',
      invitedAt: timestamp,
      expiresAt: invitationExpiresAt,
      invitedByUid: actor,
      schemaVersion: 1,
    });
    transaction.create(auditRef, {
      action: 'organisation.created',
      actorUid: actor,
      targetOrgId: orgId,
      targetUid: invitedUser.uid,
      details: { displayName: name, invitationStatus: 'pending' },
      occurredAt: timestamp,
    });
  });

  return {
    orgId,
    displayName: name,
    status: 'provisioning',
    superAdminInvitation: { invitationId, uid: invitedUser.uid, email, status: 'pending', expiresAt: invitationExpiresAt.toISOString() },
  };
}


/**
 * Cancels the initial Super Admin invitation before it is accepted. The
 * organisation is moved to suspended/revoked state in the same transaction,
 * so the generic registry cannot reactivate this provisioning record.
 */
export async function revokeSuperAdminInvitation({
  orgId, invitationId, actorUid, reason, database, serverTimestamp,
}) {
  if (typeof orgId !== 'string' || !/^org_[a-f0-9]{32}$/.test(orgId)
    || typeof invitationId !== 'string' || !/^[A-Za-z0-9_-]{40,50}$/.test(invitationId)
    || typeof actorUid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(actorUid)
    || typeof reason !== 'string' || reason.trim().length < 10
    || reason.trim().length > 500 || /[\u0000-\u001f\u007f]/.test(reason)) {
    throw new Error('invalid_super_admin_invitation_request');
  }
  if (!database?.runTransaction || !database?.doc || !database?.collection
    || typeof serverTimestamp !== 'function') {
    throw new Error('organisation_invitation_revocation_unavailable');
  }

  const organisationRef = database.doc('organisations/' + orgId);
  const invitationRef = database.doc('organisations/' + orgId + '/invitations/' + invitationId);
  const auditRef = database.collection('platformAuditEvents').doc();
  const timestamp = serverTimestamp();

  return database.runTransaction(async (transaction) => {
    const [organisationSnapshot, invitationSnapshot] = await Promise.all([
      transaction.get(organisationRef),
      transaction.get(invitationRef),
    ]);
    if (!organisationSnapshot.exists || !invitationSnapshot.exists) {
      throw new Error('super_admin_invitation_not_found');
    }
    const organisation = organisationSnapshot.data();
    const invitation = invitationSnapshot.data();
    if (organisation.orgId !== orgId || organisation.status !== 'provisioning'
      || organisation.lifecycleStage !== 'super_admin_invitation_pending') {
      throw new Error('super_admin_invitation_not_pending');
    }
    if (invitation.invitationId !== invitationId || invitation.orgId !== orgId
      || invitation.role !== 'tenant_super_admin' || invitation.schemaVersion !== 1
      || !/^[A-Za-z0-9_-]{1,128}$/.test(invitation.uid ?? '')
      || !/^[A-Za-z0-9_-]{1,128}$/.test(invitation.invitedByUid ?? '')
      || typeof invitation.email !== 'string'
      || normalizeEmail(invitation.email) !== invitation.email.toLowerCase()) {
      throw new Error('super_admin_invitation_unavailable');
    }
    if (invitation.status !== 'pending') throw new Error('super_admin_invitation_not_pending');

    transaction.update(invitationRef, {
      status: 'revoked',
      revokedAt: timestamp,
      revokedByUid: actorUid,
      revocationReason: reason.trim(),
      updatedAt: timestamp,
    });
    transaction.update(organisationRef, {
      status: 'suspended',
      lifecycleStage: 'super_admin_invitation_revoked',
      suspendedAt: timestamp,
      suspendedByUid: actorUid,
      updatedAt: timestamp,
      updatedByUid: actorUid,
    });
    transaction.create(auditRef, {
      action: 'organisation.super_admin_invitation_revoked',
      actorUid,
      targetOrgId: orgId,
      targetUid: invitation.uid,
      details: { invitationId, reason: reason.trim() },
      occurredAt: timestamp,
    });
    return { orgId, invitationId, status: 'revoked', organisationStatus: 'suspended' };
  });
}
