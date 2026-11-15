import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDpdpGovernanceRepository, DPDP_GOVERNANCE_STORAGE_KEY, type GovernanceStorage } from './dpdpGovernanceRepository.ts';
import { EMPTY_PRIVACY_GOVERNANCE } from '../types/dpdpGovernance.ts';

function memoryStorage(): GovernanceStorage {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

describe('DPDP governance demo repository', () => {
  it('loads an empty synthetic-only snapshot and persists a validated snapshot', () => {
    const storage = memoryStorage();
    const repository = createDpdpGovernanceRepository(storage);
    assert.deepEqual(repository.load(), EMPTY_PRIVACY_GOVERNANCE);
    repository.save(EMPTY_PRIVACY_GOVERNANCE);
    assert.equal(storage.getItem(DPDP_GOVERNANCE_STORAGE_KEY), JSON.stringify(EMPTY_PRIVACY_GOVERNANCE));
  });

  it('rejects non-synthetic and malformed snapshots without writing', () => {
    const storage = memoryStorage();
    const repository = createDpdpGovernanceRepository(storage);
    assert.throws(() => repository.save({ ...EMPTY_PRIVACY_GOVERNANCE, workspaceMode: 'production' } as never), /Refusing to save/);
    assert.equal(storage.getItem(DPDP_GOVERNANCE_STORAGE_KEY), null);
  });

  it('fails closed on malformed stored JSON', () => {
    const storage = memoryStorage();
    storage.setItem(DPDP_GOVERNANCE_STORAGE_KEY, '{broken');
    assert.throws(() => createDpdpGovernanceRepository(storage).load(), /malformed/);
    assert.equal(storage.getItem(DPDP_GOVERNANCE_STORAGE_KEY), '{broken');
  });

  it('rejects stale writes from a second repository instance', () => {
    const storage = memoryStorage();
    const first = createDpdpGovernanceRepository(storage);
    const second = createDpdpGovernanceRepository(storage);
    const firstSnapshot = first.load();
    second.load();
    first.save(firstSnapshot);
    assert.throws(() => second.save(EMPTY_PRIVACY_GOVERNANCE), /changed in another tab or session/);
  });

  it('fails closed when browser storage is unavailable', () => {
    const storage: GovernanceStorage = {
      getItem: () => { throw new DOMException('Blocked', 'SecurityError'); },
      setItem: () => undefined,
    };
    assert.throws(() => createDpdpGovernanceRepository(storage).load(), /Unable to read/);
  });
});
