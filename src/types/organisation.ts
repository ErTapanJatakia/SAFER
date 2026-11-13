/**
 * SAFER organisation and membership domain contracts.
 *
 * These types describe the proposed tenant model only. They are not an
 * authorization mechanism. All access must be enforced by Firestore Security
 * Rules against authoritative membership documents before any tenant data is
 * read or written. Never derive roles from profile fields or browser storage.
 */

export type OrganisationStatus = 'active' | 'suspended' | 'archived';

export type OrganisationRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'auditor'
  | 'member';

export type MembershipStatus =
  | 'invited'
  | 'active'
  | 'suspended'
  | 'revoked';

export interface OrganisationRecord {
  /** Firestore document ID; generated outside untrusted client input. */
  id: string;
  displayName: string;
  status: OrganisationStatus;
  createdAt: string;
  /** Auth UID of the trusted provisioning actor, not an email address. */
  createdByUid: string;
}

export interface OrganisationMembership {
  /** Must equal the Firebase Authentication UID and membership document ID. */
  userId: string;
  organisationId: string;
  role: OrganisationRole;
  status: MembershipStatus;
  createdAt: string;
  /** Trusted actor UID that provisioned or changed this membership. */
  assignedByUid: string;
  updatedAt: string;
}

/**
 * UI capability hints only. Firestore rules must independently enforce every
 * operation. This matrix must never be treated as proof of authorization.
 */
export interface OrganisationRoleCapabilities {
  canViewPersonnel: boolean;
  canEditPersonnel: boolean;
  canViewIncidents: boolean;
  canCreateIncidents: boolean;
  canUpdateIncidents: boolean;
  canViewAuditEvents: boolean;
  canManageMemberships: boolean;
  canExportOperationalData: boolean;
  readOnly: boolean;
}

export const ORGANISATION_ROLE_CAPABILITIES: Readonly<
  Record<OrganisationRole, Readonly<OrganisationRoleCapabilities>>
> = Object.freeze({
  owner: Object.freeze({
    canViewPersonnel: true,
    canEditPersonnel: true,
    canViewIncidents: true,
    canCreateIncidents: true,
    canUpdateIncidents: true,
    canViewAuditEvents: true,
    canManageMemberships: true,
    canExportOperationalData: true,
    readOnly: false,
  }),
  admin: Object.freeze({
    canViewPersonnel: true,
    canEditPersonnel: true,
    canViewIncidents: true,
    canCreateIncidents: true,
    canUpdateIncidents: true,
    canViewAuditEvents: true,
    canManageMemberships: true,
    canExportOperationalData: true,
    readOnly: false,
  }),
  manager: Object.freeze({
    canViewPersonnel: true,
    canEditPersonnel: true,
    canViewIncidents: true,
    canCreateIncidents: true,
    canUpdateIncidents: true,
    canViewAuditEvents: true,
    canManageMemberships: false,
    canExportOperationalData: false,
    readOnly: false,
  }),
  auditor: Object.freeze({
    canViewPersonnel: true,
    canEditPersonnel: false,
    canViewIncidents: true,
    canCreateIncidents: false,
    canUpdateIncidents: false,
    canViewAuditEvents: true,
    canManageMemberships: false,
    canExportOperationalData: false,
    readOnly: true,
  }),
  member: Object.freeze({
    canViewPersonnel: false,
    canEditPersonnel: false,
    canViewIncidents: true,
    canCreateIncidents: true,
    canUpdateIncidents: false,
    canViewAuditEvents: false,
    canManageMemberships: false,
    canExportOperationalData: false,
    readOnly: false,
  }),
});

const ORGANISATION_ROLES: readonly OrganisationRole[] = [
  'owner', 'admin', 'manager', 'auditor', 'member',
];

export function isOrganisationRole(value: unknown): value is OrganisationRole {
  return typeof value === 'string' &&
    ORGANISATION_ROLES.includes(value as OrganisationRole);
}

export function isActiveMembershipFor(
  membership: OrganisationMembership,
  authenticatedUid: string,
  organisationId: string,
): boolean {
  return membership.userId === authenticatedUid &&
    membership.organisationId === organisationId &&
    membership.status === 'active';
}
