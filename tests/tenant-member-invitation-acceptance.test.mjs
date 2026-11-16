import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptTenantMemberInvitation, TenantInvitationAcceptanceError } from '../src/server/tenant-member-invitation-acceptance.mjs';

function fixture({ role = 'tenant_employee', status = 'pending', expired = false } = {}) {
  const records = new Map();
  const orgId = 'org_0123456789abcdef0123456789abcdef';
  const invitationId = 'A'.repeat(43);
  const uid = 'member-1';
  const now = Date.now();
  records.set(`organisations/${orgId}`, { orgId, status: 'active' });
  records.set(`organisations/${orgId}/invitations/${invitationId}`, {
    invitationId, uid, email: 'member@example.com', orgId, role, status,
    invitedAt: new Date(now), expiresAt: new Date(expired ? now - 1 : now + 60000),
    invitedByUid: 'admin-1', schemaVersion: 1,
  });
  const database = {
    doc: (path) => ({ path }),
    runTransaction: async (callback) => callback({
      get: async (ref) => ({ exists: records.has(ref.path), data: () => records.get(ref.path) }),
      create: (ref, data) => {
        if (records.has(ref.path)) throw new Error('already exists');
        records.set(ref.path, data);
      },
      update: (ref, patch) => records.set(ref.path, { ...records.get(ref.path), ...patch }),
    }),
  };
  return { records, database, orgId, invitationId, uid };
}

test('verified invitee accepts ordinary role and receives active versioned membership', async () => {
  const f = fixture({ role: 'tenant_manager' });
  const result = await acceptTenantMemberInvitation({
    orgId: f.orgId, invitationId: f.invitationId, actorUid: f.uid,
    actorEmail: 'MEMBER@example.com', actorEmailVerified: true,
    database: f.database, serverTimestamp: () => new Date(),
  });
  assert.equal(result.role, 'tenant_manager');
  assert.equal(result.membershipStatus, 'active');
  const membership = f.records.get(`organisations/${f.orgId}/members/${f.uid}`);
  assert.equal(membership.role, 'tenant_manager');
  assert.equal(membership.status, 'active');
  assert.equal(membership.schemaVersion, 1);
  assert.equal(f.records.get(`organisations/${f.orgId}/invitations/${f.invitationId}`).status, 'accepted');
});

test('rejects wrong identity, expiry, role, duplicate membership and inactive organisation', async () => {
  const wrongEmail = fixture();
  await assert.rejects(acceptTenantMemberInvitation({
    orgId: wrongEmail.orgId, invitationId: wrongEmail.invitationId, actorUid: wrongEmail.uid,
    actorEmail: 'other@example.com', actorEmailVerified: true,
    database: wrongEmail.database, serverTimestamp: () => new Date(),
  }), (error) => error.code === 'invitation_identity_mismatch');

  const expired = fixture({ expired: true });
  await assert.rejects(acceptTenantMemberInvitation({
    orgId: expired.orgId, invitationId: expired.invitationId, actorUid: expired.uid,
    actorEmail: 'member@example.com', actorEmailVerified: true,
    database: expired.database, serverTimestamp: () => new Date(),
  }), (error) => error.code === 'invitation_expired');

  const elevated = fixture({ role: 'tenant_super_admin' });
  await assert.rejects(acceptTenantMemberInvitation({
    orgId: elevated.orgId, invitationId: elevated.invitationId, actorUid: elevated.uid,
    actorEmail: 'member@example.com', actorEmailVerified: true,
    database: elevated.database, serverTimestamp: () => new Date(),
  }), (error) => error.code === 'invitation_identity_mismatch');

  const duplicate = fixture();
  duplicate.records.set(`organisations/${duplicate.orgId}/members/${duplicate.uid}`, { uid: duplicate.uid });
  await assert.rejects(acceptTenantMemberInvitation({
    orgId: duplicate.orgId, invitationId: duplicate.invitationId, actorUid: duplicate.uid,
    actorEmail: 'member@example.com', actorEmailVerified: true,
    database: duplicate.database, serverTimestamp: () => new Date(),
  }), (error) => error.code === 'membership_conflict');

  const inactive = fixture();
  inactive.records.set(`organisations/${inactive.orgId}`, { orgId: inactive.orgId, status: 'suspended' });
  await assert.rejects(acceptTenantMemberInvitation({
    orgId: inactive.orgId, invitationId: inactive.invitationId, actorUid: inactive.uid,
    actorEmail: 'member@example.com', actorEmailVerified: true,
    database: inactive.database, serverTimestamp: () => new Date(),
  }), (error) => error.code === 'organisation_unavailable');
});

test('unverified identity and non-pending invitation cannot be accepted', async () => {
  const unverified = fixture();
  await assert.rejects(acceptTenantMemberInvitation({
    orgId: unverified.orgId, invitationId: unverified.invitationId, actorUid: unverified.uid,
    actorEmail: 'member@example.com', actorEmailVerified: false,
    database: unverified.database, serverTimestamp: () => new Date(),
  }), (error) => error.code === 'verified_account_required');

  const accepted = fixture({ status: 'accepted' });
  await assert.rejects(acceptTenantMemberInvitation({
    orgId: accepted.orgId, invitationId: accepted.invitationId, actorUid: accepted.uid,
    actorEmail: 'member@example.com', actorEmailVerified: true,
    database: accepted.database, serverTimestamp: () => new Date(),
  }), (error) => error.code === 'invitation_unavailable');
});


test('rejects malformed inviter UID rather than creating an unusable membership', async () => {
  const f = fixture();
  const invitationPath = \`organisations/\${f.orgId}/invitations/\${f.invitationId}\`;
  f.records.set(invitationPath, {
    ...f.records.get(invitationPath),
    invitedByUid: ' ',
  });
  await assert.rejects(acceptTenantMemberInvitation({
    orgId: f.orgId, invitationId: f.invitationId, actorUid: f.uid,
    actorEmail: 'member@example.com', actorEmailVerified: true,
    database: f.database, serverTimestamp: () => new Date(),
  }), (error) => error.code === 'invalid_invitation');
  assert.equal(f.records.has(\`organisations/\${f.orgId}/members/\${f.uid}\`), false);
});
