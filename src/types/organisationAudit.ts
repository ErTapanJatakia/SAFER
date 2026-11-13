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
const EVENT_KEYS = [
  'actorUid',
  'eventHash',
  'eventId',
  'eventType',
  'occurredAt',
  'orgId',
  'previousEventHash',
  'schemaVersion',
  'targetUid',
] as const;

export function isOrganisationAuditEventType(
  value: unknown,
): value is OrganisationAuditEventType {
  return typeof value === 'string'
    && (ORGANISATION_AUDIT_EVENT_TYPES as readonly string[]).includes(value);
}

/** Strict shape validation; trust and authenticity must be established elsewhere. */
export function isOrganisationAuditEvent(
  value: unknown,
): value is OrganisationAuditEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expected = [...EVENT_KEYS].sort();
  const exactKeys = keys.length === expected.length
    && keys.every((key, index) => key === expected[index]);
  const targetValid = record.targetUid === undefined
    || (typeof record.targetUid === 'string' && ID.test(record.targetUid));

  return exactKeys
    && typeof record.eventId === 'string' && ID.test(record.eventId)
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

/**
 * Checks only linkage between supplied envelopes. It does not recompute the
 * canonical event hash, verify a signature, or prove append-only storage.
 */
export function hasContinuousAuditHashLinks(
  events: readonly OrganisationAuditEvent[],
): boolean {
  for (let index = 0; index < events.length; index += 1) {
    if (!isOrganisationAuditEvent(events[index])) return false;
    const expectedPrevious = index === 0 ? null : events[index - 1].eventHash;
    if (events[index].previousEventHash !== expectedPrevious) return false;
    if (index > 0 && events[index].occurredAt < events[index - 1].occurredAt) return false;
  }
  return true;
}
