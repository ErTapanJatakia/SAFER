import type { CyberHygieneItem, CyberHygieneDomain } from '../types/index.ts';

export interface CyberHygieneMetrics {
  totalCount: number;
  completedCount: number;
  outstandingCount: number;
  complianceRate: number;
  verifiedFindingsCount: number;
  verifiedCompletedCount: number;
  verifiedOutstandingCount: number;
  generalRecsCount: number;
  generalCompletedCount: number;
  generalOutstandingCount: number;
  domainsCoveredCount: number;
  domainBreakdown: Record<
    CyberHygieneDomain,
    {
      total: number;
      completed: number;
      outstanding: number;
    }
  >;
}

export const ALL_CYBER_DOMAINS: CyberHygieneDomain[] = [
  'Device and operating-system updates',
  'Multi-factor authentication',
  'Password-manager usage',
  'Phishing awareness',
  'Secure handling of documents',
  'Lost-device reporting',
  'Account access reviews',
  'Backup and recovery checks',
  'Suspicious-activity reporting',
  'Basic incident escalation',
];

/**
 * Computes defensive cybersecurity hygiene metrics across items.
 */
export function computeCyberHygieneMetrics(items: CyberHygieneItem[]): CyberHygieneMetrics {
  const totalCount = items.length;
  const completedCount = items.filter((i) => i.status === 'Completed').length;
  const outstandingCount = items.filter((i) => i.status === 'Outstanding').length;
  const complianceRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const verifiedFindings = items.filter((i) => i.itemType === 'Verified Finding');
  const verifiedFindingsCount = verifiedFindings.length;
  const verifiedCompletedCount = verifiedFindings.filter((i) => i.status === 'Completed').length;
  const verifiedOutstandingCount = verifiedFindings.filter((i) => i.status === 'Outstanding').length;

  const generalRecs = items.filter((i) => i.itemType === 'General Recommendation');
  const generalRecsCount = generalRecs.length;
  const generalCompletedCount = generalRecs.filter((i) => i.status === 'Completed').length;
  const generalOutstandingCount = generalRecs.filter((i) => i.status === 'Outstanding').length;

  const domainBreakdown = ALL_CYBER_DOMAINS.reduce((acc, domain) => {
    const domainItems = items.filter((i) => i.domain === domain);
    acc[domain] = {
      total: domainItems.length,
      completed: domainItems.filter((i) => i.status === 'Completed').length,
      outstanding: domainItems.filter((i) => i.status === 'Outstanding').length,
    };
    return acc;
  }, {} as CyberHygieneMetrics['domainBreakdown']);

  const domainsCoveredCount = Object.values(domainBreakdown).filter((d) => d.total > 0).length;

  return {
    totalCount,
    completedCount,
    outstandingCount,
    complianceRate,
    verifiedFindingsCount,
    verifiedCompletedCount,
    verifiedOutstandingCount,
    generalRecsCount,
    generalCompletedCount,
    generalOutstandingCount,
    domainsCoveredCount,
    domainBreakdown,
  };
}

/**
 * Generates an executive, plain-English defensive cybersecurity hygiene briefing.
 */
