import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCurrentUserActiveMember,
  isTenantRole,
  TENANT_ROLE_UI_CAPABILITIES,
  type OrganisationMembership,
} from './organisation.ts';

test('tenant role vocabulary matches the existing Firestore Rules model', () => {
  for (const role of ['owner', 'admin', 'manager', 'viewer']) {
    assert.equal(isTenantRole(role), true);
  }
  for (const role of ['platform_super_admin', 'org_admin', 'auditor', 'demo_guest', null, 1]) {
    assert.equal(isTenantRole(role), false);
  }
});

test('UI capability hints match the current four-role Rules grants and denials', () => {
  for (const role of ['owner', 'admin'] as const) {
    const capabilities = TENANT_ROLE_UI_CAPABILITIES[role];
    assert.equal(capabilities.canReadOrganisation, true);
    assert.equal(capabilities.canReadPersonnel, true);
    assert.equal(capabilities.canWritePersonnel, true);
    assert.equal(capabilities.canReadIncidents, true);
    assert.equal(capabilities.canCreateIncidents, true);
    assert.equal(capabilities.canUpdateIncidents, true);
    assert.equal(capabilities.canReadEvidence, true);
    assert.equal(capabilities.canDeletePersonnel, false);
    assert.equal(capabilities.canDeleteIncidents, false);
    assert.equal(capabilities.canWriteEvidence, false);
    assert.equal(capabilities.canManageMemberships, false);
    assert.equal(capabilities.canReadAuditEvents, false);
    assert.equal(capabilities.canWriteAuditEvents, false);
  }

  for (const role of ['manager', 'viewer'] as const) {
    const capabilities = TENANT_ROLE_UI_CAPABILITIES[role];
    assert.equal(Object.values(capabilities).every((allowed) => allowed === false), true);
  }
});

test('active membership helper binds UID, organisation and status exactly', () => {
  const membership: OrganisationMembership = {
    uid: 'synthetic-user-a',
    orgId: 'synthetic-org-a',
    role: 'owner',
    status: 'active',
  };
  assert.equal(isCurrentUserActiveMember(membership, 'synthetic-user-a', 'synthetic-org-a'), true);
  assert.equal(isCurrentUserActiveMember(membership, 'synthetic-user-b', 'synthetic-org-a'), false);
  assert.equal(isCurrentUserActiveMember(membership, 'synthetic-user-a', 'synthetic-org-b'), false);
  assert.equal(isCurrentUserActiveMember({ ...membership, status: 'suspended' } as unknown as OrganisationMembership, 'synthetic-user-a', 'synthetic-org-a'), false);
});

test('active membership boundary rejects malformed runtime values without throwing', () => {
  const valid = {
    uid: 'synthetic-user-a',
    orgId: 'synthetic-org-a',
    role: 'owner',
    status: 'active',
  };
  for (const malformed of [
    null,
    undefined,
    'membership',
    42,
    [],
    ['synthetic-user-a', 'synthetic-org-a', 'owner', 'active'],
  ]) {
    assert.equal(isCurrentUserActiveMember(malformed, 'synthetic-user-a', 'synthetic-org-a'), false);
  }
  assert.equal(
    isCurrentUserActiveMember({ ...valid, unexpected: 'sensitive-extra-field' }, 'synthetic-user-a', 'synthetic-org-a'),
    false,
  );
  assert.equal(
    isCurrentUserActiveMember({ uid: 'synthetic-user-a', orgId: 'synthetic-org-a', role: 'owner' }, 'synthetic-user-a', 'synthetic-org-a'),
    false,
  );
});

test('active membership boundary rejects accessor-backed and exotic objects', () => {
  const accessorMembership = {
    get uid() { throw new Error('getter must not execute'); },
    orgId: 'synthetic-org-a',
    role: 'owner',
    status: 'active',
  };
  assert.equal(
    isCurrentUserActiveMember(accessorMembership, 'synthetic-user-a', 'synthetic-org-a'),
    false,
  );
  assert.equal(
    isCurrentUserActiveMember(
      Object.assign(Object.create({ inherited: true }), {
        uid: 'synthetic-user-a',
        orgId: 'synthetic-org-a',
        role: 'owner',
        status: 'active',
      }),
      'synthetic-user-a',
      'synthetic-org-a',
    ),
    false,
  );
});

test('active membership boundary rejects non-enumerable fields and hostile proxies', () => {
  const hiddenField = {
    uid: 'synthetic-user-a',
    orgId: 'synthetic-org-a',
    role: 'owner',
    status: 'active',
  };
  Object.defineProperty(hiddenField, 'uid', {
    value: 'synthetic-user-a', enumerable: false, configurable: true,
  });
  assert.equal(isCurrentUserActiveMember(hiddenField, 'synthetic-user-a', 'synthetic-org-a'), false);

  const hostileProxy = new Proxy({
    uid: 'synthetic-user-a',
    orgId: 'synthetic-org-a',
    role: 'owner',
    status: 'active',
  }, {
    ownKeys() { throw new Error('hostile membership proxy'); },
  });
  assert.equal(isCurrentUserActiveMember(hostileProxy, 'synthetic-user-a', 'synthetic-org-a'), false);
  assert.equal(isCurrentUserActiveMember({
    uid: 'synthetic-user-a', orgId: 'invalid/org', role: 'owner', status: 'active',
  }, 'synthetic-user-a', 'invalid/org'), false);
});
