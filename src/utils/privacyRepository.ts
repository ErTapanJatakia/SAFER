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

function cloneEmptyWorkspace(): PrivacyDemoWorkspace {
  return structuredClone(EMPTY_PRIVACY_DEMO_WORKSPACE);
}

/**
 * Browser-local repository for synthetic demonstration data only.
 * It deliberately has no authenticated-user or operational-record API.
 */
export function createPrivacyDemoRepository(storage: PrivacyStorage) {
  const readRaw = (): string | null => {
    try {
      return storage.getItem(PRIVACY_DEMO_STORAGE_KEY);
    } catch (error) {
      throw new Error('Unable to read SAFER privacy demo storage.', { cause: error });
    }
  };

  const loadWorkspace = (): PrivacyDemoWorkspace => {
    const raw = readRaw();
    if (raw === null) return cloneEmptyWorkspace();
    if (new TextEncoder().encode(raw).byteLength > MAX_SERIALIZED_CHARS) {
      throw new Error('Stored privacy demo workspace exceeds the 1 MB safety limit; no data was replaced.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error('Stored privacy demo data is malformed; no data was replaced.', { cause: error });
    }
    if (!isPrivacyWorkspace(parsed) || !isWithinWorkspaceLimits(parsed)) {
      throw new Error('Stored privacy demo data failed schema or size validation; workspace access is blocked to protect it.');
    }
    return structuredClone(parsed);
  };

  const saveWorkspace = (workspace: PrivacyDemoWorkspace): void => {
    if (!isPrivacyWorkspace(workspace) || !isWithinWorkspaceLimits(workspace)) {
      throw new Error('Refusing to persist invalid or oversized privacy demo data.');
    }
    const serialized = JSON.stringify(workspace);
    if (new TextEncoder().encode(serialized).byteLength > MAX_SERIALIZED_CHARS) {
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
  };

  const clearWorkspace = (): void => {
    try {
      storage.removeItem(PRIVACY_DEMO_STORAGE_KEY);
    } catch (error) {
      throw new Error('Unable to clear SAFER privacy demo storage.', { cause: error });
    }
    if (readRaw() !== null) {
      throw new Error('Unable to verify SAFER privacy demo storage after clearing.');
    }
  };

  return Object.freeze({ loadWorkspace, saveWorkspace, clearWorkspace });
}
