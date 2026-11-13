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
  membership: OrganisationMembership,
  authenticatedUid: string,
  expectedOrgId: string,
): boolean {
  return membership.uid === authenticatedUid &&
    membership.orgId === expectedOrgId &&
    membership.status === 'active' &&
    isTenantRole(membership.role);
}
