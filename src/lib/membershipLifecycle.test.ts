import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessOwnerTransfer,
  canAcceptInvitationForRecipient,
  canIssueInvitation,
  canTransitionInvitation,
  evaluateMembershipChange,
  isInvitationStatus,
  validateInvitationForIssuance,
  type MembershipInvitation,
  type MembershipChangeProposal,
} from './membershipLifecycle.ts';

const DAY = 24 * 60 * 60 * 1000;
const now = 1_800_000_000_000;

function invitation(overrides: Partial<MembershipInvitation> = {}): MembershipInvitation {
  return {
    invitationId: 'invite-001',
    orgId: 'org-001',
    invitedEmail: 'member@example.test',
    role: 'manager',
    invitedByUid: 'owner-001',
    status: 'draft',
    createdAt: now - 1_000,
    expiresAt: now + DAY,
    tokenDigest: 'a'.repeat(64),
    ...overrides,
  };
}

function proposal(overrides: Partial<MembershipChangeProposal> = {}): MembershipChangeProposal {
  return {
    actorUid: 'owner-001',
    actorRole: 'owner',
    targetUid: 'member-001',
    currentRole: 'manager',
    nextRole: 'viewer',
    currentStatus: 'active',
    nextStatus: 'active',
    activeOwnerCount: 1,
    ...overrides,
  };
}

test('invitation status parser accepts only known lifecycle states', () => {
  for (const value of ['draft', 'issued', 'accepted', 'expired', 'revoked']) {
    assert.equal(isInvitationStatus(value), true);
  }
  for (const value of ['pending', 'deleted', null, 1]) {
    assert.equal(isInvitationStatus(value), false);
  }
});

test('issuance metadata requires bounded expiry and a SHA-256 digest, never a raw secret', () => {
  assert.equal(validateInvitationForIssuance(invitation(), now), true);
  assert.equal(validateInvitationForIssuance(invitation({ expiresAt: now + 8 * DAY }), now), false);
  assert.equal(validateInvitationForIssuance(invitation({ tokenDigest: 'raw-token' }), now), false);
  assert.equal(validateInvitationForIssuance(invitation({ role: 'owner' as never }), now), false);
  assert.equal(validateInvitationForIssuance(invitation({ status: 'issued' }), now), false);
});

test('invitation transitions enforce one-way states and expiry boundaries', () => {
  assert.equal(canTransitionInvitation('draft', 'issue', now, now + DAY), true);
  assert.equal(canTransitionInvitation('issued', 'accept', now, now + DAY), true);
  assert.equal(canTransitionInvitation('issued', 'accept', now + DAY, now + DAY), false);
  assert.equal(canTransitionInvitation('issued', 'expire', now + DAY, now + DAY), true);
  assert.equal(canTransitionInvitation('accepted', 'revoke', now, now + DAY), false);
  assert.equal(canTransitionInvitation('revoked', 'accept', now, now + DAY), false);
});


test('invitation acceptance is bound to the verified recipient and exact expiry boundary', () => {
  const issued = invitation({ status: 'issued' });
  assert.equal(canAcceptInvitationForRecipient(
    issued, 'member-001', ' MEMBER@example.test ', now,
  ), true);
  assert.equal(canAcceptInvitationForRecipient(
    issued, 'member-001', 'other@example.test', now,
  ), false);
  assert.equal(canAcceptInvitationForRecipient(
    issued, 'member-001', 'member@example.test', issued.expiresAt,
  ), false);
  assert.equal(canAcceptInvitationForRecipient(
    invitation({ status: 'accepted' }), 'member-001', 'member@example.test', now,
  ), false);
  assert.equal(canAcceptInvitationForRecipient(
    invitation({ status: 'issued', acceptedByUid: 'member-002' }),
    'member-001', 'member@example.test', now,
  ), false);
  assert.equal(canAcceptInvitationForRecipient(
    invitation({ status: 'issued', tokenDigest: 'raw-secret' }),
    'member-001', 'member@example.test', now,
  ), false);
  assert.equal(canAcceptInvitationForRecipient(
    issued, 'member-001', 'member@example.test', Number.NaN,
  ), false);
});

