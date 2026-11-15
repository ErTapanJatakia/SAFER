import { randomBytes } from 'node:crypto';
import { authorizePlatformSupportAccess } from './platform-owner-support-access.mjs';

const ORG_ID = /^org_[a-f0-9]{32}$/;
const SESSION_ID = /^[a-f0-9]{64}$/;
const COLLECTIONS = Object.freeze([
  ['members', 'members'],
  ['personnel', 'personnel'],
  ['incidents', 'incidents'],
  ['evidence', 'evidenceMetadata'],
  ['checklists', 'checklists'],
]);

export class PlatformTenantDataError extends Error {
  constructor(code) { super(code); this.name = 'PlatformTenantDataError'; this.code = code; }
}
const fail = (code) => { throw new PlatformTenantDataError(code); };

async function countCollection(database, path) {
  const snapshot = await database.collection(path).count().get();
  const count = snapshot?.data?.()?.count;
  if (!Number.isSafeInteger(count) || count < 0) fail('tenant_summary_unavailable');
  return count;
}

async function appendOutcomeAudit({ database, serverTimestamp, actorUid, orgId, action, outcome, context }) {
  const auditRef = database.collection('platformAuditEvents').doc();
  const occurredAt = serverTimestamp();
  await database.runTransaction(async (transaction) => {
    transaction.create(auditRef, {
      action: `platform.support_access.${outcome}`,
      actorUid,
      targetOrgId: orgId,
      occurredAt,
      details: {
        requestedAction: action,
        purpose: context.purpose,
        changeReference: context.changeReference,
        scope: 'tenant_aggregate_counts_only',
      },
    });
  });
}

/**
 * Purpose-bound Platform Owner view/export of aggregate PMC operational counts.
 * No record contents, personal data, evidence payloads or invitation secrets
 * are returned. The support session is checked before every operation.
 */
export async function getPlatformTenantOperationalSummary({
  actorUid, principal, sessionId, orgId, action = 'platform:tenant-data:read',
  database, serverTimestamp, now = Date.now(),
}) {
  if (!ORG_ID.test(orgId ?? '') || !SESSION_ID.test(sessionId ?? '')
    || !['platform:tenant-data:read', 'platform:tenant-data:export'].includes(action)) {
    fail('invalid_request');
  }
  if (!database?.collection || !database?.runTransaction || typeof serverTimestamp !== 'function') {
    fail('tenant_summary_unavailable');
  }

  const context = await authorizePlatformSupportAccess({
    actorUid, principal, sessionId, orgId, action, database, serverTimestamp, now,
  });
  try {
    const values = await Promise.all(COLLECTIONS.map(([collection]) =>
      countCollection(database, `organisations/${orgId}/${collection}`)));
    const summary = Object.freeze({
      orgId,
      generatedAt: new Date(now).toISOString(),
      scope: 'tenant_aggregate_counts_only',
      counts: Object.fromEntries(COLLECTIONS.map(([, label], index) => [label, values[index]])),
    });
    await appendOutcomeAudit({
      database, serverTimestamp, actorUid, orgId, action,
      outcome: action.endsWith(':export') ? 'data_exported' : 'data_read',
      context,
    });
    return summary;
  } catch {
    try {
      await appendOutcomeAudit({
        database, serverTimestamp, actorUid, orgId, action,
        outcome: 'data_operation_failed', context,
      });
    } catch { /* The initial authorization event remains the durable audit record. */ }
    fail('tenant_summary_unavailable');
  }
}
