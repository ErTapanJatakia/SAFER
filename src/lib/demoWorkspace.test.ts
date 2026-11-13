import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  beginAuthenticatedSession, beginSignOut, beginTenantResolution,
  completeTenantResolution, enterDemoGuest, signedOutState,
  type DemoRepository,
} from './dataBoundary.ts';
import { createRevocableDemoRepository, selectDemoWorkspaceRepository, type DemoWorkspaceRepository } from './demoWorkspace.ts';
import { createDemoRepository, type DemoStorage } from './demoRepository.ts';
import { INITIAL_PERSONNEL } from '../data/mockData.ts';

const repository = { kind: 'demo' } as DemoRepository;
const membership = { uid: 'user-a', orgId: 'org-a', role: 'owner' as const, status: 'active' as const };

function trackedStorage(): DemoStorage & { calls: string[] } {
  const values = new Map<string, string>();
  const calls: string[] = [];
  return {
    calls,
    getItem(key) { calls.push('get:' + key); return values.get(key) ?? null; },
    setItem(key, value) { calls.push('set:' + key); values.set(key, value); },
    removeItem(key) { calls.push('remove:' + key); values.delete(key); },
  };
}

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

describe('revocable Demo Guest repository capability', () => {
  it('rejects retained reads after the owning session is revoked without touching storage', async () => {
    const storage = trackedStorage();
    let active = true;
    const raw = createDemoRepository(storage);
    const guarded = createRevocableDemoRepository(raw, () => active);
    guarded.loadSnapshot();
    const beforeRevocation = storage.calls.length;

    active = false;
    assert.throws(() => guarded.loadSnapshot(), /session has ended/);
    await assert.rejects(guarded.listPersonnel(), /session has ended/);
    assert.equal(storage.calls.length, beforeRevocation);
  });

  it('does not deliver an in-flight read result after the session is revoked', async () => {
    let active = true;
    let completeRead!: (records: readonly typeof INITIAL_PERSONNEL[number][]) => void;
    const pendingRead = new Promise<readonly typeof INITIAL_PERSONNEL[number][]>((resolve) => {
      completeRead = resolve;
    });
    const raw = createDemoRepository(trackedStorage());
    const delayed: DemoWorkspaceRepository = {
      ...raw,
      listPersonnel: () => pendingRead,
    };
    const guarded = createRevocableDemoRepository(delayed, () => active);

    const result = guarded.listPersonnel();
    active = false;
    completeRead(INITIAL_PERSONNEL);
    await assert.rejects(result, /session has ended/);
  });

  it('rejects retained writes and reset after sign-out without changing stored records', async () => {
    const storage = trackedStorage();
    let active = true;
    const raw = createDemoRepository(storage);
    const guarded = createRevocableDemoRepository(raw, () => active);
    const record = { ...INITIAL_PERSONNEL[0], id: 'revocation-test' };
    await guarded.savePersonnel(record);
    const beforeRevocation = storage.calls.length;

    active = false;
    await assert.rejects(guarded.savePersonnel({ ...record, fullName: 'Must not persist' }), /session has ended/);
    await assert.rejects(guarded.reset(), /session has ended/);
    assert.equal(storage.calls.length, beforeRevocation);
    assert.equal((await raw.listPersonnel()).some((item) => item.id === record.id), true);
    assert.equal((await raw.listPersonnel()).find((item) => item.id === record.id)?.fullName, record.fullName);
  });

  it('keeps the prior session revoked when a separate later session starts', async () => {
    const storage = trackedStorage();
    let priorSessionActive = true;
    const priorRepository = createRevocableDemoRepository(
      createDemoRepository(storage),
      () => priorSessionActive,
    );
    priorSessionActive = false;

    // A new guest session receives a new capability and a new revocation scope.
    let nextSessionActive = true;
    const nextRepository = createRevocableDemoRepository(
      createDemoRepository(storage),
      () => nextSessionActive,
    );
    assert.doesNotThrow(() => nextRepository.loadSnapshot());

    const beforePriorAccess = storage.calls.length;
    assert.throws(() => priorRepository.loadSnapshot(), /session has ended/);
    assert.equal(storage.calls.length, beforePriorAccess);

    nextSessionActive = false;
    assert.throws(() => nextRepository.loadSnapshot(), /session has ended/);
  });
});
