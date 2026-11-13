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
        | 'invalid-transition';
    };

const MAX_INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const SHA256_HEX = /^[a-f0-9]{64}$/i;
const INVITATION_ID = /^[A-Za-z0-9_-]{1,128}$/;
const UID = /^[A-Za-z0-9_-]{1,128}$/;

export function isInvitationStatus(value: unknown): value is InvitationStatus {
  return value === 'draft' || value === 'issued' || value === 'accepted'
    || value === 'expired' || value === 'revoked';
}

/** Validate safe metadata before a trusted service issues an invitation. */
export function validateInvitationForIssuance(
  invitation: MembershipInvitation,
  now: number,
): boolean {
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
 * Advisory policy for a future trusted membership-management service.
 * It is deliberately stricter than the currently deployed Firestore Rules
 * and grants no client permission to write membership documents.
 */
export function evaluateMembershipChange(
  proposal: MembershipChangeProposal,
): MembershipPolicyDecision {
  const {
    actorUid, actorRole, targetUid, currentRole, nextRole,
    currentStatus, nextStatus, activeOwnerCount,
  } = proposal;

  if (
    !UID.test(actorUid) || !UID.test(targetUid) || actorUid === ''
    || targetUid === '' || !Number.isSafeInteger(activeOwnerCount)
    || activeOwnerCount < 0
  ) return { allowed: false, reason: 'invalid-context' };

  if (actorRole !== 'owner' && actorRole !== 'admin') {
    return { allowed: false, reason: 'actor-not-authorised' };
  }
  if (actorUid === targetUid) {
    return { allowed: false, reason: 'self-modification-forbidden' };
  }
  if (nextRole === 'owner' && currentRole !== 'owner') {
    return { allowed: false, reason: 'owner-assignment-requires-trusted-bootstrap' };
  }
  if (
    currentRole === 'owner'
    && (nextRole !== 'owner' || nextStatus !== 'active')
    && activeOwnerCount <= 1
  ) return { allowed: false, reason: 'owner-protection' };

  if (actorRole === 'admin' && (currentRole === 'owner' || currentRole === 'admin')) {
    return { allowed: false, reason: 'admin-cannot-manage-admin' };
  }
  if (currentStatus === 'revoked' && nextStatus !== 'revoked') {
    return { allowed: false, reason: 'invalid-transition' };
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
