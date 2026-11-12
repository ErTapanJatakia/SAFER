import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoRepository, type DemoStorage } from './demoRepository.ts';
import { INITIAL_PERSONNEL, INITIAL_INCIDENTS, INITIAL_CYBER_ITEMS, INITIAL_CHECKLIST } from '../data/mockData.ts';

function memoryStorage(): DemoStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe('Demo Guest repository', () => {
  it('loads only the existing browser-local demo keys and uses synthetic defaults when empty', () => {
    const repository = createDemoRepository(memoryStorage());
    const snapshot = repository.loadSnapshot();
    assert.deepEqual(snapshot.personnel, INITIAL_PERSONNEL);
    assert.deepEqual(snapshot.incidents, INITIAL_INCIDENTS);
    assert.deepEqual(snapshot.cyberHygiene, INITIAL_CYBER_ITEMS);
    assert.deepEqual(snapshot.checklist, INITIAL_CHECKLIST);
  });

  it('recovers to synthetic defaults from malformed stored JSON', () => {
    const storage = memoryStorage();
    storage.setItem('prot_ops_personnel_v2', '{not-json');
    const repository = createDemoRepository(storage);
    assert.deepEqual(repository.loadSnapshot().personnel, INITIAL_PERSONNEL);
  });

  it('fails closed when valid JSON contains malformed personnel records', () => {
    const storage = memoryStorage();
    storage.setItem('prot_ops_personnel_v2', JSON.stringify([{ id: 7, fullName: null }]));
    const repository = createDemoRepository(storage);
    assert.throws(() => repository.loadSnapshot(), /Invalid Demo Guest records in prot_ops_personnel_v2/);
  });

  it('rejects duplicate record identifiers rather than silently updating the wrong record', () => {
    const storage = memoryStorage();
    const duplicate = { ...INITIAL_INCIDENTS[0] };
    storage.setItem('prot_ops_incidents_v2', JSON.stringify([duplicate, duplicate]));
    const repository = createDemoRepository(storage);
    assert.throws(() => repository.loadSnapshot(), /Invalid Demo Guest records in prot_ops_incidents_v2/);
  });

  it('validates required fields in each operational record collection', () => {
    const cases = [
      ['prot_ops_incidents_v2', [{ id: 'incident-1', title: 'incomplete' }]],
      ['prot_ops_cyber_v2', [{ id: 'cyber-1', domain: 'incomplete' }]],
      ['prot_ops_checklist_v2', [{ id: 'checklist-1', task: 'incomplete' }]],
    ] as const;
    for (const [key, records] of cases) {
      const storage = memoryStorage();
      storage.setItem(key, JSON.stringify(records));
      assert.throws(() => createDemoRepository(storage).loadSnapshot(), /Invalid Demo Guest records/);
    }
  });

  it('rejects malformed nested personnel qualifications', () => {
    const storage = memoryStorage();
    const record = { ...INITIAL_PERSONNEL[0], certifications: [{ id: 'qualification-1' }] };
    storage.setItem('prot_ops_personnel_v2', JSON.stringify([record]));
    assert.throws(() => createDemoRepository(storage).loadSnapshot(), /Invalid Demo Guest records/);
  });

  it('does not silently replace data when browser storage reads are blocked', () => {
    const storage: DemoStorage = {
      getItem: () => { throw new Error('SecurityError: storage access denied'); },
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => { throw new Error('SecurityError'); },
    };
    const repository = createDemoRepository(storage);
    assert.throws(() => repository.loadSnapshot(), /Unable to read Demo Guest storage key/);
  });

  it('persists and reloads personnel through the repository contract', async () => {
    const repository = createDemoRepository(memoryStorage());
    const record = { ...INITIAL_PERSONNEL[0], id: 'demo-repository-test' };
    await repository.savePersonnel(record);
    assert.equal((await repository.listPersonnel()).some((item) => item.id === record.id), true);
  });

  it('deletes personnel through the repository contract', async () => {
    const repository = createDemoRepository(memoryStorage());
    const record = { ...INITIAL_PERSONNEL[0], id: 'demo-delete-test' };
    await repository.savePersonnel(record);
    await repository.deletePersonnel(record.id);
    assert.equal((await repository.listPersonnel()).some((item) => item.id === record.id), false);
  });

  it('persists all other operational domains without changing their storage keys', async () => {
    const storage = memoryStorage();
    const repository = createDemoRepository(storage);
    await repository.saveIncident(INITIAL_INCIDENTS[0]);
    await repository.saveCyberHygiene(INITIAL_CYBER_ITEMS[0]);
    await repository.saveChecklist(INITIAL_CHECKLIST[0]);
    assert.ok(storage.getItem('prot_ops_incidents_v2'));
    assert.ok(storage.getItem('prot_ops_cyber_v2'));
    assert.ok(storage.getItem('prot_ops_checklist_v2'));
  });

  it('reset attempts every operational key even when one removal fails', () => {
    const attempted: string[] = [];
    const storage: DemoStorage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: (key) => {
        attempted.push(key);
        if (key === 'prot_ops_incidents_v2') throw new Error('SecurityError');
      },
    };
    const repository = createDemoRepository(storage);
    assert.throws(() => repository.reset(), /incidents/);
    assert.deepEqual(attempted, [
      'prot_ops_personnel_v2',
      'prot_ops_incidents_v2',
      'prot_ops_cyber_v2',
      'prot_ops_checklist_v2',
    ]);
  });

  it('reset removes all four operational demo keys while preserving unrelated preferences', async () => {
    const storage = memoryStorage();
    const repository = createDemoRepository(storage);
    const operationalKeys = [
      'prot_ops_personnel_v2',
      'prot_ops_incidents_v2',
      'prot_ops_cyber_v2',
      'prot_ops_checklist_v2',
    ];
    const preferenceKey = 'prot_ops_theme_v2';

    for (const key of operationalKeys) storage.setItem(key, 'demo-records');
    storage.setItem(preferenceKey, 'midnight-navy');

    repository.reset();

    for (const key of operationalKeys) {
      assert.equal(storage.getItem(key), null, `reset must remove ${key}`);
    }
    assert.equal(storage.getItem(preferenceKey), 'midnight-navy', 'reset must preserve unrelated device preferences');
    assert.deepEqual(repository.loadSnapshot().personnel, INITIAL_PERSONNEL);

    assert.doesNotThrow(() => repository.reset(), 'reset should be safe to repeat');
    assert.equal(storage.getItem(preferenceKey), 'midnight-navy');
  });
});
