import assert from 'node:assert/strict';
import test from 'node:test';
import { inviteTenantMember, manageTenantMember, TenantMembershipError } from '../src/server/tenant-membership-admin.mjs';

function fixture({ actorRole = 'tenant_super_admin', targetRole = null } = {}) {
  const records = new Map();
  const audit = [];
  const reads = [];
  const orgId = 'org_0123456789abcdef0123456789abcdef';
  const actorUid = 'actor-1';
  const targetUid = 'target-1';
  const now = Date.now();
  const member = (uid, role, status = 'active') => ({
    uid, orgId, role, status, createdAt: new Date(now), createdByUid: 'seed-owner',
    updatedAt: new Date(now), updatedByUid: 'seed-owner', schemaVersion: 1,
  });
  records.set(`organisations/${orgId}`, { orgId, status: 'active' });
  records.set(`organisations/${orgId}/members/${actorUid}`, member(actorUid, actorRole));
  if (targetRole) records.set(`organisations/${orgId}/members/${targetUid}`, member(targetUid, targetRole));
  const database = {
    doc: (path) => ({ path }),
    collection: (path) => ({ doc: () => ({ path: `${path}/audit-${audit.length + 1}` }) }),
    runTransaction: async (callback) => callback({
      get: async (ref) => {
        reads.push(ref.path);
        return { exists: records.has(ref.path), data: () => records.get(ref.path) };
      },
      create: (ref, data) => {
        if (records.has(ref.path)) throw new Error('already exists');
        records.set(ref.path, data);
        if (ref.path.includes('/auditEvents/')) audit.push(data);
      },
      update: (ref, patch) => records.set(ref.path, { ...records.get(ref.path), ...patch }),
    }),
  };
  const authAdmin = {
    getUserByEmail: async (email) => ({
      uid: targetUid, email, emailVerified: true, disabled: false,
    }),
  };
  return { records, audit, reads, database, authAdmin, orgId, actorUid, targetUid, member };
}

test('Super Admin can invite a verified existing user into a lower PMC role', async () => {
  const f = fixture();
  const result = await inviteTenantMember({
    orgId: f.orgId, actorUid: f.actorUid, email: 'new.member@example.com',
    role: 'tenant_manager', database: f.database, authAdmin: f.authAdmin,
    serverTimestamp: () => new Date(),
  });
  assert.equal(result.status, 'pending');
  assert.equal(result.role, 'tenant_manager');
  assert.equal(result.invitationId.length >= 40, true);
  const invitation = f.records.get(`organisations/${f.orgId}/invitations/${result.invitationId}`);
  assert.equal(invitation.uid, f.targetUid);
  assert.equal(invitation.schemaVersion, 1);
  assert.equal(f.audit[0].action, 'tenant.member.invitation_created');
});

test('Admin cannot invite an Admin or Super Admin and unverified invitees are rejected', async () => {
  const admin = fixture({ actorRole: 'tenant_admin' });
  await assert.rejects(inviteTenantMember({
    orgId: admin.orgId, actorUid: admin.actorUid, email: 'new.member@example.com',
    role: 'tenant_admin', database: admin.database, authAdmin: admin.authAdmin,
    serverTimestamp: () => new Date(),
  }), (error) => error instanceof TenantMembershipError && error.code === 'role_delegation_denied');

  const unverified = fixture();
  unverified.authAdmin.getUserByEmail = async (email) => ({
    uid: unverified.targetUid, email, emailVerified: false, disabled: false,
  });
  await assert.rejects(inviteTenantMember({
    orgId: unverified.orgId, actorUid: unverified.actorUid, email: 'new.member@example.com',
    role: 'tenant_employee', database: unverified.database, authAdmin: unverified.authAdmin,
    serverTimestamp: () => new Date(),
  }), (error) => error.code === 'verified_invitee_required');
});

