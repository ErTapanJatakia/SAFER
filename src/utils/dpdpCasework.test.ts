import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canAdvanceRightsCase, approveRetentionDisposition, isPrincipalRightsCase,
  isRetentionDispositionRecord, isPersonalDataBreachCase, isAccountabilityAssignment,
  isAssuranceEvidenceRecord, validatePrivacyGovernanceSnapshot,
} from './dpdpGovernance.ts';
import { EMPTY_PRIVACY_GOVERNANCE, type PrincipalRightsCase, type RetentionDispositionRecord } from '../types/dpdpGovernance.ts';

const now = '2026-11-14T12:00:00.000Z';
const rights: PrincipalRightsCase = {
  id:'rights-1', subjectRef:'synthetic-1', requestKind:'access', description:'Synthetic access request',
  identityCheck:'not-started', status:'received', receivedAt:now, updatedAt:now,
  assignedRole:'organisation-admin', evidenceRefs:[], syntheticOnly:true,
};
const disposition: RetentionDispositionRecord = {
  id:'disposition-1', scheduleId:'schedule-1', disposition:'delete-after-approval',
  requestedByRole:'organisation-admin', decisionNote:'Synthetic proposal', recordedAt:now, executed:false,
};

describe('DPDP-02 rights workflow', () => {
  it('requires synthetic identity matching before progressing or completing a request', () => {
    assert.equal(canAdvanceRightsCase(rights,'identity-check','not-started'), true);
    assert.equal(canAdvanceRightsCase(rights,'in-progress','not-started'), false);
    assert.equal(canAdvanceRightsCase({...rights,status:'identity-check'},'in-progress','synthetic-reference-matched'), true);
    assert.equal(canAdvanceRightsCase({...rights,status:'identity-check'},'completed','not-started'), false);
    assert.equal(isPrincipalRightsCase({...rights,syntheticOnly:false}), false);
  });
  it('rejects terminal-state transitions', () => {
    assert.equal(canAdvanceRightsCase({...rights,status:'completed'},'in-progress','synthetic-reference-matched'), false);
    assert.equal(canAdvanceRightsCase({...rights,status:'declined'},'closed','synthetic-reference-matched'), false);
  });
});

describe('DPDP-03 retention governance', () => {
  it('requires a different workflow role to approve a disposition and never executes it', () => {
    assert.equal(approveRetentionDisposition(disposition,'organisation-admin'), null);
    const approved = approveRetentionDisposition(disposition,'organisation-owner');
    assert.equal(approved?.approvedByRole,'organisation-owner');
    assert.equal(approved?.executed,false);
    assert.equal(approveRetentionDisposition(approved!,'organisation-owner'), null);
    assert.equal(isRetentionDispositionRecord({...approved!,approvedByRole:'organisation-admin'}), false);
  });
  it('validates disposition records with explicit non-execution state', () => {
    assert.equal(isRetentionDispositionRecord(disposition), true);
    assert.equal(isRetentionDispositionRecord({...disposition,executed:true}), false);
  });
});

describe('DPDP-04 breach management', () => {
  it('requires synthetic-only records and constrained notification assessment states', () => {
    const breach = {
      id:'breach-1', reference:'DEMO-1', discoveredAt:now, recordedAt:now,
      summary:'Synthetic incident', affectedDataCategories:['synthetic category'],
      affectedSystems:['demo system'], severity:'unassessed', status:'reported',
      containmentActions:[], remediationActions:[], notificationAssessment:'not-assessed',
      ownerRole:'organisation-admin', evidenceRefs:[], syntheticOnly:true,
    };
    assert.equal(isPersonalDataBreachCase(breach), true);
    assert.equal(isPersonalDataBreachCase({...breach,syntheticOnly:false}), false);
    assert.equal(isPersonalDataBreachCase({...breach,notificationAssessment:'notified'}), false);
  });
});

describe('DPDP-05 accountability and DPDP-06 validation', () => {
  it('validates responsibility and evidence reference contracts', () => {
    assert.equal(isAccountabilityAssignment({id:'assign-1',responsibility:'Review notice',assignedRole:'organisation-admin',status:'assigned'}),true);
    assert.equal(isAccountabilityAssignment({id:'assign-2',responsibility:'Review notice',assignedRole:'platform-super-admin',status:'assigned'}),false);
    assert.equal(isAssuranceEvidenceRecord({id:'evidence-1',controlCode:'C1',controlDescription:'Review',evidenceRef:'TEST-1',evidenceType:'test-reference',reviewedByRole:'organisation-owner',reviewedAt:now,limitations:'Not independently verified'}),true);
  });
  it('requires every bounded synthetic collection in the snapshot envelope', () => {
    assert.equal(validatePrivacyGovernanceSnapshot(EMPTY_PRIVACY_GOVERNANCE),true);
    assert.equal(validatePrivacyGovernanceSnapshot({...EMPTY_PRIVACY_GOVERNANCE,rightsCases:[rights]}),true);
    assert.equal(validatePrivacyGovernanceSnapshot({...EMPTY_PRIVACY_GOVERNANCE,rightsCases:[rights,rights]}),false);
    assert.equal(validatePrivacyGovernanceSnapshot({...EMPTY_PRIVACY_GOVERNANCE,breachCases:[{syntheticOnly:false}]}),false);
    assert.equal(validatePrivacyGovernanceSnapshot({...EMPTY_PRIVACY_GOVERNANCE,extra:true}),false);
    const orphanSchedule = { id:'retention-1', dataCategory:'synthetic', purposeId:'missing-purpose', retentionRule:'review', reviewAt:now, ownerRole:'organisation-admin', status:'draft' };
    assert.equal(validatePrivacyGovernanceSnapshot({...EMPTY_PRIVACY_GOVERNANCE,retentionSchedules:[orphanSchedule]}),false);
  });
});
