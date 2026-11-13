import type { DemoSnapshot } from './demoRepository.ts';

export interface DemoConflictSnapshot {
  readonly format: 'SAFER Demo Guest conflict snapshot';
  readonly version: 1;
  readonly exportedAt: string;
  readonly purpose: string;
  readonly warning: string;
  readonly records: DemoSnapshot;
}

/**
 * Serializes this tab's last confirmed operational records for manual recovery.
 * This is deliberately an export-only format; it is not an import or merge API.
 */
export function serializeDemoConflictSnapshot(
  records: DemoSnapshot,
  exportedAt: string = new Date().toISOString(),
): string {
  const snapshot: DemoConflictSnapshot = {
    format: 'SAFER Demo Guest conflict snapshot',
    version: 1,
    exportedAt,
    purpose: 'Preserve the records confirmed in this browser tab before reloading after a cross-tab conflict.',
    warning: 'Recovery export only. Review and reconcile manually; this file is not automatically imported or merged. Unsubmitted form fields are not included. This JSON is unencrypted and may contain sensitive record fields; store it securely.',
    records: {
      personnel: [...records.personnel],
      incidents: [...records.incidents],
      cyberHygiene: [...records.cyberHygiene],
      checklist: [...records.checklist],
    },
  };
  return JSON.stringify(snapshot, null, 2);
}
