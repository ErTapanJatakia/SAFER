/**
 * SAFER's canonical tenant RBAC policy engine.
 *
 * This module accepts only identity and membership records already resolved
 * by a trusted server boundary. It does not authenticate tokens, read the
 * database, or grant authority from browser-supplied role fields.
 *
 * Legacy tenant roles (owner/admin/manager/viewer) are deliberately rejected:
 * the platform Owner is a separate principal and must never be confused with
 * a tenant role.
 */

export const TENANT_ROLES = Object.freeze([
  'tenant_super_admin',
  'tenant_admin',
  'tenant_manager',
  'tenant_employee',
  'tenant_auditor',
]);

export const TENANT_ACTIONS = Object.freeze([
  'organisation:read',
  'organisation:update',
  'members:read',
  'members:invite',
  'members:suspend',
  'members:role:assign',
  'personnel:read',
  'personnel:read:own',
  'personnel:create',
  'personnel:update',
  'incidents:read',
  'incidents:read:own',
  'incidents:create',
  'incidents:update',
  'evidence:read',
  'evidence:register',
  'checklists:read',
  'checklists:create',
  'checklists:assign',
  'checklists:read:assigned',
  'checklists:update',
  'checklists:update:assigned',
  'audit:read',
  'reports:read',
  'reports:export',
]);

const ALL_TENANT_ACTIONS = TENANT_ACTIONS;
const ROLE_ACTIONS = Object.freeze({
  tenant_super_admin: new Set(ALL_TENANT_ACTIONS),
  tenant_admin: new Set([
    'organisation:read', 'members:read', 'members:invite', 'members:suspend',
    'members:role:assign', 'personnel:read', 'personnel:create', 'personnel:update',
    'incidents:read', 'incidents:create', 'incidents:update', 'evidence:read', 'evidence:register',
    'checklists:read', 'checklists:create', 'checklists:assign', 'checklists:update', 'audit:read', 'reports:read', 'reports:export',
  ]),
  tenant_manager: new Set([
    'organisation:read', 'personnel:read', 'incidents:read', 'incidents:create',
    'incidents:update', 'evidence:read', 'evidence:register', 'checklists:read', 'checklists:create', 'checklists:assign', 'checklists:update',
    'reports:read',
  ]),
  tenant_employee: new Set([
    'organisation:read', 'personnel:read:own', 'incidents:read:own',
    'incidents:create', 'checklists:read:assigned', 'checklists:update:assigned',
  ]),
  tenant_auditor: new Set([
    'organisation:read', 'members:read', 'personnel:read', 'incidents:read',
    'evidence:read', 'checklists:read', 'audit:read', 'reports:read',
  ]),
});

const PLATFORM_ACTIONS = new Set([
  'platform:organisations:list',
  'platform:organisations:create',
  'platform:organisations:update',
  'platform:organisations:suspend',
  'platform:organisations:reactivate',
  'platform:organisations:close',
  'platform:tenant-data:read',
  'platform:tenant-data:write',
  'platform:tenant-data:export',
  'platform:identities:manage',
  'platform:audit:read',
  'platform:security:manage',
]);

const PURPOSE_REQUIRED_PLATFORM_ACTIONS = new Set([
  'platform:tenant-data:read',
  'platform:tenant-data:write',
  'platform:tenant-data:export',
]);

const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const ORG_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MEMBERSHIP_FIELDS = Object.freeze([
  'uid', 'orgId', 'role', 'status', 'createdAt', 'createdByUid',
  'updatedAt', 'updatedByUid', 'schemaVersion',
].sort());

function isRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validTimestamp(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime());
  if (!value || typeof value !== 'object') return false;
  if (typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && Number.isFinite(date.getTime());
  }
  if (typeof value.toMillis === 'function') return Number.isFinite(value.toMillis());
  return false;
}

function denied(reason) {
  return Object.freeze({ allowed: false, reason, auditRequired: false });
}

function permitted(reason, auditRequired = false) {
  return Object.freeze({ allowed: true, reason, auditRequired });
}

/**
 * Authorize a tenant action using server-resolved membership and organisation
 * snapshots. The caller MUST verify the Firebase ID token and load both
 * records from authoritative Firestore paths before invoking this function.
 */
