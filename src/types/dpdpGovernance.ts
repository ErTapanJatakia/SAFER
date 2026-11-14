/**
 * DPDP governance planning contracts for SAFER's synthetic demonstration workspace.
 *
 * These records are operational prompts, not legal conclusions. Organisations must
 * review purposes, notices, lawful grounds, retention and contact details with counsel.
 * No statutory compliance, valid consent or notice delivery is implied.
 */

export type GovernanceReviewState = 'draft' | 'organisation-reviewed' | 'retired';
export type NoticePublicationState = 'draft' | 'approved-for-demo' | 'superseded';
export type PurposeGroundAssessment = 'not-assessed' | 'organisation-reviewed';
export type ConsentLifecycleState = 'granted' | 'withdrawn' | 'expired' | 'superseded';

export interface PrivacyPurposeRecord {
  id: string;
  purposeCode: string;
  purposeDescription: string;
  dataCategories: string[];
  processingOperations: string[];
  recipientCategories: string[];
  retentionRule: string;
  groundAssessment: PurposeGroundAssessment;
  groundReviewNote?: string;
  ownerRole: 'organisation-owner' | 'organisation-admin' | 'privacy-reviewer';
  reviewState: GovernanceReviewState;
  createdAt: string;
  updatedAt: string;
  nextReviewAt?: string;
}

export interface VersionedPrivacyNotice {
  id: string;
  noticeCode: string;
  version: number;
  title: string;
  content: string;
  purposeIds: string[];
  status: NoticePublicationState;
  createdAt: string;
  approvedAt?: string;
  supersedesNoticeId?: string;
  reviewNote?: string;
}

export interface ConsentLifecycleEvent {
  id: string;
  subjectRef: string;
  purposeId: string;
  noticeId: string;
  noticeVersion: number;
  state: ConsentLifecycleState;
  recordedAt: string;
  source: 'synthetic-manual-entry';
  note?: string;
}

export interface PrivacyGovernanceSnapshot {
  schemaVersion: 1;
  workspaceMode: 'synthetic-demo';
  purposes: PrivacyPurposeRecord[];
  notices: VersionedPrivacyNotice[];
  consentHistory: ConsentLifecycleEvent[];
}

export const EMPTY_PRIVACY_GOVERNANCE: PrivacyGovernanceSnapshot = {
  schemaVersion: 1,
  workspaceMode: 'synthetic-demo',
  purposes: [],
  notices: [],
  consentHistory: [],
};