test('owner may propose ordinary non-owner role and status changes', () => {
  assert.deepEqual(evaluateMembershipChange(proposal()), {
    allowed: true,
    reason: 'owner-policy',
  });
});

test('only owners may invite administrators', () => {
  assert.equal(canIssueInvitation('owner', 'admin'), true);
  assert.equal(canIssueInvitation('admin', 'admin'), false);
  assert.equal(canIssueInvitation('admin', 'manager'), true);
  assert.equal(canIssueInvitation('manager', 'viewer'), false);
});

test('admin cannot manage owners or other administrators', () => {
  assert.equal(evaluateMembershipChange(proposal({
    actorRole: 'admin', currentRole: 'admin',
  })).reason, 'admin-cannot-manage-admin');
  assert.equal(evaluateMembershipChange(proposal({
    actorRole: 'admin', currentRole: 'owner',
  })).reason, 'admin-cannot-manage-admin');
  assert.equal(evaluateMembershipChange(proposal({
    actorRole: 'admin', currentRole: 'manager', nextRole: 'admin',
  })).reason, 'admin-cannot-manage-admin');
});

test('client policy never permits owner assignment or self-modification', () => {
  assert.equal(evaluateMembershipChange(proposal({ nextRole: 'owner' })).reason,
    'owner-assignment-requires-trusted-bootstrap');
  assert.equal(evaluateMembershipChange(proposal({
    actorUid: 'member-001',
  })).reason, 'self-modification-forbidden');
});

test('last active owner cannot be suspended, revoked or demoted', () => {
  for (const change of [
    { nextRole: 'admin' as const, nextStatus: 'active' as const },
    { nextRole: 'owner' as const, nextStatus: 'suspended' as const },
    { nextRole: 'owner' as const, nextStatus: 'revoked' as const },
  ]) {
    assert.equal(evaluateMembershipChange(proposal({
      currentRole: 'owner',
      ...change,
      activeOwnerCount: 1,
    })).reason, 'owner-protection');
  }
});

test('revoked memberships cannot be reactivated and non-admins cannot manage membership', () => {
  assert.equal(evaluateMembershipChange(proposal({
    currentStatus: 'revoked', nextStatus: 'active',
  })).reason, 'invalid-transition');
  assert.equal(evaluateMembershipChange(proposal({
    actorRole: 'manager',
  })).reason, 'actor-not-authorised');
});

test('owner transfer assessment requires a distinct active non-owner and trusted authority', () => {
  assert.deepEqual(assessOwnerTransfer({
    actorUid: 'owner-001', actorRole: 'owner',
    targetUid: 'member-001', targetRole: 'admin', targetStatus: 'active',
  }), { eligible: true, disposition: 'trusted-authority-required' });

  assert.equal(assessOwnerTransfer({
    actorUid: 'owner-001', actorRole: 'owner',
    targetUid: 'owner-001', targetRole: 'admin', targetStatus: 'active',
  }).reason, 'self-transfer-forbidden');
  assert.equal(assessOwnerTransfer({
    actorUid: 'admin-001', actorRole: 'admin',
    targetUid: 'member-001', targetRole: 'manager', targetStatus: 'active',
  }).reason, 'actor-not-owner');
  assert.equal(assessOwnerTransfer({
    actorUid: 'owner-001', actorRole: 'owner',
    targetUid: 'member-001', targetRole: 'manager', targetStatus: 'suspended',
  }).reason, 'target-not-active');
  assert.equal(assessOwnerTransfer({
    actorUid: 'owner-001', actorRole: 'owner',
    targetUid: 'owner-002', targetRole: 'owner', targetStatus: 'active',
  }).reason, 'target-already-owner');
});

test('membership policy rejects malformed role and status values at runtime', () => {
  assert.equal(evaluateMembershipChange(proposal({
    actorRole: 'platform_super_admin' as never,
  })).reason, 'invalid-context');
  assert.equal(evaluateMembershipChange(proposal({
    currentStatus: 'pending' as never,
  })).reason, 'invalid-context');
});
});
