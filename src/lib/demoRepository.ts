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

type RecordShape = (value: unknown) => value is Record<string, unknown>;

const isObject: RecordShape = (value): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const hasStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');
const hasString = (record: Record<string, unknown>, key: string): boolean =>
  typeof record[key] === 'string' && (record[key] as string).trim().length > 0;
const hasNullableString = (record: Record<string, unknown>, key: string): boolean =>
  record[key] === null || typeof record[key] === 'string';
const hasNumber = (record: Record<string, unknown>, key: string): boolean =>
  typeof record[key] === 'number' && Number.isFinite(record[key]);
const hasBoolean = (record: Record<string, unknown>, key: string): boolean =>
  typeof record[key] === 'boolean';

function hasUniqueIds(records: unknown[]): boolean {
  const ids = new Set<string>();
  for (const value of records) {
    if (!isObject(value) || !hasString(value, 'id') || ids.has(value.id as string)) return false;
    ids.add(value.id as string);
  }
  return true;
}

function isQualification(value: unknown): boolean {
  if (!isObject(value)) return false;
  return hasString(value, 'id') && hasString(value, 'name') &&
    hasString(value, 'completionDate') && hasNullableString(value, 'expiryDate') &&
    hasString(value, 'verificationStatus') && hasString(value, 'issuer') &&
    hasString(value, 'verificationId');
}

function isPersonnelRecord(value: unknown): value is PersonnelRecord {
  if (!isObject(value)) return false;
  const requiredStrings = [
    'id', 'pmcEmployeeId', 'badgeId', 'fullName', 'displayName', 'callSign',
    'role', 'specialisation', 'assignmentSector', 'contactEmail',
    'verificationStatus', 'administrativeNotes', 'notes',
  ];
  if (!requiredStrings.every((key) => hasString(value, key))) return false;
  if (!hasStrings(value.outstandingRequirements) ||
      !Array.isArray(value.certifications) || !value.certifications.every(isQualification) ||
      !hasNullableString(value, 'lastSupervisorReviewDate') ||
      !hasNullableString(value, 'reviewedBy') ||
      !hasNumber(value, 'tasksCompleted') || !hasNumber(value, 'tasksOutstanding') ||
      !hasBoolean(value, 'requiresReview')) return false;
  if (value.workExperience !== undefined && (!Array.isArray(value.workExperience) ||
      !value.workExperience.every((entry) => isObject(entry) &&
        hasString(entry, 'id') && hasString(entry, 'employerName') &&
        hasString(entry, 'startDate') && typeof entry.endDate === 'string' &&
        hasBoolean(entry, 'currentlyWorkingHere') && hasString(entry, 'workDescription')))) return false;
  return true;
}

function isIncidentReport(value: unknown): value is IncidentReport {
  if (!isObject(value)) return false;
  return ['id', 'referenceNumber', 'title', 'incidentType', 'dateReported',
    'reportedBy', 'location', 'summary', 'status', 'priority']
    .every((key) => hasString(value, key));
}

function isCyberHygieneItem(value: unknown): value is CyberHygieneItem {
  if (!isObject(value)) return false;
  return ['id', 'domain', 'title', 'recommendation', 'plainEnglishExplanation',
    'status', 'itemType', 'findingNotes', 'lastChecked']
    .every((key) => hasString(value, key)) && hasNullableString(value, 'verifiedBy');
}

function isChecklistItem(value: unknown): value is PreDeploymentChecklistItem {
  if (!isObject(value)) return false;
  return ['id', 'category', 'task', 'description', 'status', 'priority']
    .every((key) => hasString(value, key)) && hasBoolean(value, 'requiresHumanReview');
}

