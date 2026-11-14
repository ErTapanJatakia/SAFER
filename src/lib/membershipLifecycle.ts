/**
 * Proposed, client-side membership lifecycle policy model.
 *
 * This module does not issue invitations, mutate Firestore memberships, or
 * authorize database access. Trusted server-side provisioning and Firestore
 * Security Rules remain mandatory before any lifecycle action is enabled.
 */

export type InvitationStatus = 'draft' | 'issued' | 'accepted' | 'expired' | 'revoked';
export type InvitationAction = 'issue' | 'accept' | 'expire' | 'revoke';

export interface MembershipInvitation {
  readonly invitationId: string;
  readonly orgId: string;
  readonly invitedEmail: string;
  readonly role: Exclude<TenantRole, 'owner'>;
  readonly invitedByUid: string;
  readonly status: InvitationStatus;
  readonly createdAt: number;
  readonly expiresAt: number;
  /** SHA-256 digest only. A raw invitation secret must never be persisted. */
  readonly tokenDigest: string;
  readonly acceptedByUid?: string;
}

export type TenantRole = 'owner' | 'admin' | 'manager' | 'viewer';
export type ManagedMembershipStatus = 'active' | 'suspended' | 'revoked';

export type OwnerTransferAssessment =
  | { readonly eligible: true; readonly disposition: 'trusted-authority-required' }
  | { readonly eligible: false; readonly reason: 'invalid-context' | 'actor-not-owner' | 'self-transfer-forbidden' | 'target-not-active' | 'target-already-owner' };

export interface MembershipChangeProposal {
  readonly actorUid: string;
  readonly actorRole: TenantRole;
  readonly targetUid: string;
  readonly currentRole: TenantRole;
  readonly nextRole: TenantRole;
  readonly currentStatus: ManagedMembershipStatus;
  readonly nextStatus: ManagedMembershipStatus;
  readonly activeOwnerCount: number;
}

export type MembershipPolicyDecision =
  | { readonly allowed: true; readonly reason: 'owner-policy' | 'admin-policy' }
  | {
      readonly allowed: false;
      readonly reason:
        | 'invalid-context'
        | 'actor-not-authorised'
        | 'self-modification-forbidden'
        | 'owner-assignment-requires-trusted-bootstrap'
        | 'owner-protection'
        | 'admin-cannot-manage-admin'
        | 'invalid-transition'
        | 'owner-count-inconsistent';
    };

const MAX_INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const SHA256_HEX = /^[a-f0-9]{64}$/i;
const INVITATION_ID = /^[A-Za-z0-9_-]{1,128}$/;
const UID = /^[A-Za-z0-9_-]{1,128}$/;
const TENANT_ROLES: readonly TenantRole[] = ['owner', 'admin', 'manager', 'viewer'];
const MEMBERSHIP_STATUSES: readonly ManagedMembershipStatus[] = ['active', 'suspended', 'revoked'];

/** Snapshot exact plain data objects without invoking accessors. */
function readExactDataObject(value: unknown, expectedKeys: readonly string[]): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== 'object' || Array.isArray(value)
      || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== expectedKeys.length
      || keys.some((key) => typeof key !== 'string' || !expectedKeys.includes(key))) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of expectedKeys) {
      const descriptor = descriptors[key];
      if (!descriptor || !('value' in descriptor) || descriptor.enumerable !== true) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}
const MEMBERSHIP_CHANGE_KEYS = ['actorUid', 'actorRole', 'targetUid', 'currentRole', 'nextRole', 'currentStatus', 'nextStatus', 'activeOwnerCount'] as const;
const OWNER_TRANSFER_KEYS = ['actorUid', 'actorRole', 'targetUid', 'targetRole', 'targetStatus'] as const;

/** Only owners may delegate administrator invitations. */
export function canIssueInvitation(
  actorRole: TenantRole,
  invitedRole: Exclude<TenantRole, 'owner'>,
): boolean {
  if (!TENANT_ROLES.includes(actorRole)
    || !['admin', 'manager', 'viewer'].includes(invitedRole)) return false;
  if (actorRole === 'owner') return true;
  return actorRole === 'admin' && invitedRole !== 'admin';
}

export function isInvitationStatus(value: unknown): value is InvitationStatus {
  return value === 'draft' || value === 'issued' || value === 'accepted'
    || value === 'expired' || value === 'revoked';
}

