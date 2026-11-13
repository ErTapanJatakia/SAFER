import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasContinuousAuditHashLinks,
  isOrganisationAuditEvent,
  isOrganisationAuditEventType,
  type OrganisationAuditEvent,
} from './organisationAudit.ts';

function event(overrides: Partial<OrganisationAuditEvent> = {}): OrganisationAuditEvent {
  return {
    eventId: 'event-001',
    orgId: 'org-001',
    actorUid: 'actor-001',
    eventType: 'membership.role_changed',
    targetUid: 'member-001',
    occurredAt: 1_800_000_000_000,
    schemaVersion: 1,
    previousEventHash: null,
    eventHash: 'a'.repeat(64),
    ...overrides,
  };
}

test('audit event vocabulary is explicit and rejects arbitrary event names', () => {
  assert.equal(isOrganisationAuditEventType('membership.revoked'), true);
  assert.equal(isOrganisationAuditEventType('member.deleted'), false);
  assert.equal(isOrganisationAuditEventType(null), false);
});

test('audit envelope requires exact fields, identifiers and digest formats', () => {
  assert.equal(isOrganisationAuditEvent(event()), true);
  assert.equal(isOrganisationAuditEvent({ ...event(), email: 'person@example.test' }), false);
  assert.equal(isOrganisationAuditEvent({ ...event(), eventHash: 'not-a-hash' }), false);
  assert.equal(isOrganisationAuditEvent({ ...event(), occurredAt: Number.MAX_SAFE_INTEGER + 1 }), false);
  assert.equal(isOrganisationAuditEvent({ ...event(), eventType: 'arbitrary.action' }), false);
  assert.equal(isOrganisationAuditEvent({ ...event(), targetUid: '' }), false);
});

test('audit chain requires genesis null and exact previous-event hash linkage', () => {
  const first = event();
  const second = event({
    eventId: 'event-002',
    occurredAt: first.occurredAt + 1,
    previousEventHash: first.eventHash,
    eventHash: 'b'.repeat(64),
  });
  assert.equal(hasContinuousAuditHashLinks([first, second]), true);
  assert.equal(hasContinuousAuditHashLinks([
    first,
    { ...second, previousEventHash: 'c'.repeat(64) },
  ]), false);
  assert.equal(hasContinuousAuditHashLinks([
    { ...first, previousEventHash: 'd'.repeat(64) },
  ]), false);
});

test('audit chain rejects time reversal and malformed event envelopes', () => {
  const first = event();
  const second = event({
    eventId: 'event-002',
    occurredAt: first.occurredAt - 1,
    previousEventHash: first.eventHash,
    eventHash: 'b'.repeat(64),
  });
  assert.equal(hasContinuousAuditHashLinks([first, second]), false);
  assert.equal(hasContinuousAuditHashLinks([first, { ...second, actorUid: '' }]), false);
});
