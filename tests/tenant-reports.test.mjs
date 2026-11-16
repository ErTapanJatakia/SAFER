import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTenantOperationalSummary,
  exportTenantOperationalSummary,
} from '../src/server/tenant-reports.mjs';

const orgId = \`org_\${'a'.repeat(32)}\`;

function db(role = 'tenant_admin') {
  const docs = new Map([
    [\`organisations/\${orgId}/members/u1\`, {
      uid: 'u1', orgId, role, status: 'active',
      createdAt: new Date(), createdByUid: 'seed',
      updatedAt: new Date(), updatedByUid: 'seed', schemaVersion: 1,
    }],
    [\`organisations/\${orgId}\`, { orgId, status: 'active' }],
  ]);
  const writes = [];
  return {
    writes,
    collection(path) {
      return {
        count() {
          return {
            async get() {
              return { data: () => ({ count: 3 }) };
            },
          };
        },
      };
    },
    doc(path) {
      return { path };
    },
    async runTransaction(fn) {
      const tx = {
        async get(ref) {
          const value = docs.get(ref.path);
          return { exists: Boolean(value), data: () => value };
        },
        create(ref, data) {
          writes.push({ path: ref.path, data });
        },
      };
      return fn(tx);
    },
  };
}

test('summary returns aggregate counts only', async () => {
  const result = await getTenantOperationalSummary({ orgId, database: db() });
  assert.equal(result.counts.incidents, 3);
  assert.equal(result.scope, 'tenant_aggregate_counts_only');
  assert.equal('records' in result, false);
});

test('export appends tenant audit event', async () => {
  const database = db();
  await exportTenantOperationalSummary({
    orgId, actorUid: 'u1', database, serverTimestamp: () => new Date(),
  });
  assert.equal(database.writes.length, 1);
  assert.equal(database.writes[0].data.action, 'tenant.report.exported');
});

test('Auditor cannot export', async () => {
  await assert.rejects(() => exportTenantOperationalSummary({
    orgId, actorUid: 'u1', database: db('tenant_auditor'),
    serverTimestamp: () => new Date(),
  }), /role_permission_denied/);
});