/** Validate safe metadata before a trusted service issues an invitation. */
export function validateInvitationForIssuance(
  invitation: MembershipInvitation,
  now: number,
): boolean {
  if (!invitation || typeof invitation !== 'object') return false;
  return INVITATION_ID.test(invitation.invitationId)
    && INVITATION_ID.test(invitation.orgId)
    && UID.test(invitation.invitedByUid)
    && invitation.status === 'draft'
    && invitation.role !== 'owner'
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitation.invitedEmail)
    && invitation.invitedEmail.length <= 254
    && SHA256_HEX.test(invitation.tokenDigest)
    && Number.isSafeInteger(invitation.createdAt)
    && Number.isSafeInteger(invitation.expiresAt)
    && Number.isSafeInteger(now)
    && invitation.createdAt <= now
    && invitation.expiresAt > now
    && invitation.expiresAt > invitation.createdAt
    && invitation.expiresAt - invitation.createdAt <= MAX_INVITATION_LIFETIME_MS
    && invitation.acceptedByUid === undefined;
}


/**
 * Checks whether the currently authenticated, verified account matches the
 * invitation recipient. This is a local consistency check only: a trusted
 * service must still verify the secret digest, email verification state,
 * single-use status, expiry and membership write atomically.
 */
export function canAcceptInvitationForRecipient(
  invitation: MembershipInvitation,
  authenticatedUid: string,
  verifiedEmail: string,
  now: number,
): boolean {
  if (
    !invitation || typeof invitation !== 'object'
    || !UID.test(authenticatedUid)
    || !Number.isSafeInteger(now)
    || invitation.status !== 'issued'
    || invitation.acceptedByUid !== undefined
    || !Number.isSafeInteger(invitation.expiresAt)
    || now >= invitation.expiresAt
    || !Number.isSafeInteger(invitation.createdAt)
    || invitation.createdAt > now
    || invitation.expiresAt <= invitation.createdAt
    || invitation.expiresAt - invitation.createdAt > MAX_INVITATION_LIFETIME_MS
    || !UID.test(invitation.invitedByUid)
    || !INVITATION_ID.test(invitation.invitationId)
    || !INVITATION_ID.test(invitation.orgId)
    || !SHA256_HEX.test(invitation.tokenDigest)
    || !['admin', 'manager', 'viewer'].includes(invitation.role)
    || typeof invitation.invitedEmail !== 'string'
    || invitation.invitedEmail.length > 254
    || typeof verifiedEmail !== 'string'
    || verifiedEmail.length > 254
  ) return false;

  const normalizeEmail = (value: string) => value.trim().toLocaleLowerCase('en-US');
  const recipient = normalizeEmail(invitation.invitedEmail);
  const account = normalizeEmail(verifiedEmail);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)
    && recipient === account;
}

/**
 * Pure state transition guard. The caller must separately authenticate the
 * recipient and verify the invitation digest/email server-side before accept.
 */
export function canTransitionInvitation(
  status: InvitationStatus,
  action: InvitationAction,
  now: number,
  expiresAt: number,
): boolean {
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(expiresAt)) return false;

  switch (action) {
    case 'issue':
      return status === 'draft' && expiresAt > now
        && expiresAt - now <= MAX_INVITATION_LIFETIME_MS;
    case 'accept':
      return status === 'issued' && now < expiresAt;
    case 'expire':
      return status === 'issued' && now >= expiresAt;
    case 'revoke':
      return status === 'issued' && now < expiresAt;
    default:
      return false;
  }
}

/**
 * Assess whether an existing active non-owner is a valid transfer candidate.
 * A positive result is NOT permission to transfer: the operation must be
 * atomic and executed by the separately approved trusted administration plane.
 */
export function assessOwnerTransfer(input: {
  readonly actorUid: string;
  readonly actorRole: TenantRole;
  readonly targetUid: string;
  readonly targetRole: TenantRole;
  readonly targetStatus: ManagedMembershipStatus;
}): OwnerTransferAssessment {
  const record = readExactDataObject(input, OWNER_TRANSFER_KEYS);
  if (!record || typeof record.actorUid !== 'string' || !UID.test(record.actorUid)
    || typeof record.targetUid !== 'string' || !UID.test(record.targetUid)
    || !TENANT_ROLES.includes(record.actorRole as TenantRole)
    || !TENANT_ROLES.includes(record.targetRole as TenantRole)
    || !MEMBERSHIP_STATUSES.includes(record.targetStatus as ManagedMembershipStatus)) {
    return { eligible: false, reason: 'invalid-context' };
  }
  if (record.actorRole !== 'owner') return { eligible: false, reason: 'actor-not-owner' };
  if (record.actorUid === record.targetUid) return { eligible: false, reason: 'self-transfer-forbidden' };
  if (record.targetStatus !== 'active') return { eligible: false, reason: 'target-not-active' };
  if (record.targetRole === 'owner') return { eligible: false, reason: 'target-already-owner' };
  return { eligible: true, disposition: 'trusted-authority-required' };
}

