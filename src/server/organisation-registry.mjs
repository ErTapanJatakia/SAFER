const ALLOWED_TRANSITIONS = Object.freeze({
  active: new Set(['suspended', 'closed']),
  suspended: new Set(['active', 'closed']),
  provisioning: new Set(['suspended']),
});

const MEMBERSHIP_FIELDS = Object.freeze([
  'uid', 'orgId', 'role', 'status', 'createdAt', 'createdByUid',
  'updatedAt', 'updatedByUid', 'schemaVersion',
].sort());

function validOrgId(value) {
  return typeof value === 'string' && /^org_[a-f0-9]{32}$/.test(value);
}

function validMembershipTimestamp(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime());
  if (!value || typeof value !== 'object') return false;
  try {
    if (typeof value.toDate === 'function') {
      const date = value.toDate();
      return date instanceof Date && Number.isFinite(date.getTime());
    }
    if (typeof value.toMillis === 'function') return Number.isFinite(value.toMillis());
  } catch {
    return false;
  }
  return false;
}

function hasCanonicalActiveSuperAdmin(membership, documentId, orgId) {
  if (!membership || typeof membership !== 'object' || Array.isArray(membership)) return false;
  const fields = Object.keys(membership).sort();
  const validUid = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
  return fields.length === MEMBERSHIP_FIELDS.length
    && fields.every((field, index) => field === MEMBERSHIP_FIELDS[index])
    && membership.uid === documentId
    && validUid(documentId)
    && membership.orgId === orgId
    && membership.role === 'tenant_super_admin'
    && membership.status === 'active'
    && membership.schemaVersion === 1
    && validUid(membership.createdByUid)
    && validUid(membership.updatedByUid)
    && validMembershipTimestamp(membership.createdAt)
    && validMembershipTimestamp(membership.updatedAt);
}

/**
 * Owner-only registry operations. All lifecycle changes are transactional and
 * append a platform audit event. Provisioning tenants cannot be activated here.
 */
export async function listPlatformOrganisations({ database, limit = 100 }) {
  const boundedLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 100;
  const snapshot = await database.collection('organisations')
    .orderBy('createdAt', 'desc')
    .limit(boundedLimit)
    .get();

  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      orgId: data.orgId,
      displayName: data.displayName,
      status: data.status,
      lifecycleStage: data.lifecycleStage ?? null,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
    };
  });
}

export async function changeOrganisationStatus({
  database,
  orgId,
  nextStatus,
  actorUid,
  serverTimestamp,
}) {
  if (!validOrgId(orgId)) throw new Error('A valid organisation identifier is required.');
  if (!['active', 'suspended', 'closed'].includes(nextStatus)) {
    throw new Error('A supported organisation status is required.');
  }
  if (typeof actorUid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(actorUid)) {
    throw new Error('A valid Platform Owner identity is required.');
  }

  const organisationRef = database.doc(`organisations/${orgId}`);
  const auditRef = database.collection('platformAuditEvents').doc();
  const timestamp = serverTimestamp();

  return database.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(organisationRef);
    if (!snapshot.exists) throw new Error('Organisation not found.');
    const current = snapshot.data();
    const allowed = ALLOWED_TRANSITIONS[current.status];
    if (!allowed || !allowed.has(nextStatus)) {
      throw new Error('The requested organisation lifecycle transition is not permitted.');
    }

    if (nextStatus === 'active') {
      // A provisioning tenant may have been suspended by the registry. It must
      // not become active merely by taking the generic suspended -> active path.
      if (current.lifecycleStage !== 'active') {
        throw new Error('Organisation activation is not permitted before the dedicated Super Admin activation workflow completes.');
      }
      const activeSuperAdmins = await transaction.get(
        database.collection(`organisations/${orgId}/members`)
          .where('role', '==', 'tenant_super_admin')
          .where('status', '==', 'active')
          .limit(1),
      );
      const hasActiveOwner = (activeSuperAdmins.docs ?? []).some((document) => (
        hasCanonicalActiveSuperAdmin(document.data(), document.id, orgId)
      ));
      if (!hasActiveOwner) {
        throw new Error('Organisation activation is not permitted without a canonical active Super Admin membership.');
      }
    }

    transaction.update(organisationRef, {
      status: nextStatus,
      updatedAt: timestamp,
      updatedByUid: actorUid,
      ...(nextStatus === 'closed' ? { closedAt: timestamp, closedByUid: actorUid } : {}),
    });
    transaction.create(auditRef, {
      action: 'organisation.status_changed',
      actorUid,
      targetOrgId: orgId,
      details: { previousStatus: current.status, nextStatus },
      occurredAt: timestamp,
    });

    return { orgId, previousStatus: current.status, status: nextStatus };
  });
}
