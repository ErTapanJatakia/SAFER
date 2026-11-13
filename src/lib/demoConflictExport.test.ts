import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { serializeDemoConflictSnapshot } from './demoConflictExport.ts';
import {
  INITIAL_PERSONNEL,
  INITIAL_INCIDENTS,
  INITIAL_CYBER_ITEMS,
  INITIAL_CHECKLIST,
} from '../data/mockData.ts';

describe('Demo Guest conflict recovery export', () => {
  it('exports all four confirmed collections with explicit recovery metadata', () => {
    const records = {
      personnel: INITIAL_PERSONNEL,
      incidents: INITIAL_INCIDENTS,
      cyberHygiene: INITIAL_CYBER_ITEMS,
      checklist: INITIAL_CHECKLIST,
    };
    const serialized = serializeDemoConflictSnapshot(records, '2026-11-13T00:00:00.000Z');
    const parsed = JSON.parse(serialized);

    assert.equal(parsed.format, 'SAFER Demo Guest conflict snapshot');
    assert.equal(parsed.version, 1);
    assert.equal(parsed.exportedAt, '2026-11-13T00:00:00.000Z');
    assert.match(parsed.purpose, /before reloading after a cross-tab conflict/);
    assert.match(parsed.warning, /not automatically imported or merged/);
    assert.match(parsed.warning, /Unsubmitted form fields are not included/);
    assert.match(parsed.warning, /unencrypted/);
    assert.match(parsed.warning, /sensitive record fields/);
    assert.deepEqual(parsed.records, records);
  });

  it('does not mutate the source snapshot while preparing the export', () => {
    const records = {
      personnel: [...INITIAL_PERSONNEL],
      incidents: [...INITIAL_INCIDENTS],
      cyberHygiene: [...INITIAL_CYBER_ITEMS],
      checklist: [...INITIAL_CHECKLIST],
    };
    const before = JSON.stringify(records);
    serializeDemoConflictSnapshot(records, '2026-11-13T00:00:00.000Z');
    assert.equal(JSON.stringify(records), before);
  });
});
