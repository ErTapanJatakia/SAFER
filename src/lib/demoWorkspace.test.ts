import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  beginAuthenticatedSession, beginSignOut, beginTenantResolution,
  completeTenantResolution, enterDemoGuest, signedOutState,
  type DemoRepository,
} from './dataBoundary.ts';
import { selectDemoWorkspaceRepository } from './demoWorkspace.ts';

const repository = { kind: 'demo' } as DemoRepository;
const membership = { uid: 'user-a', orgId: 'org-a', role: 'owner' as const, status: 'active' as const };

describe('Demo Guest repository selection boundary', () => {
  it('selects the repository only for explicit Demo Guest state', () => {
    const selected = selectDemoWorkspaceRepository(enterDemoGuest(1), repository);
    assert.equal(selected.kind, 'demo');
    if (selected.kind === 'demo') assert.equal(selected.repository, repository);
  });

  it('does not expose Demo Guest storage while signed out', () => {
    assert.deepEqual(selectDemoWorkspaceRepository(signedOutState(2), repository), {
      kind: 'unavailable', reason: 'signed-out',
    });
  });

  it('does not expose Demo Guest storage during authenticated membership resolution', () => {
    const pending = beginTenantResolution(beginAuthenticatedSession('user-a', 3), 'org-a', 4);
    assert.deepEqual(selectDemoWorkspaceRepository(pending, repository), {
      kind: 'unavailable', reason: 'authentication-unresolved',
    });
  });

  it('does not expose Demo Guest storage even after valid membership verification', () => {
    const pending = beginTenantResolution(beginAuthenticatedSession('user-a', 3), 'org-a', 4);
    const active = completeTenantResolution(pending, 4, membership);
    assert.deepEqual(selectDemoWorkspaceRepository(active, repository), {
      kind: 'unavailable', reason: 'tenant-repository-not-released',
    });
  });

  it('does not expose Demo Guest storage during sign-out transition', () => {
    assert.deepEqual(selectDemoWorkspaceRepository(beginSignOut(5), repository), {
      kind: 'unavailable', reason: 'transitioning',
    });
  });
});
