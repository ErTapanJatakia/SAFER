import { randomBytes } from 'node:crypto';
import { authorizeTenantAction } from './tenant-rbac.mjs';

const TENANT_ROLES = Object.freeze([
  'tenant_super_admin', 'tenant_admin', 'tenant_manager', 'tenant_employee', 'tenant_auditor',
]);
const EMAIL_MAX = 254;
const ORG_ID_PATTERN = /^org_[a-f0-9]{32}$/;

export class TenantMembershipError extends Error {
  constructor(code) {
    super(code);
    this.name = 'TenantMembershipError';
    this.code = code;
  }
}

function fail(code) {
  throw new TenantMembershipError(code);
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  const email = value.trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

function timestampMillis(value) {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value.toDate === 'function') return value.toDate().getTime();
  return Number.NaN;
}

function assertTenantLocator(orgId) {
  if (typeof orgId !== 'string' || !ORG_ID_PATTERN.test(orgId)) fail('invalid_request');
}

function assertMembership(membership, uid, orgId, allowedStatuses = ['active']) {
  const requiredFields = [
    'uid', 'orgId', 'role', 'status', 'createdAt', 'createdByUid',
    'updatedAt', 'updatedByUid', 'schemaVersion',
  ].sort();
  const fields = membership && typeof membership === 'object' && !Array.isArray(membership)
    ? Object.keys(membership).sort()
    : [];
  if (fields.length !== requiredFields.length
    || fields.some((field, index) => field !== requiredFields[index])
    || membership.uid !== uid || membership.orgId !== orgId
    || !allowedStatuses.includes(membership.status) || membership.schemaVersion !== 1
    || !TENANT_ROLES.includes(membership.role)
    || typeof membership.createdByUid !== 'string'
    || typeof membership.updatedByUid !== 'string'
    || membership.createdAt == null || membership.updatedAt == null) {
    fail('active_tenant_membership_required');
  }
}

function assertOrganisation(organisation, orgId) {
  if (!organisation || organisation.orgId !== orgId || organisation.status !== 'active') {
    fail('active_organisation_required');
  }
}

async function authorizeInTransaction(transaction, database, {
  actorUid, orgId, action, targetUid, targetCurrentRole, targetRole,
}) {
  const actorRef = database.doc(`organisations/${orgId}/members/${actorUid}`);
  const orgRef = database.doc(`organisations/${orgId}`);
  const [actorSnapshot, orgSnapshot] = await Promise.all([
    transaction.get(actorRef), transaction.get(orgRef),
  ]);
  if (!actorSnapshot.exists || !orgSnapshot.exists) fail('tenant_membership_required');
  const decision = authorizeTenantAction({
    actorUid,
    membership: actorSnapshot.data(),
    organisation: orgSnapshot.data(),
    requestedOrgId: orgId,
    action,
    targetUid,
    targetCurrentRole,
    targetRole,
  });
  if (!decision.allowed) fail(decision.reason);
  return { actor: actorSnapshot.data(), organisation: orgSnapshot.data(), actorRef, orgRef };
}

/**
 * Creates a short-lived invitation for an existing, verified Firebase identity.
 * The opaque invitation ID is returned once so the trusted admin can share it
 * through an approved channel. No email is sent by this service.
 */
export async function inviteTenantMember({
  orgId, actorUid, email, role, database, authAdmin, serverTimestamp, now = Date.now(),
}) {
  assertTenantLocator(orgId);
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !TENANT_ROLES.includes(role) || role === 'tenant_super_admin') {
    fail('invalid_invitation_request');
  }
  if (!database?.runTransaction || !database?.doc || !database?.collection
    || !authAdmin?.getUserByEmail || typeof serverTimestamp !== 'function') {
    fail('service_unavailable');
  }

  // Authorize the caller before querying Firebase Auth by email. Otherwise
  // an unprivileged signed-in user could use this endpoint to enumerate
  // registered/verified accounts. The invitation transaction below repeats
  // this check to close the role-change race between preflight and creation.
  await database.runTransaction(async (transaction) => {
    await authorizeInTransaction(transaction, database, {
      actorUid, orgId, action: 'members:invite', targetRole: role,
    });
  });

  let invitedUser;
  try {
    invitedUser = await authAdmin.getUserByEmail(normalizedEmail);
  } catch (error) {
    if (error?.code === 'auth/user-not-found') fail('invitee_not_found');
    fail('identity_service_unavailable');
  }
  if (!invitedUser || invitedUser.disabled || invitedUser.emailVerified !== true
    || normalizeEmail(invitedUser.email) !== normalizedEmail
    || typeof invitedUser.uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(invitedUser.uid)) {
    fail('verified_invitee_required');
  }

  const invitationId = randomBytes(32).toString('base64url');
  const invitationExpiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);
  const invitationRef = database.doc(`organisations/${orgId}/invitations/${invitationId}`);
  const memberRef = database.doc(`organisations/${orgId}/members/${invitedUser.uid}`);
  const auditRef = database.doc(`organisations/${orgId}/auditEvents/${randomBytes(16).toString('hex')}`);
  const timestamp = serverTimestamp();

  await database.runTransaction(async (transaction) => {
    const { actor } = await authorizeInTransaction(transaction, database, {
      actorUid, orgId, action: 'members:invite', targetRole: role,
    });
    const existingMembership = await transaction.get(memberRef);
    if (existingMembership.exists) fail('membership_conflict');
    transaction.create(invitationRef, {
      invitationId, uid: invitedUser.uid, email: normalizedEmail, orgId, role,
      status: 'pending', invitedAt: timestamp, expiresAt: invitationExpiresAt,
      invitedByUid: actorUid, schemaVersion: 1,
    });
    transaction.create(auditRef, {
      action: 'tenant.member.invitation_created',
      actorUid, orgId, targetOrgId: orgId, targetUid: invitedUser.uid,
      details: { role, invitationId, email: normalizedEmail },
      occurredAt: timestamp,
    });
  });

  return {
    orgId, invitationId, email: normalizedEmail, role,
    status: 'pending', expiresAt: invitationExpiresAt.toISOString(),
  };
}

