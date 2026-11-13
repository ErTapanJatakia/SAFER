/**
 * SAFER privacy workspace contracts.
 *
 * These types describe an administrative tracking aid, not a legal determination.
 * The first release is limited to synthetic Demo Guest data.
 */

export type PrivacyRequestKind = 'access' | 'correction' | 'erasure' | 'other';
export type PrivacyRequestStatus = 'submitted' | 'under_review' | 'completed' | 'rejected';
export type PrivacyGrievanceStatus = 'open' | 'investigating' | 'resolved' | 'closed';
export type PrivacyConsentEventKind = 'granted' | 'withdrawn';
export type RetentionReviewStatus = 'pending' | 'reviewed' | 'deferred';

export interface PrivacyNoticeDraft {
  id: string;
  title: string;
  content: string;
  versionLabel: string;
  updatedAt: string;
}

export interface PrivacyProcessingActivity {
  id: string;
  purpose: string;
  dataCategories: string[];
  recipients: string[];
  retentionDescription: string;
  legalAssessment: 'not-assessed' | 'organization-reviewed';
}

export interface PrivacyConsentEvent {
  id: string;
  subjectRef: string;
  purposeRef: string;
  event: PrivacyConsentEventKind;
  recordedAt: string;
  note?: string;
}

export interface PrivacyRightsRequest {
  id: string;
  subjectRef: string;
  requestKind: PrivacyRequestKind;
  description: string;
  status: PrivacyRequestStatus;
  submittedAt: string;
  updatedAt: string;
  resolutionNote?: string;
}

export interface PrivacyGrievance {
  id: string;
  subjectRef: string;
  category: string;
  description: string;
  status: PrivacyGrievanceStatus;
  submittedAt: string;
  updatedAt: string;
  responseNote?: string;
}

export interface PrivacyRetentionReview {
  id: string;
  dataCategory: string;
  reviewNote: string;
  status: RetentionReviewStatus;
  reviewedAt?: string;
}

export interface PrivacyDemoWorkspace {
  schemaVersion: 1;
  workspaceMode: 'synthetic-demo';
  noticeDrafts: PrivacyNoticeDraft[];
  processingActivities: PrivacyProcessingActivity[];
  consentEvents: PrivacyConsentEvent[];
  rightsRequests: PrivacyRightsRequest[];
  grievances: PrivacyGrievance[];
  retentionReviews: PrivacyRetentionReview[];
}

export const EMPTY_PRIVACY_DEMO_WORKSPACE: PrivacyDemoWorkspace = {
  schemaVersion: 1,
  workspaceMode: 'synthetic-demo',
  noticeDrafts: [],
  processingActivities: [],
  consentEvents: [],
  rightsRequests: [],
  grievances: [],
  retentionReviews: [],
};
