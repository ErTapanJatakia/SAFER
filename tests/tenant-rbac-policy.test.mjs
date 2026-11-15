import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TENANT_ROLES,
  TENANT_ROLE_PERMISSION_CATALOGUE,
  authorizePlatformOwnerAction,
  authorizeTenantAction,
  canAssignTenantRole,
  canManageTenantRole,
} from '../src/server/tenant-rbac.mjs';

const organisation = { orgId: 'pmc-alpha', status: 'active' };
const membership = (role = 'tenant_super_admin', overrides = {}) => ({
  uid: 'user-1', orgId: 'pmc-alpha', role, status: 'active',
  createdAt: new Date(0), createdByUid: 'owner-1', updatedAt: new Date(0),
  updatedByUid: 'owner-1', schemaVersion: 1, ...overrides,
});
const authorize = (role, action, overrides = {}) => authorizeTenantAction({
  actorUid: 'user-1',
  membership: membership(role, overrides.membership),
  organisation: overrides.organisation ?? organisation,
  requestedOrgId: overrides.requestedOrgId ?? 'pmc-alpha',
  action,
  resourceOwnerUid: overrides.resourceOwnerUid,
  assignedToUid: overrides.assignedToUid,
  targetUid: overrides.targetUid,
  targetCurrentRole: overrides.targetCurrentRole,
  targetRole: overrides.targetRole,
});

test('the tenant role catalogue contains only the approved tenant hierarchy', () => {
  assert.deepEqual(TENANT_ROLES, [
    'tenant_super_admin', 'tenant_admin', 'tenant_manager', 'tenant_employee', 'tenant_auditor',
  ]);
  assert.equal(Object.hasOwn(TENANT_ROLE_PERMISSION_CATALOGUE, 'platform_owner'), false);
  for (const legacyRole of ['owner', 'admin', 'manager', 'viewer']) {
    assert.equal(TENANT_ROLES.includes(legacyRole), false);
  }
});

test('Super Admin receives the complete tenant permission set but no platform authority', () => {
  assert.equal(authorize('tenant_super_admin', 'organisation:update').allowed, true);
  assert.equal(authorize('tenant_super_admin', 'members:invite', { targetRole: 'tenant_admin' }).allowed, true);
  assert.equal(authorize('tenant_super_admin', 'audit:read').allowed, true);
  assert.equal(authorize('tenant_super_admin', 'platform:organisations:list').allowed, false);
});

test('Admin has delegated tenant permissions but cannot change organisation settings', () => {
  assert.equal(authorize('tenant_admin', 'personnel:create').allowed, true);
  assert.equal(authorize('tenant_admin', 'incidents:update').allowed, true);
  assert.equal(authorize('tenant_admin', 'organisation:update').allowed, false);
  assert.equal(authorize('tenant_admin', 'platform:tenant-data:read').allowed, false);
});

test('Manager can work on operational modules but cannot administer memberships or audit', () => {
  assert.equal(authorize('tenant_manager', 'incidents:create').allowed, true);
  assert.equal(authorize('tenant_manager', 'checklists:update').allowed, true);
  assert.equal(authorize('tenant_manager', 'members:invite').allowed, false);
  assert.equal(authorize('tenant_manager', 'audit:read').allowed, false);
});

test('Employee access is restricted to own personnel and assigned checklists', () => {
  assert.equal(authorize('tenant_employee', 'personnel:read:own', { resourceOwnerUid: 'user-1' }).allowed, true);
  assert.equal(authorize('tenant_employee', 'personnel:read:own', { resourceOwnerUid: 'user-2' }).reason, 'record_owner_mismatch');
  assert.equal(authorize('tenant_employee', 'checklists:update:assigned', { assignedToUid: 'user-1' }).allowed, true);
  assert.equal(authorize('tenant_employee', 'checklists:update:assigned', { assignedToUid: 'user-2' }).reason, 'assignment_mismatch');
  assert.equal(authorize('tenant_employee', 'personnel:read').allowed, false);
  assert.equal(authorize('tenant_employee', 'reports:export').allowed, false);
});

test('Auditor is read-only and cannot export or mutate operational records', () => {
  assert.equal(authorize('tenant_auditor', 'audit:read').allowed, true);
  assert.equal(authorize('tenant_auditor', 'personnel:read').allowed, true);
  assert.equal(authorize('tenant_auditor', 'incidents:update').allowed, false);
  assert.equal(authorize('tenant_auditor', 'reports:export').allowed, false);
});

