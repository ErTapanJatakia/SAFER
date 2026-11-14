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

/** Mirrors explicit allow/deny boundaries in the current Rules file. */
export interface TenantUiCapabilities {
  canReadOrganisation: boolean;
  canReadPersonnel: boolean;
  canWritePersonnel: boolean;
  canDeletePersonnel: boolean;
  canReadIncidents: boolean;
  canCreateIncidents: boolean;
  canUpdateIncidents: boolean;
  canDeleteIncidents: boolean;
  canReadEvidence: boolean;
  canWriteEvidence: boolean;
  canManageMemberships: boolean;
  canReadAuditEvents: boolean;
  canWriteAuditEvents: boolean;
}

const OWNER_ADMIN_CAPABILITIES: Readonly<TenantUiCapabilities> = Object.freeze({
  canReadOrganisation: true,
  canReadPersonnel: true,
  canWritePersonnel: true,
  canDeletePersonnel: false,
  canReadIncidents: true,
  canCreateIncidents: true,
  canUpdateIncidents: true,
  canDeleteIncidents: false,
  canReadEvidence: true,
  canWriteEvidence: false,
  canManageMemberships: false,
  canReadAuditEvents: false,
  canWriteAuditEvents: false,
});

const NO_TENANT_CAPABILITIES: Readonly<TenantUiCapabilities> = Object.freeze({
  canReadOrganisation: false,
  canReadPersonnel: false,
  canWritePersonnel: false,
  canDeletePersonnel: false,
  canReadIncidents: false,
  canCreateIncidents: false,
  canUpdateIncidents: false,
  canDeleteIncidents: false,
  canReadEvidence: false,
  canWriteEvidence: false,
  canManageMemberships: false,
  canReadAuditEvents: false,
  canWriteAuditEvents: false,
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
  try {
    if (
      membership === null ||
      typeof membership !== 'object' ||
      Array.isArray(membership) ||
      (Object.getPrototypeOf(membership) !== Object.prototype &&
        Object.getPrototypeOf(membership) !== null) ||
      typeof authenticatedUid !== 'string' ||
      authenticatedUid.length === 0 ||
      typeof expectedOrgId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(expectedOrgId)
    ) return false;

    const keys = Reflect.ownKeys(membership);
    if (
      keys.length !== MEMBERSHIP_KEYS.length ||
      keys.some((key) => typeof key !== 'string' || !MEMBERSHIP_KEYS.includes(key as typeof MEMBERSHIP_KEYS[number]))
    ) return false;

    const descriptors = Object.getOwnPropertyDescriptors(membership);
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of MEMBERSHIP_KEYS) {
      const descriptor = descriptors[key];
      if (!descriptor || !('value' in descriptor) || descriptor.enumerable !== true) return false;
      snapshot[key] = descriptor.value;
    }

    return snapshot.uid === authenticatedUid &&
      snapshot.orgId === expectedOrgId &&
      snapshot.status === 'active' &&
      isTenantRole(snapshot.role);
  } catch {
    return false;
  }
}