/**
 * Advisory policy for a future trusted membership-management service.
 * It is deliberately stricter than the currently deployed Firestore Rules
 * and grants no client permission to write membership documents.
 */
export function evaluateMembershipChange(
  proposal: MembershipChangeProposal,
): MembershipPolicyDecision {
  const record = readExactDataObject(proposal, MEMBERSHIP_CHANGE_KEYS);
  if (!record) return { allowed: false, reason: 'invalid-context' };
  const {
    actorUid, actorRole, targetUid, currentRole, nextRole,
    currentStatus, nextStatus, activeOwnerCount,
  } = record;

  if (
    typeof actorUid !== 'string' || !UID.test(actorUid)
    || typeof targetUid !== 'string' || !UID.test(targetUid)
    || typeof actorRole !== 'string' || !TENANT_ROLES.includes(actorRole as TenantRole)
    || typeof currentRole !== 'string' || !TENANT_ROLES.includes(currentRole as TenantRole)
    || typeof nextRole !== 'string' || !TENANT_ROLES.includes(nextRole as TenantRole)
    || typeof currentStatus !== 'string' || !MEMBERSHIP_STATUSES.includes(currentStatus as ManagedMembershipStatus)
    || typeof nextStatus !== 'string' || !MEMBERSHIP_STATUSES.includes(nextStatus as ManagedMembershipStatus)
    || typeof activeOwnerCount !== 'number' || !Number.isSafeInteger(activeOwnerCount) || activeOwnerCount < 0
  ) return { allowed: false, reason: 'invalid-context' };

  // A proposal about an active owner must include that owner in the supplied
  // count. Counts are advisory snapshots; the trusted writer must re-read and
  // enforce the invariant transactionally to prevent concurrent last-owner loss.
  if (currentRole === 'owner' && currentStatus === 'active' && activeOwnerCount < 1) {
    return { allowed: false, reason: 'owner-count-inconsistent' };
  }

  if (actorRole !== 'owner' && actorRole !== 'admin') {
    return { allowed: false, reason: 'actor-not-authorised' };
  }
  if (actorUid === targetUid) {
    return { allowed: false, reason: 'self-modification-forbidden' };
  }
  if (nextRole === 'owner' && currentRole !== 'owner') {
    return { allowed: false, reason: 'owner-assignment-requires-trusted-bootstrap' };
  }
  // Revocation is terminal: no later role or status edits are accepted.
  if (currentStatus === 'revoked') {
    return { allowed: false, reason: 'invalid-transition' };
  }
  // Revocation is a dedicated lifecycle action; do not bundle it with a role change.
  if (nextStatus === 'revoked' && nextRole !== currentRole) {
    return { allowed: false, reason: 'invalid-transition' };
  }
  if (
    currentRole === 'owner' && currentStatus === 'active'
    && (nextRole !== 'owner' || nextStatus !== 'active')
    && activeOwnerCount <= 1
  ) return { allowed: false, reason: 'owner-protection' };

  if (actorRole === 'admin' && (currentRole === 'owner' || currentRole === 'admin' || nextRole === 'admin')) {
    return { allowed: false, reason: 'admin-cannot-manage-admin' };
  }
  if (currentStatus === nextStatus && currentRole === nextRole) {
    return { allowed: false, reason: 'invalid-transition' };
  }

  return {
    allowed: true,
    reason: actorRole === 'owner' ? 'owner-policy' : 'admin-policy',
  };
}

/** These operations require a trusted, auditable server-side authority. */
export const TRUSTED_MEMBERSHIP_OPERATIONS = Object.freeze([
  'owner-bootstrap',
  'owner-transfer',
  'invitation-issue',
  'invitation-accept',
  'membership-create',
  'membership-role-change',
  'membership-suspend',
  'membership-revoke',
  'audit-event-append',
] as const);
