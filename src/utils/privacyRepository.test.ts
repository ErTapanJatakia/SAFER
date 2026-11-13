import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPrivacyDemoRepository,
  PRIVACY_DEMO_STORAGE_KEY,
  type PrivacyStorage,
} from './privacyRepository.ts';
import { EMPTY_PRIVACY_DEMO_WORKSPACE } from '../types/privacy.ts';

function memoryStorage(): PrivacyStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe('SAFER privacy demo repository', () => {
  it('starts with an empty synthetic-only workspace and returns independent snapshots', () => {
    const repository = createPrivacyDemoRepository(memoryStorage());
    const first = repository.loadWorkspace();
    first.noticeDrafts.push({
      id: 'local-only', title: 'Draft', content: 'Synthetic content',
      versionLabel: 'draft', updatedAt: '2026-11-13T00:00:00.000Z',
    });
    assert.deepEqual(repository.loadWorkspace(), EMPTY_PRIVACY_DEMO_WORKSPACE);
  });

  it('round-trips valid synthetic demo records and verifies the storage key', () => {
    const storage = memoryStorage();
    const repository = createPrivacyDemoRepository(storage);
    const workspace = repository.loadWorkspace();
    workspace.rightsRequests.push({
      id: 'request-demo-1', subjectRef: 'synthetic-subject-1',
      requestKind: 'access', description: 'Synthetic access request',
      status: 'submitted', submittedAt: '2026-11-13T00:00:00.000Z',
      updatedAt: '2026-11-13T00:00:00.000Z',
    });
    repository.saveWorkspace(workspace);
    assert.deepEqual(repository.loadWorkspace(), workspace);
    assert.ok(storage.getItem(PRIVACY_DEMO_STORAGE_KEY));
  });

  it('rejects non-demo workspaces before writing', () => {
    let writes = 0;
    const storage: PrivacyStorage = {
      getItem: () => null,
      setItem: () => { writes += 1; },
      removeItem: () => undefined,
    };
    const repository = createPrivacyDemoRepository(storage);
    assert.throws(
      () => repository.saveWorkspace({ ...EMPTY_PRIVACY_DEMO_WORKSPACE, workspaceMode: 'authenticated' } as never),
      /Refusing to persist invalid privacy demo data/,
    );
    assert.equal(writes, 0);
  });

  it('fails closed on malformed JSON without replacing the original bytes', () => {
    const original = '{malformed';
    const storage: PrivacyStorage = {
      getItem: () => original,
      setItem: () => { throw new Error('must not write'); },
      removeItem: () => undefined,
    };
    assert.throws(() => createPrivacyDemoRepository(storage).loadWorkspace(), /malformed/);
    assert.equal(storage.getItem(PRIVACY_DEMO_STORAGE_KEY), original);
  });

  it('fails closed when a collection contains malformed records or duplicate IDs', () => {
    for (const requests of [
      [{ id: 7 }],
      [
        { id: 'same', subjectRef: 's', requestKind: 'access', description: 'x', status: 'submitted', submittedAt: 'now', updatedAt: 'now' },
        { id: 'same', subjectRef: 's', requestKind: 'access', description: 'y', status: 'submitted', submittedAt: 'now', updatedAt: 'now' },
      ],
    ]) {
      const storage = memoryStorage();
      storage.setItem(PRIVACY_DEMO_STORAGE_KEY, JSON.stringify({
        ...EMPTY_PRIVACY_DEMO_WORKSPACE,
        rightsRequests: requests,
      }));
      assert.throws(() => createPrivacyDemoRepository(storage).loadWorkspace(), /schema validation/);
    }
  });

  it('does not treat browser storage read failures as an empty workspace', () => {
    const storage: PrivacyStorage = {
      getItem: () => { throw new DOMException('Blocked', 'SecurityError'); },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    assert.throws(() => createPrivacyDemoRepository(storage).loadWorkspace(), /Unable to read/);
  });

  it('reports quota failures without claiming a successful write', () => {
    const storage: PrivacyStorage = {
      getItem: () => null,
      setItem: () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); },
      removeItem: () => undefined,
    };
    const repository = createPrivacyDemoRepository(storage);
    assert.throws(() => repository.saveWorkspace(EMPTY_PRIVACY_DEMO_WORKSPACE), /Unable to write/);
  });

  it('detects writes that cannot be read back exactly', () => {
    const storage: PrivacyStorage = {
      getItem: () => 'different-bytes',
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    assert.throws(
      () => createPrivacyDemoRepository(storage).saveWorkspace(EMPTY_PRIVACY_DEMO_WORKSPACE),
      /Unable to verify/,
    );
  });


  it('round-trips synthetic processing activity register entries', () => {
    const repository = createPrivacyDemoRepository(memoryStorage());
    const workspace = repository.loadWorkspace();
    workspace.processingActivities.push({
      id: 'activity-demo-1',
      purpose: 'Synthetic workforce administration',
      dataCategories: ['synthetic role reference', 'synthetic qualification'],
      recipients: ['demo operations team'],
      retentionDescription: 'Manual review required; no statutory period asserted.',
      legalAssessment: 'not-assessed',
    });
    repository.saveWorkspace(workspace);
    assert.deepEqual(repository.loadWorkspace(), workspace);
  });

  it('rejects malformed processing activity records and duplicate activity IDs', () => {
    for (const activities of [
      [{ id: 'activity-1', purpose: 'x', dataCategories: [], recipients: [], retentionDescription: 'x', legalAssessment: 'approved' }],
      [
        { id: 'same', purpose: 'x', dataCategories: [], recipients: [], retentionDescription: 'x', legalAssessment: 'not-assessed' },
        { id: 'same', purpose: 'y', dataCategories: [], recipients: [], retentionDescription: 'y', legalAssessment: 'not-assessed' },
      ],
    ]) {
      const storage = memoryStorage();
      storage.setItem(PRIVACY_DEMO_STORAGE_KEY, JSON.stringify({
        ...EMPTY_PRIVACY_DEMO_WORKSPACE,
        processingActivities: activities,
      }));
      assert.throws(() => createPrivacyDemoRepository(storage).loadWorkspace(), /schema validation/);
    }
  });

  it('verifies clear operations and leaves no stored demo workspace', () => {
    const storage = memoryStorage();
    const repository = createPrivacyDemoRepository(storage);
    repository.saveWorkspace(EMPTY_PRIVACY_DEMO_WORKSPACE);
    repository.clearWorkspace();
    assert.equal(storage.getItem(PRIVACY_DEMO_STORAGE_KEY), null);
  });
});
