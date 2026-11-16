import { randomBytes } from 'node:crypto';
import { authorizeTenantAction } from './tenant-rbac.mjs';

const ORG_ID = /^org_[a-f0-9]{32}$/;
const UID = /^[A-Za-z0-9_-]{1,128}$/;
const TYPES = ['Equipment Malfunction', 'Access Control Anomaly', 'Communications Drop', 'Logistics Delay', 'Medical First-Aid Event', 'Administrative Discrepancy'];
const STATUSES = ['Logged - Pending Officer Review', 'Under Investigation / Human Review', 'Documented & Filed'];
const PRIORITIES = ['Routine', 'Moderate', 'High Attention'];

export class TenantIncidentError extends Error {
  constructor(code) { super(code); this.name = 'TenantIncidentError'; this.code = code; }
}
const fail = (code) => { throw new TenantIncidentError(code); };

function assertOrg(orgId) { if (typeof orgId !== 'string' || !ORG_ID.test(orgId)) fail('invalid_request'); }
function validateText(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail('invalid_incident_data');
  return value.trim();
}

function parseIncidentDate(value) {
  if (value === undefined || value === null || value === '') return new Date();
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    fail('invalid_incident_data');
  }
  const datePart = value.slice(0, 10);
  const calendarDate = new Date(`${datePart}T00:00:00.000Z`);
  const parsed = new Date(value);
  if (!Number.isFinite(calendarDate.getTime())
    || !Number.isFinite(parsed.getTime())
    || calendarDate.toISOString().slice(0, 10) !== datePart
    || parsed.getTime() > Date.now() + 5 * 60 * 1000) {
    fail('invalid_incident_data');
  }
  return parsed;
}
function validMembership(data, uid, orgId) {
  const keys = ['uid','orgId','role','status','createdAt','createdByUid','updatedAt','updatedByUid','schemaVersion'].sort();
  const actual = data && typeof data === 'object' ? Object.keys(data).sort() : [];
  return actual.length === keys.length && actual.every((key, i) => key === keys[i])
    && data.uid === uid && data.orgId === orgId && data.status === 'active'
    && data.schemaVersion === 1 && typeof data.createdByUid === 'string'
    && typeof data.updatedByUid === 'string' && data.createdAt != null && data.updatedAt != null;
}
async function authorize(transaction, db, uid, orgId, action, extra = {}) {
  const memberRef = db.doc(`organisations/${orgId}/members/${uid}`);
  const orgRef = db.doc(`organisations/${orgId}`);
  const [member, org] = await Promise.all([transaction.get(memberRef), transaction.get(orgRef)]);
  if (!member.exists || !org.exists || !validMembership(member.data(), uid, orgId)
    || org.data().orgId !== orgId || org.data().status !== 'active') fail('tenant_membership_required');
  const decision = authorizeTenantAction({
    actorUid: uid, membership: member.data(), organisation: org.data(),
    requestedOrgId: orgId, action, ...extra,
  });
  if (!decision.allowed) fail(decision.reason);
  return { member: member.data(), org: org.data() };
}

/** List incidents. Employee scope is enforced in the Firestore query itself. */
export async function listTenantIncidents({ orgId, actorUid, role, database, limit = 100 }) {
  assertOrg(orgId);
  if (!UID.test(actorUid ?? '') || !database?.collection) fail('invalid_request');
  const collection = database.collection(`organisations/${orgId}/incidents`);
  let query = collection.orderBy('dateReported', 'desc').limit(Math.min(Math.max(Number(limit) || 100, 1), 100));
  if (role === 'tenant_employee') query = query.where('reportedByUid', '==', actorUid);
  const snapshot = await query.get();
  const incidents = snapshot.docs.flatMap((doc) => {
    const d = doc.data();
    if (d.incidentId !== doc.id || d.orgId !== orgId || typeof d.reportedByUid !== 'string') return [];
    return [{
      incidentId: doc.id, referenceNumber: d.referenceNumber, incidentType: d.incidentType,
      dateReported: d.dateReported?.toDate?.()?.toISOString?.() ?? null,
      title: d.title, status: d.status, priority: d.priority, summary: d.summary,
      reportedByUid: d.reportedByUid, locationLabel: d.locationLabel ?? null,
    }];
  });
  return { orgId, incidents };
}

