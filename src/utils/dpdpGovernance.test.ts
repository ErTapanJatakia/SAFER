import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canMarkPurposeReviewed,
  canApproveNoticeForDemo,
  canRecordSyntheticConsent,
  createSyntheticWithdrawal,
  getLatestConsentState,
  validatePrivacyGovernanceSnapshot,
} from './dpdpGovernance.ts';
import { EMPTY_PRIVACY_GOVERNANCE, type PrivacyPurposeRecord, type VersionedPrivacyNotice, type ConsentLifecycleEvent } from '../types/dpdpGovernance.ts';

const purpose: PrivacyPurposeRecord = {
  id: 'purpose-workforce', purposeCode: 'WORKFORCE-OPS',
  purposeDescription: 'Synthetic workforce administration example',
  dataCategories: ['synthetic personnel reference'], processingOperations: ['organise records'],
  recipientCategories: ['authorised demo administrators'],
  retentionRule: 'Organisation-defined period; review required; no statutory period asserted.',
  groundAssessment: 'organisation-reviewed', groundReviewNote: 'Synthetic review note only.',
  ownerRole: 'organisation-admin', reviewState: 'draft',
  createdAt: '2026-11-14T10:00:00.000Z', updatedAt: '2026-11-14T10:00:00.000Z',
};
const notice: VersionedPrivacyNotice = {
  id: 'notice-v1', noticeCode: 'WORKFORCE', version: 1,
  title: 'Synthetic workforce notice', content: 'Demonstration notice content.',
  purposeIds: [purpose.id], status: 'draft', createdAt: '2026-11-14T10:00:00.000Z',
};
const grant: ConsentLifecycleEvent = {
  id: 'consent-grant', subjectRef: 'synthetic-subject-1',
  purposeId: purpose.id, noticeId: notice.id, noticeVersion: 1,
  state: 'granted', recordedAt: '2026-11-14T10:00:00.000Z',
  source: 'synthetic-manual-entry',
};

describe('DPDP governance domain', () => {
  it('requires an explicit organisation review note before marking a purpose reviewed', () => {
    assert.equal(canMarkPurposeReviewed(purpose), true);
    assert.equal(canMarkPurposeReviewed({ ...purpose, groundReviewNote: '' }), false);
    assert.equal(canMarkPurposeReviewed({ ...purpose, groundAssessment: 'not-assessed' }), false);
  });

  it('approves a notice for demonstration only when every linked purpose is reviewed', () => {
    assert.equal(canApproveNoticeForDemo(notice, [{ ...purpose, reviewState: 'organisation-reviewed' }]), true);
    assert.equal(canApproveNoticeForDemo(notice, [purpose]), false);
    assert.equal(canApproveNoticeForDemo({ ...notice, purposeIds: [] }, [purpose]), false);
  });

  it('requires a reviewed purpose and demo-approved notice before recording synthetic consent', () => {
    assert.equal(canRecordSyntheticConsent({ ...purpose, reviewState: 'organisation-reviewed' },
      { ...notice, status: 'approved-for-demo' }, 'synthetic-subject'), true);
    assert.equal(canRecordSyntheticConsent(purpose, { ...notice, status: 'approved-for-demo' }, 'synthetic-subject'), false);
  });

  it('appends a withdrawal event without mutating the original grant', () => {
    const withdrawal = createSyntheticWithdrawal(grant, 'consent-withdrawal', '2026-11-14T11:00:00.000Z');
    assert.ok(withdrawal);
    assert.equal(withdrawal?.state, 'withdrawn');
    assert.equal(grant.state, 'granted');
    assert.equal(withdrawal?.noticeVersion, grant.noticeVersion);
  });

  it('rejects withdrawal before the grant, duplicate state transitions and malformed dates', () => {
    assert.equal(createSyntheticWithdrawal(grant, 'withdrawal-1', '2026-11-13T11:00:00.000Z'), null);
    assert.equal(createSyntheticWithdrawal({ ...grant, state: 'withdrawn' }, 'withdrawal-2', '2026-11-14T11:00:00.000Z'), null);
    assert.equal(createSyntheticWithdrawal(grant, 'withdrawal-3', 'not-a-date'), null);
  });

  it('derives current consent state from the append-only event history', () => {
    const withdrawal = createSyntheticWithdrawal(grant, 'consent-withdrawal', '2026-11-14T11:00:00.000Z');
    assert.equal(getLatestConsentState([grant, withdrawal!], grant.subjectRef, grant.purposeId)?.state, 'withdrawn');
    assert.equal(getLatestConsentState([grant], 'other-subject', grant.purposeId), null);
  });

  it('validates the synthetic governance envelope and rejects unknown fields or duplicate IDs', () => {
    assert.equal(validatePrivacyGovernanceSnapshot(EMPTY_PRIVACY_GOVERNANCE), true);
    assert.equal(validatePrivacyGovernanceSnapshot({ ...EMPTY_PRIVACY_GOVERNANCE, unexpected: true }), false);
    assert.equal(validatePrivacyGovernanceSnapshot({ ...EMPTY_PRIVACY_GOVERNANCE, purposes: [purpose, purpose] }), false);
    assert.equal(validatePrivacyGovernanceSnapshot({ ...EMPTY_PRIVACY_GOVERNANCE, workspaceMode: 'production' }), false);
  });
});
