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
 * Pure schema and provenance validation, independent of Firestore access.
 * Treat the runtime adapter value as untrusted: inspect only plain data
 * objects, never invoke accessors, and fail closed on proxy inspection errors.
 */
export function parseTenantMembership(
  data: unknown,
  authenticatedUid: string,
  expectedOrgId: string,
): TenantMembership {
  try {
    if (
      data === null ||
      typeof data !== 'object' ||
      Array.isArray(data) ||
      (Object.getPrototypeOf(data) !== Object.prototype &&
        Object.getPrototypeOf(data) !== null) ||
      typeof authenticatedUid !== 'string' ||
      authenticatedUid.length === 0 ||
      typeof expectedOrgId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(expectedOrgId)
    ) {
      throw new TenantMembershipError('invalid-membership');
    }

    const keys = Reflect.ownKeys(data);
    if (
      keys.length !== MEMBERSHIP_KEYS.length ||
      keys.some((key) => typeof key !== 'string' || !MEMBERSHIP_KEYS.includes(key as typeof MEMBERSHIP_KEYS[number]))
    ) {
      throw new TenantMembershipError('invalid-membership');
    }

    const descriptors = Object.getOwnPropertyDescriptors(data);
    if (MEMBERSHIP_KEYS.some((key) => {
      const descriptor = descriptors[key];
      return !descriptor || !('value' in descriptor) || descriptor.enumerable !== true;
    })) {
      throw new TenantMembershipError('invalid-membership');
    }

    const record = data as Record<string, unknown>;
    if (
      record.uid !== authenticatedUid ||
      record.orgId !== expectedOrgId ||
      record.status !== 'active' ||
      typeof record.role !== 'string' ||
      !SUPPORTED_ROLES.has(record.role as TenantRole)
    ) {
      throw new TenantMembershipError('invalid-membership');
    }

    return Object.freeze({
      uid: authenticatedUid,
      orgId: expectedOrgId,
      role: record.role as TenantRole,
      status: 'active' as const,
    });
  } catch {
    // Keep one stable, generic error for malformed values and proxy traps.
    throw new TenantMembershipError('invalid-membership');
  }
}

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

  return parseTenantMembership(snapshot.data(), user.uid, orgId);
}
