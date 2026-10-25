import type { CyberHygieneItem } from '../types/index.ts';

export const CYBER_LEGAL_DISCLAIMER =
  'DEFENSIVE CYBERSECURITY NOTICE: This review assesses administrative compliance, hygiene best practices, and operational procedures only. No active vulnerability scans, penetration testing, interception of private communications, or intrusive network probing were conducted.';

export interface CyberPostureMetrics {
  totalItems: number;
  completedCount: number;
  outstandingCount: number;
  completionPercentage: number;
  verifiedFindingsCount: number;
  generalRecommendationsCount: number;
  outstandingFindingsCount: number;
}

export function computeCyberPosture(items: CyberHygieneItem[]): CyberPostureMetrics {
  const totalItems = items.length;
  const completedCount = items.filter((i) => i.status === 'Completed').length;
  const outstandingCount = totalItems - completedCount;
  const completionPercentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const verifiedFindingsCount = items.filter((i) => i.itemType === 'Verified Finding').length;
  const generalRecommendationsCount = items.filter((i) => i.itemType === 'General Recommendation').length;
  const outstandingFindingsCount = items.filter(
    (i) => i.itemType === 'Verified Finding' && i.status === 'Outstanding'
  ).length;

  return {
    totalItems,
    completedCount,
    outstandingCount,
    completionPercentage,
    verifiedFindingsCount,
    generalRecommendationsCount,
    outstandingFindingsCount,
  };
}

/**
 * Generates a concise plain-English cybersecurity hygiene summary.
 */
export function generateCyberHygieneSummary(
  items: CyberHygieneItem[],
  referenceDateStr: string = '2026-10-15'
): string {
  const metrics = computeCyberPosture(items);
  const lines: string[] = [];

  lines.push(`================================================================`);
  lines.push(`DEFENSIVE CYBERSECURITY HYGIENE AUDIT BRIEFING`);
  lines.push(`Evaluation Reference Date: ${referenceDateStr}`);
  lines.push(`Scope: 10 Operational Defensive Domains`);
  lines.push(`================================================================`);
  lines.push(``);

  lines.push(`1. EXECUTIVE POSTURE & READINESS SCORE:`);
  lines.push(`   - Overall Hygiene Baseline: ${metrics.completionPercentage}% Complete`);
  lines.push(`   - Controls Audited: ${metrics.totalItems}`);
  lines.push(`   - Completed / Verified Active: ${metrics.completedCount}`);
  lines.push(`   - Outstanding Action Items: ${metrics.outstandingCount}`);
  lines.push(`   - Breakdown: ${metrics.verifiedFindingsCount} Verified Findings / ${metrics.generalRecommendationsCount} General Recommendations`);
  lines.push(``);

  lines.push(`2. STATUS ACROSS 10 DEFENSIVE DOMAINS:`);
  for (const item of items) {
    const isVerified = item.itemType === 'Verified Finding';
    const typeLabel = isVerified ? '[VERIFIED FINDING]' : '[GENERAL RECOMMENDATION]';
    const statusLabel = item.status === 'Completed' ? '[COMPLETED]' : '[OUTSTANDING]';

    lines.push(`   * ${item.domain}:`);
    lines.push(`     Control: ${item.title} -> ${statusLabel} | ${typeLabel}`);
    lines.push(`     Recommendation: ${item.recommendation}`);
    lines.push(`     Plain-English Rationale: ${item.plainEnglishExplanation}`);
    if (item.findingNotes) {
      lines.push(`     Auditor Notes: ${item.findingNotes}`);
    }
    lines.push(``);
  }

  lines.push(`3. IMMEDIATE OUTSTANDING ACTIONS REQUIRING REMEDIATION:`);
  const outstanding = items.filter((i) => i.status === 'Outstanding');
  if (outstanding.length === 0) {
    lines.push(`   - All 10 defensive checklist domains have met active compliance criteria.`);
  } else {
    for (let i = 0; i < outstanding.length; i++) {
      const o = outstanding[i];
      const typeTag = o.itemType === 'Verified Finding' ? '(Verified Finding - Priority)' : '(General Recommendation)';
      lines.push(`   [ ] ${i + 1}. [${o.domain}] ${o.title} ${typeTag}`);
      lines.push(`       Action Needed: ${o.findingNotes || o.recommendation}`);
    }
  }
  lines.push(``);

  lines.push(`----------------------------------------------------------------`);
  lines.push(CYBER_LEGAL_DISCLAIMER);
  lines.push(`----------------------------------------------------------------`);

  return lines.join('\n');
}