export function authorizeTenantAction({
  actorUid,
  membership,
  organisation,
  requestedOrgId,
  action,
  resourceOwnerUid,
  assignedToUid,
  targetUid,
  targetCurrentRole,
  targetRole,
} = {}) {
  if (!UID_PATTERN.test(actorUid ?? '') || !ORG_ID_PATTERN.test(requestedOrgId ?? '')
    || !TENANT_ACTIONS.includes(action) || !isRecord(membership) || !isRecord(organisation)) {
    return denied('invalid_authorization_context');
  }

  const membershipFields = Object.keys(membership).sort();
  if (membershipFields.length !== MEMBERSHIP_FIELDS.length
    || membershipFields.some((field, index) => field !== MEMBERSHIP_FIELDS[index])
    || membership.uid !== actorUid || membership.orgId !== requestedOrgId
    || membership.schemaVersion !== 1 || membership.status !== 'active'
    || !TENANT_ROLES.includes(membership.role)
    || !UID_PATTERN.test(membership.createdByUid ?? '')
    || !UID_PATTERN.test(membership.updatedByUid ?? '')
    || !validTimestamp(membership.createdAt) || !validTimestamp(membership.updatedAt)) {
    return denied('active_tenant_membership_required');
  }

  if (organisation.orgId !== requestedOrgId || organisation.status !== 'active') {
    return denied('active_organisation_required');
  }

  const permissions = ROLE_ACTIONS[membership.role];
  if (!permissions.has(action)) return denied('role_permission_denied');

  if (action === 'members:invite' && !canAssignTenantRole(membership.role, targetRole)) {
    return denied('role_delegation_denied');
  }
  if (action === 'members:suspend' || action === 'members:role:assign') {
    if (!UID_PATTERN.test(targetUid ?? '') || targetUid === actorUid
      || !canManageTenantRole(membership.role, targetCurrentRole)) {
      return denied('target_membership_not_manageable');
    }
    if (action === 'members:role:assign'
      && (!canAssignTenantRole(membership.role, targetRole) || targetRole === targetCurrentRole)) {
      return denied('role_delegation_denied');
    }
  }

  if (action.endsWith(':own') && resourceOwnerUid !== actorUid) {
    return denied('record_owner_mismatch');
  }
  if (action.endsWith(':assigned') && assignedToUid !== actorUid) {
    return denied('assignment_mismatch');
  }

  return permitted('tenant_role_permission_granted');
}

/**
 * Check whether an actor may administer an existing tenant member. No tenant
 * role can manage a peer or a higher role.
 */
export function canManageTenantRole(actorRole, targetCurrentRole) {
  if (!TENANT_ROLES.includes(actorRole) || !TENANT_ROLES.includes(targetCurrentRole)) return false;
  if (actorRole === 'tenant_super_admin') return targetCurrentRole !== 'tenant_super_admin';
  if (actorRole === 'tenant_admin') {
    return ['tenant_manager', 'tenant_employee', 'tenant_auditor'].includes(targetCurrentRole);
  }
  return false;
}

/**
 * Check whether an actor may assign a tenant role. Platform roles are never
 * assignable through this function or by any tenant administrator.
 */
export function canAssignTenantRole(actorRole, targetRole) {
  if (!TENANT_ROLES.includes(actorRole) || !TENANT_ROLES.includes(targetRole)) return false;
  if (actorRole === 'tenant_super_admin') {
    return ['tenant_admin', 'tenant_manager', 'tenant_employee', 'tenant_auditor'].includes(targetRole);
  }
  if (actorRole === 'tenant_admin') {
    return ['tenant_manager', 'tenant_employee', 'tenant_auditor'].includes(targetRole);
  }
  return false;
}

/**
 * Evaluate a platform action only after a trusted backend has verified the
 * Firebase ID token and loaded platformAdministrators/{verifiedUid}.
 * Direct tenant-data access always requires a recorded purpose.
 */
export function authorizePlatformOwnerAction({
  actorUid,
  principal,
  action,
  purpose,
} = {}) {
  if (!UID_PATTERN.test(actorUid ?? '') || !isRecord(principal)
    || principal.uid !== actorUid || principal.role !== 'platform_owner'
    || principal.status !== 'active') {
    return denied('active_platform_owner_required');
  }

  if (!PLATFORM_ACTIONS.has(action)) return denied('platform_action_not_supported');

  if (PURPOSE_REQUIRED_PLATFORM_ACTIONS.has(action)
    && (typeof purpose !== 'string' || purpose.trim().length < 20 || purpose.trim().length > 500)) {
    return denied('support_purpose_required');
  }

  return permitted('platform_owner_permission_granted', true);
}

export const TENANT_ROLE_PERMISSION_CATALOGUE = Object.freeze(
  Object.fromEntries(
    Object.entries(ROLE_ACTIONS).map(([role, actions]) => [role, Object.freeze([...actions].sort())]),
  ),
);
