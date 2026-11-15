import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveTenantAuthorization,
  TenantAuthorizationError,
} from '../src/server/tenant-authorization.mjs';

function fixture({ role = 'tenant_employee', status = 'active', orgStatus = 'active' } = {}) {
  const reads = [];
  const records = {
    'organisations/pmc-alpha/members/user-1': {
      uid: 'user-1', orgId: 'pmc-alpha', role, status,
      createdAt: {}, createdByUid: 'owner-1', updatedAt: {}, updatedByUid: 'owner-1',
      schemaVersion: 1,
    },
    'organisations/pmc-alpha': { orgId: 'pmc-alpha', status: orgStatus },
  };
  const auth = {
    verifyIdToken: async (token, checkRevoked) => {
      assert.equal(token, 'valid-token');
      assert.equal(checkRevoked, true);
      return { uid: 'user-1', role: 'tenant_super_admin' };
    },
    getUser: async (uid) => ({ uid, disabled: false }),
  };
  const database = {
    doc: (path) => ({
      get: async () => {
        reads.push(path);
        const value = records[path];
        return { exists: Boolean(value), data: () => value };
      },
    }),
  };
  return { auth, database, reads };
}

test('resolves role only from authoritative membership, not token claims', async () => {
  const { auth, database, reads } = fixture({ role: 'tenant_employee' });
  const result = await resolveTenantAuthorization({
    token: 'valid-token', orgId: 'pmc-alpha', action: 'personnel:read:own',
    auth, database, resourceOwnerUid: 'user-1',
  });
  assert.equal(result.role, 'tenant_employee');
  assert.deepEqual(reads.sort(), [
    'organisations/pmc-alpha',
    'organisations/pmc-alpha/members/user-1',
  ]);
});

test('rejects invalid, revoked and disabled identities', async () => {
  const base = fixture();
  await assert.rejects(
    resolveTenantAuthorization({ token: '', orgId: 'pmc-alpha', action: 'organisation:read', ...base }),
    (error) => error instanceof TenantAuthorizationError && error.status === 401,
  );
  const revoked = fixture();
  revoked.auth.verifyIdToken = async () => { throw new Error('revoked'); };
  await assert.rejects(
    resolveTenantAuthorization({ token: 'valid-token', orgId: 'pmc-alpha', action: 'organisation:read', ...revoked }),
    (error) => error.code === 'unauthenticated',
  );
  const disabled = fixture();
  disabled.auth.getUser = async (uid) => ({ uid, disabled: true });
  await assert.rejects(
    resolveTenantAuthorization({ token: 'valid-token', orgId: 'pmc-alpha', action: 'organisation:read', ...disabled }),
    (error) => error.code === 'account_unavailable',
  );
  const unavailable = fixture();
  unavailable.auth.getUser = async () => { throw new Error('identity provider unavailable'); };
  await assert.rejects(
    resolveTenantAuthorization({ token: 'valid-token', orgId: 'pmc-alpha', action: 'organisation:read', ...unavailable }),
    (error) => error.code === 'identity_service_unavailable' && error.status === 503,
  );
});

test('rejects missing membership and inactive or suspended tenant context', async () => {
  const missing = fixture();
  missing.database.doc = () => ({ get: async () => ({ exists: false, data: () => null }) });
  await assert.rejects(
    resolveTenantAuthorization({ token: 'valid-token', orgId: 'pmc-alpha', action: 'organisation:read', ...missing }),
    (error) => error.code === 'tenant_membership_required',
  );
  for (const options of [{ status: 'suspended' }, { orgStatus: 'suspended' }]) {
    const current = fixture(options);
    await assert.rejects(
      resolveTenantAuthorization({ token: 'valid-token', orgId: 'pmc-alpha', action: 'organisation:read', ...current }),
      (error) => error.status === 403,
    );
  }
});

test('enforces employee ownership and denies actions outside the role catalogue', async () => {
  const current = fixture({ role: 'tenant_employee' });
  await assert.rejects(
    resolveTenantAuthorization({
      token: 'valid-token', orgId: 'pmc-alpha', action: 'personnel:read:own',
      auth: current.auth, database: current.database, resourceOwnerUid: 'user-2',
    }),
    (error) => error.code === 'record_owner_mismatch',
  );
  await assert.rejects(
    resolveTenantAuthorization({
      token: 'valid-token', orgId: 'pmc-alpha', action: 'reports:export',
      auth: current.auth, database: current.database,
    }),
    (error) => error.code === 'role_permission_denied',
  );
});

test('rejects malformed tenant locators before database access', async () => {
  const current = fixture();
  await assert.rejects(
    resolveTenantAuthorization({
      token: 'valid-token', orgId: '../other', action: 'organisation:read', ...current,
    }),
    (error) => error.code === 'invalid_authorization_request',
  );
  assert.equal(current.reads.length, 0);
});
