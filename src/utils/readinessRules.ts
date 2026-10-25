import type { QualificationItem, PersonnelRecord, AdministrativeReadinessStatus, VerificationStatus } from '../types/index.ts';
import { toYYYYMMDD, toDDMMYYYY } from './dateUtils.ts';

/**
 * Calculates days difference between target date and base date.
 * Handles both DD-MM-YYYY and YYYY-MM-DD input formats reliably.
 */
export function getDaysDifference(targetDateStr: string, baseDateStr: string): number {
  const targetIso = toYYYYMMDD(targetDateStr);
  const baseIso = toYYYYMMDD(baseDateStr);
  const target = new Date(targetIso);
  const base = new Date(baseIso);
  const diffTime = target.getTime() - base.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export type CertExpiryStatus = 'EXPIRED' | 'EXPIRING_SOON' | 'CURRENT' | 'NON_EXPIRING';

/**
 * Evaluates certification/qualification validity relative to a base date.
 * Threshold for 'expiring soon' is 45 days.
 */
export function evaluateCertification(
  cert: QualificationItem,
  referenceDateStr: string = '2026-10-15'
): { status: CertExpiryStatus; daysRemaining: number | null } {
  if (!cert.expiryDate) {
    return { status: 'NON_EXPIRING', daysRemaining: null };
  }

  const daysRemaining = getDaysDifference(cert.expiryDate, referenceDateStr);

  if (daysRemaining < 0) {
    return { status: 'EXPIRED', daysRemaining };
  } else if (daysRemaining <= 45) {
    return { status: 'EXPIRING_SOON', daysRemaining };
  } else {
    return { status: 'CURRENT', daysRemaining };
  }
}

export type RecordIndicatorStatus = 'VALID' | 'EXPIRING' | 'EXPIRED' | 'UNVERIFIED';

/**
 * Computes administrative readiness status without ever automatically declaring "fit" or "cleared".
 * Emphasizes administrative status and necessity for human supervisory sign-off.
 */
export function evaluatePersonnelReadiness(
  personnel: PersonnelRecord,
  referenceDateStr: string = '2026-10-15'
): {
  status: AdministrativeReadinessStatus;
  indicator: RecordIndicatorStatus;
  label: string;
  badgeColor: string;
  indicatorBadgeColor: string;
  hasExpiredCerts: boolean;
  hasExpiringSoonCerts: boolean;
  hasUnverified: boolean;
  summaryReason: string;
} {
  const certs = personnel.certifications || [];

  if (certs.length === 0) {
    return {
      status: 'PENDING_INTAKE_DOCS',
      indicator: 'UNVERIFIED',
      label: 'Pending Administrative Documentation',
      badgeColor: 'border-slate-400 bg-slate-100 text-slate-800',
      indicatorBadgeColor: 'bg-purple-50 text-purple-800 border-purple-300',
      hasExpiredCerts: false,
      hasExpiringSoonCerts: false,
      hasUnverified: true,
      summaryReason: 'No certifications or administrative credentials uploaded on file.',
    };
  }

  let hasExpired = false;
  let hasExpiringSoon = false;
  let hasUnverified = personnel.verificationStatus === 'Unverified' || personnel.verificationStatus === 'Pending Verification';

  for (const cert of certs) {
    const { status } = evaluateCertification(cert, referenceDateStr);
    if (status === 'EXPIRED') {
      hasExpired = true;
    } else if (status === 'EXPIRING_SOON') {
      hasExpiringSoon = true;
    }

    if (cert.verificationStatus === 'Unverified' || cert.verificationStatus === 'Pending Verification' || cert.verificationStatus === 'Audit Flagged') {
      hasUnverified = true;
    }
  }

  // Priority 1: Expired qualifications
  if (hasExpired) {
    return {
      status: 'FLAGGED_EXPIRED_CERTS',
      indicator: 'EXPIRED',
      label: 'Action Required: Expired Certification',
      badgeColor: 'border-rose-400 bg-rose-50 text-rose-800',
      indicatorBadgeColor: 'bg-rose-50 text-rose-800 border-rose-300',
      hasExpiredCerts: true,
      hasExpiringSoonCerts: hasExpiringSoon,
      hasUnverified,
      summaryReason: 'One or more mandatory certifications have expired. Re-qualification required.',
    };
  }

  // Priority 2: Unverified credentials
  if (hasUnverified) {
    return {
      status: 'UNVERIFIED_CREDENTIALS',
      indicator: 'UNVERIFIED',
      label: 'Action Required: Unverified Credentials',
      badgeColor: 'border-purple-400 bg-purple-50 text-purple-900',
      indicatorBadgeColor: 'bg-purple-50 text-purple-800 border-purple-300',
      hasExpiredCerts: false,
      hasExpiringSoonCerts: hasExpiringSoon,
      hasUnverified: true,
      summaryReason: 'Credentials pending supervisory intake verification or marked unverified.',
    };
  }

  // Check if supervisor review is overdue (>90 days), or certs expiring soon, or requiresReview flag, or has outstanding requirements
  let reviewOverdue = false;
  if (!personnel.lastSupervisorReviewDate) {
    reviewOverdue = true;
  } else {
    const daysSinceReview = getDaysDifference(referenceDateStr, personnel.lastSupervisorReviewDate);
    if (daysSinceReview > 90) {
      reviewOverdue = true;
    }
  }

  const hasOutstandingReqs = personnel.outstandingRequirements && personnel.outstandingRequirements.length > 0;

  if (hasExpiringSoon || personnel.requiresReview || reviewOverdue || hasOutstandingReqs) {
    const reasonParts = [];
    if (hasExpiringSoon) reasonParts.push('Certifications expiring within 45 days');
    if (hasOutstandingReqs) reasonParts.push(`${personnel.outstandingRequirements.length} administrative requirement(s) pending`);
    if (personnel.requiresReview) reasonParts.push('Flagged for supervisory review');
    if (reviewOverdue) reasonParts.push('Supervisor quarterly audit overdue');

    return {
      status: 'REQUIRES_HUMAN_REVIEW',
      indicator: hasExpiringSoon ? 'EXPIRING' : 'VALID',
      label: 'Human Review Required',
      badgeColor: 'border-amber-400 bg-amber-50 text-amber-900',
      indicatorBadgeColor: hasExpiringSoon ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-teal-50 text-teal-800 border-teal-300',
      hasExpiredCerts: false,
      hasExpiringSoonCerts: hasExpiringSoon,
      hasUnverified: false,
      summaryReason: reasonParts.join('; ') || 'Items pending supervisory officer review.',
    };
  }

  return {
    status: 'DOCS_CURRENT_AWAITING_REVIEW',
    indicator: 'VALID',
    label: 'Documentation Complete — Awaiting Supervisor Sign-off',
    badgeColor: 'border-teal-400 bg-teal-50 text-teal-900',
    indicatorBadgeColor: 'bg-teal-50 text-teal-800 border-teal-300',
    hasExpiredCerts: false,
    hasExpiringSoonCerts: false,
    hasUnverified: false,
    summaryReason: 'All administrative documentation on file is current. Awaiting formal supervisory briefing.',
  };
}

export interface OperationalMetrics {
  totalPersonnel: number;
  expiredCertsCount: number;
  expiringSoonCertsCount: number;
  unverifiedCount: number;
  requiringHumanReviewCount: number;
  docsCurrentCount: number;
  totalTasksCompleted: number;
  totalTasksOutstanding: number;
  overallTaskCompletionRate: number;
}

export function computeOperationalMetrics(
  roster: PersonnelRecord[],
  referenceDateStr: string = '2026-10-15'
): OperationalMetrics {
  let expiredCertsCount = 0;
  let expiringSoonCertsCount = 0;
  let unverifiedCount = 0;
  let requiringHumanReviewCount = 0;
  let docsCurrentCount = 0;
  let totalTasksCompleted = 0;
  let totalTasksOutstanding = 0;

  for (const person of roster) {
    totalTasksCompleted += person.tasksCompleted || 0;
    totalTasksOutstanding += person.tasksOutstanding || 0;

    for (const cert of person.certifications || []) {
      const { status } = evaluateCertification(cert, referenceDateStr);
      if (status === 'EXPIRED') expiredCertsCount++;
      if (status === 'EXPIRING_SOON') expiringSoonCertsCount++;
    }

    const readiness = evaluatePersonnelReadiness(person, referenceDateStr);
    if (readiness.indicator === 'UNVERIFIED' || person.verificationStatus === 'Unverified' || person.verificationStatus === 'Pending Verification') {
      unverifiedCount++;
    }

    if (readiness.status === 'REQUIRES_HUMAN_REVIEW' || readiness.status === 'FLAGGED_EXPIRED_CERTS' || readiness.status === 'UNVERIFIED_CREDENTIALS') {
      requiringHumanReviewCount++;
    } else if (readiness.status === 'DOCS_CURRENT_AWAITING_REVIEW') {
      docsCurrentCount++;
    }
  }

  const totalTasks = totalTasksCompleted + totalTasksOutstanding;
  const overallTaskCompletionRate = totalTasks > 0 ? Math.round((totalTasksCompleted / totalTasks) * 100) : 0;

  return {
    totalPersonnel: roster.length,
    expiredCertsCount,
    expiringSoonCertsCount,
    unverifiedCount,
    requiringHumanReviewCount,
    docsCurrentCount,
    totalTasksCompleted,
    totalTasksOutstanding,
    overallTaskCompletionRate,
  };
}

export const MANDATORY_LEGAL_DISCLAIMER =
  'IMPORTANT ADMINISTRATIVE NOTICE: This readiness summary reports administrative and credential documentation status only. It does not certify combat capability, medical fitness, suitability for deployment, or legal eligibility. Operational assignment requires independent human supervisory determination and qualified authority sign-off.';

/**
 * Generates a plain-English administrative readiness summary for a single personnel record.
 */
export function generatePlainEnglishPersonnelSummary(
  person: PersonnelRecord,
  referenceDateStr: string = '2026-10-15'
): string {
  const readiness = evaluatePersonnelReadiness(person, referenceDateStr);
  const certs = person.certifications || [];
  const reqs = person.outstandingRequirements || [];

  const lines: string[] = [];
  const empId = person.pmcEmployeeId || person.demoId || person.badgeId;
  const callSignText = person.callSign || person.callsign || 'Unassigned';
  const rolesText = (person.roles && person.roles.length > 0) ? person.roles.join(', ') : person.role;
  const specText = (person.specialisations && person.specialisations.length > 0) ? person.specialisations.join(', ') : (person.specialisation || 'General Operations');

  lines.push(`================================================================`);
  lines.push(`ADMINISTRATIVE READINESS SUMMARY: ${person.displayName || person.fullName} [PMC Employee ID: ${empId} | Badge ID: ${person.badgeId}]`);
  lines.push(`Call Sign: ${callSignText}`);
  lines.push(`Operational Role(s): ${rolesText}`);
  lines.push(`Specialisation(s): ${specText}`);
  lines.push(`Sector Assignment: ${person.assignmentSector}`);
  lines.push(`Evaluation Reference Date: ${toDDMMYYYY(referenceDateStr)}`);
  lines.push(`================================================================`);
  lines.push(``);
  lines.push(`1. ADMINISTRATIVE STANDING:`);
  lines.push(`   Status: ${readiness.label}`);
  lines.push(`   Indicator: ${readiness.indicator} (Verification: ${person.verificationStatus})`);
  lines.push(`   Summary: ${readiness.summaryReason}`);
  lines.push(``);

  lines.push(`2. TRAINING & QUALIFICATIONS ON FILE (${certs.length} registered):`);
  if (certs.length === 0) {
    lines.push(`   - No qualifications or credentials uploaded on file.`);
  } else {
    for (const cert of certs) {
      const evalCert = evaluateCertification(cert, referenceDateStr);
      let expiryText = 'Non-expiring / Lifetime qualification';
      if (cert.expiryDate) {
        const expFormatted = toDDMMYYYY(cert.expiryDate);
        if (evalCert.status === 'EXPIRED') {
          expiryText = `EXPIRED on ${expFormatted} (${Math.abs(evalCert.daysRemaining || 0)} days past due)`;
        } else if (evalCert.status === 'EXPIRING_SOON') {
          expiryText = `EXPIRING SOON on ${expFormatted} (${evalCert.daysRemaining} days remaining)`;
        } else {
          expiryText = `Valid through ${expFormatted} (${evalCert.daysRemaining} days remaining)`;
        }
      }
      lines.push(`   * ${cert.name}`);
      lines.push(`     Completed: ${toDDMMYYYY(cert.completionDate)} | ${expiryText}`);
      lines.push(`     Issuer: ${cert.issuer} | Verification: ${cert.verificationStatus} (Ref: ${cert.verificationId})`);
    }
  }
  lines.push(``);

  lines.push(`3. OUTSTANDING ADMINISTRATIVE REQUIREMENTS (${reqs.length} pending):`);
  if (reqs.length === 0) {
    lines.push(`   - All standard administrative prerequisites are documented.`);
  } else {
    for (let i = 0; i < reqs.length; i++) {
      lines.push(`   [ ] ${i + 1}. ${reqs[i]}`);
    }
  }
  lines.push(``);

  lines.push(`4. SUPERVISORY AUDIT & ADMINISTRATIVE NOTES:`);
  lines.push(`   Last Supervisor Audit: ${person.lastSupervisorReviewDate || 'None recorded (Pending intake review)'}`);
  lines.push(`   Auditing Supervisor: ${person.reviewedBy || 'Unassigned'}`);
  lines.push(`   Tasks Tracked: ${person.tasksCompleted} completed / ${person.tasksOutstanding} outstanding`);
  lines.push(`   Notes: ${person.notes || person.administrativeNotes || 'No notes on file.'}`);
  lines.push(``);

  lines.push(`----------------------------------------------------------------`);
  lines.push(MANDATORY_LEGAL_DISCLAIMER);
  lines.push(`----------------------------------------------------------------`);

  return lines.join('\n');
}

/**
 * Generates a plain-English roster overview readiness briefing.
 */
export function generatePlainEnglishRosterSummary(
  roster: PersonnelRecord[],
  referenceDateStr: string = '2026-10-15'
): string {
  const metrics = computeOperationalMetrics(roster, referenceDateStr);
  const lines: string[] = [];

  lines.push(`================================================================`);
  lines.push(`PROTECTION OPERATIONS: ROSTER ADMINISTRATIVE READINESS BRIEFING`);
  lines.push(`Evaluation Reference Date: ${referenceDateStr}`);
  lines.push(`Records Evaluated: ${roster.length} personnel profiles`);
  lines.push(`================================================================`);
  lines.push(``);

  lines.push(`1. EXECUTIVE METRICS & POSTURE:`);
  lines.push(`   - Total Personnel Roster: ${metrics.totalPersonnel}`);
  lines.push(`   - Documentation Current (Awaiting Supervisor Sign-off): ${metrics.docsCurrentCount}`);
  lines.push(`   - Requiring Human Review / Audit Queue: ${metrics.requiringHumanReviewCount}`);
  lines.push(`   - Expired Qualifications: ${metrics.expiredCertsCount}`);
  lines.push(`   - Qualifications Expiring in <45 Days: ${metrics.expiringSoonCertsCount}`);
  lines.push(`   - Unverified / Pending Credentials: ${metrics.unverifiedCount}`);
  lines.push(`   - Overall Task Completion Rate: ${metrics.overallTaskCompletionRate}% (${metrics.totalTasksCompleted} completed / ${metrics.totalTasksOutstanding} outstanding)`);
  lines.push(``);

  lines.push(`2. INDIVIDUAL ADMINISTRATIVE ROSTER BREAKDOWN:`);
  for (const person of roster) {
    const readiness = evaluatePersonnelReadiness(person, referenceDateStr);
    const empId = person.pmcEmployeeId || person.demoId || person.badgeId;
    const callSignText = person.callSign || person.callsign || 'Unassigned';
    const roleText = (person.roles && person.roles.length > 0) ? person.roles.join(', ') : person.role;
    lines.push(`   * [PMC ID: ${empId} | Call Sign: ${callSignText}] ${person.displayName || person.fullName} (${roleText})`);
    lines.push(`     Specialisation: ${person.specialisation || (person.specialisations && person.specialisations.join(', ')) || 'General Operations'}`);
    lines.push(`     Status: ${readiness.label} [${readiness.indicator}]`);
    lines.push(`     Verification: ${person.verificationStatus}`);
    if (person.outstandingRequirements && person.outstandingRequirements.length > 0) {
      lines.push(`     Outstanding Requirements: ${person.outstandingRequirements.join('; ')}`);
    } else {
      lines.push(`     Outstanding Requirements: None on file`);
    }
  }
  lines.push(``);

  lines.push(`3. SUPERVISORY ACTION REQUIRED:`);
  lines.push(`   - All expired and unverified entries require physical credential intake and human signature.`);
  lines.push(`   - Incomplete administrative requirements must be resolved prior to briefing sign-off.`);
  lines.push(``);

  lines.push(`----------------------------------------------------------------`);
  lines.push(MANDATORY_LEGAL_DISCLAIMER);
  lines.push(`----------------------------------------------------------------`);

  return lines.join('\n');
}
