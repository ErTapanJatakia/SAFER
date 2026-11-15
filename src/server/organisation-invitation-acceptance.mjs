const ORG_ID_PATTERN = /^org_[a-f0-9]{32}$/;
const INVITATION_ID_PATTERN = /^[A-Za-z0-9_-]{40,50}$/;
const SUPER_ADMIN_ROLE = 'tenant_super_admin';

export class InvitationAcceptanceError extends Error {
  constructor(code) {
    super(code);
    this.name = 'InvitationAcceptanceError';
    this.code = code;
  }
}

function fail(code) {
  throw new InvitationAcceptanceError(code);
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

function matchesAcceptedMembership(membership, uid, orgId) {
  return Boolean(
    membership
    && membership.uid === uid
    && membership.orgId === orgId
    && membership.role === SUPER_ADMIN_ROLE
    && ['pending_activation', 'active'].includes(membership.status)
    && membership.schemaVersion === 1,
  );
}

/**
 * Accept a pending Super Admin invitation for the exact authenticated UID.
 * Membership is created as pending_activation: it cannot pass the active-only
 * resolver or Firestore Rules until the separate activation workflow completes.
 */
export async function acceptSuperAdminInvitation({
  orgId,
  invitationId,
  actorUid,
  actorEmail,
  actorEmailVerified,
  database,
  serverTimestamp,
  now = Date.now(),
}) {
  if (typeof orgId !== 'string' || !ORG_ID_PATTERN.test(orgId)) fail('invalid_invitation');
  if (typeof invitationId !== 'string' || !INVITATION_ID_PATTERN.test(invitationId)) fail('invalid_invitation');
  if (typeof actorUid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(actorUid)) fail('unauthenticated');
  const normalizedEmail = normalizeEmail(actorEmail);
  if (!actorEmailVerified || !normalizedEmail) fail('verified_account_required');
  if (!database || typeof database.runTransaction !== 'function' || typeof serverTimestamp !== 'function') {
    fail('service_unavailable');
  }

  const organisationRef = database.doc(`organisations/${orgId}`);
  const invitationRef = database.doc(`organisations/${orgId}/invitations/${invitationId}`);
  const membershipRef = database.doc(`organisations/${orgId}/members/${actorUid}`);
  const auditRef = database.collection('platformAuditEvents').doc();
  const timestamp = serverTimestamp();

  return database.runTransaction(async (transaction) => {
    const [organisationSnapshot, invitationSnapshot, membershipSnapshot] = await Promise.all([
      transaction.get(organisationRef),
      transaction.get(invitationRef),
      transaction.get(membershipRef),
    ]);

    if (!organisationSnapshot.exists || !invitationSnapshot.exists) fail('invalid_invitation');

    const organisation = organisationSnapshot.data();
    const invitation = invitationSnapshot.data();

    if (
      invitation.invitationId !== invitationId
      || invitation.orgId !== orgId
      || invitation.uid !== actorUid
      || normalizeEmail(invitation.email) !== normalizedEmail
      || invitation.role !== SUPER_ADMIN_ROLE
      || invitation.schemaVersion !== 1
    ) fail('invitation_identity_mismatch');

    if (organisation.orgId !== orgId) fail('invalid_invitation');
    if (!['provisioning', 'active'].includes(organisation.status)) fail('organisation_unavailable');

    if (invitation.status === 'accepted') {
      const membership = membershipSnapshot.exists ? membershipSnapshot.data() : null;
      if (
        invitation.acceptedByUid !== actorUid
        || !matchesAcceptedMembership(membership, actorUid, orgId)
        || !['super_admin_invitation_accepted', 'active'].includes(organisation.lifecycleStage)
      ) fail('invitation_conflict');
      return {
        orgId,
        invitationId,
        status: 'accepted',
        membershipStatus: membership.status,
        activationRequired: membership.status !== 'active',
        idempotent: true,
      };
    }

    if (invitation.status !== 'pending') fail('invitation_unavailable');
    if (
      organisation.status !== 'provisioning'
      || organisation.lifecycleStage !== 'super_admin_invitation_pending'
    ) fail('organisation_not_ready');
    const expiresAt = timestampMillis(invitation.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= now) fail('invitation_expired');
    if (membershipSnapshot.exists) fail('membership_conflict');
    if (typeof invitation.invitedByUid !== 'string' || !invitation.invitedByUid) fail('invalid_invitation');

    transaction.create(membershipRef, {
      uid: actorUid,
      orgId,
      role: SUPER_ADMIN_ROLE,
      status: 'pending_activation',
      createdAt: timestamp,
      createdByUid: invitation.invitedByUid,
      updatedAt: timestamp,
      updatedByUid: actorUid,
      schemaVersion: 1,
    });
    transaction.update(invitationRef, {
      status: 'accepted',
      acceptedAt: timestamp,
      acceptedByUid: actorUid,
      updatedAt: timestamp,
    });
    transaction.update(organisationRef, {
      lifecycleStage: 'super_admin_invitation_accepted',
      updatedAt: timestamp,
    });
    transaction.create(auditRef, {
      action: 'organisation.super_admin_invitation_accepted',
      actorUid,
      targetOrgId: orgId,
      targetUid: actorUid,
      details: { invitationId, membershipStatus: 'pending_activation' },
      occurredAt: timestamp,
    });

    return {
      orgId,
      invitationId,
      status: 'accepted',
      membershipStatus: 'pending_activation',
      activationRequired: true,
      idempotent: false,
    };
  });
}
