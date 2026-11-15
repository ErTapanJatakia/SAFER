import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp, type Firestore } from 'firebase/firestore';
import {
  parseTenantMembership,
  resolveTenantMembership,
  TenantMembershipError,
  TENANT_ROLES,
} from './tenantMembership.ts';

const projectId = 'demo-safer';
const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({ projectId, firestore: { rules } });
});

after(async () => {
  await testEnv?.cleanup();
});

function canonicalMembership(uid: string, orgId: string, role: string = 'tenant_super_admin') {
  const now = Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z'));
  return {
    uid, orgId, role, status: 'active',
    createdAt: now, createdByUid: 'trusted-platform-owner',
    updatedAt: now, updatedByUid: 'trusted-platform-owner',
    schemaVersion: 1,
  };
}

async function seedMembership(orgId: string, uid: string, fields: Record<string, unknown> = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await setDoc(doc(database, 'organisations', orgId), {
      orgId, displayName: 'Synthetic Resolver Test', status: 'active', schemaVersion: 1,
    });
    await setDoc(
      doc(database, 'organisations', orgId, 'members', uid),
      { ...canonicalMembership(uid, orgId), ...fields },
    );
  });
}

test('resolves only the caller exact active membership for all five canonical tenant roles', async () => {
  for (const role of TENANT_ROLES) {
    const uid = 'resolver-' + role;
    const orgId = 'resolver-org-' + role;
    await seedMembership(orgId, uid, { role });
    const database = testEnv.authenticatedContext(uid).firestore() as unknown as Firestore;
    const result = await resolveTenantMembership(database, { uid }, orgId);
    assert.deepEqual(result, { uid, orgId, role, status: 'active', schemaVersion: 1 });
    assert.equal(Object.isFrozen(result), true);
  }
});

test('rejects unauthenticated users and unsafe organisation locators', async () => {
  const database = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
  await assert.rejects(
    resolveTenantMembership(database, null, 'org-safe'),
    (error: unknown) => error instanceof TenantMembershipError && error.code === 'unauthenticated',
  );
  await assert.rejects(
    resolveTenantMembership(database, { uid: 'user-a' }, '../other-org'),
    (error: unknown) => error instanceof TenantMembershipError && error.code === 'invalid-organisation-id',
  );
  await assert.rejects(
    resolveTenantMembership(database, { uid: 'user-a' }, 'org/a'),
    (error: unknown) => error instanceof TenantMembershipError && error.code === 'invalid-organisation-id',
  );
});

test('fails closed when membership is absent or denied by Firestore Rules', async () => {
  const database = testEnv.authenticatedContext('no-membership').firestore() as unknown as Firestore;
  await assert.rejects(
    resolveTenantMembership(database, { uid: 'no-membership' }, 'missing-org'),
    (error: unknown) => error instanceof TenantMembershipError && error.code === 'membership-unavailable',
  );
});

test('Firestore Rules reject legacy, malformed, inactive and non-canonical membership documents', async () => {
  const fixtures = [
    { orgId: 'resolver-inactive', uid: 'resolver-inactive', fields: { status: 'suspended' } },
    { orgId: 'resolver-invalid-role', uid: 'resolver-invalid-role', fields: { role: 'platform_owner' } },
    { orgId: 'resolver-legacy-owner', uid: 'resolver-legacy-owner', fields: { role: 'owner' } },
    { orgId: 'resolver-legacy-viewer', uid: 'resolver-legacy-viewer', fields: { role: 'viewer' } },
    { orgId: 'resolver-extra-field', uid: 'resolver-extra-field', fields: { internalNote: 'not permitted' } },
    { orgId: 'resolver-mismatched-org', uid: 'resolver-mismatched-org', fields: { orgId: 'different-org' } },
    { orgId: 'resolver-invalid-version', uid: 'resolver-invalid-version', fields: { schemaVersion: 2 } },
  ];

  for (const fixture of fixtures) {
    await seedMembership(fixture.orgId, fixture.uid, fixture.fields);
    const database = testEnv.authenticatedContext(fixture.uid).firestore() as unknown as Firestore;
    await assertFails(
      getDoc(doc(database, 'organisations', fixture.orgId, 'members', fixture.uid)),
    );
  }
});

test('pure parser rejects malformed, mismatched, inactive, legacy and non-minimal membership data', () => {
  const uid = 'parser-user';
  const orgId = 'parser-org';
  const valid = canonicalMembership(uid, orgId);

  assert.deepEqual(parseTenantMembership(valid, uid, orgId), {
    uid, orgId, role: 'tenant_super_admin', status: 'active', schemaVersion: 1,
  });
  assert.equal(Object.isFrozen(parseTenantMembership(valid, uid, orgId)), true);

  const invalidRecords: unknown[] = [
    null, [],
    { ...valid, uid: 'other-user' },
    { ...valid, orgId: 'other-org' },
    { ...valid, status: 'suspended' },
    { ...valid, role: 'platform_owner' },
    { ...valid, role: 'owner' },
    { ...valid, role: 'viewer' },
    { ...valid, extraField: 'not permitted' },
    { ...valid, schemaVersion: 2 },
    { ...valid, createdAt: 'not-a-timestamp' },
    { uid, orgId, role: 'tenant_super_admin', status: 'active' },
  ];

  for (const record of invalidRecords) {
    assert.throws(
      () => parseTenantMembership(record, uid, orgId),
      (error: unknown) => error instanceof TenantMembershipError && error.code === 'invalid-membership',
    );
  }
});
