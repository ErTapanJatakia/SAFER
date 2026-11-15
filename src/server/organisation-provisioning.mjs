import { randomUUID } from 'node:crypto';

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

  const invitedUser = await authAdmin.getUserByEmail(email);
  if (!invitedUser.emailVerified) throw new Error('The nominated Super Admin must verify their email before invitation.');
  if (invitedUser.disabled) throw new Error('The nominated Super Admin account is disabled.');

  const orgId = `org_${randomUUID().replace(/-/g, '')}`;
  const orgRef = database.doc(`organisations/${orgId}`);
  const invitationRef = database.doc(`organisations/${orgId}/invitations/${invitedUser.uid}`);
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
      uid: invitedUser.uid,
      email,
      orgId,
      role: 'tenant_super_admin',
      status: 'pending',
      invitedAt: timestamp,
      invitedByUid: actor,
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
    superAdminInvitation: { uid: invitedUser.uid, email, status: 'pending' },
  };
}
