import assert from 'node:assert/strict';
import test from 'node:test';
import {
  proposeOrganisationOwnershipTransfer,
  acceptOrganisationOwnershipTransfer,
  OwnershipTransferError,
} from '../src/server/organisation-ownership-transfer.mjs';

const orgId = `org_${'a'.repeat(32)}`;
const date = new Date('2026-11-16T12:00:00.000Z');
function fixture({ nomineeExists = false, nomineeRole = 'tenant_employee' } = {}) {
  const docs = new Map();
  const orgPath = `organisations/${orgId}`;
  const oldUid = 'incumbent-1';
  const newUid = 'nominee-1';
  const oldPath = `${orgPath}/members/${oldUid}`;
  const newPath = `${orgPath}/members/${newUid}`;
  docs.set(orgPath, { orgId, status: 'active', ownerUid: oldUid });
  docs.set(oldPath, {
    uid: oldUid, orgId, role: 'tenant_super_admin', status: 'active',
    createdAt: date, createdByUid: oldUid, updatedAt: date, updatedByUid: oldUid, schemaVersion: 1,
  });
  if (nomineeExists) docs.set(newPath, {
    uid: newUid, orgId, role: nomineeRole, status: 'active',
    createdAt: date, createdByUid: oldUid, updatedAt: date, updatedByUid: oldUid, schemaVersion: 1,
  });
  const database = {
    doc: (path) => ({ path }),
    runTransaction: async (callback) => callback({
      get: async (ref) => ({ exists: docs.has(ref.path), data: () => docs.get(ref.path) }),
      create: (ref, value) => {
        if (docs.has(ref.path)) throw new Error('already exists');
        docs.set(ref.path, value);
      },
      update: (ref, patch) => docs.set(ref.path, { ...docs.get(ref.path), ...patch }),
    }),
  };
  const authAdmin = { getUserByEmail: async (email) => ({
    uid: newUid, email, emailVerified: true, disabled: false,
  }) };
  const serverTimestamp = () => date;
  return { docs, database, authAdmin, serverTimestamp, oldUid, newUid, oldPath, newPath, orgPath };
}

test('ownership proposal keeps incumbent authority and binds transfer to verified nominee', async () => {
  const f = fixture();
  const proposal = await proposeOrganisationOwnershipTransfer({
    orgId, actorUid: f.oldUid, targetEmail: 'nominee@example.com',
    database: f.database, authAdmin: f.authAdmin, serverTimestamp: f.serverTimestamp,
    now: date.getTime(),
  });
  assert.equal(proposal.status, 'pending');
  assert.equal(f.docs.get(f.orgPath).ownerUid, f.oldUid);
  const transfer = f.docs.get(`organisations/${orgId}/ownershipTransfers/${proposal.transferId}`);
  assert.equal(transfer.toUid, f.newUid);
  assert.equal(transfer.status, 'pending');
});

test('verified nominee acceptance atomically promotes nominee and demotes incumbent', async () => {
  const f = fixture({ nomineeExists: true, nomineeRole: 'tenant_employee' });
  const proposal = await proposeOrganisationOwnershipTransfer({
    orgId, actorUid: f.oldUid, targetEmail: 'nominee@example.com',
    database: f.database, authAdmin: f.authAdmin, serverTimestamp: f.serverTimestamp,
    now: date.getTime(),
  });
  const result = await acceptOrganisationOwnershipTransfer({
    orgId, transferId: proposal.transferId, actorUid: f.newUid,
    actorEmail: 'NOMINEE@example.com', actorEmailVerified: true,
    database: f.database, serverTimestamp: f.serverTimestamp, now: date.getTime(),
  });
  assert.equal(result.superAdminUid, f.newUid);
  assert.equal(f.docs.get(f.orgPath).ownerUid, f.newUid);
  assert.equal(f.docs.get(f.newPath).role, 'tenant_super_admin');
  assert.equal(f.docs.get(f.oldPath).role, 'tenant_admin');
  assert.equal(f.docs.get(`organisations/${orgId}/ownershipTransfers/${proposal.transferId}`).status, 'accepted');
});

test('wrong identity, expired transfer, inactive organisation and changed ownership fail closed', async () => {
  const f = fixture();
  const proposal = await proposeOrganisationOwnershipTransfer({
    orgId, actorUid: f.oldUid, targetEmail: 'nominee@example.com',
    database: f.database, authAdmin: f.authAdmin, serverTimestamp: f.serverTimestamp,
    now: date.getTime(),
  });
  await assert.rejects(acceptOrganisationOwnershipTransfer({
    orgId, transferId: proposal.transferId, actorUid: f.newUid,
    actorEmail: 'other@example.com', actorEmailVerified: true,
    database: f.database, serverTimestamp: f.serverTimestamp, now: date.getTime(),
  }), (error) => error instanceof OwnershipTransferError && error.code === 'transfer_identity_mismatch');

  await assert.rejects(acceptOrganisationOwnershipTransfer({
    orgId, transferId: proposal.transferId, actorUid: f.newUid,
    actorEmail: 'nominee@example.com', actorEmailVerified: true,
    database: f.database, serverTimestamp: f.serverTimestamp, now: date.getTime() + 73 * 60 * 60 * 1000,
  }), (error) => error.code === 'transfer_expired');

  f.docs.set(f.orgPath, { orgId, status: 'suspended', ownerUid: f.oldUid });
  await assert.rejects(acceptOrganisationOwnershipTransfer({
    orgId, transferId: proposal.transferId, actorUid: f.newUid,
    actorEmail: 'nominee@example.com', actorEmailVerified: true,
    database: f.database, serverTimestamp: f.serverTimestamp, now: date.getTime(),
  }), (error) => error.code === 'ownership_changed');
});

test('only the current active Super Admin can propose transfer; unverified nominee is rejected', async () => {
  const f = fixture();
  f.authAdmin.getUserByEmail = async (email) => ({ uid: f.newUid, email, emailVerified: false, disabled: false });
  await assert.rejects(proposeOrganisationOwnershipTransfer({
    orgId, actorUid: f.oldUid, targetEmail: 'nominee@example.com',
    database: f.database, authAdmin: f.authAdmin, serverTimestamp: f.serverTimestamp,
  }), (error) => error.code === 'verified_nominee_required');

  await assert.rejects(proposeOrganisationOwnershipTransfer({
    orgId, actorUid: 'not-owner', targetEmail: 'nominee@example.com',
    database: f.database, authAdmin: { getUserByEmail: async (email) => ({ uid: f.newUid, email, emailVerified: true, disabled: false }) },
    serverTimestamp: f.serverTimestamp,
  }), (error) => error.code === 'active_super_admin_required');
});