/**
 * Suspends a tenant member or changes their role. Actor, organisation and
 * target are re-read inside one Firestore transaction to prevent TOCTOU
 * escalation and stale-role decisions.
 */
export async function manageTenantMember({
  orgId, actorUid, targetUid, action, targetRole, database, serverTimestamp,
}) {
  assertTenantLocator(orgId);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(actorUid ?? '')
    || !/^[A-Za-z0-9_-]{1,128}$/.test(targetUid ?? '')
    || actorUid === targetUid
    || !['members:suspend', 'members:reactivate', 'members:role:assign'].includes(action)
    || (action === 'members:role:assign' && !TENANT_ROLES.includes(targetRole))) {
    fail('invalid_request');
  }
  if (!database?.runTransaction || !database?.doc || !database?.collection
    || typeof serverTimestamp !== 'function') fail('service_unavailable');

  const actorRef = database.doc(`organisations/${orgId}/members/${actorUid}`);
  const targetRef = database.doc(`organisations/${orgId}/members/${targetUid}`);
  const orgRef = database.doc(`organisations/${orgId}`);
  const auditRef = database.doc(`organisations/${orgId}/auditEvents/${randomBytes(16).toString('hex')}`);
  const timestamp = serverTimestamp();

  return database.runTransaction(async (transaction) => {
    const [actorSnapshot, targetSnapshot, orgSnapshot] = await Promise.all([
      transaction.get(actorRef), transaction.get(targetRef), transaction.get(orgRef),
    ]);
    if (!actorSnapshot.exists || !targetSnapshot.exists || !orgSnapshot.exists) {
      fail('membership_not_found');
    }
    const actor = actorSnapshot.data();
    const target = targetSnapshot.data();
    const organisation = orgSnapshot.data();
    assertMembership(target, targetUid, orgId, action === 'members:reactivate' ? ['suspended'] : ['active']);
    assertOrganisation(organisation, orgId);

    const decision = authorizeTenantAction({
      actorUid, membership: actor, organisation, requestedOrgId: orgId, action,
      targetUid, targetCurrentRole: target.role, targetRole,
    });
    if (!decision.allowed) fail(decision.reason);

    if (action === 'members:suspend' || action === 'members:reactivate') {
      transaction.update(targetRef, {
        status: action === 'members:suspend' ? 'suspended' : 'active', updatedAt: timestamp, updatedByUid: actorUid,
      });
    } else {
      transaction.update(targetRef, {
        role: targetRole, updatedAt: timestamp, updatedByUid: actorUid,
      });
    }
    transaction.create(auditRef, {
      action: action === 'members:suspend' ? 'tenant.member.suspended' : action === 'members:reactivate' ? 'tenant.member.reactivated' : 'tenant.member.role_changed',
      actorUid, orgId, targetOrgId: orgId, targetUid,
      details: {
        previousRole: target.role,
        newRole: action === 'members:role:assign' ? targetRole : target.role,
        previousStatus: target.status,
        newStatus: action === 'members:suspend' ? 'suspended' : action === 'members:reactivate' ? 'active' : target.status,
      },
      occurredAt: timestamp,
    });
    return {
      orgId, targetUid,
      role: action === 'members:role:assign' ? targetRole : target.role,
      status: action === 'members:suspend' ? 'suspended' : action === 'members:reactivate' ? 'active' : target.status,
    };
  });
}

/** Expiry helper used by the invitation acceptance workflow. */
export function isTenantInvitationExpired(invitation, now = Date.now()) {
  return timestampMillis(invitation?.expiresAt) <= now;
}
