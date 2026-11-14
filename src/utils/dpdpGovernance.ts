import type {
  ConsentLifecycleEvent,
  PrivacyPurposeRecord,
  PrivacyGovernanceSnapshot,
  VersionedPrivacyNotice,
} from '../types/dpdpGovernance.ts';

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function validDate(value: string): boolean {
  return ISO.test(value) && Number.isFinite(Date.parse(value));
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function stringList(value: unknown, maxItems = 50): value is string[] {
  return Array.isArray(value) && value.length <= maxItems &&
    value.every((item) => boundedText(item, 160));
}

export function isPrivacyPurposeRecord(value: unknown): value is PrivacyPurposeRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  const allowed = ['id','purposeCode','purposeDescription','dataCategories','processingOperations',
    'recipientCategories','retentionRule','groundAssessment','groundReviewNote','ownerRole',
    'reviewState','createdAt','updatedAt','nextReviewAt'];
  if (Object.keys(item).some((key) => !allowed.includes(key)) ||
      allowed.filter((key) => key !== 'groundReviewNote' && key !== 'nextReviewAt').some((key) => !(key in item))) return false;
  return typeof item.id === 'string' && ID.test(item.id) &&
    boundedText(item.purposeCode, 60) && boundedText(item.purposeDescription, 500) &&
    stringList(item.dataCategories) && stringList(item.processingOperations) &&
    stringList(item.recipientCategories) && boundedText(item.retentionRule, 500) &&
    ['not-assessed','organisation-reviewed'].includes(String(item.groundAssessment)) &&
    (item.groundReviewNote === undefined || boundedText(item.groundReviewNote, 1000)) &&
    ['organisation-owner','organisation-admin','privacy-reviewer'].includes(String(item.ownerRole)) &&
    ['draft','organisation-reviewed','retired'].includes(String(item.reviewState)) &&
    typeof item.createdAt === 'string' && validDate(item.createdAt) &&
    typeof item.updatedAt === 'string' && validDate(item.updatedAt) &&
    (item.nextReviewAt === undefined || (typeof item.nextReviewAt === 'string' && validDate(item.nextReviewAt)));
}

export function isVersionedPrivacyNotice(value: unknown): value is VersionedPrivacyNotice {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  const allowed = ['id','noticeCode','version','title','content','purposeIds','status','createdAt',
    'approvedAt','supersedesNoticeId','reviewNote'];
  if (Object.keys(item).some((key) => !allowed.includes(key)) ||
      allowed.filter((key) => !['approvedAt','supersedesNoticeId','reviewNote'].includes(key)).some((key) => !(key in item))) return false;
  return typeof item.id === 'string' && ID.test(item.id) &&
    boundedText(item.noticeCode, 60) && Number.isSafeInteger(item.version) && Number(item.version) > 0 &&
    boundedText(item.title, 160) && boundedText(item.content, 12000) &&
    stringList(item.purposeIds) && ['draft','approved-for-demo','superseded'].includes(String(item.status)) &&
    typeof item.createdAt === 'string' && validDate(item.createdAt) &&
    (item.approvedAt === undefined || (typeof item.approvedAt === 'string' && validDate(item.approvedAt))) &&
    (item.supersedesNoticeId === undefined || (typeof item.supersedesNoticeId === 'string' && ID.test(item.supersedesNoticeId))) &&
    (item.reviewNote === undefined || boundedText(item.reviewNote, 1000));
}

export function isConsentLifecycleEvent(value: unknown): value is ConsentLifecycleEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  const allowed = ['id','subjectRef','purposeId','noticeId','noticeVersion','state','recordedAt','source','note'];
  if (Object.keys(item).some((key) => !allowed.includes(key)) ||
      allowed.filter((key) => key !== 'note').some((key) => !(key in item))) return false;
  return typeof item.id === 'string' && ID.test(item.id) &&
    boundedText(item.subjectRef, 120) && typeof item.purposeId === 'string' && ID.test(item.purposeId) &&
    typeof item.noticeId === 'string' && ID.test(item.noticeId) &&
    Number.isSafeInteger(item.noticeVersion) && Number(item.noticeVersion) > 0 &&
    ['granted','withdrawn','expired','superseded'].includes(String(item.state)) &&
    typeof item.recordedAt === 'string' && validDate(item.recordedAt) &&
    item.source === 'synthetic-manual-entry' &&
    (item.note === undefined || boundedText(item.note, 1000));
}