test('tenant authorization fails closed for forged identity, wrong tenant, and inactive records', () => {
  assert.equal(authorize('tenant_super_admin', 'personnel:read', {
    membership: { uid: 'attacker', orgId: 'pmc-alpha', role: 'tenant_super_admin', status: 'active' },
  }).allowed, false);
  assert.equal(authorize('tenant_super_admin', 'personnel:read', { requestedOrgId: 'pmc-bravo' }).allowed, false);
  assert.equal(authorize('tenant_super_admin', 'personnel:read', {
    membership: { uid: 'user-1', orgId: 'pmc-alpha', role: 'tenant_super_admin', status: 'revoked' },
  }).allowed, false);
  assert.equal(authorize('tenant_super_admin', 'personnel:read', {
    organisation: { orgId: 'pmc-alpha', status: 'suspended' },
  }).allowed, false);
  assert.equal(authorize('owner', 'personnel:read').allowed, false);
  assert.equal(authorize('tenant_super_admin', 'personnel:read', {
    membership: { ...membership('tenant_super_admin'), schemaVersion: 2 },
  }).allowed, false);
  assert.equal(authorize('tenant_super_admin', 'personnel:read', {
    membership: { ...membership('tenant_super_admin'), platformOverride: true },
  }).allowed, false);
  assert.equal(authorize('tenant_super_admin', 'unknown:action').allowed, false);
});

test('role delegation follows the tenant hierarchy and never grants platform roles', () => {
  assert.equal(canAssignTenantRole('tenant_super_admin', 'tenant_admin'), true);
  assert.equal(canAssignTenantRole('tenant_super_admin', 'tenant_manager'), true);
  assert.equal(canAssignTenantRole('tenant_admin', 'tenant_manager'), true);
  assert.equal(canAssignTenantRole('tenant_admin', 'tenant_employee'), true);
  assert.equal(canAssignTenantRole('tenant_admin', 'tenant_super_admin'), false);
  assert.equal(canAssignTenantRole('tenant_manager', 'tenant_employee'), false);
  assert.equal(canAssignTenantRole('tenant_super_admin', 'platform_owner'), false);
  assert.equal(canManageTenantRole('tenant_super_admin', 'tenant_admin'), true);
  assert.equal(canManageTenantRole('tenant_super_admin', 'tenant_super_admin'), false);
  assert.equal(canManageTenantRole('tenant_admin', 'tenant_manager'), true);
  assert.equal(canManageTenantRole('tenant_admin', 'tenant_admin'), false);
  assert.equal(canAssignTenantRole('owner', 'tenant_admin'), false);
  assert.equal(authorize('tenant_admin', 'members:invite', { targetRole: 'tenant_admin' }).reason, 'role_delegation_denied');
  assert.equal(authorize('tenant_admin', 'members:invite', { targetRole: 'tenant_manager' }).allowed, true);
  assert.equal(authorize('tenant_admin', 'members:suspend', {
    targetUid: 'user-2', targetCurrentRole: 'tenant_admin',
  }).reason, 'target_membership_not_manageable');
  assert.equal(authorize('tenant_admin', 'members:suspend', {
    targetUid: 'user-2', targetCurrentRole: 'tenant_manager',
  }).allowed, true);
  assert.equal(authorize('tenant_admin', 'members:role:assign', {
    targetUid: 'user-2', targetCurrentRole: 'tenant_manager', targetRole: 'tenant_admin',
  }).reason, 'role_delegation_denied');
});

test('Platform Owner access requires the authoritative active platform principal', () => {
  const principal = { uid: 'platform-1', role: 'platform_owner', status: 'active' };
  assert.equal(authorizePlatformOwnerAction({
    actorUid: 'platform-1', principal, action: 'platform:organisations:list',
  }).allowed, true);
  assert.equal(authorizePlatformOwnerAction({
    actorUid: 'tenant-1', principal, action: 'platform:organisations:list',
  }).reason, 'active_platform_owner_required');
  assert.equal(authorizePlatformOwnerAction({
    actorUid: 'platform-1', principal: { ...principal, status: 'revoked' },
    action: 'platform:organisations:list',
  }).allowed, false);
});

test('Platform Owner cross-tenant record access requires a purpose and is audit-marked', () => {
  const principal = { uid: 'platform-1', role: 'platform_owner', status: 'active' };
  assert.equal(authorizePlatformOwnerAction({
    actorUid: 'platform-1', principal, action: 'platform:tenant-data:read',
  }).reason, 'support_purpose_required');
  const result = authorizePlatformOwnerAction({
    actorUid: 'platform-1', principal, action: 'platform:tenant-data:read',
    purpose: 'Client-requested investigation of a reported access issue.',
  });
  assert.deepEqual(result, {
    allowed: true, reason: 'platform_owner_permission_granted', auditRequired: true,
  });
});

test('unsupported platform actions and tenant roles cannot gain global authority', () => {
  const principal = { uid: 'platform-1', role: 'platform_owner', status: 'active' };
  assert.equal(authorizePlatformOwnerAction({
    actorUid: 'platform-1', principal, action: 'tenant:members:invite',
  }).allowed, false);
  assert.equal(authorizePlatformOwnerAction({
    actorUid: 'platform-1', principal: { uid: 'platform-1', role: 'tenant_super_admin', status: 'active' },
    action: 'platform:security:manage',
  }).allowed, false);
});
