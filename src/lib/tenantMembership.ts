import { doc, getDoc, type Firestore } from 'firebase/firestore';

export type TenantRole = 'owner' | 'admin' | 'manager' | 'viewer';

export interface TenantMembership {
  readonly uid: string;
  readonly orgId: string;
  readonly role: TenantRole;
  readonly status: 'active';
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

const SUPPORTED_ROLES = new Set<TenantRole>(['owner', 'admin', 'manager', 'viewer']);
const MEMBERSHIP_KEYS = ['uid', 'orgId', 'role', 'status'] as const;

/**
 * Resolve one exact membership document for the currently authenticated UID.
 * The organisation ID is an out-of-band locator, never an authorisation token.
 * Firestore Security Rules remain the authoritative access-control boundary.
 * This helper deliberately performs no query, discovery, caching, or writes.
 */
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

  const data: unknown = snapshot.data();
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
    || record.uid !== user.uid
    || record.orgId !== orgId
    || record.status !== 'active'
    || typeof record.role !== 'string'
    || !SUPPORTED_ROLES.has(record.role as TenantRole)
  ) {
    throw new TenantMembershipError('invalid-membership');
  }

  return Object.freeze({
    uid: user.uid,
    orgId,
    role: record.role as TenantRole,
    status: 'active' as const,
  });
}
