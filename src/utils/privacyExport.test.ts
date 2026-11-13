import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_PRIVACY_DEMO_WORKSPACE } from '../types/privacy.ts';
import { createPrivacyDemoExport } from './privacyExport.ts';

describe('synthetic privacy workspace export', () => {
  it('exports every supported collection with an explicit synthetic-only disclaimer', () => {
    const workspace = {
      ...EMPTY_PRIVACY_DEMO_WORKSPACE,
      processingActivities: [{
        id: 'activity-1', purpose: 'Synthetic access administration',
        dataCategories: ['synthetic contact reference'], recipients: ['demo operations team'],
        retentionDescription: 'Review manually; no retention period asserted.',
        legalAssessment: 'not-assessed' as const,
      }],
      rightsRequests: [{
        id: 'request-1', subjectRef: 'synthetic-subject-1', requestKind: 'access' as const,
        description: 'Synthetic request', status: 'submitted' as const,
        submittedAt: '2026-11-13T00:00:00.000Z', updatedAt: '2026-11-13T00:00:00.000Z',
      }],
    };
    const parsed = JSON.parse(createPrivacyDemoExport(workspace, '2026-11-13T01:00:00.000Z'));
    assert.equal(parsed.exportType, 'SAFER synthetic privacy demonstration workspace');
    assert.equal(parsed.exportedAt, '2026-11-13T01:00:00.000Z');
    assert.match(parsed.warning, /not a statutory submission/);
    assert.equal(parsed.workspace.workspaceMode, 'synthetic-demo');
    assert.deepEqual(parsed.workspace.processingActivities, workspace.processingActivities);
    assert.deepEqual(parsed.workspace.rightsRequests, workspace.rightsRequests);
    for (const collection of [
      'noticeDrafts', 'processingActivities', 'consentEvents',
      'rightsRequests', 'grievances', 'retentionReviews',
    ]) assert.ok(Array.isArray(parsed.workspace[collection]));
  });

  it('copies records and omits unexpected object properties from the exported data', () => {
    const workspace = {
      ...EMPTY_PRIVACY_DEMO_WORKSPACE,
      processingActivities: [{
        id: 'activity-2', purpose: 'Synthetic purpose', dataCategories: [],
        recipients: [], retentionDescription: 'Manual review only',
        legalAssessment: 'not-assessed' as const,
        unexpectedSecret: 'must-not-export',
      }],
    } as typeof EMPTY_PRIVACY_DEMO_WORKSPACE;
    const output = createPrivacyDemoExport(workspace);
    assert.equal(output.includes('must-not-export'), false);
    assert.equal(workspace.processingActivities[0].purpose, 'Synthetic purpose');
  });

  it('uses a valid ISO timestamp by default', () => {
    const parsed = JSON.parse(createPrivacyDemoExport(EMPTY_PRIVACY_DEMO_WORKSPACE));
    assert.ok(Number.isFinite(Date.parse(parsed.exportedAt)));
  });
});