export function validatePrivacyGovernanceSnapshot(value: unknown): value is PrivacyGovernanceSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (item.schemaVersion !== 1 || item.workspaceMode !== 'synthetic-demo' ||
      Object.keys(item).some((key) => !['schemaVersion','workspaceMode','purposes','notices','consentHistory'].includes(key)) ||
      !Array.isArray(item.purposes) || !Array.isArray(item.notices) || !Array.isArray(item.consentHistory)) return false;
  const collections = [item.purposes, item.notices, item.consentHistory];
  if (collections.some((records) => records.length > 500)) return false;
  const validators = [isPrivacyPurposeRecord, isVersionedPrivacyNotice, isConsentLifecycleEvent];
  return collections.every((records, index) => {
    const ids = new Set<string>();
    return records.every((record) => {
      if (!validators[index](record)) return false;
      const id = (record as { id: string }).id;
      if (ids.has(id)) return false;
      ids.add(id);
      return true;
    });
  });
}

/** A purpose can be approved only after an organisation has documented its review. */
export function canMarkPurposeReviewed(record: PrivacyPurposeRecord): boolean {
  return isPrivacyPurposeRecord(record) &&
    record.groundAssessment === 'organisation-reviewed' &&
    Boolean(record.groundReviewNote?.trim()) &&
    record.reviewState === 'draft';
}

/** Approval is a workflow marker for a synthetic example, not legal approval or publication. */
export function canApproveNoticeForDemo(
  notice: VersionedPrivacyNotice,
  purposes: PrivacyPurposeRecord[],
): boolean {
  if (!isVersionedPrivacyNotice(notice) || notice.status !== 'draft' || notice.purposeIds.length === 0) return false;
  const byId = new Map(purposes.map((purpose) => [purpose.id, purpose]));
  return notice.purposeIds.every((id) => {
    const purpose = byId.get(id);
    return Boolean(purpose && isPrivacyPurposeRecord(purpose) &&
      purpose.reviewState === 'organisation-reviewed');
  });
}

/** Consent may be recorded only against a demo-approved notice and reviewed purpose. */
export function canRecordSyntheticConsent(
  purpose: PrivacyPurposeRecord,
  notice: VersionedPrivacyNotice,
  subjectRef: string,
): boolean {
  return isPrivacyPurposeRecord(purpose) && isVersionedPrivacyNotice(notice) &&
    purpose.reviewState === 'organisation-reviewed' &&
    notice.status === 'approved-for-demo' && notice.purposeIds.includes(purpose.id) &&
    boundedText(subjectRef, 120);
}

/** Withdrawal appends a new event; it never edits or deletes the original grant. */
export function createSyntheticWithdrawal(
  priorGrant: ConsentLifecycleEvent,
  id: string,
  recordedAt: string,
  note = 'Synthetic demonstration withdrawal',
): ConsentLifecycleEvent | null {
  if (!isConsentLifecycleEvent(priorGrant) || priorGrant.state !== 'granted' ||
      !ID.test(id) || !validDate(recordedAt) || Date.parse(recordedAt) < Date.parse(priorGrant.recordedAt) ||
      !boundedText(note, 1000)) return null;
  return {
    id, subjectRef: priorGrant.subjectRef, purposeId: priorGrant.purposeId,
    noticeId: priorGrant.noticeId, noticeVersion: priorGrant.noticeVersion,
    state: 'withdrawn', recordedAt, source: 'synthetic-manual-entry', note,
  };
}

/** Current state is derived from the latest event; history remains intact. */
export function getLatestConsentState(
  events: ConsentLifecycleEvent[],
  subjectRef: string,
  purposeId: string,
): ConsentLifecycleEvent | null {
  const matching = events.filter((event) => isConsentLifecycleEvent(event) &&
    event.subjectRef === subjectRef && event.purposeId === purposeId);
  matching.sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
  return matching[0] ?? null;
}
