import assert from 'node:assert/strict';
import test from 'node:test';
import { getPlatformTenantOperationalSummary, PlatformTenantDataError } from '../src/server/platform-owner-tenant-data.mjs';

const orgId = `org_${'c'.repeat(32)}`;
const sessionId = 'a'.repeat(64);
const actorUid = 'platform-owner-1';
const principal = { uid: actorUid, role: 'platform_owner', status: 'active' };
const now = Date.parse('2026-11-16T12:00:00.000Z');

function fixture({ actions = ['platform:tenant-data:read', 'platform:tenant-data:export'], status = 'active', expiresAt = new Date(now + 60000), orgStatus = 'active' } = {}) {
  const docs = new Map([
    [`platformSupportSessions/${sessionId}`, {
      sessionId, actorUid, orgId, actions, status, expiresAt,
      purpose: 'Client-approved investigation of tenant access and service readiness.',
      changeReference: 'CHG-2026-1116',
    }],
    [`organisations/${orgId}`, { orgId, status: orgStatus }],
  ]);
  const events = [];
  const counts = { members: 4, personnel: 7, incidents: 2, evidence: 3, checklists: 5 };
  const database = {
    doc: (path) => ({ path }),
    collection: (path) => {
      if (path === 'platformAuditEvents') return { doc: () => ({ path: `platformAuditEvents/event-${events.length + 1}` }) };
      const name = path.split('/').at(-1);
      return { count: () => ({ get: async () => ({ data: () => ({ count: counts[name] ?? 0 }) }) }) };
    },
    runTransaction: async (callback) => callback({
      get: async (ref) => ({ exists: docs.has(ref.path), data: () => docs.get(ref.path) }),
      create: (ref, value) => {
        if (docs.has(ref.path)) throw new Error('already_exists');
        docs.set(ref.path, value);
        if (ref.path.startsWith('platformAuditEvents/')) events.push(value);
      },
    }),
  };
  return { database, docs, events };
}

test('Platform Owner reads aggregate PMC counts only through the matching active support session', async () => {
  const f = fixture();
  const result = await getPlatformTenantOperationalSummary({
    actorUid, principal, sessionId, orgId, database: f.database,
    serverTimestamp: () => new Date(now), now,
  });
  assert.equal(result.scope, 'tenant_aggregate_counts_only');
  assert.deepEqual(result.counts, {
    members: 4, personnel: 7, incidents: 2, evidenceMetadata: 3, checklists: 5,
  });
  assert.equal(f.events.some((event) => event.action === 'platform.support_access.action_authorized'), true);
  assert.equal(f.events.some((event) => event.action === 'platform.support_access.data_read'), true);
  assert.equal(JSON.stringify(result).includes('purpose'), false);
});

test('aggregate export requires an export-scoped session and records completion', async () => {
  const f = fixture({ actions: ['platform:tenant-data:export'] });
  const result = await getPlatformTenantOperationalSummary({
    actorUid, principal, sessionId, orgId, action: 'platform:tenant-data:export',
    database: f.database, serverTimestamp: () => new Date(now), now,
  });
  assert.equal(result.scope, 'tenant_aggregate_counts_only');
  assert.equal(f.events.at(-1).action, 'platform.support_access.data_exported');
});

test('rejects wrong owner, tenant, action scope, expired or revoked sessions', async () => {
  const cases = [
    { actorUid: 'other-owner', principal: { ...principal, uid: 'other-owner' } },
    { orgId: `org_${'d'.repeat(32)}` },
    { action: 'platform:tenant-data:export', session: { actions: ['platform:tenant-data:read'] } },
    { session: { status: 'revoked' } },
    { session: { expiresAt: new Date(now) } },
  ];
  for (const item of cases) {
    const f = fixture(item.session ?? {});
    await assert.rejects(getPlatformTenantOperationalSummary({
      actorUid, principal, sessionId, orgId, database: f.database,
      serverTimestamp: () => new Date(now), now, ...item,
    }), (error) => error instanceof Error);
  }
});

test('does not return tenant counts when the audit store cannot commit', async () => {
  const f = fixture();
  f.database.runTransaction = async (callback) => {
    const tx = {
      get: async (ref) => ({ exists: f.docs.has(ref.path), data: () => f.docs.get(ref.path) }),
      create: (ref, value) => {
        if (ref.path.startsWith('platformAuditEvents/')) throw new Error('audit unavailable');
        f.docs.set(ref.path, value);
      },
    };
    return callback(tx);
  };
  await assert.rejects(getPlatformTenantOperationalSummary({
    actorUid, principal, sessionId, orgId, database: f.database,
    serverTimestamp: () => new Date(now), now,
  }), (error) => error.message === 'audit unavailable');
});
