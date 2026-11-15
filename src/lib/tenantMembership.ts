import { doc, getDoc, Timestamp, type Firestore } from 'firebase/firestore';

export const TENANT_ROLES = Object.freeze([
  'tenant_super_admin',
  'tenant_admin',
  'tenant_manager',
  'tenant_employee',
  'tenant_auditor',
] as const);

export type TenantRole = typeof TENANT_ROLES[number];

export interface TenantMembership {
  readonly uid: string;
  readonly orgId: string;
  readonly role: TenantRole;
  readonly status: 'active';
  readonly schemaVersion: 1;
}

export interface AuthenticatedUserRef {
  readonly uid: string;
}

export type TenantMembershipErrorCode =
  | 'unauthenticated'
  | 'invalid-organisation-id'
  | 'membership-unavailable'
  | 'invalid-membership';

export class TenantMembershipError extends Error {
  readonly code: TenantMembershipErrorCode;

  constructor(code: TenantMembershipErrorCode) {
    super('Organisation membership could not be verified.');
    this.name = 'TenantMembershipError';
    this.code = code;
  }
}

const SUPPORTED_ROLES = new Set<string>(TENANT_ROLES);
const MEMBERSHIP_KEYS = [
  'uid', 'orgId', 'role', 'status', 'createdAt', 'createdByUid',
  'updatedAt', 'updatedByUid', 'schemaVersion',
] as const;

/** Validate the canonical, versioned membership document. */
export function parseTenantMembership(
  data: unknown,
  authenticatedUid: string,
  expectedOrgId: string,
): TenantMembership {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TenantMembershipError('invalid-membership');
  }

  const record = data as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expectedKeys = [...MEMBERSHIP_KEYS].sort();
  const hasExactKeys = keys.length === expectedKeys.length
    && keys.every((key, index) => key === expectedKeys[index]);

  if (
    !hasExactKeys
    || record.uid !== authenticatedUid
    || record.orgId !== expectedOrgId
    || record.status !== 'active'
    || typeof record.role !== 'string'
    || !SUPPORTED_ROLES.has(record.role)
    || record.schemaVersion !== 1
    || !(record.createdAt instanceof Timestamp)
    || typeof record.createdByUid !== 'string'
    || record.createdByUid.length === 0
    || !(record.updatedAt instanceof Timestamp)
    || typeof record.updatedByUid !== 'string'
    || record.updatedByUid.length === 0
  ) {
    throw new TenantMembershipError('invalid-membership');
  }

  return Object.freeze({
    uid: authenticatedUid,
    orgId: expectedOrgId,
    role: record.role as TenantRole,
    status: 'active' as const,
    schemaVersion: 1 as const,
  });
}

/** Resolve one exact membership document for the authenticated UID. */
export async function resolveTenantMembership(
  database: Firestore,
  user: AuthenticatedUserRef | null,
  organisationIdInput: string,
): Promise<TenantMembership> {
  if (!user || typeof user.uid !== 'string' || user.uid.length === 0) {
    throw new TenantMembershipError('unauthenticated');
  }

  const orgId = typeof organisationIdInput === 'string' ? organisationIdInput.trim() : '';
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(orgId)) {
    throw new TenantMembershipError('invalid-organisation-id');
  }

  let snapshot;
  try {
    snapshot = await getDoc(doc(database, 'organisations', orgId, 'members', user.uid));
  } catch {
    throw new TenantMembershipError('membership-unavailable');
  }

  if (!snapshot.exists()) {
    throw new TenantMembershipError('membership-unavailable');
  }

  return parseTenantMembership(snapshot.data(), user.uid, orgId);
}
