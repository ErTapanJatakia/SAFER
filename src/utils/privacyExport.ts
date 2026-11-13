import type { PrivacyDemoWorkspace } from '../types/privacy.ts';

/**
 * Produces a portable export of the synthetic privacy workspace.
 * Callers must pass a workspace loaded through the validated demo repository.
 * This export is explicitly not a statutory record or proof of compliance.
 */
export function createPrivacyDemoExport(
  workspace: PrivacyDemoWorkspace,
  exportedAt = new Date().toISOString(),
): string {
  const safeWorkspace: PrivacyDemoWorkspace = {
    schemaVersion: 1,
    workspaceMode: 'synthetic-demo',
    noticeDrafts: workspace.noticeDrafts.map(({ id, title, content, versionLabel, updatedAt }) => ({
      id, title, content, versionLabel, updatedAt,
    })),
    processingActivities: workspace.processingActivities.map((activity) => ({
      id: activity.id,
      purpose: activity.purpose,
      dataCategories: [...activity.dataCategories],
      recipients: [...activity.recipients],
      retentionDescription: activity.retentionDescription,
      legalAssessment: activity.legalAssessment,
    })),
    consentEvents: workspace.consentEvents.map(({ id, subjectRef, purposeRef, event, recordedAt, note }) => ({
      id, subjectRef, purposeRef, event, recordedAt, ...(note === undefined ? {} : { note }),
    })),
    rightsRequests: workspace.rightsRequests.map(({ id, subjectRef, requestKind, description, status, submittedAt, updatedAt, resolutionNote }) => ({
      id, subjectRef, requestKind, description, status, submittedAt, updatedAt,
      ...(resolutionNote === undefined ? {} : { resolutionNote }),
    })),
    grievances: workspace.grievances.map(({ id, subjectRef, category, description, status, submittedAt, updatedAt, responseNote }) => ({
      id, subjectRef, category, description, status, submittedAt, updatedAt,
      ...(responseNote === undefined ? {} : { responseNote }),
    })),
    retentionReviews: workspace.retentionReviews.map(({ id, dataCategory, reviewNote, status, reviewedAt }) => ({
      id, dataCategory, reviewNote, status, ...(reviewedAt === undefined ? {} : { reviewedAt }),
    })),
  };

  return JSON.stringify({
    exportType: 'SAFER synthetic privacy demonstration workspace',
    exportVersion: 1,
    exportedAt,
    warning: 'Synthetic demonstration data only. This export is not a statutory submission, legally operative record, proof of valid consent, or evidence of legal compliance. Review before sharing.',
    workspace: safeWorkspace,
  }, null, 2);
}
