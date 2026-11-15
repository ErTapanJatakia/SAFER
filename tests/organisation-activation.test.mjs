import assert from 'node:assert/strict';
import test from 'node:test';
import { activateProvisionedOrganisation, OrganisationActivationError } from '../src/server/organisation-activation.mjs';

const orgId = `org_${'b'.repeat(32)}`;
const ownerUid = 'super-admin-1';
function fixture({ orgStatus = 'provisioning', lifecycleStage = 'super_admin_invitation_accepted', memberStatus = 'pending_activation' } = {}) {
  const docs = new Map();
  const orgPath = `organisations/${orgId}`;
  const memberPath = `${orgPath}/members/${ownerUid}`;
  docs.set(orgPath, { orgId, status: orgStatus, lifecycleStage, ownerUid });
  docs.set(memberPath, {
    uid: ownerUid, orgId, role: 'tenant_super_admin', status: memberStatus,
    createdAt: new Date(), createdByUid: 'platform-owner', updatedAt: new Date(),
    updatedByUid: ownerUid, schemaVersion: 1,
  });
  const database = {
    doc: (path) => ({ path }),
    runTransaction: async (callback) => callback({
      get: async (ref) => ({ exists: docs.has(ref.path), data: () => docs.get(ref.path) }),
      update: (ref, patch) => docs.set(ref.path, { ...docs.get(ref.path), ...patch }),
      create: (ref, data) => {
        if (docs.has(ref.path)) throw new Error('already exists');
        docs.set(ref.path, data);
      },
    }),
  };
  return { docs, database, orgPath, memberPath };
}

test('activation atomically activates the organisation and accepted Super Admin with audit event', async () => {
  const f = fixture();
  const result = await activateProvisionedOrganisation({
    orgId, actorUid: 'platform-owner', database: f.database, serverTimestamp: () => new Date(),
  });
  assert.equal(result.status, 'active');
  assert.equal(f.docs.get(f.orgPath).status, 'active');
  assert.equal(f.docs.get(f.memberPath).status, 'active');
  assert.equal(f.docs.get(f.orgPath).lifecycleStage, 'active');
  assert.equal([...f.docs.entries()].some(([path, event]) => path.startsWith('platformAuditEvents/') && event.action === 'organisation.activated'), true);
});

test('activation fails closed for missing acceptance, inactive organisation or non-canonical membership', async () => {
  for (const options of [
    { orgStatus: 'suspended' },
    { lifecycleStage: 'super_admin_invitation_pending' },
    { memberStatus: 'active' },
  ]) {
    const f = fixture(options);
    await assert.rejects(activateProvisionedOrganisation({
      orgId, actorUid: 'platform-owner', database: f.database, serverTimestamp: () => new Date(),
    }), (error) => error instanceof OrganisationActivationError);
  }
});
