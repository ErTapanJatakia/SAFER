import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { resolveTenantMembership, TenantMembershipError } from './tenantMembership.ts';

const projectId = 'demo-safer';
const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');
let testEnv: RulesTestEnvironment;

before(async () => {
  testEnv = await initializeTestEnvironment({ projectId, firestore: { rules } });
});

after(async () => {
  await testEnv?.cleanup();
});

async function seedMembership(orgId: string, uid: string, fields: Record<string, unknown> = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await setDoc(doc(database, 'organisations', orgId), {
      orgId, displayName: 'Synthetic Resolver Test', status: 'active', schemaVersion: 1,
    });
    await setDoc(doc(database, 'organisations', orgId, 'members', uid), {
      uid, orgId, role: 'owner', status: 'active', ...fields,
    });
  });
}

test('resolves only the caller exact active membership for every supported role', async () => {
  for (const role of ['owner', 'admin', 'manager', 'viewer'] as const) {
    const uid = 'resolver-' + role;
    const orgId = 'resolver-org-' + role;
    await seedMembership(orgId, uid, { role });
    const database = testEnv.authenticatedContext(uid).firestore();
    const result = await resolveTenantMembership(database, { uid }, orgId);
    assert.deepEqual(result, { uid, orgId, role, status: 'active' });
    assert.equal(Object.isFrozen(result), true);
  }
});

test('rejects unauthenticated users and unsafe organisation locators', async () => {
  const database = testEnv.unauthenticatedContext().firestore();
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
  const database = testEnv.authenticatedContext('no-membership').firestore();
  await assert.rejects(
    resolveTenantMembership(database, { uid: 'no-membership' }, 'missing-org'),
    (error: unknown) => error instanceof TenantMembershipError && error.code === 'membership-unavailable',
  );
});

test('rejects inactive, unsupported, mismatched, and non-minimal membership records', async () => {
  const fixtures = [
    { orgId: 'resolver-inactive', uid: 'resolver-inactive', fields: { status: 'suspended' } },
    { orgId: 'resolver-invalid-role', uid: 'resolver-invalid-role', fields: { role: 'platform-admin' } },
    { orgId: 'resolver-extra-field', uid: 'resolver-extra-field', fields: { internalNote: 'not permitted' } },
    { orgId: 'resolver-mismatched-org', uid: 'resolver-mismatched-org', fields: { orgId: 'different-org' } },
  ];

  for (const fixture of fixtures) {
    await seedMembership(fixture.orgId, fixture.uid, fixture.fields);
    const database = testEnv.authenticatedContext(fixture.uid).firestore();
    await assert.rejects(
      resolveTenantMembership(database, { uid: fixture.uid }, fixture.orgId),
      (error: unknown) => error instanceof TenantMembershipError && error.code === 'invalid-membership',
    );
  }
});
