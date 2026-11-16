import assert from 'node:assert/strict';
import test from 'node:test';
import { createOrganisationWithSuperAdminInvitation } from '../src/server/organisation-provisioning.mjs';

function fixture(user) {
  const records = new Map();
  const writes = [];
  let auditSequence = 0;
  const database = {
    doc: (path) => ({ path }),
    collection: (name) => ({ doc: () => ({ path: name + '/audit-' + (++auditSequence) }) }),
    runTransaction: async (callback) => callback({
      get: async (ref) => ({ exists: records.has(ref.path), data: () => records.get(ref.path) }),
      create: (ref, value) => {
        writes.push({ path: ref.path, value });
        records.set(ref.path, value);
      },
    }),
  };
  return {
    records, writes, database,
    authAdmin: { getUserByEmail: async () => user },
  };
}

const baseUser = {
  uid: 'nominated-super-admin',
  email: 'admin@example.com',
  emailVerified: true,
  disabled: false,
};

test('creates provisioning invitation only for exact enabled verified Firebase identity', async () => {
  const f = fixture(baseUser);
  const result = await createOrganisationWithSuperAdminInvitation({
    displayName: 'Example Organisation',
    superAdminEmail: 'ADMIN@example.com',
    actorUid: 'platform-owner-1',
    database: f.database,
    authAdmin: f.authAdmin,
    serverTimestamp: () => new Date('2026-11-17T00:00:00.000Z'),
  });
  assert.equal(result.status, 'provisioning');
  assert.equal(result.superAdminInvitation.uid, baseUser.uid);
  assert.equal(result.superAdminInvitation.status, 'pending');
  assert.equal(f.writes.length, 3);
});

test('rejects disabled, unverified, malformed-UID and mismatched-email identities without writes', async () => {
  const ineligibleUsers = [
    { ...baseUser, disabled: true },
    { ...baseUser, emailVerified: false },
    { ...baseUser, uid: 'invalid uid' },
    { ...baseUser, email: 'different@example.com' },
  ];
  for (const user of ineligibleUsers) {
    const f = fixture(user);
    await assert.rejects(createOrganisationWithSuperAdminInvitation({
      displayName: 'Example Organisation',
      superAdminEmail: 'admin@example.com',
      actorUid: 'platform-owner-1',
      database: f.database,
      authAdmin: f.authAdmin,
      serverTimestamp: () => new Date(),
    }), /account is not eligible/);
    assert.equal(f.writes.length, 0);
  }
});
