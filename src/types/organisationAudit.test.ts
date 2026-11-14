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

test('target UID may be omitted but cannot be undefined or malformed when present', () => {
  const {targetUid: _targetUid, ...withoutTarget} = event();
  assert.equal(isOrganisationAuditEvent(withoutTarget), true);
  assert.equal(isOrganisationAuditEvent({...withoutTarget, targetUid: undefined}), false);
  assert.equal(isOrganisationAuditEvent({...withoutTarget, targetUid: 'member-002'}), true);
  assert.equal(isOrganisationAuditEvent({...withoutTarget, unexpected: true}), false);
});

test('audit envelope rejects symbols, non-enumerable fields and accessor properties without invoking getters', () => {
  const symbolKey = Symbol('extra');
  const withSymbol = Object.assign(event(), { [symbolKey]: 'unexpected' });
  assert.equal(isOrganisationAuditEvent(withSymbol), false);

  const nonEnumerable = event();
  Object.defineProperty(nonEnumerable, 'actorUid', { value: 'actor-001', enumerable: false });
  assert.equal(isOrganisationAuditEvent(nonEnumerable), false);

  let getterInvoked = false;
  const accessor = event();
  Object.defineProperty(accessor, 'actorUid', {
    enumerable: true,
    get() { getterInvoked = true; return 'actor-001'; },
  });
  assert.equal(isOrganisationAuditEvent(accessor), false);
  assert.equal(getterInvoked, false);
});

test('audit envelope rejects exotic prototypes and hostile proxies', () => {
  assert.equal(isOrganisationAuditEvent(Object.assign(Object.create({ inherited: true }), event())), false);
  const hostile = new Proxy(event(), {
    ownKeys() { throw new Error('blocked'); },
  });
  assert.equal(isOrganisationAuditEvent(hostile), false);
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

test('audit chain rejects duplicate event IDs and mixed organisation sequences', () => {
  const first = event();
  const second = event({
    eventId: 'event-002',
    occurredAt: first.occurredAt,
    orgId: first.orgId,
    previousEventHash: first.eventHash,
    eventHash: 'b'.repeat(64),
  });
  assert.equal(hasContinuousAuditHashLinks([first, second]), true);
  assert.equal(hasContinuousAuditHashLinks([
    first,
    { ...second, eventId: first.eventId },
  ]), false);
  assert.equal(hasContinuousAuditHashLinks([
    first,
    { ...second, orgId: 'other-org' },
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

test('audit chain fails closed for malformed arrays, holes and hostile array proxies', () => {
  assert.equal(hasContinuousAuditHashLinks(null as unknown as OrganisationAuditEvent[]), false);
  assert.equal(hasContinuousAuditHashLinks([,] as unknown as OrganisationAuditEvent[]), false);
  const hostile = new Proxy([event()], {
    get(target, property, receiver) {
      if (property === '0') throw new Error('blocked');
      return Reflect.get(target, property, receiver);
    },
  });
  assert.equal(hasContinuousAuditHashLinks(hostile), false);
});

test('audit chain accepts equal timestamps while preserving explicit hash order', () => {
  const first = event();
  const second = event({
    eventId: 'event-002',
    occurredAt: first.occurredAt,
    previousEventHash: first.eventHash,
    eventHash: 'b'.repeat(64),
  });
  assert.equal(hasContinuousAuditHashLinks([first, second]), true);
});
