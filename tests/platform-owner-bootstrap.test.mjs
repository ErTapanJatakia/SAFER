import assert from 'node:assert/strict';
import test from 'node:test';
import {
  provisionFirstPlatformOwner,
  revokePlatformOwner,
} from '../src/server/platform-owner-bootstrap.mjs';

function createFakeDatabase({ settings = null, administrator = null } = {}) {
  const documents = new Map();
  if (settings) documents.set('platform/settings', { ...settings });
  if (administrator) documents.set(`platform/administrators/${administrator.uid}`, { ...administrator });
  const database = {
    doc(path) {
      return {
        path,
        async get() {
          const value = documents.get(path);
          return { exists: Boolean(value), get: (key) => value?.[key] };
        },
      };
    },
    async runTransaction(callback) {
      const writes = [];
      const transaction = {
        async get(reference) {
          const value = documents.get(reference.path);
          return { exists: Boolean(value), get: (key) => value?.[key] };
        },
        set(reference, value, options) { writes.push({ kind: 'set', reference, value, options }); },
        create(reference, value) { writes.push({ kind: 'create', reference, value }); },
        update(reference, value) { writes.push({ kind: 'update', reference, value }); },
      };
      await callback(transaction);
      for (const write of writes) {
        const existing = documents.get(write.reference.path);
        if (write.kind === 'create' && existing) throw new Error('already exists');
        if (write.kind === 'set') {
          documents.set(write.reference.path, write.options?.merge
            ? { ...existing, ...write.value }
            : { ...write.value });
        } else if (write.kind === 'create') {
          documents.set(write.reference.path, { ...write.value });
        } else if (write.kind === 'update') {
          if (!existing) throw new Error('missing document');
          documents.set(write.reference.path, { ...existing, ...write.value });
        }
      }
    },
  };
  return { database, documents };
}

const validInput = {
  uid: 'owner-uid',
  changeReference: 'CHG-2026-001',
  operatorReference: 'verified-project-operator',
  reason: 'Approved initial Platform Owner appointment after independent identity verification.',
  authAdmin: { getUser: async (uid) => ({ uid, emailVerified: true }) },
  serverTimestamp: () => 'SERVER_TIMESTAMP',
};

test('provisions one verified identity and creates an authoritative platform principal', async () => {
  const { database, documents } = createFakeDatabase();
  const result = await provisionFirstPlatformOwner({ ...validInput, database });
  assert.deepEqual(result, { uid: 'owner-uid', role: 'platform_owner', status: 'active' });
  assert.equal(documents.get('platform/administrators/owner-uid').role, 'platform_owner');
  assert.equal(documents.get('platform/administrators/owner-uid').status, 'active');
  assert.equal(documents.get('platform/settings').platformOwnerUid, 'owner-uid');
  assert.equal(documents.get('platform/settings').ownerBootstrapStatus, 'claimed');
});

test('refuses unverified Firebase identity and does not write documents', async () => {
  const { database, documents } = createFakeDatabase();
  await assert.rejects(
    provisionFirstPlatformOwner({
      ...validInput,
      database,
      authAdmin: { getUser: async (uid) => ({ uid, emailVerified: false }) },
    }),
    /identity could not be verified/,
  );
  assert.equal(documents.size, 0);
});

test('refuses a second bootstrap or a pre-existing administrator record', async () => {
  const cases = [
    createFakeDatabase({ settings: { platformOwnerUid: 'existing-owner', ownerBootstrapStatus: 'claimed' } }),
    createFakeDatabase({ administrator: { uid: 'owner-uid', role: 'platform_owner', status: 'active' } }),
  ];
  for (const { database } of cases) {
    await assert.rejects(
      provisionFirstPlatformOwner({ ...validInput, database }),
      /already been consumed|already exists/,
    );
  }
});

test('requires a meaningful operator reference, change reference, and reason', async () => {
  const { database } = createFakeDatabase();
  await assert.rejects(
    provisionFirstPlatformOwner({ ...validInput, database, operatorReference: '' }),
    /operator reference/,
  );
  await assert.rejects(
    provisionFirstPlatformOwner({ ...validInput, database, changeReference: '' }),
    /change reference/,
  );
  await assert.rejects(
    provisionFirstPlatformOwner({ ...validInput, database, reason: 'ok' }),
    /provisioning reason/,
  );
});

test('revokes the exact active Platform Owner and preserves the bootstrap lock', async () => {
  const { database, documents } = createFakeDatabase({
    settings: { platformOwnerUid: 'owner-uid', ownerBootstrapStatus: 'claimed' },
    administrator: { uid: 'owner-uid', role: 'platform_owner', status: 'active' },
  });
  const result = await revokePlatformOwner({
    uid: 'owner-uid',
    changeReference: 'CHG-2026-002',
    operatorReference: 'verified-project-operator',
    reason: 'Emergency revocation following an approved security incident response.',
    database,
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  });
  assert.deepEqual(result, { uid: 'owner-uid', role: 'platform_owner', status: 'revoked' });
  assert.equal(documents.get('platform/administrators/owner-uid').status, 'revoked');
  assert.equal(documents.get('platform/settings').ownerBootstrapStatus, 'revoked');
  assert.equal(documents.get('platform/settings').platformOwnerUid, 'owner-uid');
});

test('revocation cannot revoke another UID or a non-active principal', async () => {
  const { database } = createFakeDatabase({
    settings: { platformOwnerUid: 'owner-uid', ownerBootstrapStatus: 'claimed' },
    administrator: { uid: 'owner-uid', role: 'platform_owner', status: 'revoked' },
  });
  await assert.rejects(
    revokePlatformOwner({
      uid: 'owner-uid',
      changeReference: 'CHG-2026-003',
      operatorReference: 'verified-project-operator',
      reason: 'Approved revocation retry after the original revocation operation was reviewed.',
      database,
      serverTimestamp: () => 'SERVER_TIMESTAMP',
    }),
    /could not be verified/,
  );
});
