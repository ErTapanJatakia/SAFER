import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  beginAuthenticatedSession, beginSignOut, beginTenantResolution,
  completeSignOut, completeTenantResolution, enterDemoGuest,
  selectOperationalRepository, signedOutState,
  type DemoRepository,
} from './dataBoundary.ts';

const demo = { kind: 'demo' } as DemoRepository;
const membership = { uid: 'user-a', orgId: 'org-a', role: 'owner' as const, status: 'active' as const };

describe('SAFER operational data boundary', () => {
  it('starts fail-closed while signed out', () => {
    assert.deepEqual(selectOperationalRepository(signedOutState(1), demo), { kind: 'unavailable', reason: 'signed-out' });
  });
  it('selects the demo repository only in explicit Demo Guest mode', () => {
    const selected = selectOperationalRepository(enterDemoGuest(2), demo);
    assert.equal(selected.kind, 'demo');
    if (selected.kind === 'demo') assert.equal(selected.repository, demo);
  });
  it('does not grant access from authentication or an organisation locator', () => {
    const pending = beginTenantResolution(beginAuthenticatedSession('user-a', 1), 'org-a', 2);
    assert.deepEqual(selectOperationalRepository(pending, demo), { kind: 'unavailable', reason: 'authentication-unresolved' });
  });
  it('denies malformed organisation locators', () => {
    assert.equal(beginTenantResolution(beginAuthenticatedSession('user-a', 1), '../other-org', 2).kind, 'tenant_denied');
  });
  it('accepts only membership matching exact UID, organisation and request generation', () => {
    const pending = beginTenantResolution(beginAuthenticatedSession('user-a', 1), 'org-a', 2);
    const active = completeTenantResolution(pending, 2, membership);
    assert.equal(active.kind, 'tenant_active');
    assert.deepEqual(selectOperationalRepository(active, demo), { kind: 'unavailable', reason: 'tenant-repository-not-released' });
  });
  it('denies mismatched membership provenance', () => {
    const pending = beginTenantResolution(beginAuthenticatedSession('user-a', 1), 'org-a', 2);
    assert.equal(completeTenantResolution(pending, 2, { ...membership, uid: 'user-b' }).kind, 'tenant_denied');
  });
  it('does not let stale membership responses revive another account or organisation', () => {
    const current = beginTenantResolution(beginAuthenticatedSession('user-b', 5), 'org-b', 6);
    assert.equal(completeTenantResolution(current, 4, membership), current);
  });
  it('fails closed when membership resolution returns no membership', () => {
    const pending = beginTenantResolution(beginAuthenticatedSession('user-a', 1), 'org-a', 2);
    assert.equal(completeTenantResolution(pending, 2, null).kind, 'tenant_denied');
  });
  it('clears access through sign-out transition and rejects stale completion', () => {
    const transition = beginSignOut(7);
    assert.deepEqual(selectOperationalRepository(transition, demo), { kind: 'unavailable', reason: 'transitioning' });
    assert.equal(completeSignOut(transition, 6), transition);
    assert.deepEqual(completeSignOut(transition, 7), signedOutState(7));
  });
  it('never exposes demo repository to authenticated tenant states', () => {
    const pending = beginTenantResolution(beginAuthenticatedSession('user-a', 1), 'org-a', 2);
    const active = completeTenantResolution(pending, 2, membership);
    assert.equal(selectOperationalRepository(active, demo).kind, 'unavailable');
  });
});