export function generateCyberHygieneSummary(
  items: CyberHygieneItem[],
  generatedDate: string = '2026-10-15'
): string {
  const metrics = computeCyberHygieneMetrics(items);
  const outstandingItems = items.filter((i) => i.status === 'Outstanding');
  const completedItems = items.filter((i) => i.status === 'Completed');

  const verifiedOutstanding = outstandingItems.filter((i) => i.itemType === 'Verified Finding');
  const generalOutstanding = outstandingItems.filter((i) => i.itemType === 'General Recommendation');

  let text = '';
  text += `======================================================================\n`;
  text += `SAFER — DEFENSIVE CYBERSECURITY HYGIENE EXECUTIVE BRIEFING\n`;
  text += `Security Administration, Field Readiness, Evidence & Reporting\n`;
  text += `Generated: ${generatedDate} | Classification: Administrative / Demonstration\n`;
  text += `======================================================================\n\n`;

  text += `1. EXECUTIVE COMPLIANCE OVERVIEW\n`;
  text += `----------------------------------------------------------------------\n`;
  text += `Overall Defensive Compliance Score: ${metrics.complianceRate}% (${metrics.completedCount} of ${metrics.totalCount} controls verified)\n`;
  text += `Outstanding Items Requiring Attention: ${metrics.outstandingCount} controls\n`;
  text += `Defensive Domains Monitored: ${metrics.domainsCoveredCount} of ${ALL_CYBER_DOMAINS.length} operational baseline areas\n\n`;

  text += `2. CLASSIFICATION BREAKDOWN\n`;
  text += `----------------------------------------------------------------------\n`;
  text += `* Verified Findings (Operational Audits): ${metrics.verifiedFindingsCount} total\n`;
  text += `  - Compliant: ${metrics.verifiedCompletedCount}\n`;
  text += `  - Outstanding / Remediation Needed: ${metrics.verifiedOutstandingCount}\n`;
  text += `* General Recommendations (Baseline Protocols): ${metrics.generalRecsCount} total\n`;
  text += `  - Implemented / Completed: ${metrics.generalCompletedCount}\n`;
  text += `  - Outstanding: ${metrics.generalOutstandingCount}\n\n`;

  text += `3. OUTSTANDING DEFENSIVE TASKS REQUIRING HUMAN ACTION\n`;
  text += `----------------------------------------------------------------------\n`;
  if (outstandingItems.length === 0) {
    text += `All tracked defensive controls and recommendations are currently marked as COMPLETED.\n`;
  } else {
    if (verifiedOutstanding.length > 0) {
      text += `[A] VERIFIED OPERATIONAL FINDINGS (Priority Remediation):\n`;
      verifiedOutstanding.forEach((item, idx) => {
        text += `  ${idx + 1}. [${item.domain.toUpperCase()}] ${item.title}\n`;
        text += `     Status: OUTSTANDING | Last Audited: ${item.lastChecked} | Auditor: ${item.verifiedBy || 'Unassigned'}\n`;
        text += `     Operational Finding: ${item.findingNotes}\n`;
        text += `     Plain-English Rationale: ${item.plainEnglishExplanation}\n`;
        text += `     Recommended Remediation: ${item.recommendation}\n\n`;
      });
    }

    if (generalOutstanding.length > 0) {
      text += `[B] GENERAL DEFENSIVE RECOMMENDATIONS (Pending Implementation):\n`;
      generalOutstanding.forEach((item, idx) => {
        text += `  ${idx + 1}. [${item.domain.toUpperCase()}] ${item.title}\n`;
        text += `     Plain-English Rationale: ${item.plainEnglishExplanation}\n`;
        text += `     Recommendation: ${item.recommendation}\n\n`;
      });
    }
  }

  text += `4. DOMAIN-BY-DOMAIN STATUS REVIEW\n`;
  text += `----------------------------------------------------------------------\n`;
  ALL_CYBER_DOMAINS.forEach((domain, idx) => {
    const stats = metrics.domainBreakdown[domain];
    const statusText =
      stats.total === 0
        ? 'NO CONTROLS CONFIGURED'
        : stats.outstanding === 0
        ? 'COMPLIANT'
        : `${stats.outstanding} OUTSTANDING`;

    text += `  ${(idx + 1).toString().padStart(2, '0')}. ${domain.padEnd(42, ' ')} [${statusText}]\n`;
  });

  text += `\n5. COMPLETED VERIFIED CONTROLS\n`;
  text += `----------------------------------------------------------------------\n`;
  completedItems.forEach((item, idx) => {
    text += `  ${idx + 1}. [${item.itemType.toUpperCase()}] ${item.title} (${item.domain})\n`;
    text += `     Audited: ${item.lastChecked} | Sign-off: ${item.verifiedBy || 'Verified'} | Finding: ${item.findingNotes || 'Meets baseline'}\n`;
  });

  text += `\n======================================================================\n`;
  text += `ADMINISTRATIVE NOTICE & SAFETY BOUNDARY\n`;
  text += `This briefing documents defensive cybersecurity administrative hygiene only.\n`;
  text += `It does not constitute a penetrative security audit, automated vulnerability\n`;
  text += `assessment, or real-time surveillance. Independent demonstration prototype.\n`;
  text += `======================================================================\n`;

  return text;
}