function readList<T>(storage: DemoStorage, key: string, fallback: readonly T[], isValid: (value: unknown) => value is T): T[] {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch (error) {
    throw new Error(`Unable to read Demo Guest storage key: ${key}`, { cause: error });
  }
  if (!raw) return [...fallback];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [...fallback];
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid Demo Guest record collection: ${key} must contain an array.`);
  }
  if (!parsed.every(isValid) || !hasUniqueIds(parsed)) {
    throw new Error(`Invalid Demo Guest records in ${key}. The workspace is locked to protect stored data; reset only if you intend to discard these records.`);
  }
  return parsed;
}

/** Browser-local repository for synthetic Demo Guest records only. */
export function createDemoRepository(storage: DemoStorage): DemoRepository & {
  loadSnapshot(): DemoSnapshot;
  reset(): void;
} {
  const loadSnapshot = (): DemoSnapshot => Object.freeze({
    personnel: readList(storage, KEYS.personnel, INITIAL_PERSONNEL, isPersonnelRecord),
    incidents: readList(storage, KEYS.incidents, INITIAL_INCIDENTS, isIncidentReport),
    cyberHygiene: readList(storage, KEYS.cyberHygiene, INITIAL_CYBER_ITEMS, isCyberHygieneItem),
    checklist: readList(storage, KEYS.checklist, INITIAL_CHECKLIST, isChecklistItem),
  });

  const save = <T,>(
    key: string,
    value: readonly T[],
    isValid: (entry: unknown) => entry is T,
  ): void => {
    if (!Array.isArray(value) || !value.every(isValid) || !hasUniqueIds(value)) {
      throw new Error(`Refusing to persist invalid Demo Guest records for ${key}.`);
    }

    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch (error) {
      throw new Error(`Unable to serialize Demo Guest records for ${key}.`, { cause: error });
    }

    try {
      storage.setItem(key, serialized);
    } catch (error) {
      throw new Error(`Unable to write Demo Guest storage key: ${key}. Check browser storage availability and available space.`, { cause: error });
    }

    try {
      if (storage.getItem(key) !== serialized) {
        throw new Error('Stored value did not match the submitted value.');
      }
    } catch (error) {
      throw new Error(`Unable to verify Demo Guest storage key after writing: ${key}.`, { cause: error });
    }
  };

  return Object.freeze({
    kind: 'demo' as const,
    loadSnapshot,
    listPersonnel: async () => loadSnapshot().personnel,
    replacePersonnel: async (records: readonly PersonnelRecord[]) => { save(KEYS.personnel, records, isPersonnelRecord); },
    savePersonnel: async (record: PersonnelRecord) => {
      const current = [...loadSnapshot().personnel];
      const index = current.findIndex((item) => item.id === record.id);
      if (index < 0) current.unshift(record);
      else current[index] = record;
      save(KEYS.personnel, current, isPersonnelRecord);
    },
    deletePersonnel: async (recordId: string) => {
      save(KEYS.personnel, loadSnapshot().personnel.filter((item) => item.id !== recordId));
    },
    listIncidents: async () => loadSnapshot().incidents,
    replaceIncidents: async (records: readonly IncidentReport[]) => { save(KEYS.incidents, records, isIncidentReport); },
    saveIncident: async (record: IncidentReport) => {
      const current = [...loadSnapshot().incidents];
      const index = current.findIndex((item) => item.id === record.id);
      if (index < 0) current.unshift(record);
      else current[index] = record;
      save(KEYS.incidents, current, isIncidentReport);
    },
    listCyberHygiene: async () => loadSnapshot().cyberHygiene,
    replaceCyberHygiene: async (items: readonly CyberHygieneItem[]) => { save(KEYS.cyberHygiene, items, isCyberHygieneItem); },
    saveCyberHygiene: async (item: CyberHygieneItem) => {
      const current = [...loadSnapshot().cyberHygiene];
      const index = current.findIndex((entry) => entry.id === item.id);
      if (index < 0) current.unshift(item);
      else current[index] = item;
      save(KEYS.cyberHygiene, current, isCyberHygieneItem);
    },
    listChecklist: async () => loadSnapshot().checklist,
    replaceChecklist: async (items: readonly PreDeploymentChecklistItem[]) => { save(KEYS.checklist, items, isChecklistItem); },
    saveChecklist: async (item: PreDeploymentChecklistItem) => {
      const current = [...loadSnapshot().checklist];
      const index = current.findIndex((entry) => entry.id === item.id);
      if (index < 0) current.unshift(item);
      else current[index] = item;
      save(KEYS.checklist, current, isChecklistItem);
    },
    reset: () => {
      const failedKeys: string[] = [];
      Object.entries(KEYS).forEach(([domain, key]) => {
        try {
          storage.removeItem(key);
        } catch {
          failedKeys.push(domain);
        }
      });
      if (failedKeys.length > 0) {
        throw new Error(`Unable to clear all Demo Guest records. Storage removal failed for: ${failedKeys.join(', ')}.`);
      }
    },
  });
}
