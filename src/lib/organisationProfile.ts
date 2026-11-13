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

/**
 * Read one organisation document only after an exact active owner/admin
 * membership has been resolved. Firestore Rules remain authoritative.
 */
export async function readOrganisationProfile(
  database: Firestore,
  membership: OrganisationMembership,
): Promise<OrganisationRecord> {
  if (membership.status !== 'active' || !['owner', 'admin'].includes(membership.role)) {
    throw new OrganisationProfileError('not-authorised');
  }

  let snapshot;
  try {
    snapshot = await getDoc(doc(database, 'organisations', membership.orgId));
  } catch {
    throw new OrganisationProfileError('unavailable');
  }

  if (!snapshot.exists()) throw new OrganisationProfileError('unavailable');

  const data: unknown = snapshot.data();
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new OrganisationProfileError('invalid-profile');
  }

  const record = data as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expectedKeys = [...PROFILE_KEYS].sort();
  const exactKeys = keys.length === expectedKeys.length
    && keys.every((key, index) => key === expectedKeys[index]);

  if (
    !exactKeys
    || record.orgId !== membership.orgId
    || record.status !== 'active'
    || typeof record.displayName !== 'string'
    || record.displayName.trim().length === 0
    || record.displayName.length > 120
    || record.schemaVersion !== 1
  ) {
    throw new OrganisationProfileError('invalid-profile');
  }

  return Object.freeze({
    orgId: membership.orgId,
    displayName: record.displayName,
    status: 'active',
    schemaVersion: 1,
  });
}
