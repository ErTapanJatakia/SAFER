import type {
  PreDeploymentChecklistItem,
  PreDeploymentCategory,
  PreDeploymentStatus,
  FictionalDemonstrationScenario,
} from '../types/index.ts';

export const ALL_PREDEPLOYMENT_CATEGORIES: PreDeploymentCategory[] = [
  'Required documentation and approvals',
  'Training and certification validity',
  'Emergency contacts and escalation arrangements',
  'First-aid and emergency preparedness documentation',
  'Equipment inventory and condition records',
  'Device and communications security checks',
  'Required briefings and acknowledgements',
  "Outstanding issues requiring a supervisor's review",
];

export interface PreDeploymentMetrics {
  totalCount: number;
  completeCount: number;
  incompleteCount: number; // Outstanding
  notApplicableCount: number;
  completionRate: number; // complete / (total - notApplicable)
  reviewedCount: number;
  pendingReviewCount: number;
  outstandingItems: PreDeploymentChecklistItem[];
  categoryBreakdown: {
    category: PreDeploymentCategory;
    total: number;
    complete: number;
    incomplete: number;
    notApplicable: number;
  }[];
}

export function computePreDeploymentMetrics(
  items: PreDeploymentChecklistItem[]
): PreDeploymentMetrics {
  const totalCount = items.length;
  const completeCount = items.filter((i) => i.status === 'Complete').length;
  const incompleteCount = items.filter((i) => i.status === 'Incomplete').length;
  const notApplicableCount = items.filter((i) => i.status === 'Not Applicable').length;

  const eligibleCount = totalCount - notApplicableCount;
  const completionRate =
    eligibleCount > 0 ? Math.round((completeCount / eligibleCount) * 100) : 100;

  const reviewedCount = items.filter((i) => Boolean(i.reviewedBy)).length;
  const pendingReviewCount = items.filter(
    (i) => i.requiresHumanReview && !i.reviewedBy
  ).length;

  // Prominently outstanding: Incomplete items OR items under "Outstanding issues requiring a supervisor's review"
  const outstandingItems = items.filter(
    (i) =>
      i.status === 'Incomplete' ||
      (i.category === "Outstanding issues requiring a supervisor's review" && !i.reviewedBy)
  );

  const categoryBreakdown = ALL_PREDEPLOYMENT_CATEGORIES.map((category) => {
    const catItems = items.filter((i) => i.category === category);
    return {
      category,
      total: catItems.length,
      complete: catItems.filter((i) => i.status === 'Complete').length,
      incomplete: catItems.filter((i) => i.status === 'Incomplete').length,
      notApplicable: catItems.filter((i) => i.status === 'Not Applicable').length,
    };
  });

  return {
    totalCount,
    completeCount,
    incompleteCount,
    notApplicableCount,
    completionRate,
    reviewedCount,
    pendingReviewCount,
    outstandingItems,
    categoryBreakdown,
  };
}

