/**
 * DPDP governance planning contracts for SAFER's synthetic demonstration workspace.
 * Workflow states are not legal determinations, proof of compliance or statutory submissions.
 */
export type GovernanceReviewState = 'draft' | 'organisation-reviewed' | 'retired';
export type NoticePublicationState = 'draft' | 'approved-for-demo' | 'superseded';
export type PurposeGroundAssessment = 'not-assessed' | 'organisation-reviewed';
export type ConsentLifecycleState = 'granted' | 'withdrawn' | 'expired' | 'superseded';
export type PrincipalRequestKind = 'access' | 'correction' | 'completion' | 'erasure' | 'grievance' | 'other';
export type PrincipalRequestStatus = 'received' | 'identity-check' | 'in-progress' | 'awaiting-information' | 'completed' | 'declined' | 'closed';
export type IdentityCheckState = 'not-started' | 'pending' | 'synthetic-reference-matched' | 'not-verified';
export type RetentionDisposition = 'retain' | 'restrict-review' | 'delete-after-approval' | 'defer';
export type BreachSeverity = 'unassessed' | 'low' | 'moderate' | 'high' | 'critical';
export type BreachStatus = 'reported' | 'assessing' | 'contained' | 'remediating' | 'closed';

export interface PrivacyPurposeRecord {
  id: string; purposeCode: string; purposeDescription: string; dataCategories: string[];
  processingOperations: string[]; recipientCategories: string[]; retentionRule: string;
  groundAssessment: PurposeGroundAssessment; groundReviewNote?: string;
  ownerRole: 'organisation-owner' | 'organisation-admin' | 'privacy-reviewer';
  reviewState: GovernanceReviewState; createdAt: string; updatedAt: string; nextReviewAt?: string;
}
export interface VersionedPrivacyNotice {
  id: string; noticeCode: string; version: number; title: string; content: string;
  purposeIds: string[]; status: NoticePublicationState; createdAt: string; approvedAt?: string;
  supersedesNoticeId?: string; reviewNote?: string;
}
export interface ConsentLifecycleEvent {
  id: string; subjectRef: string; purposeId: string; noticeId: string; noticeVersion: number;
  state: ConsentLifecycleState; recordedAt: string; source: 'synthetic-manual-entry'; note?: string;
}
export interface PrincipalRightsCase {
  id: string; subjectRef: string; requestKind: PrincipalRequestKind; description: string;
  identityCheck: IdentityCheckState; status: PrincipalRequestStatus; receivedAt: string;
  updatedAt: string; assignedRole: 'organisation-owner' | 'organisation-admin' | 'privacy-reviewer';
  scopeNote?: string; decision?: 'fulfilled' | 'partially-fulfilled' | 'declined' | 'not-applicable';
  decisionReason?: string; evidenceRefs: string[]; syntheticOnly: true;
}
export interface RetentionSchedule {
  id: string; dataCategory: string; purposeId: string; retentionRule: string;
  reviewAt: string; ownerRole: 'organisation-owner' | 'organisation-admin' | 'privacy-reviewer';
  status: 'draft' | 'reviewed' | 'retired'; reviewNote?: string;
}
export interface RetentionDispositionRecord {
  id: string; scheduleId: string; disposition: RetentionDisposition;
  requestedByRole: 'organisation-owner' | 'organisation-admin' | 'privacy-reviewer';
  approvedByRole?: 'organisation-owner' | 'organisation-admin' | 'privacy-reviewer';
  decisionNote: string; recordedAt: string; evidenceRef?: string;
  executed: false;
}
export interface PersonalDataBreachCase {
  id: string; reference: string; discoveredAt: string; recordedAt: string;
  summary: string; affectedDataCategories: string[]; affectedSystems: string[];
  severity: BreachSeverity; status: BreachStatus;
  containmentActions: string[]; remediationActions: string[];
  notificationAssessment: 'not-assessed' | 'under-review' | 'organisation-decided';
  notificationDecisionNote?: string; ownerRole: 'organisation-owner' | 'organisation-admin' | 'privacy-reviewer';
  evidenceRefs: string[]; syntheticOnly: true;
}
export interface AccountabilityAssignment {
  id: string; responsibility: string;
  assignedRole: 'organisation-owner' | 'organisation-admin' | 'privacy-reviewer';
  purposeId?: string; reviewAt?: string; status: 'assigned' | 'reviewed' | 'retired';
  note?: string;
}
export interface AssuranceEvidenceRecord {
  id: string; controlCode: string; controlDescription: string;
  evidenceRef: string; evidenceType: 'document-reference' | 'test-reference' | 'review-note';
  reviewedByRole: 'organisation-owner' | 'organisation-admin' | 'privacy-reviewer';
  reviewedAt: string; limitations: string;
}
export interface PrivacyGovernanceSnapshot {
  schemaVersion: 1; workspaceMode: 'synthetic-demo';
  purposes: PrivacyPurposeRecord[]; notices: VersionedPrivacyNotice[];
  consentHistory: ConsentLifecycleEvent[]; rightsCases: PrincipalRightsCase[];
  retentionSchedules: RetentionSchedule[]; retentionDispositions: RetentionDispositionRecord[];
  breachCases: PersonalDataBreachCase[]; assignments: AccountabilityAssignment[];
  assuranceEvidence: AssuranceEvidenceRecord[];
}
export const EMPTY_PRIVACY_GOVERNANCE: PrivacyGovernanceSnapshot = {
  schemaVersion: 1, workspaceMode: 'synthetic-demo', purposes: [], notices: [],
  consentHistory: [], rightsCases: [], retentionSchedules: [], retentionDispositions: [],
  breachCases: [], assignments: [], assuranceEvidence: [],
};
