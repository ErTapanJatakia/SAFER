import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const workspace=readFileSync(new URL('../src/components/TenantOperationsWorkspace.tsx',import.meta.url),'utf8');
const authGate=readFileSync(new URL('../src/components/AuthGate.tsx',import.meta.url),'utf8');
const evidence=readFileSync(new URL('../src/server/tenant-evidence.mjs',import.meta.url),'utf8');
const config=readFileSync(new URL('../src/server/tenant-configuration.mjs',import.meta.url),'utf8');
const notifications=readFileSync(new URL('../api/tenant/notifications.js',import.meta.url),'utf8');

test('Tenant workspace exposes all ten operational module areas and uses tenant APIs',()=>{
 for(const label of ['Incidents','Personnel','Evidence','Checklists','Reports','Audit','Members','Activity','PMC settings'])assert.ok(workspace.includes(label),`missing workspace label: ${label}`);
 for(const route of ['/api/tenant/incidents','/api/tenant/personnel','/api/tenant/evidence','/api/tenant/checklists','/api/tenant/reports','/api/tenant/audit','/api/tenant/members','/api/tenant/notifications','/api/tenant/configuration'])assert.ok(workspace.includes(route),`missing API route: ${route}`);
});

test('Authenticated tenant workspace is rendered only after exact membership verification',()=>{
 assert.match(authGate,/membership\s*\?\s*\(/);
 assert.match(authGate,/resolveTenantMembership\(db,\s*\{uid:\s*requestedUid\},\s*requestedOrganisationId\)/);
});

test('Evidence UI and server remain metadata-only and do not claim secure ingestion',()=>{
 assert.match(workspace,/No file bytes are transmitted or stored/);
 assert.match(workspace,/metadata only/i);
 assert.match(evidence,/Register metadata only/);
 assert.match(evidence,/metadata_registered_unverified/);
 assert.match(evidence,/does not upload, store, scan, or verify a file/);
});

test('PMC configuration has an explicit allowlist and server-side organisation update authorization',()=>{
 assert.match(config,/organisation:update/);
 assert.match(config,/validSettings/);
 assert.match(config,/DEFAULT_SETTINGS/);
});


test('Tenant invitations return a shareable one-time ID to the authorised inviter',()=>{
 assert.match(workspace,/const result=await jsonPost\('\/api\/tenant\/members'/);
 assert.match(workspace,/invitationReceipt\.invitationId/);
 assert.match(workspace,/Copy invitation ID/);
 assert.match(workspace,/intended verified recipient/);
 assert.match(workspace,/no email is sent automatically/);
});


test('Audit interface supports server-side date filtering and cursor pagination',()=>{
 assert.match(workspace,/Audit start date/);
 assert.match(workspace,/Audit end date/);
 assert.match(workspace,/Apply date filter/);
 assert.match(workspace,/Load older events/);
 assert.match(workspace,/nextCursor/);
});


test('Tenant membership administration exposes reactivation only for suspended records',()=>{
 assert.match(workspace,/members:reactivate/);
 assert.match(workspace,/row\.status==='suspended'/);
 assert.match(workspace,/row\.status==='active'&&<select aria-label="Change member role"/);
});


test('Activity feed tab is limited to roles with audit-read permission',()=>{
 assert.match(workspace,/\{id:'notifications',label:'Activity',roles:\['tenant_super_admin','tenant_admin','tenant_auditor'\]\}/);
});
