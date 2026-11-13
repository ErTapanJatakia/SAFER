/**
 * SAFER's current tenant domain contracts, aligned with tenantMembership.ts
 * and firestore.rules. These types do not grant access: Firestore Security
 * Rules remain the authoritative boundary.
 */

export type OrganisationStatus = 'active' | 'suspended';

export type TenantRole = 'owner' | 'admin' | 'manager' | 'viewer';

export type MembershipStatus = 'active' | 'suspended' | 'revoked';

export interface OrganisationRecord {
  orgId: string;
  displayName: string;
  status: OrganisationStatus;
  schemaVersion: 1;
}

/** Exact minimal membership shape currently accepted by Firestore Rules. */
export interface OrganisationMembership {
  uid: string;
  orgId: string;
  role: TenantRole;
  status: 'active';
}

/**
 * Reflects current rules, not a desired future grant matrix.
 * Manager and viewer are intentionally denied operational access today.
 */
export interface TenantUiCapabilities {
  canReadOrganisation: boolean;
  canReadPersonnel: boolean;
  canWritePersonnel: boolean;
  canReadIncidents: boolean;
  canCreateIncidents: boolean;
  canUpdateIncidents: boolean;
  canReadEvidence: boolean;
  canManageMemberships: boolean;
  canReadAuditEvents: boolean;
}

const OWNER_ADMIN_CAPABILITIES: Readonly<TenantUiCapabilities> = Object.freeze({
  canReadOrganisation: true,
  canReadPersonnel: true,
  canWritePersonnel: true,
  canReadIncidents: true,
  canCreateIncidents: true,
  canUpdateIncidents: true,
  canReadEvidence: true,
  canManageMemberships: false,
  canReadAuditEvents: false,
});

const NO_TENANT_CAPABILITIES: Readonly<TenantUiCapabilities> = Object.freeze({
  canReadOrganisation: false,
  canReadPersonnel: false,
  canWritePersonnel: false,
  canReadIncidents: false,
  canCreateIncidents: false,
  canUpdateIncidents: false,
  canReadEvidence: false,
  canManageMemberships: false,
  canReadAuditEvents: false,
});

/** UI hints only. Never use this map as a substitute for Firestore Rules. */
export const TENANT_ROLE_UI_CAPABILITIES: Readonly<
  Record<TenantRole, Readonly<TenantUiCapabilities>>
> = Object.freeze({
  owner: OWNER_ADMIN_CAPABILITIES,
  admin: OWNER_ADMIN_CAPABILITIES,
  manager: NO_TENANT_CAPABILITIES,
  viewer: NO_TENANT_CAPABILITIES,
});

const TENANT_ROLES: readonly TenantRole[] = ['owner', 'admin', 'manager', 'viewer'];

export function isTenantRole(value: unknown): value is TenantRole {
  return typeof value === 'string' && TENANT_ROLES.includes(value as TenantRole);
}

/** Shape/provenance check for UI decisions; not a security authorization. */
export function isCurrentUserActiveMember(
  membership: unknown,
  authenticatedUid: string,
  expectedOrgId: string,
): boolean {
  // Treat the adapter boundary as untrusted at runtime: reject nulls,
  // arrays, exotic objects, missing/extra keys, and accessor properties.
  try {
    if (
      membership === null ||
      typeof membership !== 'object' ||
      Array.isArray(membership) ||
      (Object.getPrototypeOf(membership) !== Object.prototype &&
        Object.getPrototypeOf(membership) !== null)
    ) {
      return false;
    }

    const keys = Reflect.ownKeys(membership);
    const expectedKeys = ['orgId', 'role', 'status', 'uid'];
    if (
      keys.length !== expectedKeys.length ||
      keys.some((key) => typeof key !== 'string' || !expectedKeys.includes(key))
    ) {
      return false;
    }

    const descriptors = Object.getOwnPropertyDescriptors(membership);
    if (expectedKeys.some((key) => !('value' in descriptors[key]))) {
      return false;
    }

    const candidate = membership as Record<string, unknown>;
    return typeof authenticatedUid === 'string' &&
      authenticatedUid.length > 0 &&
      typeof expectedOrgId === 'string' &&
      expectedOrgId.length > 0 &&
      candidate.uid === authenticatedUid &&
      candidate.orgId === expectedOrgId &&
      candidate.status === 'active' &&
      isTenantRole(candidate.role);
  } catch {
    // Proxies or unusual objects must never crash the authentication gate.
    return false;
  }
}
