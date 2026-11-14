import type {
  ConsentLifecycleEvent,
  PrivacyPurposeRecord,
  PrivacyGovernanceSnapshot,
  VersionedPrivacyNotice,
  PrincipalRightsCase,
  RetentionDispositionRecord,
  PersonalDataBreachCase,
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
  const keys = ['schemaVersion','workspaceMode','purposes','notices','consentHistory','rightsCases',
    'retentionSchedules','retentionDispositions','breachCases','assignments','assuranceEvidence'];
  if (item.schemaVersion !== 1 || item.workspaceMode !== 'synthetic-demo' ||
      Object.keys(item).some((key) => !keys.includes(key)) || keys.some((key) => !(key in item))) return false;
  const validators: Array<(record: unknown) => boolean> = [
    isPrivacyPurposeRecord, isVersionedPrivacyNotice, isConsentLifecycleEvent,
    isPrincipalRightsCase, isRetentionSchedule, isRetentionDispositionRecord,
    isPersonalDataBreachCase, isAccountabilityAssignment, isAssuranceEvidenceRecord,
  ];
  const collections = keys.slice(2).map((key) => item[key]);
  return collections.every((records, index) => {
    if (!Array.isArray(records) || records.length > 500) return false;
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


function hasExactKeys(item: Record<string, unknown>, required: string[], optional: string[] = []): boolean {
  const allowed = [...required, ...optional];
  return required.every((key) => Object.prototype.hasOwnProperty.call(item, key)) &&
    Object.keys(item).every((key) => allowed.includes(key));
}
function safeRole(value: unknown): boolean {
  return ['organisation-owner','organisation-admin','privacy-reviewer'].includes(String(value));
}
function safeRefs(value: unknown): boolean { return stringList(value, 50); }

export function isPrincipalRightsCase(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const x = value as Record<string, unknown>;
  return hasExactKeys(x, ['id','subjectRef','requestKind','description','identityCheck','status','receivedAt','updatedAt','assignedRole','evidenceRefs','syntheticOnly'],
    ['scopeNote','decision','decisionReason']) &&
    typeof x.id === 'string' && ID.test(x.id) && boundedText(x.subjectRef,120) &&
    ['access','correction','completion','erasure','grievance','other'].includes(String(x.requestKind)) &&
    boundedText(x.description,3000) &&
    ['not-started','pending','synthetic-reference-matched','not-verified'].includes(String(x.identityCheck)) &&
    ['received','identity-check','in-progress','awaiting-information','completed','declined','closed'].includes(String(x.status)) &&
    typeof x.receivedAt === 'string' && validDate(x.receivedAt) &&
    typeof x.updatedAt === 'string' && validDate(x.updatedAt) && safeRole(x.assignedRole) &&
    safeRefs(x.evidenceRefs) && x.syntheticOnly === true &&
    (x.scopeNote === undefined || boundedText(x.scopeNote,1500)) &&
    (x.decision === undefined || ['fulfilled','partially-fulfilled','declined','not-applicable'].includes(String(x.decision))) &&
    (x.decisionReason === undefined || boundedText(x.decisionReason,2000));
}
export function isRetentionSchedule(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const x = value as Record<string, unknown>;
  return hasExactKeys(x,['id','dataCategory','purposeId','retentionRule','reviewAt','ownerRole','status'],['reviewNote']) &&
    typeof x.id === 'string' && ID.test(x.id) && boundedText(x.dataCategory,160) &&
    typeof x.purposeId === 'string' && ID.test(x.purposeId) && boundedText(x.retentionRule,500) &&
    typeof x.reviewAt === 'string' && validDate(x.reviewAt) && safeRole(x.ownerRole) &&
    ['draft','reviewed','retired'].includes(String(x.status)) &&
    (x.reviewNote === undefined || boundedText(x.reviewNote,1500));
}
export function isRetentionDispositionRecord(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const x = value as Record<string, unknown>;
  return hasExactKeys(x,['id','scheduleId','disposition','requestedByRole','decisionNote','recordedAt','executed'],['approvedByRole','evidenceRef']) &&
    typeof x.id === 'string' && ID.test(x.id) && typeof x.scheduleId === 'string' && ID.test(x.scheduleId) &&
    ['retain','restrict-review','delete-after-approval','defer'].includes(String(x.disposition)) &&
    safeRole(x.requestedByRole) && boundedText(x.decisionNote,1500) &&
    typeof x.recordedAt === 'string' && validDate(x.recordedAt) && x.executed === false &&
    (x.approvedByRole === undefined || safeRole(x.approvedByRole)) &&
    (x.evidenceRef === undefined || boundedText(x.evidenceRef,160));
}
export function isPersonalDataBreachCase(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const x = value as Record<string, unknown>;
  return hasExactKeys(x,['id','reference','discoveredAt','recordedAt','summary','affectedDataCategories','affectedSystems',
    'severity','status','containmentActions','remediationActions','notificationAssessment','ownerRole','evidenceRefs','syntheticOnly'],
    ['notificationDecisionNote']) &&
    typeof x.id === 'string' && ID.test(x.id) && boundedText(x.reference,80) &&
    typeof x.discoveredAt === 'string' && validDate(x.discoveredAt) &&
    typeof x.recordedAt === 'string' && validDate(x.recordedAt) && boundedText(x.summary,3000) &&
    stringList(x.affectedDataCategories) && stringList(x.affectedSystems) &&
    ['unassessed','low','moderate','high','critical'].includes(String(x.severity)) &&
    ['reported','assessing','contained','remediating','closed'].includes(String(x.status)) &&
    stringList(x.containmentActions) && stringList(x.remediationActions) &&
    ['not-assessed','under-review','organisation-decided'].includes(String(x.notificationAssessment)) &&
    (x.notificationDecisionNote === undefined || boundedText(x.notificationDecisionNote,2000)) &&
    safeRole(x.ownerRole) && safeRefs(x.evidenceRefs) && x.syntheticOnly === true;
}
export function isAccountabilityAssignment(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const x = value as Record<string, unknown>;
  return hasExactKeys(x,['id','responsibility','assignedRole','status'],['purposeId','reviewAt','note']) &&
    typeof x.id === 'string' && ID.test(x.id) && boundedText(x.responsibility,500) &&
    safeRole(x.assignedRole) && ['assigned','reviewed','retired'].includes(String(x.status)) &&
    (x.purposeId === undefined || (typeof x.purposeId === 'string' && ID.test(x.purposeId))) &&
    (x.reviewAt === undefined || (typeof x.reviewAt === 'string' && validDate(x.reviewAt))) &&
    (x.note === undefined || boundedText(x.note,1500));
}
export function isAssuranceEvidenceRecord(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const x = value as Record<string, unknown>;
  return hasExactKeys(x,['id','controlCode','controlDescription','evidenceRef','evidenceType','reviewedByRole','reviewedAt','limitations']) &&
    typeof x.id === 'string' && ID.test(x.id) && boundedText(x.controlCode,80) &&
    boundedText(x.controlDescription,500) && boundedText(x.evidenceRef,200) &&
    ['document-reference','test-reference','review-note'].includes(String(x.evidenceType)) &&
    safeRole(x.reviewedByRole) && typeof x.reviewedAt === 'string' && validDate(x.reviewedAt) &&
    boundedText(x.limitations,1000);
}

export function canAdvanceRightsCase(
  current: PrincipalRightsCase, next: PrincipalRightsCase['status'],
  identityCheck: PrincipalRightsCase['identityCheck'],
): boolean {
  if (!isPrincipalRightsCase(current) || current.status === 'completed' || current.status === 'declined' || current.status === 'closed') return false;
  if (next === 'in-progress' && identityCheck !== 'synthetic-reference-matched') return false;
  if ((next === 'completed' || next === 'declined') && identityCheck !== 'synthetic-reference-matched') return false;
  const allowed: Record<PrincipalRightsCase['status'], PrincipalRightsCase['status'][]> = {
    received:['identity-check','in-progress','closed'], 'identity-check':['in-progress','awaiting-information','declined','closed'],
    'in-progress':['awaiting-information','completed','declined','closed'],
    'awaiting-information':['identity-check','in-progress','closed'],
    completed:[], declined:[], closed:[],
  };
  return allowed[current.status].includes(next);
}
export function canApproveRetentionDisposition(
  record: RetentionDispositionRecord,
): boolean {
  return isRetentionDispositionRecord(record) && record.executed === false &&
    record.approvedByRole !== undefined &&
    record.requestedByRole !== record.approvedByRole;
}
export function canCloseBreachCase(record: PersonalDataBreachCase): boolean {
  return isPersonalDataBreachCase(record) &&
    ['contained','remediating'].includes(record.status) &&
    record.containmentActions.length > 0 && record.remediationActions.length > 0 &&
    record.notificationAssessment !== 'not-assessed';
}


export function approveRetentionDisposition(
  record: RetentionDispositionRecord,
  approverRole: RetentionDispositionRecord['requestedByRole'],
): RetentionDispositionRecord | null {
  if (!isRetentionDispositionRecord(record) || record.executed ||
      record.approvedByRole !== undefined || record.requestedByRole === approverRole) return null;
  return { ...record, approvedByRole: approverRole };
}
