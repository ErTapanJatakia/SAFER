import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acceptSuperAdminInvitation,
  InvitationAcceptanceError,
} from '../src/server/organisation-invitation-acceptance.mjs';

const orgId = 'org_0123456789abcdef0123456789abcdef';
const invitationId = 'A'.repeat(43);
const actorUid = 'verified-super-admin';
const actorEmail = 'admin@example.test';

function fixture(overrides = {}) {
  const now = Date.now();
  const organisation = {
    orgId,
    status: 'provisioning',
    lifecycleStage: 'super_admin_invitation_pending',
  };
  const invitation = {
    invitationId,
    uid: actorUid,
    email: actorEmail,
    orgId,
    role: 'tenant_super_admin',
    status: 'pending',
    invitedAt: new Date(now - 1000),
    expiresAt: new Date(now + 60 * 60 * 1000),
    invitedByUid: 'platform-owner-uid',
    schemaVersion: 1,
  };
  return {
    now,
    store: new Map([
      [`organisations/${orgId}`, { ...organisation, ...overrides.organisation }],
      [`organisations/${orgId}/invitations/${invitationId}`, { ...invitation, ...overrides.invitation }],
      ...(overrides.membership ? [[`organisations/${orgId}/members/${actorUid}`, overrides.membership]] : []),
    ]),
  };
}

function fakeDatabase(store) {
  let auditSequence = 0;
  const reference = (path) => ({ path });
  return {
    doc: reference,
    collection(name) {
      return { doc: () => reference(`${name}/test-audit-${++auditSequence}`) };
    },
    async runTransaction(callback) {
      const writes = [];
      const transaction = {
        async get(ref) {
          const value = store.get(ref.path);
          return { exists: value !== undefined, data: () => value };
        },
        create(ref, data) {
          writes.push({ type: 'create', path: ref.path, data });
        },
        update(ref, data) {
          writes.push({ type: 'update', path: ref.path, data });
        },
      };
      const result = await callback(transaction);
      for (const write of writes) {
        if (write.type === 'create') {
          if (store.has(write.path)) throw new Error('already exists');
          store.set(write.path, structuredClone(write.data));
        } else {
          if (!store.has(write.path)) throw new Error('missing update target');
          store.set(write.path, { ...store.get(write.path), ...structuredClone(write.data) });
        }
      }
      return result;
    },
  };
}

function accept(state, overrides = {}) {
  return acceptSuperAdminInvitation({
    orgId,
    invitationId,
    actorUid,
    actorEmail,
    actorEmailVerified: true,
    database: fakeDatabase(state.store),
    serverTimestamp: () => new Date(state.now),
    now: state.now,
    ...overrides,
  });
}

test('acceptance creates a pending-activation membership and atomically updates invitation, organisation and audit', async () => {
  const state = fixture();
  const result = await accept(state);
  assert.deepEqual(result, {
    orgId,
    invitationId,
    status: 'accepted',
    membershipStatus: 'pending_activation',
    activationRequired: true,
    idempotent: false,
  });

  const membership = state.store.get(`organisations/${orgId}/members/${actorUid}`);
  assert.equal(membership.uid, actorUid);
  assert.equal(membership.orgId, orgId);
  assert.equal(membership.role, 'tenant_super_admin');
  assert.equal(membership.status, 'pending_activation');
  assert.equal(membership.schemaVersion, 1);
  assert.equal(membership.createdByUid, 'platform-owner-uid');

  assert.equal(state.store.get(`organisations/${orgId}/invitations/${invitationId}`).status, 'accepted');
  assert.equal(state.store.get(`organisations/${orgId}`).lifecycleStage, 'super_admin_invitation_accepted');
  const audit = [...state.store.entries()].find(([path]) => path.startsWith('platformAuditEvents/'))?.[1];
  assert.equal(audit.action, 'organisation.super_admin_invitation_accepted');
  assert.equal(audit.actorUid, actorUid);
});

