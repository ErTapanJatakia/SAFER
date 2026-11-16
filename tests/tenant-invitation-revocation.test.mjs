import assert from 'node:assert/strict';
import test from 'node:test';
import { revokeTenantMemberInvitation, TenantMembershipError } from '../src/server/tenant-membership-admin.mjs';

const orgId = 'org_0123456789abcdef0123456789abcdef';
const invitationId = 'a'.repeat(43);
const actorUid = 'actor-1';
const targetUid = 'target-1';
const reason = 'Invitation is no longer required for this access request.';

function fixture({ actorRole = 'tenant_super_admin', invitationStatus = 'pending', invitationRole = 'tenant_manager' } = {}) {
  const now = new Date('2026-11-17T00:00:00.000Z');
  const records = new Map();
  const reads = [];
  const writes = [];
  let auditSequence = 0;
  const membership = {
    uid: actorUid, orgId, role: actorRole, status: 'active',
    createdAt: now, createdByUid: 'seed-owner',
    updatedAt: now, updatedByUid: 'seed-owner', schemaVersion: 1,
  };
  const invitation = {
    invitationId, uid: targetUid, email: 'target@example.com', orgId,
    role: invitationRole, status: invitationStatus, invitedAt: now,
    expiresAt: new Date(now.getTime() + 86400000), invitedByUid: actorUid,
    schemaVersion: 1,
  };
  records.set('organisations/' + orgId, { orgId, status: 'active' });
  records.set('organisations/' + orgId + '/members/' + actorUid, membership);
  records.set('organisations/' + orgId + '/invitations/' + invitationId, invitation);
  const database = {
    doc: (path) => ({ path }),
    collection: (path) => ({ doc: () => ({ path: path + '/audit-' + (++auditSequence) }) }),
    runTransaction: async (callback) => callback({
      get: async (ref) => {
        reads.push(ref.path);
        return { exists: records.has(ref.path), data: () => records.get(ref.path) };
      },
      update: (ref, patch) => {
        writes.push({ type: 'update', path: ref.path, patch });
        records.set(ref.path, { ...records.get(ref.path), ...patch });
      },
      create: (ref, value) => {
        writes.push({ type: 'create', path: ref.path, value });
        records.set(ref.path, value);
      },
    }),
  };
  return { records, reads, writes, database, invitation };
}

function revoke(f, overrides = {}) {
  return revokeTenantMemberInvitation({
    orgId, actorUid, invitationId, reason, database: f.database,
    serverTimestamp: () => new Date('2026-11-17T01:00:00.000Z'),
    ...overrides,
  });
}

test('revokes a pending invitation and appends a tenant audit event atomically', async () => {
  const f = fixture({ actorRole: 'tenant_admin', invitationRole: 'tenant_auditor' });
  const result = await revoke(f);
  assert.deepEqual(result, { orgId, invitationId, status: 'revoked' });
  const stored = f.records.get('organisations/' + orgId + '/invitations/' + invitationId);
  assert.equal(stored.status, 'revoked');
  assert.equal(stored.revokedByUid, actorUid);
  assert.equal(stored.revocationReason, reason);
  assert.equal(f.writes.length, 2);
  assert.equal(f.writes[1].value.action, 'tenant.member.invitation_revoked');
  assert.equal(f.writes[1].value.targetUid, targetUid);
});

test('unauthorized tenant roles are rejected before the invitation is read', async () => {
  const f = fixture({ actorRole: 'tenant_manager' });
  await assert.rejects(revoke(f), (error) => error instanceof TenantMembershipError
    && error.code === 'role_permission_denied');
  assert.equal(f.reads.includes('organisations/' + orgId + '/invitations/' + invitationId), false);
  assert.equal(f.writes.length, 0);
});

test('only pending invitations can be revoked', async () => {
  for (const status of ['accepted', 'revoked', 'expired']) {
    const f = fixture({ invitationStatus: status });
    await assert.rejects(revoke(f), (error) => error.code === 'invitation_not_pending');
    assert.equal(f.writes.length, 0);
  }
});

test('tenant admins cannot revoke an invitation for a role they cannot delegate', async () => {
  const f = fixture({ actorRole: 'tenant_admin', invitationRole: 'tenant_super_admin' });
  await assert.rejects(revoke(f), (error) => error.code === 'invitation_unavailable');
  assert.equal(f.writes.length, 0);
});

test('rejects malformed identifiers and inadequate reasons', async () => {
  const f = fixture();
  await assert.rejects(revoke(f, { invitationId: 'short' }), (error) => error.code === 'invalid_invitation_request');
  await assert.rejects(revoke(f, { reason: 'no' }), (error) => error.code === 'invalid_invitation_request');
  assert.equal(f.writes.length, 0);
});