test('role delegation and suspension are transactionally scoped and audited', async () => {
  const f = fixture({ actorRole: 'tenant_admin', targetRole: 'tenant_employee' });
  const changed = await manageTenantMember({
    orgId: f.orgId, actorUid: f.actorUid, targetUid: f.targetUid,
    action: 'members:role:assign', targetRole: 'tenant_auditor',
    database: f.database, serverTimestamp: () => new Date(),
  });
  assert.equal(changed.role, 'tenant_auditor');
  assert.equal(f.records.get(`organisations/${f.orgId}/members/${f.targetUid}`).updatedByUid, f.actorUid);
  assert.equal(f.audit[0].action, 'tenant.member.role_changed');

  const suspended = await manageTenantMember({
    orgId: f.orgId, actorUid: f.actorUid, targetUid: f.targetUid,
    action: 'members:suspend', database: f.database, serverTimestamp: () => new Date(),
  });
  assert.equal(suspended.status, 'suspended');
  assert.equal(f.audit.length, 2);
});

test('tenant administrators cannot modify peers, higher roles, or themselves', async () => {
  const admin = fixture({ actorRole: 'tenant_admin', targetRole: 'tenant_manager' });
  await assert.rejects(manageTenantMember({
    orgId: admin.orgId, actorUid: admin.actorUid, targetUid: admin.targetUid,
    action: 'members:role:assign', targetRole: 'tenant_super_admin',
    database: admin.database, serverTimestamp: () => new Date(),
  }), (error) => error.code === 'role_delegation_denied');

  const peer = fixture({ actorRole: 'tenant_admin', targetRole: 'tenant_admin' });
  await assert.rejects(manageTenantMember({
    orgId: peer.orgId, actorUid: peer.actorUid, targetUid: peer.targetUid,
    action: 'members:suspend', database: peer.database, serverTimestamp: () => new Date(),
  }), (error) => error.code === 'target_membership_not_manageable');

  await assert.rejects(manageTenantMember({
    orgId: peer.orgId, actorUid: peer.actorUid, targetUid: peer.actorUid,
    action: 'members:suspend', database: peer.database, serverTimestamp: () => new Date(),
  }), (error) => error.code === 'invalid_request');
});

test('roles without member-management permission cannot probe target UID membership', async () => {
  for (const targetRole of [null, 'tenant_employee']) {
    const f = fixture({ actorRole: 'tenant_manager', targetRole });
    await assert.rejects(manageTenantMember({
      orgId: f.orgId,
      actorUid: f.actorUid,
      targetUid: f.targetUid,
      action: 'members:suspend',
      database: f.database,
      serverTimestamp: () => new Date(),
    }), (error) => error.code === 'role_permission_denied');
    assert.equal(
      f.reads.includes(`organisations/${f.orgId}/members/${f.targetUid}`),
      false,
      'target membership must not be read before the actor is authorized for this action',
    );
  }
});

test('suspended or non-active tenant context cannot administer memberships', async () => {
  const f = fixture();
  f.records.set(`organisations/${f.orgId}`, { orgId: f.orgId, status: 'suspended' });
  await assert.rejects(inviteTenantMember({
    orgId: f.orgId, actorUid: f.actorUid, email: 'new.member@example.com',
    role: 'tenant_employee', database: f.database, authAdmin: f.authAdmin,
    serverTimestamp: () => new Date(),
  }), (error) => error.code === 'active_organisation_required');
});

test('unauthorised callers cannot probe Firebase Auth email existence',async()=>{
 const f=fixture({actorRole:'tenant_employee'});
 let lookupCalled=false;
 f.authAdmin.getUserByEmail=async()=>{lookupCalled=true;return null;};
 await assert.rejects(inviteTenantMember({
  orgId:f.orgId,actorUid:f.actorUid,email:'probe@example.com',
  role:'tenant_manager',database:f.database,authAdmin:f.authAdmin,
  serverTimestamp:()=>new Date(),
 }), (error)=>error.code==='role_permission_denied');
 assert.equal(lookupCalled,false);
});
