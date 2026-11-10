import type {
  CyberHygieneItem,
  IncidentReport,
  PersonnelRecord,
  PreDeploymentChecklistItem,
} from '../types/index.ts';
import {
  INITIAL_PERSONNEL,
  INITIAL_INCIDENTS,
  INITIAL_CYBER_ITEMS,
  INITIAL_CHECKLIST,
} from '../data/mockData.ts';
import type { DemoRepository } from './dataBoundary.ts';

export interface DemoSnapshot {
  readonly personnel: readonly PersonnelRecord[];
  readonly incidents: readonly IncidentReport[];
  readonly cyberHygiene: readonly CyberHygieneItem[];
  readonly checklist: readonly PreDeploymentChecklistItem[];
}

export interface DemoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEYS = Object.freeze({
  personnel: 'prot_ops_personnel_v2',
  incidents: 'prot_ops_incidents_v2',
  cyberHygiene: 'prot_ops_cyber_v2',
  checklist: 'prot_ops_checklist_v2',
});

function readList<T>(storage: DemoStorage, key: string, fallback: readonly T[]): T[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [...fallback];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [...fallback];
  } catch {
    return [...fallback];
  }
}

/** Browser-local repository for synthetic Demo Guest records only. */
export function createDemoRepository(storage: DemoStorage): DemoRepository & {
  loadSnapshot(): DemoSnapshot;
  reset(): void;
} {
  const loadSnapshot = (): DemoSnapshot => Object.freeze({
    personnel: readList(storage, KEYS.personnel, INITIAL_PERSONNEL),
    incidents: readList(storage, KEYS.incidents, INITIAL_INCIDENTS),
    cyberHygiene: readList(storage, KEYS.cyberHygiene, INITIAL_CYBER_ITEMS),
    checklist: readList(storage, KEYS.checklist, INITIAL_CHECKLIST),
  });

  const save = <T,>(key: string, value: T): void => {
    storage.setItem(key, JSON.stringify(value));
  };

  return Object.freeze({
    kind: 'demo' as const,
    loadSnapshot,
    listPersonnel: async () => loadSnapshot().personnel,
    savePersonnel: async (record: PersonnelRecord) => {
      const current = [...loadSnapshot().personnel];
      const index = current.findIndex((item) => item.id === record.id);
      if (index < 0) current.unshift(record);
      else current[index] = record;
      save(KEYS.personnel, current);
    },
    deletePersonnel: async (recordId: string) => {
      save(KEYS.personnel, loadSnapshot().personnel.filter((item) => item.id !== recordId));
    },
    listIncidents: async () => loadSnapshot().incidents,
    saveIncident: async (record: IncidentReport) => {
      const current = [...loadSnapshot().incidents];
      const index = current.findIndex((item) => item.id === record.id);
      if (index < 0) current.unshift(record);
      else current[index] = record;
      save(KEYS.incidents, current);
    },
    listCyberHygiene: async () => loadSnapshot().cyberHygiene,
    saveCyberHygiene: async (item: CyberHygieneItem) => {
      const current = [...loadSnapshot().cyberHygiene];
      const index = current.findIndex((entry) => entry.id === item.id);
      if (index < 0) current.unshift(item);
      else current[index] = item;
      save(KEYS.cyberHygiene, current);
    },
    listChecklist: async () => loadSnapshot().checklist,
    saveChecklist: async (item: PreDeploymentChecklistItem) => {
      const current = [...loadSnapshot().checklist];
      const index = current.findIndex((entry) => entry.id === item.id);
      if (index < 0) current.unshift(item);
      else current[index] = item;
      save(KEYS.checklist, current);
    },
    reset: () => {
      Object.values(KEYS).forEach((key) => storage.removeItem(key));
    },
  });
}
