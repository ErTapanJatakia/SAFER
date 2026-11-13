import {
  EMPTY_PRIVACY_DEMO_WORKSPACE,
  type PrivacyDemoWorkspace,
} from '../types/privacy.ts';

export interface PrivacyStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const PRIVACY_DEMO_STORAGE_KEY = 'safer_privacy_demo_workspace_v1';

const MAX_SERIALIZED_BYTES = 1_000_000;
const MAX_RECORDS_PER_COLLECTION = 500;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);
const hasUniqueIds = (records: unknown[]): boolean => {
  const ids = new Set<string>();
  for (const record of records) {
    if (!isObject(record) || !isString(record.id) || !record.id.trim() || ids.has(record.id)) return false;
    ids.add(record.id);
  }
  return true;
};

function hasFields(record: unknown, fields: string[]): record is Record<string, unknown> {
  return isObject(record) && fields.every((field) => isString(record[field]));
}

function isPrivacyWorkspace(value: unknown): value is PrivacyDemoWorkspace {
  if (!isObject(value) || value.schemaVersion !== 1 || value.workspaceMode !== 'synthetic-demo') return false;

  const collections: Array<[unknown, string[], (record: unknown) => boolean]> = [
    [value.noticeDrafts, ['id', 'title', 'content', 'versionLabel', 'updatedAt'],
      (record) => hasFields(record, ['id', 'title', 'content', 'versionLabel', 'updatedAt'])],
    [value.processingActivities, ['id', 'purpose', 'retentionDescription'],
      (record) => hasFields(record, ['id', 'purpose', 'retentionDescription']) &&
        isStringArray(record.dataCategories) && isStringArray(record.recipients) &&
        ['not-assessed', 'organization-reviewed'].includes(String(record.legalAssessment))],
    [value.consentEvents, ['id', 'subjectRef', 'purposeRef', 'recordedAt'],
      (record) => hasFields(record, ['id', 'subjectRef', 'purposeRef', 'recordedAt']) &&
        ['granted', 'withdrawn'].includes(String(record.event)) &&
        (record.note === undefined || isString(record.note))],
    [value.rightsRequests, ['id', 'subjectRef', 'description', 'submittedAt', 'updatedAt'],
      (record) => hasFields(record, ['id', 'subjectRef', 'description', 'submittedAt', 'updatedAt']) &&
        ['access', 'correction', 'erasure', 'other'].includes(String(record.requestKind)) &&
        ['submitted', 'under_review', 'completed', 'rejected'].includes(String(record.status)) &&
        (record.resolutionNote === undefined || isString(record.resolutionNote))],
    [value.grievances, ['id', 'subjectRef', 'category', 'description', 'submittedAt', 'updatedAt'],
      (record) => hasFields(record, ['id', 'subjectRef', 'category', 'description', 'submittedAt', 'updatedAt']) &&
        ['open', 'investigating', 'resolved', 'closed'].includes(String(record.status)) &&
        (record.responseNote === undefined || isString(record.responseNote))],
    [value.retentionReviews, ['id', 'dataCategory', 'reviewNote'],
      (record) => hasFields(record, ['id', 'dataCategory', 'reviewNote']) &&
        ['pending', 'reviewed', 'deferred'].includes(String(record.status)) &&
        (record.reviewedAt === undefined || isString(record.reviewedAt))],
  ];

  return collections.every(([collection, _fields, validate]) =>
    Array.isArray(collection) && collection.every(validate) && hasUniqueIds(collection));
}


function boundedString(value: unknown, max: number): value is string {
  return isString(value) && value.length <= max;
}

function boundedStringArray(value: unknown, maxItems: number, maxLength: number): value is string[] {
  return Array.isArray(value) && value.length <= maxItems &&
    value.every((item) => boundedString(item, maxLength));
}

