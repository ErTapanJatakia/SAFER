import test from 'node:test';
import assert from 'node:assert/strict';
import { changeOrganisationStatus } from '../src/server/organisation-registry.mjs';

const orgId = `org_${'a'.repeat(32)}`;
const actorUid = 'platform-owner-1';

function activeSuperAdmin(uid = 'super-admin-1') {
  const now = new Date('2026-11-16T00:00:00.000Z');
  return {
    uid, orgId, role: 'tenant_super_admin', status: 'active',
    createdAt: now, createdByUid: actorUid,
    updatedAt: now, updatedByUid: actorUid, schemaVersion: 1,
  };
}

function fakeDatabase({ organisation, members = [] }) {
  const records = new Map([[ `organisations/${orgId}`, organisation ]]);
  for (const member of members) records.set(`organisations/${orgId}/members/${member.uid}`, member);
  const writes = [];
  let auditSequence = 0;
  const database = {
    writes,
    records,
    doc(path) { return { path }; },
    collection(path) {
      if (path === 'platformAuditEvents') {
        return { doc: () => ({ path: `platformAuditEvents/event-${++auditSequence}` }) };
      }
      const filters = [];
      let cap = Infinity;
      const query = {
        where(field, operator, value) {
          assert.equal(operator, '==');
          filters.push([field, value]);
          return this;
        },
        limit(value) { cap = value; return this; },
        __query: true,
        path,
        filters,
        get cap() { return cap; },
      };
      return query;
    },
    async runTransaction(callback) {
      const transaction = {
        async get(reference) {
          if (reference.__query) {
            const docs = [...records.entries()]
              .filter(([recordPath]) => recordPath.startsWith(`${reference.path}/`))
              .filter(([, value]) => reference.filters.every(([field, expected]) => value?.[field] === expected))
              .slice(0, reference.cap)
              .map(([recordPath, value]) => ({
                id: recordPath.split('/').at(-1),
                data: () => value,
              }));
            return { docs };
          }
          const value = records.get(reference.path);
          return { exists: value !== undefined, data: () => value };
        },
        update(reference, value) {
          writes.push({ kind: 'update', path: reference.path, value });
          records.set(reference.path, { ...records.get(reference.path), ...value });
        },
        create(reference, value) {
          writes.push({ kind: 'create', path: reference.path, value });
          records.set(reference.path, value);
        },
      };
      return callback(transaction);
    },
  };
  return database;
}

const change = (database, nextStatus = 'active') => changeOrganisationStatus({
  database, orgId, nextStatus, actorUid, serverTimestamp: () => new Date('2026-11-16T12:00:00.000Z'),
});

test('provisioning organisation cannot be reactivated after it was suspended', async () => {
  const database = fakeDatabase({
    organisation: {
      orgId, status: 'suspended', lifecycleStage: 'super_admin_invitation_pending',
    },
  });
  await assert.rejects(change(database), /not permitted before the dedicated Super Admin activation workflow/);
  assert.equal(database.writes.length, 0);
  assert.equal(database.records.get(`organisations/${orgId}`).status, 'suspended');
});

test('previously activated organisation cannot be reactivated without an active canonical Super Admin', async () => {
  const database = fakeDatabase({
    organisation: { orgId, status: 'suspended', lifecycleStage: 'active' },
  });
  await assert.rejects(change(database), /not permitted without a canonical active Super Admin/);
  assert.equal(database.writes.length, 0);
});

test('reactivation succeeds only with an active canonical Super Admin and is audited atomically', async () => {
  const database = fakeDatabase({
    organisation: { orgId, status: 'suspended', lifecycleStage: 'active' },
    members: [activeSuperAdmin()],
  });
  const result = await change(database);
  assert.deepEqual(result, { orgId, previousStatus: 'suspended', status: 'active' });
  assert.equal(database.records.get(`organisations/${orgId}`).status, 'active');
  assert.equal(database.writes.length, 2);
  assert.equal(database.writes[1].value.action, 'organisation.status_changed');
});

test('malformed or non-canonical Super Admin membership cannot authorize reactivation', async () => {
  const member = { ...activeSuperAdmin(), extraPrivilege: true };
  const database = fakeDatabase({
    organisation: { orgId, status: 'suspended', lifecycleStage: 'active' },
    members: [member],
  });
  await assert.rejects(change(database), /not permitted without a canonical active Super Admin/);
  assert.equal(database.writes.length, 0);
});