export function generatePreDeploymentSummaryText(
  items: PreDeploymentChecklistItem[],
  scenario?: FictionalDemonstrationScenario,
  supervisorName = 'Veer Bahadur Singh (Call Sign: KAVACH-1)',
  evaluationDate = '15-10-2026'
): string {
  const metrics = computePreDeploymentMetrics(items);
  const scenarioTitle = scenario?.title || 'National Technology & Trade Envoy Protective Readiness Review';
  const scenarioCodename = scenario?.codename || 'Operation Setu (Readiness Audit)';
  const venue = scenario?.fictionalVenue || 'India International Convention & Expo Centre (IICC Yashobhoomi), Dwarka, New Delhi';
  const jurisdiction = scenario?.fictionalJurisdiction || 'National Capital Region & Greater Noida Administrative Security Zone';

  const lines: string[] = [];

  lines.push('========================================================================');
  lines.push('   SAFER — PRE-DEPLOYMENT ADMINISTRATIVE & READINESS REVIEW SUMMARY');
  lines.push('      Security Administration, Field Readiness, Evidence & Reporting');
  lines.push('========================================================================');
  lines.push('');
  lines.push(`Generated: ${evaluationDate} | Lead Reviewer: ${supervisorName}`);
  lines.push(`Demonstration Scenario: ${scenarioCodename}`);
  lines.push(`Mission Subject: ${scenarioTitle}`);
  lines.push(`Demonstration Venue: ${venue}`);
  lines.push(`Jurisdiction: ${jurisdiction}`);
  lines.push('');
  lines.push('------------------------------------------------------------------------');
  lines.push('1. EXECUTIVE SUMMARY & READINESS METRICS');
  lines.push('------------------------------------------------------------------------');
  lines.push(`  * Total Checklist Items:      ${metrics.totalCount}`);
  lines.push(`  * Completed & Verified:       ${metrics.completeCount}`);
  lines.push(`  * Outstanding (Incomplete):   ${metrics.incompleteCount} (ATTENTION REQUIRED)`);
  lines.push(`  * Not Applicable:             ${metrics.notApplicableCount}`);
  lines.push(`  * Readiness Completion Rate:  ${metrics.completionRate}% (Excluding N/A)`);
  lines.push(`  * Supervisor Sign-offs:       ${metrics.reviewedCount} recorded | ${metrics.pendingReviewCount} pending`);
  lines.push('');

  lines.push('------------------------------------------------------------------------');
  lines.push('2. PROMINENT OUTSTANDING ISSUES REQUIRING SUPERVISOR ATTENTION');
  lines.push('------------------------------------------------------------------------');
  if (metrics.outstandingItems.length === 0) {
    lines.push('  [NONE] All items have been marked Complete or Not Applicable.');
    lines.push('  Note: Final deployment authorization still requires human sign-off.');
  } else {
    metrics.outstandingItems.forEach((item, index) => {
      lines.push(`  ${index + 1}. [${item.priority.toUpperCase()} PRIORITY] ${item.task}`);
      lines.push(`     Category: ${item.category}`);
      lines.push(`     Status:   ${item.status.toUpperCase()}`);
      lines.push(`     Target:   ${item.targetDeadline || 'Not specified'}`);
      if (item.assignedRoleOrPerson) {
        lines.push(`     Assigned: ${item.assignedRoleOrPerson}`);
      }
      lines.push(`     Context:  ${item.description}`);
      if (item.complianceNotes) {
        lines.push(`     Notes:    ${item.complianceNotes}`);
      }
      lines.push(`     Sign-off: ${item.reviewedBy ? `Verified by ${item.reviewedBy}` : 'Pending supervisor signature'}`);
      lines.push('');
    });
  }

  lines.push('------------------------------------------------------------------------');
  lines.push('3. CATEGORICAL READINESS AUDIT BREAKDOWN');
  lines.push('------------------------------------------------------------------------');
  metrics.categoryBreakdown.forEach((cat, idx) => {
    const catItems = items.filter((i) => i.category === cat.category);
    lines.push(`  ${idx + 1}. ${cat.category.toUpperCase()}`);
    lines.push(`     Status: ${cat.complete}/${cat.total} Complete | ${cat.incomplete} Outstanding | ${cat.notApplicable} N/A`);

    catItems.forEach((item) => {
      const statusIcon =
        item.status === 'Complete' ? '[COMPLETED]' : item.status === 'Incomplete' ? '[OUTSTANDING]' : '[N/A]';
      lines.push(`     - ${statusIcon} ${item.task}`);
      if (item.reviewedBy) {
        lines.push(`       Verified by: ${item.reviewedBy} on ${item.reviewDate || evaluationDate}`);
      }
    });
    lines.push('');
  });

  lines.push('------------------------------------------------------------------------');
  lines.push('4. MANDATORY REGULATORY & NON-AUTHORISATION DISCLAIMER');
  lines.push('------------------------------------------------------------------------');
  lines.push('  CRITICAL OPERATIONAL GOVERNANCE PRINCIPLE:');
  lines.push('  The application and this generated report MUST NEVER state or imply');
  lines.push('  that any person, escort team, or deployment is approved solely because');
  lines.push('  checklist items are complete.');
  lines.push('');
  lines.push('  This checklist provides administrative and safety-readiness tracking only.');
  lines.push('  No tactical routes, target profiles, combat plans, weapons instructions,');
  lines.push('  or automated operational authorizations are included or permitted.');
  lines.push('');
  lines.push('  Final deployment authorization requires affirmative, independent review');
  lines.push('  and signature by a designated human supervisor in accordance with');
  lines.push('  applicable organizational directives and local law.');
  lines.push('');

  lines.push('------------------------------------------------------------------------');
  lines.push('5. HUMAN SUPERVISOR SIGN-OFF RECORD');
  lines.push('------------------------------------------------------------------------');
  lines.push(`  Designated Supervisor Name:  ${supervisorName}`);
  lines.push(`  Review Date:                 ${evaluationDate}`);
  lines.push('  Supervisory Determination:   [ ] PENDING HUMAN REVIEW');
  lines.push('                               [ ] REMEDIATION REQUIRED');
  lines.push('                               [ ] ENDORSED FOR ADMINISTRATIVE FILING');
  lines.push('');
  lines.push('  Supervisor Signature: _____________________________________________');
  lines.push('========================================================================');

  return lines.join('\n');
}