/** Create an incident and its immutable audit event atomically. */
export async function createTenantIncident({ orgId, actorUid, input, database, serverTimestamp }) {
  assertOrg(orgId);
  if (!UID.test(actorUid ?? '') || !database?.runTransaction || typeof serverTimestamp !== 'function') fail('invalid_request');
  const incidentId = `inc_${randomBytes(16).toString('hex')}`;
  const referenceNumber = `IR-${randomBytes(5).toString('hex').toUpperCase()}`;
  const ref = database.doc(`organisations/${orgId}/incidents/${incidentId}`);
  const audit = database.doc(`organisations/${orgId}/auditEvents/${randomBytes(16).toString('hex')}`);
  const timestamp = serverTimestamp();
  const dateReported = parseIncidentDate(input?.dateReported);
  const record = {
    incidentId, orgId, referenceNumber,
    incidentType: TYPES.includes(input?.incidentType) ? input.incidentType : fail('invalid_incident_data'),
    dateReported, title: validateText(input?.title, 160, true),
    status: 'Under Investigation / Human Review',
    priority: PRIORITIES.includes(input?.priority) ? input.priority : 'Routine',
    summary: validateText(input?.summary, 2000, true),
    reportedByUid: actorUid,
    ...(input?.locationLabel ? { locationLabel: validateText(input.locationLabel, 120) } : {}),
    createdAt: timestamp, createdByUid: actorUid, updatedAt: timestamp, updatedByUid: actorUid,
  };
  await database.runTransaction(async (tx) => {
    await authorize(tx, database, actorUid, orgId, 'incidents:create');
    tx.create(ref, record);
    tx.create(audit, {
      action: 'tenant.incident.created', actorUid, orgId, targetOrgId: orgId,
      targetResourceId: incidentId, occurredAt: timestamp,
      details: { incidentType: record.incidentType, priority: record.priority },
    });
  });
  return { incidentId, referenceNumber, status: record.status };
}

/** Update only explicitly supported administrative fields; no delete operation exists. */
export async function updateTenantIncident({ orgId, actorUid, incidentId, patch, database, serverTimestamp }) {
  assertOrg(orgId);
  if (!UID.test(actorUid ?? '') || !/^inc_[a-f0-9]{32}$/.test(incidentId ?? '')
    || !database?.runTransaction || typeof serverTimestamp !== 'function') fail('invalid_request');
  const allowed = ['status', 'priority', 'summary'];
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)
    || Object.keys(patch).length === 0 || Object.keys(patch).some((key) => !allowed.includes(key))) fail('invalid_incident_data');
  if ('status' in patch && !STATUSES.includes(patch.status)) fail('invalid_incident_data');
  if ('priority' in patch && !PRIORITIES.includes(patch.priority)) fail('invalid_incident_data');
  if ('summary' in patch) patch = { ...patch, summary: validateText(patch.summary, 2000, true) };
  const ref = database.doc(`organisations/${orgId}/incidents/${incidentId}`);
  const audit = database.doc(`organisations/${orgId}/auditEvents/${randomBytes(16).toString('hex')}`);
  const timestamp = serverTimestamp();
  return database.runTransaction(async (tx) => {
    await authorize(tx, database, actorUid, orgId, 'incidents:update');
    const snapshot = await tx.get(ref);
    if (!snapshot.exists || snapshot.data().incidentId !== incidentId || snapshot.data().orgId !== orgId) fail('incident_not_found');
    tx.update(ref, { ...patch, updatedAt: timestamp, updatedByUid: actorUid });
    tx.create(audit, {
      action: 'tenant.incident.updated', actorUid, orgId, targetOrgId: orgId,
      targetResourceId: incidentId, occurredAt: timestamp,
      details: { changedFields: Object.keys(patch).sort() },
    });
    return { incidentId, updated: Object.keys(patch).sort() };
  });
}
