import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workspace = await readFile(
  new URL('../src/components/TenantOperationsWorkspace.tsx', import.meta.url),
  'utf8',
);

test('tenant workspace provides a distinct dashboard summary for every canonical tenant role', () => {
  for (const role of [
    'tenant_super_admin',
    'tenant_admin',
    'tenant_manager',
    'tenant_employee',
    'tenant_auditor',
  ]) {
    assert.match(workspace, new RegExp(role + ': \\{title:'));
  }
  assert.match(workspace, /ROLE_DASHBOARDS\[membership\.role\]/);
  assert.match(workspace, /role="heading"|aria-labelledby="role-dashboard-title"/);
});

test('employee overview does not render organisation-wide aggregate metrics', () => {
  assert.match(workspace, /membership\.role!=='tenant_employee'&&<section aria-label="PMC operational summary"/);
  assert.match(workspace, /row\.assignedToUid===membership\.uid/);
});

test('tenant dashboard layout reflows across breakpoints and permits long labels to wrap', () => {
  assert.match(workspace, /grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-5/);
  assert.match(workspace, /grid min-w-0 gap-4 lg:grid-cols-2/);
  assert.match(workspace, /break-words text-xs capitalize/);
  assert.match(workspace, /flex flex-wrap items-center justify-between/);
});

test('auditor dashboard is described as read-only with exports unavailable', () => {
  assert.match(workspace, /tenant_auditor: \\{title:'Auditor dashboard',description:'Read-only reporting and audit access\\. Mutating controls and report exports remain unavailable\\.'\\}/);
});
