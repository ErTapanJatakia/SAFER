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

export interface DemoLockManager {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
}

export interface DemoRepositoryOptions {
  /** Production must supply the browser's origin-wide Web Locks manager. */
  locks?: DemoLockManager;
  requireCrossTabLock?: boolean;
}

export class DemoWriteConflictError extends Error {
  constructor(domain: string) {
    super(`Cross-tab conflict detected for ${domain}. Reload the workspace before editing again.`);
    this.name = 'DemoWriteConflictError';
  }
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

function hasUniqueIds(records: readonly unknown[]): boolean {
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
export function createDemoRepository(storage: DemoStorage, options: DemoRepositoryOptions = {}): DemoRepository & {
  loadSnapshot(): DemoSnapshot;
  reset(): Promise<void>;
} {
  const expectedRaw = new Map<string, string | null>();
  const localQueues = new Map<string, Promise<void>>();
  let baselineLoaded = false;

  const readRaw = (key: string): string | null => {
    try {
      return storage.getItem(key);
    } catch (error) {
      throw new Error(`Unable to read Demo Guest storage key: ${key}`, { cause: error });
    }
  };

  const loadSnapshot = (): DemoSnapshot => {
    if (!baselineLoaded) {
      // The baseline and parsed snapshot must use the exact same bytes; otherwise
      // a cross-tab write between two reads could be mistaken for our own state.
      Object.values(KEYS).forEach((key) => expectedRaw.set(key, readRaw(key)));
      baselineLoaded = true;
    }
    const baselineStorage: DemoStorage = {
      getItem: (key) => expectedRaw.has(key) ? (expectedRaw.get(key) ?? null) : readRaw(key),
      setItem: () => { throw new Error('Snapshot storage is read-only.'); },
      removeItem: () => { throw new Error('Snapshot storage is read-only.'); },
    };
    return Object.freeze({
      personnel: readList(baselineStorage, KEYS.personnel, INITIAL_PERSONNEL, isPersonnelRecord),
      incidents: readList(baselineStorage, KEYS.incidents, INITIAL_INCIDENTS, isIncidentReport),
      cyberHygiene: readList(baselineStorage, KEYS.cyberHygiene, INITIAL_CYBER_ITEMS, isCyberHygieneItem),
      checklist: readList(baselineStorage, KEYS.checklist, INITIAL_CHECKLIST, isChecklistItem),
    });
  };

  const withDomainLock = async <T,>(domain: keyof typeof KEYS, operation: () => Promise<T>): Promise<T> => {
    const key = KEYS[domain];
    const lockName = `safer-demo-guest:${key}`;
    const execute = async (): Promise<T> => {
      const currentRaw = readRaw(key);
      const expected = expectedRaw.get(key);
      if (baselineLoaded && currentRaw !== expected) throw new DemoWriteConflictError(domain);
      return operation();
    };

    if (options.locks) return options.locks.request(lockName, execute);
    if (options.requireCrossTabLock) {
      throw new Error('Cross-tab safe editing is unavailable in this browser because the Web Locks API is not supported. Open SAFER in a supported browser to edit records.');
    }

    // Deterministic in-process serialization for unit tests and non-browser adapters.
    const previous = localQueues.get(key) ?? Promise.resolve();
    const operationPromise = previous.then(execute);
    const tail = operationPromise.then(() => undefined, () => undefined);
    localQueues.set(key, tail);
    try {
      return await operationPromise;
    } finally {
      if (localQueues.get(key) === tail) localQueues.delete(key);
    }
  };

  const writeUnderLock = async <T,>(
    key: string,
    value: readonly T[],
    isValid: (entry: unknown) => entry is T,
  ): Promise<void> => {
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
    expectedRaw.set(key, serialized);
  };

  const save = async <T,>(
    key: string,
    value: readonly T[],
    isValid: (entry: unknown) => entry is T,
    domain: keyof typeof KEYS,
  ): Promise<void> => {
    if (!baselineLoaded) loadSnapshot();
    await withDomainLock(domain, () => writeUnderLock(key, value, isValid));
  };

  const mutate = async <T,>(
    key: string,
    fallback: readonly T[],
    isValid: (entry: unknown) => entry is T,
    domain: keyof typeof KEYS,
    update: (records: T[]) => T[],
  ): Promise<void> => {
    if (!baselineLoaded) loadSnapshot();
    await withDomainLock(domain, async () => {
      // Read and modify only after acquiring the same lock used for the write.
      // This prevents concurrent same-tab operations from building stale arrays.
      const current = readList(storage, key, fallback, isValid);
      const next = update(current);
      await writeUnderLock(key, next, isValid);
    });
  };

  return Object.freeze({
    kind: 'demo' as const,
    loadSnapshot,
    listPersonnel: async () => loadSnapshot().personnel,
    replacePersonnel: async (records: readonly PersonnelRecord[]) => { await save(KEYS.personnel, records, isPersonnelRecord, 'personnel'); },
    savePersonnel: async (record: PersonnelRecord) => mutate(
      KEYS.personnel, INITIAL_PERSONNEL, isPersonnelRecord, 'personnel',
      (current) => {
        const index = current.findIndex((item) => item.id === record.id);
        if (index < 0) current.unshift(record);
        else current[index] = record;
        return current;
      },
    ),
    deletePersonnel: async (recordId: string) => mutate(
      KEYS.personnel, INITIAL_PERSONNEL, isPersonnelRecord, 'personnel',
      (current) => current.filter((item) => item.id !== recordId),
    ),
    listIncidents: async () => loadSnapshot().incidents,
    replaceIncidents: async (records: readonly IncidentReport[]) => { await save(KEYS.incidents, records, isIncidentReport, 'incidents'); },
    saveIncident: async (record: IncidentReport) => mutate(
      KEYS.incidents, INITIAL_INCIDENTS, isIncidentReport, 'incidents',
      (current) => {
        const index = current.findIndex((item) => item.id === record.id);
        if (index < 0) current.unshift(record);
        else current[index] = record;
        return current;
      },
    ),
    listCyberHygiene: async () => loadSnapshot().cyberHygiene,
    replaceCyberHygiene: async (items: readonly CyberHygieneItem[]) => { await save(KEYS.cyberHygiene, items, isCyberHygieneItem, 'cyberHygiene'); },
    saveCyberHygiene: async (item: CyberHygieneItem) => mutate(
      KEYS.cyberHygiene, INITIAL_CYBER_ITEMS, isCyberHygieneItem, 'cyberHygiene',
      (current) => {
        const index = current.findIndex((entry) => entry.id === item.id);
        if (index < 0) current.unshift(item);
        else current[index] = item;
        return current;
      },
    ),
    listChecklist: async () => loadSnapshot().checklist,
    replaceChecklist: async (items: readonly PreDeploymentChecklistItem[]) => { await save(KEYS.checklist, items, isChecklistItem, 'checklist'); },
    saveChecklist: async (item: PreDeploymentChecklistItem) => mutate(
      KEYS.checklist, INITIAL_CHECKLIST, isChecklistItem, 'checklist',
      (current) => {
        const index = current.findIndex((entry) => entry.id === item.id);
        if (index < 0) current.unshift(item);
        else current[index] = item;
        return current;
      },
    ),
    reset: async () => {
      const domains = Object.keys(KEYS) as (keyof typeof KEYS)[];
      const removeAllUnderLocks = async (index: number): Promise<void> => {
        if (index < domains.length) {
          await withDomainLock(domains[index], () => removeAllUnderLocks(index + 1));
          return;
        }
        const failedKeys: string[] = [];
        domains.forEach((domain) => {
          const key = KEYS[domain];
          try {
            storage.removeItem(key);
            // Keep the in-memory baseline aligned with each confirmed removal,
            // even if another key fails. This lets the user safely retry a
            // partial reset without treating our own removals as tab conflicts.
            if (storage.getItem(key) === null) expectedRaw.set(key, null);
            else failedKeys.push(domain);
          } catch {
            failedKeys.push(domain);
          }
        });
        if (failedKeys.length > 0) {
          throw new Error(`Unable to clear all Demo Guest records. Storage removal failed for: ${failedKeys.join(', ')}.`);
        }
      };
      await removeAllUnderLocks(0);
    },
  });
}
