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

test('UI hints do not advertise unimplemented manager or viewer access', () => {
  for (const role of ['manager', 'viewer'] as const) {
    assert.equal(TENANT_ROLE_UI_CAPABILITIES[role].canReadPersonnel, false);
    assert.equal(TENANT_ROLE_UI_CAPABILITIES[role].canReadIncidents, false);
    assert.equal(TENANT_ROLE_UI_CAPABILITIES[role].canManageMemberships, false);
    assert.equal(TENANT_ROLE_UI_CAPABILITIES[role].canReadAuditEvents, false);
  }
  for (const role of ['owner', 'admin'] as const) {
    assert.equal(TENANT_ROLE_UI_CAPABILITIES[role].canReadPersonnel, true);
    assert.equal(TENANT_ROLE_UI_CAPABILITIES[role].canWritePersonnel, true);
    assert.equal(TENANT_ROLE_UI_CAPABILITIES[role].canReadIncidents, true);
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
  assert.equal(isCurrentUserActiveMember({ ...membership, status: 'suspended' } as OrganisationMembership, 'synthetic-user-a', 'synthetic-org-a'), false);
});
