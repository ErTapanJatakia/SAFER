import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TENANT_ACTIONS,
  TENANT_ROLES,
  TENANT_ROLE_PERMISSION_CATALOGUE,
  authorizeTenantAction,
} from '../src/server/tenant-rbac.mjs';

const orgId = `org_${'e'.repeat(32)}`;
const uid = 'matrix-user';
const targetUid = 'matrix-target';
const expected = {
  tenant_super_admin: [
    'organisation:read','organisation:update','members:read','members:invite',
    'members:suspend','members:role:assign','personnel:read','personnel:read:own',
    'personnel:create','personnel:update','incidents:read','incidents:read:own',
    'incidents:create','incidents:update','evidence:read','evidence:register',
    'checklists:read','checklists:create','checklists:assign','checklists:read:assigned',
    'checklists:update','checklists:update:assigned','audit:read','reports:read','reports:export',
  ],
  tenant_admin: [
    'organisation:read','members:read','members:invite','members:suspend',
    'members:role:assign','personnel:read','personnel:create','personnel:update',
    'incidents:read','incidents:create','incidents:update','evidence:read',
    'evidence:register','checklists:read','checklists:create','checklists:assign',
    'checklists:update','audit:read','reports:read','reports:export',
  ],
  tenant_manager: [
    'organisation:read','personnel:read','incidents:read','incidents:create',
    'incidents:update','evidence:read','evidence:register','checklists:read',
    'checklists:create','checklists:assign','checklists:update','reports:read',
  ],
  tenant_employee: [
    'organisation:read','personnel:read:own','incidents:read:own','incidents:create',
    'checklists:read:assigned','checklists:update:assigned',
  ],
  tenant_auditor: [
    'organisation:read','members:read','personnel:read','incidents:read',
    'evidence:read','checklists:read','audit:read','reports:read',
  ],
};

function context(role, action) {
  const targetRole = role === 'tenant_admin' ? 'tenant_manager' : 'tenant_employee';
  return {
    actorUid: uid,
    membership: {
      uid, orgId, role, status: 'active', createdAt: new Date(0),
      createdByUid: 'trusted-owner', updatedAt: new Date(0),
      updatedByUid: 'trusted-owner', schemaVersion: 1,
    },
    organisation: { orgId, status: 'active' },
    requestedOrgId: orgId,
    action,
    resourceOwnerUid: uid,
    assignedToUid: uid,
    targetUid,
    targetCurrentRole: 'tenant_employee',
    targetRole,
  };
}

test('IAM-04 permission catalogue exactly matches the approved five-role matrix', () => {
  assert.deepEqual(TENANT_ROLES, Object.keys(expected));
  for (const role of TENANT_ROLES) {
    assert.deepEqual([...TENANT_ROLE_PERMISSION_CATALOGUE[role]].sort(), [...expected[role]].sort(), role);
  }
  assert.deepEqual([...TENANT_ACTIONS].sort(), [...new Set(Object.values(expected).flat())].sort());
  assert.equal(Object.hasOwn(TENANT_ROLE_PERMISSION_CATALOGUE, 'platform_owner'), false);
});

test('IAM-04 authorization engine grants exactly the catalogue actions and denies every other role/action pair', () => {
  for (const role of TENANT_ROLES) {
    for (const action of TENANT_ACTIONS) {
      const result = authorizeTenantAction(context(role, action));
      assert.equal(result.allowed, expected[role].includes(action), `${role} -> ${action}`);
    }
  }
});

test('IAM-04 delegation and role mutation boundaries remain strict', () => {
  const admin = context('tenant_admin', 'members:role:assign');
  admin.targetCurrentRole = 'tenant_manager';
  admin.targetRole = 'tenant_admin';
  assert.equal(authorizeTenantAction(admin).allowed, false);

  const manager = context('tenant_manager', 'members:invite');
  manager.targetRole = 'tenant_employee';
  assert.equal(authorizeTenantAction(manager).allowed, false);

  const auditor = context('tenant_auditor', 'members:suspend');
  assert.equal(authorizeTenantAction(auditor).allowed, false);

  const employee = context('tenant_employee', 'personnel:read:own');
  employee.resourceOwnerUid = 'another-user';
  assert.equal(authorizeTenantAction(employee).allowed, false);

  const employeeTask = context('tenant_employee', 'checklists:update:assigned');
  employeeTask.assignedToUid = 'another-user';
  assert.equal(authorizeTenantAction(employeeTask).allowed, false);
});
