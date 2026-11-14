/**
 * Minimal immutable audit-event envelope for a future trusted writer.
 *
 * This is a data contract and verifier only. It does not append, sign, or
 * authorize events. A client-generated hash chain is not tamper-proof.
 */

export const ORGANISATION_AUDIT_EVENT_TYPES = [
  'membership.invitation_issued',
  'membership.invitation_accepted',
  'membership.invitation_expired',
  'membership.invitation_revoked',
  'membership.role_changed',
  'membership.suspended',
  'membership.reactivated',
  'membership.revoked',
  'organisation.profile_updated',
] as const;

export type OrganisationAuditEventType =
  typeof ORGANISATION_AUDIT_EVENT_TYPES[number];

export interface OrganisationAuditEvent {
  readonly eventId: string;
  readonly orgId: string;
  readonly actorUid: string;
  readonly eventType: OrganisationAuditEventType;
  readonly targetUid?: string;
  readonly occurredAt: number;
  readonly schemaVersion: 1;
  readonly previousEventHash: string | null;
  readonly eventHash: string;
}

const ID = /^[A-Za-z0-9_-]{1,128}$/;
const HASH = /^[a-f0-9]{64}$/i;
const REQUIRED_EVENT_KEYS = [
  'actorUid',
  'eventHash',
  'eventId',
  'eventType',
  'occurredAt',
  'orgId',
  'previousEventHash',
  'schemaVersion',
] as const;
const OPTIONAL_EVENT_KEYS = ['targetUid'] as const;
const ALLOWED_EVENT_KEYS = new Set<string>([
  ...REQUIRED_EVENT_KEYS,
  ...OPTIONAL_EVENT_KEYS,
]);

type EventSnapshot = {
  actorUid: unknown;
  eventHash: unknown;
  eventId: unknown;
  eventType: unknown;
  occurredAt: unknown;
  orgId: unknown;
  previousEventHash: unknown;
  schemaVersion: unknown;
  targetUid?: unknown;
};

function snapshotAuditEvent(value: unknown): EventSnapshot | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;

    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== 'string' || !ALLOWED_EVENT_KEYS.has(key))) {
      return null;
    }
    if (keys.length < REQUIRED_EVENT_KEYS.length
      || keys.length > REQUIRED_EVENT_KEYS.length + OPTIONAL_EVENT_KEYS.length) {
      return null;
    }

    const snapshot: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of REQUIRED_EVENT_KEYS) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
      snapshot[key] = descriptor.value;
    }

    if (keys.includes('targetUid')) {
      const descriptor = Object.getOwnPropertyDescriptor(value, 'targetUid');
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) return null;
      snapshot.targetUid = descriptor.value;
    }
    return snapshot as EventSnapshot;
  } catch {
    // Proxies and exotic runtime objects are untrusted adapter input.
    return null;
  }
}

export function isOrganisationAuditEventType(
  value: unknown,
): value is OrganisationAuditEventType {
  return typeof value === 'string'
    && (ORGANISATION_AUDIT_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * Strict runtime-shape validation; it does not establish trust or authenticity.
 * Only enumerable own data properties on plain objects are accepted.
 */
function isValidAuditSnapshot(record: EventSnapshot): boolean {
  const targetValid = !('targetUid' in record)
    || (typeof record.targetUid === 'string' && ID.test(record.targetUid));

  return typeof record.eventId === 'string' && ID.test(record.eventId)
    && typeof record.orgId === 'string' && ID.test(record.orgId)
    && typeof record.actorUid === 'string' && ID.test(record.actorUid)
    && isOrganisationAuditEventType(record.eventType)
    && targetValid
    && Number.isSafeInteger(record.occurredAt)
    && (record.occurredAt as number) >= 0
    && record.schemaVersion === 1
    && (record.previousEventHash === null
      || (typeof record.previousEventHash === 'string' && HASH.test(record.previousEventHash)))
    && typeof record.eventHash === 'string' && HASH.test(record.eventHash);
}

export function isOrganisationAuditEvent(
  value: unknown,
): value is OrganisationAuditEvent {
  const record = snapshotAuditEvent(value);
  return record !== null && isValidAuditSnapshot(record);
}

/**
 * Checks only linkage between supplied envelopes. It does not recompute the
 * canonical event hash, verify a signature, or prove append-only storage.
 */
export function hasContinuousAuditHashLinks(
  events: readonly OrganisationAuditEvent[],
): boolean {
  try {
    if (!Array.isArray(events)) return false;
    const seenEventIds = new Set<string>();
    let chainOrganisationId: string | null = null;
    let previousHash: string | null = null;
    let previousTimestamp: number | null = null;

    for (let index = 0; index < events.length; index += 1) {
      // Snapshot each caller-owned event once; validation and linkage use the
      // same primitive values, avoiding proxy time-of-check/time-of-use changes.
      const snapshot = snapshotAuditEvent(events[index]);
      if (!snapshot || !isValidAuditSnapshot(snapshot)) return false;
      const eventId = snapshot.eventId as string;
      const orgId = snapshot.orgId as string;
      const occurredAt = snapshot.occurredAt as number;
      const eventHash = snapshot.eventHash as string;
      const currentPreviousHash = snapshot.previousEventHash as string | null;

      if (chainOrganisationId === null) chainOrganisationId = orgId;
      if (orgId !== chainOrganisationId || seenEventIds.has(eventId)) return false;
      if (currentPreviousHash !== previousHash) return false;
      if (previousTimestamp !== null && occurredAt < previousTimestamp) return false;

      seenEventIds.add(eventId);
      previousHash = eventHash;
      previousTimestamp = occurredAt;
    }
    return true;
  } catch {
    return false;
  }
}
