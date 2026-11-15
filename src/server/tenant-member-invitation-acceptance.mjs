import { randomBytes } from 'node:crypto';

const ORG_ID_PATTERN = /^org_[a-f0-9]{32}$/;
const INVITATION_ID_PATTERN = /^[A-Za-z0-9_-]{40,50}$/;
const TENANT_ROLES = Object.freeze([
  'tenant_admin', 'tenant_manager', 'tenant_employee', 'tenant_auditor',
]);

export class TenantInvitationAcceptanceError extends Error {
  constructor(code) {
    super(code);
    this.name = 'TenantInvitationAcceptanceError';
    this.code = code;
  }
}

function fail(code) {
  throw new TenantInvitationAcceptanceError(code);
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function timestampMillis(value) {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value.toDate === 'function') return value.toDate().getTime();
  return Number.NaN;
}

/**
 * Accept an invitation for an ordinary PMC role. The organisation must
 * already be active; Super Admin provisioning uses its separate lifecycle.
 */
export async function acceptTenantMemberInvitation({
  orgId, invitationId, actorUid, actorEmail, actorEmailVerified,
  database, serverTimestamp, now = Date.now(),
}) {
  if (typeof orgId !== 'string' || !ORG_ID_PATTERN.test(orgId)
    || typeof invitationId !== 'string' || !INVITATION_ID_PATTERN.test(invitationId)
    || typeof actorUid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(actorUid)) {
    fail('invalid_invitation');
  }
  const email = normalizeEmail(actorEmail);
  if (!actorEmailVerified || !email) fail('verified_account_required');
  if (!database?.runTransaction || !database?.doc || typeof serverTimestamp !== 'function') {
    fail('service_unavailable');
  }

  const orgRef = database.doc(`organisations/${orgId}`);
  const invitationRef = database.doc(`organisations/${orgId}/invitations/${invitationId}`);
  const memberRef = database.doc(`organisations/${orgId}/members/${actorUid}`);
  const auditRef = database.doc(`organisations/${orgId}/auditEvents/${randomBytes(16).toString('hex')}`);
  const timestamp = serverTimestamp();

  return database.runTransaction(async (transaction) => {
    const [orgSnapshot, invitationSnapshot, memberSnapshot] = await Promise.all([
      transaction.get(orgRef), transaction.get(invitationRef), transaction.get(memberRef),
    ]);
    if (!orgSnapshot.exists || !invitationSnapshot.exists) fail('invalid_invitation');
    const organisation = orgSnapshot.data();
    const invitation = invitationSnapshot.data();

    if (organisation.orgId !== orgId || organisation.status !== 'active') {
      fail('organisation_unavailable');
    }
    if (invitation.invitationId !== invitationId || invitation.orgId !== orgId
      || invitation.uid !== actorUid || normalizeEmail(invitation.email) !== email
      || !TENANT_ROLES.includes(invitation.role) || invitation.schemaVersion !== 1) {
      fail('invitation_identity_mismatch');
    }
    if (invitation.status !== 'pending') fail('invitation_unavailable');
    const expiresAt = timestampMillis(invitation.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= now) fail('invitation_expired');
    if (memberSnapshot.exists) fail('membership_conflict');
    if (typeof invitation.invitedByUid !== 'string' || !invitation.invitedByUid) {
      fail('invalid_invitation');
    }

    transaction.create(memberRef, {
      uid: actorUid, orgId, role: invitation.role, status: 'active',
      createdAt: timestamp, createdByUid: invitation.invitedByUid,
      updatedAt: timestamp, updatedByUid: actorUid, schemaVersion: 1,
    });
    transaction.update(invitationRef, {
      status: 'accepted', acceptedAt: timestamp, acceptedByUid: actorUid, updatedAt: timestamp,
    });
    transaction.create(auditRef, {
      action: 'tenant.member.invitation_accepted',
      actorUid, targetOrgId: orgId, targetUid: actorUid,
      details: { invitationId, role: invitation.role },
      occurredAt: timestamp,
    });
    return {
      orgId, invitationId, role: invitation.role,
      status: 'accepted', membershipStatus: 'active',
    };
  });
}