function isWithinWorkspaceLimits(value: unknown): boolean {
  if (!isObject(value)) return false;
  const limits: Array<[unknown, (record: Record<string, unknown>) => boolean]> = [
    [value.noticeDrafts, (r) => boundedString(r.id, 100) && boundedString(r.title, 120) &&
      boundedString(r.content, 8000) && boundedString(r.versionLabel, 40) && boundedString(r.updatedAt, 64)],
    [value.processingActivities, (r) => boundedString(r.id, 100) && boundedString(r.purpose, 240) &&
      boundedStringArray(r.dataCategories, 50, 160) && boundedStringArray(r.recipients, 50, 160) &&
      boundedString(r.retentionDescription, 1000)],
    [value.consentEvents, (r) => boundedString(r.id, 100) && boundedString(r.subjectRef, 120) &&
      boundedString(r.purposeRef, 120) && boundedString(r.recordedAt, 64) &&
      (r.note === undefined || boundedString(r.note, 500))],
    [value.rightsRequests, (r) => boundedString(r.id, 100) && boundedString(r.subjectRef, 120) &&
      boundedString(r.description, 3000) && boundedString(r.submittedAt, 64) &&
      boundedString(r.updatedAt, 64) && (r.resolutionNote === undefined || boundedString(r.resolutionNote, 2000))],
    [value.grievances, (r) => boundedString(r.id, 100) && boundedString(r.subjectRef, 120) &&
      boundedString(r.category, 100) && boundedString(r.description, 3000) &&
      boundedString(r.submittedAt, 64) && boundedString(r.updatedAt, 64) &&
      (r.responseNote === undefined || boundedString(r.responseNote, 2000))],
    [value.retentionReviews, (r) => boundedString(r.id, 100) && boundedString(r.dataCategory, 120) &&
      boundedString(r.reviewNote, 3000) && (r.reviewedAt === undefined || boundedString(r.reviewedAt, 64))],
  ];
  return limits.every(([collection, validate]) =>
    Array.isArray(collection) && collection.length <= MAX_RECORDS_PER_COLLECTION &&
    collection.every((record) => isObject(record) && validate(record)));
}

function cloneEmptyWorkspace(): PrivacyDemoWorkspace {
  return structuredClone(EMPTY_PRIVACY_DEMO_WORKSPACE);
}

/**
 * Browser-local repository for synthetic demonstration data only.
 * It deliberately has no authenticated-user or operational-record API.
 */
export function createPrivacyDemoRepository(storage: PrivacyStorage) {
  // Track exact bytes last loaded or verified to reject stale cross-tab writes.
  let expectedRaw: string | null | undefined;

  const readRaw = (): string | null => {
    try {
      return storage.getItem(PRIVACY_DEMO_STORAGE_KEY);
    } catch (error) {
      throw new Error('Unable to read SAFER privacy demo storage.', { cause: error });
    }
  };

  const loadWorkspace = (): PrivacyDemoWorkspace => {
    const raw = readRaw();
    expectedRaw = raw;
    if (raw === null) return cloneEmptyWorkspace();
    if (new TextEncoder().encode(raw).byteLength > MAX_SERIALIZED_BYTES) {
      throw new Error('Stored privacy demo workspace exceeds the 1 MB safety limit; no data was replaced.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error('Stored privacy demo data is malformed; no data was replaced.', { cause: error });
    }
    if (!isPrivacyWorkspace(parsed) || !isWithinWorkspaceLimits(parsed)) {
      throw new Error('Stored privacy demo data failed schema validation or size limits; workspace access is blocked to protect it.');
    }
    return structuredClone(parsed);
  };

  const saveWorkspace = (workspace: PrivacyDemoWorkspace): void => {
    if (!isPrivacyWorkspace(workspace) || !isWithinWorkspaceLimits(workspace)) {
      throw new Error('Refusing to persist invalid privacy demo data (invalid or oversized).');
    }
    const currentRaw = readRaw();
    if (expectedRaw === undefined) expectedRaw = currentRaw;
    if (currentRaw !== expectedRaw) {
      throw new Error('Privacy demo workspace changed in another tab or session. Reload the workspace before making further changes.');
    }
    const serialized = JSON.stringify(workspace);
    if (new TextEncoder().encode(serialized).byteLength > MAX_SERIALIZED_BYTES) {
      throw new Error('Privacy demo workspace exceeds the 1 MB storage safety limit.');
    }
    try {
      storage.setItem(PRIVACY_DEMO_STORAGE_KEY, serialized);
    } catch (error) {
      throw new Error('Unable to write SAFER privacy demo storage.', { cause: error });
    }
    if (readRaw() !== serialized) {
      throw new Error('Unable to verify SAFER privacy demo storage after writing.');
    }
    expectedRaw = serialized;
  };

  const clearWorkspace = (): void => {
    const currentRaw = readRaw();
    if (expectedRaw === undefined) expectedRaw = currentRaw;
    if (currentRaw !== expectedRaw) {
      throw new Error('Privacy demo workspace changed in another tab or session. Reload the workspace before clearing it.');
    }
    try {
      storage.removeItem(PRIVACY_DEMO_STORAGE_KEY);
    } catch (error) {
      throw new Error('Unable to clear SAFER privacy demo storage.', { cause: error });
    }
    if (readRaw() !== null) {
      throw new Error('Unable to verify SAFER privacy demo storage after clearing.');
    }
    expectedRaw = null;
  };

  return Object.freeze({ loadWorkspace, saveWorkspace, clearWorkspace });
}