test('repeated acceptance by the same identity is idempotent and does not add another audit event', async () => {
  const state = fixture();
  await accept(state);
  const auditCountBefore = [...state.store.keys()].filter((path) => path.startsWith('platformAuditEvents/')).length;
  const result = await accept(state);
  const auditCountAfter = [...state.store.keys()].filter((path) => path.startsWith('platformAuditEvents/')).length;
  assert.equal(result.idempotent, true);
  assert.equal(result.membershipStatus, 'pending_activation');
  assert.equal(auditCountAfter, auditCountBefore);
});

test('rejects an invitation addressed to another UID or email', async () => {
  const state = fixture();
  await assert.rejects(
    accept(state, { actorUid: 'different-user' }),
    (error) => error instanceof InvitationAcceptanceError && error.code === 'invitation_conflict',
  );
  await assert.rejects(
    accept(state, { actorEmail: 'attacker@example.test' }),
    (error) => error instanceof InvitationAcceptanceError && error.code === 'invitation_identity_mismatch',
  );
});

test('rejects unverified accounts, expired invitations and malformed expiry values', async () => {
  const state = fixture();
  await assert.rejects(
    accept(state, { actorEmailVerified: false }),
    (error) => error instanceof InvitationAcceptanceError && error.code === 'verified_account_required',
  );
  const expired = fixture();
  expired.store.set(`organisations/${orgId}/invitations/${invitationId}`, {
    ...expired.store.get(`organisations/${orgId}/invitations/${invitationId}`),
    expiresAt: new Date(expired.now - 1),
  });
  await assert.rejects(
    accept(expired),
    (error) => error instanceof InvitationAcceptanceError && error.code === 'invitation_expired',
  );
  const malformed = fixture();
  malformed.store.set(`organisations/${orgId}/invitations/${invitationId}`, {
    ...malformed.store.get(`organisations/${orgId}/invitations/${invitationId}`),
    expiresAt: 'not-a-date',
  });
  await assert.rejects(
    accept(malformed),
    (error) => error instanceof InvitationAcceptanceError && error.code === 'invitation_expired',
  );
});

test('rejects tampered roles, lifecycle state, invitation status and conflicting membership', async () => {
  const wrongRole = fixture({ invitation: { role: 'tenant_admin' } });
  await assert.rejects(
    accept(wrongRole),
    (error) => error instanceof InvitationAcceptanceError && error.code === 'invitation_identity_mismatch',
  );
  const wrongOrgState = fixture({ organisation: { status: 'suspended' } });
  await assert.rejects(
    accept(wrongOrgState),
    (error) => error instanceof InvitationAcceptanceError && error.code === 'organisation_unavailable',
  );
  const wrongStage = fixture({ organisation: { lifecycleStage: 'active' } });
  await assert.rejects(
    accept(wrongStage),
    (error) => error instanceof InvitationAcceptanceError && error.code === 'organisation_not_ready',
  );
  const alreadyUsed = fixture({ invitation: { status: 'revoked' } });
  await assert.rejects(
    accept(alreadyUsed),
    (error) => error instanceof InvitationAcceptanceError && error.code === 'invitation_unavailable',
  );
  const membershipConflict = fixture({
    membership: {
      uid: actorUid, orgId, role: 'tenant_employee',
      status: 'active', schemaVersion: 1,
    },
  });
  await assert.rejects(
    accept(membershipConflict),
    (error) => error instanceof InvitationAcceptanceError && error.code === 'membership_conflict',
  );
});

test('rejects replay of an accepted invitation by a different identity or with conflicting membership', async () => {
  const state = fixture();
  await accept(state);
  const invitationPath = `organisations/${orgId}/invitations/${invitationId}`;
  state.store.set(invitationPath, {
    ...state.store.get(invitationPath),
    acceptedByUid: 'someone-else',
  });
  await assert.rejects(
    accept(state),
    (error) => error instanceof InvitationAcceptanceError && error.code === 'invitation_identity_mismatch',
  );
});
