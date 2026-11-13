import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionLifecycle } from './sessionLifecycle.ts';

describe('SAFER session lifecycle invalidation', () => {
  it('starts fail-closed and cannot issue a request without an authenticated organisation', () => {
    const lifecycle = createSessionLifecycle();
    assert.equal(lifecycle.snapshot().phase, 'signed_out');
    assert.equal(lifecycle.beginRequest(), null);
  });

  it('binds request tokens to the exact authenticated UID and organisation', () => {
    const lifecycle = createSessionLifecycle();
    lifecycle.startAuthenticated('user-a');
    lifecycle.selectOrganisation('org-a');
    const token = lifecycle.beginRequest();
    assert.ok(token);
    assert.equal(token.uid, 'user-a');
    assert.equal(token.orgId, 'org-a');
    assert.equal(lifecycle.isCurrent(token), true);
  });

  it('invalidates an outstanding request when the account changes', () => {
    const lifecycle = createSessionLifecycle();
    lifecycle.startAuthenticated('user-a');
    lifecycle.selectOrganisation('org-a');
    const token = lifecycle.beginRequest()!;
    lifecycle.startAuthenticated('user-b');
    assert.equal(lifecycle.isCurrent(token), false);
  });

  it('invalidates an outstanding request when the organisation changes', () => {
    const lifecycle = createSessionLifecycle();
    lifecycle.startAuthenticated('user-a');
    lifecycle.selectOrganisation('org-a');
    const token = lifecycle.beginRequest()!;
    lifecycle.selectOrganisation('org-b');
    assert.equal(lifecycle.isCurrent(token), false);
    assert.equal(lifecycle.snapshot().orgId, 'org-b');
  });

  it('invalidates an outstanding request when the organisation is cleared', () => {
    const lifecycle = createSessionLifecycle();
    lifecycle.startAuthenticated('user-a');
    lifecycle.selectOrganisation('org-a');
    const token = lifecycle.beginRequest()!;
    lifecycle.selectOrganisation('');
    assert.equal(lifecycle.isCurrent(token), false);
    assert.equal(lifecycle.beginRequest(), null);
  });

  it('allows only the newest request in the same session context', () => {
    const lifecycle = createSessionLifecycle();
    lifecycle.startAuthenticated('user-a');
    lifecycle.selectOrganisation('org-a');
    const first = lifecycle.beginRequest()!;
    const second = lifecycle.beginRequest()!;
    assert.equal(lifecycle.isCurrent(first), false);
    assert.equal(lifecycle.isCurrent(second), true);
  });

  it('invalidates all outstanding work immediately when sign-out begins', () => {
    const lifecycle = createSessionLifecycle();
    lifecycle.startAuthenticated('user-a');
    lifecycle.selectOrganisation('org-a');
    const token = lifecycle.beginRequest()!;
    lifecycle.beginSignOut();
    assert.equal(lifecycle.snapshot().phase, 'signing_out');
    assert.equal(lifecycle.isCurrent(token), false);
    assert.equal(lifecycle.beginRequest(), null);
  });

  it('clears identity and organisation after sign-out completes', () => {
    const lifecycle = createSessionLifecycle();
    lifecycle.startAuthenticated('user-a');
    lifecycle.selectOrganisation('org-a');
    lifecycle.beginSignOut();
    const state = lifecycle.endSession();
    assert.equal(state.phase, 'signed_out');
    assert.equal(state.uid, null);
    assert.equal(state.orgId, null);
  });

  it('invalidates requests after a membership/session refresh transition', () => {
    const lifecycle = createSessionLifecycle();
    lifecycle.startAuthenticated('user-a');
    lifecycle.selectOrganisation('org-a');
    const token = lifecycle.beginRequest()!;
    lifecycle.invalidate();
    assert.equal(lifecycle.isCurrent(token), false);
    assert.equal(lifecycle.snapshot().orgId, null);
  });
});
