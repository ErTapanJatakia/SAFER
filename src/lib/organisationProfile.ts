import {doc, getDoc, type Firestore} from 'firebase/firestore';
import type {OrganisationRecord, OrganisationMembership} from '../types/organisation.ts';

export type OrganisationProfileErrorCode =
  | 'not-authorised'
  | 'unavailable'
  | 'invalid-profile';

export class OrganisationProfileError extends Error {
  readonly code: OrganisationProfileErrorCode;

  constructor(code: OrganisationProfileErrorCode) {
    super('Organisation profile could not be loaded.');
    this.name = 'OrganisationProfileError';
    this.code = code;
  }
}

const PROFILE_KEYS = ['displayName', 'orgId', 'schemaVersion', 'status'] as const;
const MEMBERSHIP_KEYS = ['orgId', 'role', 'status', 'uid'] as const;

/** Copy only exact own data fields; never invoke membership accessors. */
function readPrivilegedMembership(value: unknown): OrganisationMembership {
  try {
    if (
      value === null ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      (Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null)
    ) throw new OrganisationProfileError('not-authorised');

    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== MEMBERSHIP_KEYS.length ||
      keys.some((key) => typeof key !== 'string' || !MEMBERSHIP_KEYS.includes(key as typeof MEMBERSHIP_KEYS[number]))
    ) throw new OrganisationProfileError('not-authorised');

    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (MEMBERSHIP_KEYS.some((key) => {
      const descriptor = descriptors[key];
      return !descriptor || !('value' in descriptor) || descriptor.enumerable !== true;
    })) throw new OrganisationProfileError('not-authorised');

    const record = value as Record<string, unknown>;
    if (
      typeof record.uid !== 'string' || record.uid.length === 0 ||
      typeof record.orgId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(record.orgId) ||
      record.status !== 'active' ||
      (record.role !== 'owner' && record.role !== 'admin')
    ) throw new OrganisationProfileError('not-authorised');

    return Object.freeze({
      uid: record.uid,
      orgId: record.orgId,
      role: record.role,
      status: 'active',
    });
  } catch {
    throw new OrganisationProfileError('not-authorised');
  }
}

/**
 * Read one organisation document only after an exact active owner/admin
 * membership has been resolved. Firestore Rules remain authoritative.
 */
export async function readOrganisationProfile(
  database: Firestore,
  membershipInput: OrganisationMembership,
): Promise<OrganisationRecord> {
  const membership = readPrivilegedMembership(membershipInput);

  let snapshot;
  try {
    snapshot = await getDoc(doc(database, 'organisations', membership.orgId));
  } catch {
    throw new OrganisationProfileError('unavailable');
  }

  if (!snapshot.exists()) throw new OrganisationProfileError('unavailable');

  const data: unknown = snapshot.data();
  try {
    if (
      data === null ||
      typeof data !== 'object' ||
      Array.isArray(data) ||
      (Object.getPrototypeOf(data) !== Object.prototype &&
        Object.getPrototypeOf(data) !== null)
    ) throw new OrganisationProfileError('invalid-profile');

    const keys = Reflect.ownKeys(data);
    if (
      keys.length !== PROFILE_KEYS.length ||
      keys.some((key) => typeof key !== 'string' || !PROFILE_KEYS.includes(key as typeof PROFILE_KEYS[number]))
    ) throw new OrganisationProfileError('invalid-profile');

    const descriptors = Object.getOwnPropertyDescriptors(data);
    if (PROFILE_KEYS.some((key) => {
      const descriptor = descriptors[key];
      return !descriptor || !('value' in descriptor) || descriptor.enumerable !== true;
    })) throw new OrganisationProfileError('invalid-profile');

    const record = data as Record<string, unknown>;
    if (
      record.orgId !== membership.orgId ||
      record.status !== 'active' ||
      typeof record.displayName !== 'string' ||
      record.displayName.trim().length === 0 ||
      record.displayName.length > 120 ||
      record.schemaVersion !== 1
    ) throw new OrganisationProfileError('invalid-profile');

    return Object.freeze({
      orgId: membership.orgId,
      displayName: record.displayName,
      status: 'active',
      schemaVersion: 1,
    });
  } catch {
    throw new OrganisationProfileError('invalid-profile');
  }
}
