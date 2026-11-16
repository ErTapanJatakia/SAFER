import assert from 'node:assert/strict';
import test from 'node:test';
import { revokeSuperAdminInvitation } from '../src/server/organisation-provisioning.mjs';

const orgId = 'org_0123456789abcdef0123456789abcdef';
const invitationId = 'b'.repeat(43);
const actorUid = 'platform-owner-1';
const reason = 'The nominated administrator has changed for this organisation.';

function fixture({ organisationStatus = 'provisioning', lifecycleStage = 'super_admin_invitation_pending', invitationStatus = 'pending' } = {}) {
  const records = new Map();
  const writes = [];
  let auditSequence = 0;
  records.set('organisations/' + orgId, {
    orgId, status: organisationStatus, lifecycleStage, createdByUid: actorUid,
  });
  records.set('organisations/' + orgId + '/invitations/' + invitationId, {
    invitationId, uid: 'super-admin-2', email: 'admin@example.com', orgId,
    role: 'tenant_super_admin', status: invitationStatus, invitedByUid: actorUid,
    schemaVersion: 1,
  });
  const database = {
    doc: (path) => ({ path }),
    collection: () => ({ doc: () => ({ path: 'platformAuditEvents/audit-' + (++auditSequence) }) }),
    runTransaction: async (callback) => callback({
      get: async (ref) => ({ exists: records.has(ref.path), data: () => records.get(ref.path) }),
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
  return { records, writes, database };
}

function revoke(f, overrides = {}) {
  return revokeSuperAdminInvitation({
    orgId, invitationId, actorUid, reason, database: f.database,
    serverTimestamp: () => new Date('2026-11-17T02:00:00.000Z'),
    ...overrides,
  });
}

test('revokes the pending initial Super Admin invitation and suspends provisioning atomically', async () => {
  const f = fixture();
  const result = await revoke(f);
  assert.deepEqual(result, {
    orgId, invitationId, status: 'revoked', organisationStatus: 'suspended',
  });
  const invitation = f.records.get('organisations/' + orgId + '/invitations/' + invitationId);
  const organisation = f.records.get('organisations/' + orgId);
  assert.equal(invitation.status, 'revoked');
  assert.equal(invitation.revokedByUid, actorUid);
  assert.equal(organisation.status, 'suspended');
  assert.equal(organisation.lifecycleStage, 'super_admin_invitation_revoked');
  assert.equal(f.writes.length, 3);
  assert.equal(f.writes[2].value.action, 'organisation.super_admin_invitation_revoked');
});

test('does not revoke accepted, revoked, or otherwise non-pending invitations', async () => {
  for (const invitationStatus of ['accepted', 'revoked', 'expired']) {
    const f = fixture({ invitationStatus });
    await assert.rejects(revoke(f), /super_admin_invitation_not_pending/);
    assert.equal(f.writes.length, 0);
  }
});

test('does not revoke an invitation after organisation lifecycle has advanced', async () => {
  const f = fixture({ organisationStatus: 'active', lifecycleStage: 'active' });
  await assert.rejects(revoke(f), /super_admin_invitation_not_pending/);
  assert.equal(f.writes.length, 0);
});

test('rejects malformed invitation metadata and insufficient revocation reason', async () => {
  const f = fixture();
  const path = 'organisations/' + orgId + '/invitations/' + invitationId;
  f.records.set(path, { ...f.records.get(path), role: 'tenant_admin' });
  await assert.rejects(revoke(f), /super_admin_invitation_unavailable/);
  await assert.rejects(revoke(f, { reason: 'no' }), /invalid_super_admin_invitation_request/);
  assert.equal(f.writes.length, 0);
});
