import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDemoRepository, DemoWriteConflictError, type DemoStorage, type DemoLockManager } from './demoRepository.ts';
import type { PersonnelRecord } from '../types/index.ts';
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

  it('reports quota failures without claiming a successful write', async () => {
    const storage: DemoStorage = {
      getItem: () => null,
      setItem: () => { throw new DOMException('Storage quota exceeded', 'QuotaExceededError'); },
      removeItem: () => undefined,
    };
    const repository = createDemoRepository(storage);
    await assert.rejects(
      repository.replacePersonnel(INITIAL_PERSONNEL),
      /Unable to write Demo Guest storage key: prot_ops_personnel_v2/,
    );
  });

  it('verifies persisted bytes after a successful storage write', async () => {
    let stored = '';
    const storage: DemoStorage = {
      getItem: () => stored ? 'different-value' : null,
      setItem: (_key, value) => { stored = value; },
      removeItem: () => undefined,
    };
    const repository = createDemoRepository(storage);
    await assert.rejects(
      repository.replacePersonnel(INITIAL_PERSONNEL),
      /Unable to verify Demo Guest storage key after writing/,
    );
  });

  it('rejects invalid outbound records before writing them', async () => {
    let writes = 0;
    const storage: DemoStorage = {
      getItem: () => null,
      setItem: () => { writes += 1; },
      removeItem: () => undefined,
    };
    const repository = createDemoRepository(storage);
    await assert.rejects(
      repository.replacePersonnel([{ id: 'incomplete' } as PersonnelRecord]),
      /Refusing to persist invalid Demo Guest records/,
    );
    assert.equal(writes, 0, 'invalid records must be rejected before storage is touched');
  });

  it('rejects duplicate identifiers before replacing a collection', async () => {
    let writes = 0;
    const storage: DemoStorage = {
      getItem: () => null,
      setItem: () => { writes += 1; },
      removeItem: () => undefined,
    };
    const duplicate = { ...INITIAL_INCIDENTS[0] };
    const repository = createDemoRepository(storage);
    await assert.rejects(
      repository.replaceIncidents([duplicate, { ...duplicate }]),
      /Refusing to persist invalid Demo Guest records/,
    );
    assert.equal(writes, 0);
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



  it('preserves concurrent same-tab mutations across all four operational collections', async () => {
    const repository = createDemoRepository(memoryStorage());
    const personnelA = { ...INITIAL_PERSONNEL[0], id: 'parallel-person-a', fullName: 'Parallel Person A' };
    const personnelB = { ...INITIAL_PERSONNEL[0], id: 'parallel-person-b', fullName: 'Parallel Person B' };
    const incidentA = { ...INITIAL_INCIDENTS[0], id: 'parallel-incident-a', title: 'Parallel Incident A' };
    const incidentB = { ...INITIAL_INCIDENTS[0], id: 'parallel-incident-b', title: 'Parallel Incident B' };
    const cyberA = { ...INITIAL_CYBER_ITEMS[0], id: 'parallel-cyber-a', title: 'Parallel Cyber A' };
    const cyberB = { ...INITIAL_CYBER_ITEMS[0], id: 'parallel-cyber-b', title: 'Parallel Cyber B' };
    const checklistA = { ...INITIAL_CHECKLIST[0], id: 'parallel-checklist-a', task: 'Parallel Checklist A' };
    const checklistB = { ...INITIAL_CHECKLIST[0], id: 'parallel-checklist-b', task: 'Parallel Checklist B' };

    await Promise.all([
      repository.savePersonnel(personnelA),
      repository.savePersonnel(personnelB),
      repository.saveIncident(incidentA),
      repository.saveIncident(incidentB),
      repository.saveCyberHygiene(cyberA),
      repository.saveCyberHygiene(cyberB),
      repository.saveChecklist(checklistA),
      repository.saveChecklist(checklistB),
    ]);

    const [personnel, incidents, cyber, checklist] = await Promise.all([
      repository.listPersonnel(),
      repository.listIncidents(),
      repository.listCyberHygiene(),
      repository.listChecklist(),
    ]);
    assert.ok(personnel.some((record) => record.id === personnelA.id));
    assert.ok(personnel.some((record) => record.id === personnelB.id));
    assert.ok(incidents.some((record) => record.id === incidentA.id));
    assert.ok(incidents.some((record) => record.id === incidentB.id));
    assert.ok(cyber.some((record) => record.id === cyberA.id));
    assert.ok(cyber.some((record) => record.id === cyberB.id));
    assert.ok(checklist.some((record) => record.id === checklistA.id));
    assert.ok(checklist.some((record) => record.id === checklistB.id));
  });

  it('rejects a stale second-tab write after another repository instance commits', async () => {
    const values = new Map<string, string>();
    const sharedStorage: DemoStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: (key) => { values.delete(key); },
    };
    const lockTails = new Map<string, Promise<void>>();
    const locks: DemoLockManager = {
      async request<T>(name: string, callback: () => Promise<T>): Promise<T> {
        const previous = lockTails.get(name) ?? Promise.resolve();
        let release!: () => void;
        const held = new Promise<void>((resolve) => { release = resolve; });
        lockTails.set(name, previous.then(() => held));
        await previous;
        try { return await callback(); }
        finally { release(); }
      },
    };
    const firstTab = createDemoRepository(sharedStorage, { locks, requireCrossTabLock: true });
    const secondTab = createDemoRepository(sharedStorage, { locks, requireCrossTabLock: true });
    firstTab.loadSnapshot();
    secondTab.loadSnapshot();

    const firstTabRecords = [...firstTab.loadSnapshot().personnel];
    firstTabRecords[0] = { ...firstTabRecords[0], administrativeNotes: 'Updated in first tab' };
    await firstTab.replacePersonnel(firstTabRecords);

    const staleTabRecords = [...secondTab.loadSnapshot().personnel];
    staleTabRecords[0] = { ...staleTabRecords[0], administrativeNotes: 'Stale update from second tab' };
    await assert.rejects(
      secondTab.replacePersonnel(staleTabRecords),
      (error: unknown) => error instanceof DemoWriteConflictError && /Reload the workspace/.test(error.message),
    );
    assert.equal(JSON.parse(values.get('prot_ops_personnel_v2')!)[0].administrativeNotes, 'Updated in first tab');
  });



  it('serializes simultaneous writes from two tabs and rejects exactly one stale snapshot', async () => {
    const values = new Map<string, string>();
    const sharedStorage: DemoStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: (key) => { values.delete(key); },
    };
    const lockTails = new Map<string, Promise<void>>();
    const locks: DemoLockManager = {
      async request<T>(name: string, callback: () => Promise<T>): Promise<T> {
        const previous = lockTails.get(name) ?? Promise.resolve();
        let release!: () => void;
        const held = new Promise<void>((resolve) => { release = resolve; });
        lockTails.set(name, previous.then(() => held));
        await previous;
        try { return await callback(); }
        finally { release(); }
      },
    };
    const firstTab = createDemoRepository(sharedStorage, { locks, requireCrossTabLock: true });
    const secondTab = createDemoRepository(sharedStorage, { locks, requireCrossTabLock: true });
    firstTab.loadSnapshot();
    secondTab.loadSnapshot();

    const firstRecord = { ...INITIAL_PERSONNEL[0], id: 'simultaneous-tab-a', fullName: 'Simultaneous Tab A' };
    const secondRecord = { ...INITIAL_PERSONNEL[0], id: 'simultaneous-tab-b', fullName: 'Simultaneous Tab B' };
    const outcomes = await Promise.allSettled([
      firstTab.savePersonnel(firstRecord),
      secondTab.savePersonnel(secondRecord),
    ]);

    const accepted = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');
    assert.equal(accepted.length, 1, 'only one stale baseline may commit');
    assert.equal(rejected.length, 1, 'the competing stale baseline must be rejected');
    const rejectedOutcome = rejected[0];
    if (!rejectedOutcome || rejectedOutcome.status !== 'rejected') throw new Error('Expected one rejected stale-tab write.');
    assert.ok(rejectedOutcome.reason instanceof DemoWriteConflictError);

    const persisted = await firstTab.listPersonnel();
    const acceptedIds = [firstRecord.id, secondRecord.id].filter((id) => persisted.some((record) => record.id === id));
    assert.equal(acceptedIds.length, 1, 'the persisted roster must contain exactly the accepted tab update');
  });

  it('refuses a reset when another tab has changed any protected collection', async () => {
    const values = new Map<string, string>();
    const sharedStorage: DemoStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: (key) => { values.delete(key); },
    };
    const lockTails = new Map<string, Promise<void>>();
    const locks: DemoLockManager = {
      async request<T>(name: string, callback: () => Promise<T>): Promise<T> {
        const previous = lockTails.get(name) ?? Promise.resolve();
        let release!: () => void;
        const held = new Promise<void>((resolve) => { release = resolve; });
        const tail = previous.then(() => held);
        lockTails.set(name, tail);
        await previous;
        try { return await callback(); }
        finally { release(); }
      },
    };
    const firstTab = createDemoRepository(sharedStorage, { locks, requireCrossTabLock: true });
    const secondTab = createDemoRepository(sharedStorage, { locks, requireCrossTabLock: true });
    firstTab.loadSnapshot();
    secondTab.loadSnapshot();
    const updated = [...firstTab.loadSnapshot().personnel];
    updated[0] = { ...updated[0], administrativeNotes: 'Keep this newer value' };
    await firstTab.replacePersonnel(updated);

    await assert.rejects(secondTab.reset(), /Cross-tab conflict detected for personnel/);
    assert.equal(JSON.parse(values.get('prot_ops_personnel_v2')!)[0].administrativeNotes, 'Keep this newer value');
  });

  it('fails closed for writes when cross-tab locking is required but unavailable', async () => {
    let writes = 0;
    const storage: DemoStorage = {
      getItem: () => null,
      setItem: () => { writes += 1; },
      removeItem: () => undefined,
    };
    const repository = createDemoRepository(storage, { requireCrossTabLock: true });
    repository.loadSnapshot();
    await assert.rejects(
      repository.replacePersonnel(INITIAL_PERSONNEL),
      /Web Locks API is not supported/,
    );
    assert.equal(writes, 0, 'unsupported browsers must not fall back to unsafe cross-tab writes');
  });

  it('reset attempts every operational key even when one removal fails', async () => {
    const attempted: string[] = [];
    const values = new Map([
      ['prot_ops_personnel_v2', 'personnel'],
      ['prot_ops_incidents_v2', 'incidents'],
      ['prot_ops_cyber_v2', 'cyber'],
      ['prot_ops_checklist_v2', 'checklist'],
    ]);
    let blockIncidentRemoval = true;
    const storage: DemoStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: (key) => {
        attempted.push(key);
        if (key === 'prot_ops_incidents_v2' && blockIncidentRemoval) throw new Error('SecurityError');
        values.delete(key);
      },
    };
    const repository = createDemoRepository(storage);
    repository.loadSnapshot();

    await assert.rejects(repository.reset(), /incidents/);
    assert.deepEqual(attempted, [
      'prot_ops_personnel_v2',
      'prot_ops_incidents_v2',
      'prot_ops_cyber_v2',
      'prot_ops_checklist_v2',
    ]);
    assert.equal(storage.getItem('prot_ops_personnel_v2'), null);
    assert.equal(storage.getItem('prot_ops_incidents_v2'), 'incidents');
    assert.equal(storage.getItem('prot_ops_cyber_v2'), null);
    assert.equal(storage.getItem('prot_ops_checklist_v2'), null);

    blockIncidentRemoval = false;
    attempted.length = 0;
    await assert.doesNotReject(repository.reset(), 'a partial reset must be safely retryable in the same tab');
    assert.deepEqual(attempted, [
      'prot_ops_personnel_v2',
      'prot_ops_incidents_v2',
      'prot_ops_cyber_v2',
      'prot_ops_checklist_v2',
    ]);
    for (const key of [
      'prot_ops_personnel_v2',
      'prot_ops_incidents_v2',
      'prot_ops_cyber_v2',
      'prot_ops_checklist_v2',
    ]) assert.equal(storage.getItem(key), null);
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

    await repository.reset();

    for (const key of operationalKeys) {
      assert.equal(storage.getItem(key), null, `reset must remove ${key}`);
    }
    assert.equal(storage.getItem(preferenceKey), 'midnight-navy', 'reset must preserve unrelated device preferences');
    assert.deepEqual(repository.loadSnapshot().personnel, INITIAL_PERSONNEL);

    await assert.doesNotReject(repository.reset(), 'reset should be safe to repeat');
    assert.equal(storage.getItem(preferenceKey), 'midnight-navy');
  });
});
