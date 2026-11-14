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

function ownerTransferReason(input: Parameters<typeof assessOwnerTransfer>[0]) {
  const assessment = assessOwnerTransfer(input);
  return assessment.eligible ? undefined : assessment.reason;
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

test('invitation role policy rejects malformed runtime roles', () => {
  assert.equal(canIssueInvitation('owner', 'owner' as never), false);
  assert.equal(canIssueInvitation('platform_super_admin' as never, 'viewer'), false);
  assert.equal(canIssueInvitation('owner', 'unknown' as never), false);
  assert.equal(validateInvitationForIssuance(null as never, now), false);
  assert.equal(evaluateMembershipChange(null as never).reason, 'invalid-context');
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

test('suspended memberships can be restored by an authorised actor but not by a manager', () => {
  assert.deepEqual(evaluateMembershipChange(proposal({
    currentStatus: 'suspended', nextStatus: 'active',
  })), { allowed: true, reason: 'owner-policy' });
  assert.deepEqual(evaluateMembershipChange(proposal({
    actorRole: 'admin', currentStatus: 'suspended', nextStatus: 'active',
  })), { allowed: true, reason: 'admin-policy' });
  assert.equal(evaluateMembershipChange(proposal({
    actorRole: 'manager', currentStatus: 'suspended', nextStatus: 'active',
  })).reason, 'actor-not-authorised');
  assert.equal(evaluateMembershipChange(proposal({
    currentRole: 'manager', nextRole: 'manager',
    currentStatus: 'suspended', nextStatus: 'suspended',
  })).reason, 'invalid-transition');
});

test('revocation is terminal and cannot be combined with a role change', () => {
  assert.equal(evaluateMembershipChange(proposal({
    currentStatus: 'revoked', nextStatus: 'revoked',
    currentRole: 'manager', nextRole: 'viewer',
  })).reason, 'invalid-transition');
  assert.equal(evaluateMembershipChange(proposal({
    currentStatus: 'revoked', nextStatus: 'revoked',
    currentRole: 'manager', nextRole: 'manager',
  })).reason, 'invalid-transition');
  assert.equal(evaluateMembershipChange(proposal({
    currentStatus: 'active', nextStatus: 'revoked',
    currentRole: 'manager', nextRole: 'viewer',
  })).reason, 'invalid-transition');
  assert.deepEqual(evaluateMembershipChange(proposal({
    currentStatus: 'active', nextStatus: 'revoked',
    currentRole: 'manager', nextRole: 'manager',
  })), { allowed: true, reason: 'owner-policy' });
});

test('active owner count must include the target active owner', () => {
  assert.equal(evaluateMembershipChange(proposal({
    currentRole: 'owner', currentStatus: 'active',
    nextRole: 'owner', nextStatus: 'suspended',
    activeOwnerCount: 0,
  })).reason, 'owner-count-inconsistent');
  assert.equal(evaluateMembershipChange(proposal({
    currentRole: 'owner', currentStatus: 'active',
    nextRole: 'admin', nextStatus: 'active',
    activeOwnerCount: 1,
  })).reason, 'owner-protection');
  assert.deepEqual(evaluateMembershipChange(proposal({
    currentRole: 'owner', currentStatus: 'active',
    nextRole: 'admin', nextStatus: 'active',
    activeOwnerCount: 2,
  })), { allowed: true, reason: 'owner-policy' });
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
  assert.deepEqual(ownerTransferReason({
    actorUid: 'owner-001', actorRole: 'owner',
    targetUid: 'member-001', targetRole: 'admin', targetStatus: 'active',
  }), { eligible: true, disposition: 'trusted-authority-required' });

  assert.equal(ownerTransferReason({
    actorUid: 'owner-001', actorRole: 'owner',
    targetUid: 'owner-001', targetRole: 'admin', targetStatus: 'active',
  }), 'self-transfer-forbidden');
  assert.equal(assessOwnerTransfer({
    actorUid: 'admin-001', actorRole: 'admin',
    targetUid: 'member-001', targetRole: 'manager', targetStatus: 'active',
  }), 'actor-not-owner');
  assert.equal(ownerTransferReason({
    actorUid: 'owner-001', actorRole: 'owner',
    targetUid: 'member-001', targetRole: 'manager', targetStatus: 'suspended',
  }), 'target-not-active');
  assert.equal(ownerTransferReason({
    actorUid: 'owner-001', actorRole: 'owner',
    targetUid: 'owner-002', targetRole: 'owner', targetStatus: 'active',
  }), 'target-already-owner');
});

test('owner transfer assessment rejects malformed runtime role and status values', () => {
  assert.equal(ownerTransferReason({
    actorUid: 'owner-001', actorRole: 'owner',
    targetUid: 'member-001', targetRole: 'platform_super_admin' as never,
    targetStatus: 'active',
  }), 'invalid-context');
  assert.equal(ownerTransferReason({
    actorUid: 'owner-001', actorRole: 'owner',
    targetUid: 'member-001', targetRole: 'manager',
    targetStatus: 'pending' as never,
  }), 'invalid-context');
});

test('membership policy rejects malformed role and status values at runtime', () => {
  assert.equal(evaluateMembershipChange(proposal({
    actorRole: 'platform_super_admin' as never,
  })).reason, 'invalid-context');
  assert.equal(evaluateMembershipChange(proposal({
    currentStatus: 'pending' as never,
  })).reason, 'invalid-context');
});

test('invitation policy rejects accessor-backed and hostile proxy inputs without executing getters', () => {
  let getterCalls = 0;
  const accessorInvitation = invitation();
  Object.defineProperty(accessorInvitation, 'invitedEmail', {
    enumerable: true,
    get() { getterCalls += 1; return 'member@example.test'; },
  });
  assert.equal(validateInvitationForIssuance(accessorInvitation, now), false);
  assert.equal(getterCalls, 0);

  const proxyInvitation = new Proxy(invitation(), {
    ownKeys() { throw new Error('hostile invitation proxy'); },
  });
  assert.equal(validateInvitationForIssuance(proxyInvitation, now), false);
  assert.equal(canAcceptInvitationForRecipient(
    proxyInvitation, 'member-001', 'member@example.test', now,
  ), false);
});

test('membership policy rejects accessor-backed, exotic and hostile proxy inputs without executing getters', () => {
  let getterCalls = 0;
  const accessorProposal = proposal();
  Object.defineProperty(accessorProposal, 'actorUid', {
    enumerable: true,
    get() { getterCalls += 1; return 'owner-001'; },
  });
  assert.deepEqual(evaluateMembershipChange(accessorProposal), {
    allowed: false, reason: 'invalid-context',
  });
  assert.equal(getterCalls, 0);

  const proxyProposal = new Proxy(proposal(), {
    ownKeys() { throw new Error('hostile proxy'); },
  });
  assert.deepEqual(evaluateMembershipChange(proxyProposal), {
    allowed: false, reason: 'invalid-context',
  });

  const exoticTransfer = Object.assign(Object.create({ inherited: true }), {
    actorUid: 'owner-001', actorRole: 'owner',
    targetUid: 'member-001', targetRole: 'manager', targetStatus: 'active',
  } as const);
  assert.deepEqual(assessOwnerTransfer(exoticTransfer), {
    eligible: false, reason: 'invalid-context',
  });

  const proxyTransfer = new Proxy({
    actorUid: 'owner-001', actorRole: 'owner',
    targetUid: 'member-001', targetRole: 'manager', targetStatus: 'active',
  } as const, { getOwnPropertyDescriptor() { throw new Error('hostile proxy'); } });
  assert.deepEqual(assessOwnerTransfer(proxyTransfer), {
    eligible: false, reason: 'invalid-context',
  });
});
