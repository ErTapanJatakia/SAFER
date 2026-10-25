import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDaysDifference,
  evaluateCertification,
  evaluatePersonnelReadiness,
  computeOperationalMetrics,
  generatePlainEnglishPersonnelSummary,
  generatePlainEnglishRosterSummary,
  MANDATORY_LEGAL_DISCLAIMER,
} from './readinessRules.ts';
import type { QualificationItem, PersonnelRecord } from '../types/index.ts';

test('getDaysDifference computes correct delta', () => {
  assert.equal(getDaysDifference('2026-10-20', '2026-10-15'), 5);
  assert.equal(getDaysDifference('2026-10-10', '2026-10-15'), -5);
  assert.equal(getDaysDifference('2026-10-15', '2026-10-15'), 0);
});

test('evaluateCertification handles expired, expiring soon, current, and non-expiring', () => {
  const expiredCert: QualificationItem = {
    id: 'c1',
    name: 'First Aid / CPR / AED Advanced',
    completionDate: '2024-01-01',
    expiryDate: '2026-09-30',
    verificationStatus: 'Verified',
    issuer: 'Red Cross Professional Safety',
    verificationId: 'RC-9921',
  };
  const resExpired = evaluateCertification(expiredCert, '2026-10-15');
  assert.equal(resExpired.status, 'EXPIRED');
  assert.ok(resExpired.daysRemaining !== null && resExpired.daysRemaining < 0);

  const expiringSoonCert: QualificationItem = {
    id: 'c2',
    name: 'Defensive Driving & Route Recon',
    completionDate: '2024-11-01',
    expiryDate: '2026-11-10', // 26 days away
    verificationStatus: 'Verified',
    issuer: 'Security Driver Training Institute',
    verificationId: 'SDI-4410',
  };
  const resExpiring = evaluateCertification(expiringSoonCert, '2026-10-15');
  assert.equal(resExpiring.status, 'EXPIRING_SOON');
  assert.equal(resExpiring.daysRemaining, 26);

  const currentCert: QualificationItem = {
    id: 'c3',
    name: 'Defensive Cyber Hygiene & COMSEC',
    completionDate: '2026-01-15',
    expiryDate: '2027-01-15',
    verificationStatus: 'Verified',
    issuer: 'Defensive Cyber Operations Council',
    verificationId: 'CYB-8832',
  };
  const resCurrent = evaluateCertification(currentCert, '2026-10-15');
  assert.equal(resCurrent.status, 'CURRENT');

  const lifetimeCert: QualificationItem = {
    id: 'c4',
    name: 'Crisis De-escalation & Conflict Resolution Core',
    completionDate: '2025-05-10',
    expiryDate: null, // Non-expiring
    verificationStatus: 'Verified',
    issuer: 'National De-escalation Registry',
    verificationId: 'NDR-001',
  };
  const resLifetime = evaluateCertification(lifetimeCert, '2026-10-15');
  assert.equal(resLifetime.status, 'NON_EXPIRING');
  assert.equal(resLifetime.daysRemaining, null);
});

test('evaluatePersonnelReadiness computes correct indicators (VALID, EXPIRING, EXPIRED, UNVERIFIED)', () => {
  const baseRecord: PersonnelRecord = {
    id: 'p1',
    demoId: 'DEMO-01',
    pmcEmployeeId: 'PMC-ID-001',
    badgeId: 'SEC-101',
    fullName: 'Alex Vance',
    displayName: 'Alex Vance',
    callsign: 'Apex-1',
    callSign: 'Apex-1',
    role: 'Protection Officer',
    specialisation: 'Executive Close Protection',
    assignmentSector: 'Sector Alpha (Metropolitan)',
    contactEmail: 'alex.v@shieldprot.demo',
    certifications: [
      {
        id: 'c1',
        name: 'First Aid / CPR / AED Advanced',
        completionDate: '2024-01-01',
        expiryDate: '2026-08-15', // expired
        verificationStatus: 'Verified',
        issuer: 'Demo Safety Board',
        verificationId: 'V-1',
      },
    ],
    verificationStatus: 'Verified',
    outstandingRequirements: ['Practical re-assessment scheduled'],
    administrativeNotes: 'Annual renewal scheduled.',
    notes: 'In progress.',
    lastSupervisorReviewDate: '2026-09-01',
    reviewedBy: 'Capt. R. Miller',
    tasksCompleted: 4,
    tasksOutstanding: 2,
    requiresReview: false,
  };

  const statusExpired = evaluatePersonnelReadiness(baseRecord, '2026-10-15');
  assert.equal(statusExpired.indicator, 'EXPIRED');
  assert.equal(statusExpired.status, 'FLAGGED_EXPIRED_CERTS');

  // Test UNVERIFIED
  const unverifiedRecord: PersonnelRecord = {
    ...baseRecord,
    certifications: [
      {
        id: 'c2',
        name: 'Executive Protection & Escort Protocols',
        completionDate: '2026-01-01',
        expiryDate: '2028-01-01',
        verificationStatus: 'Pending Verification',
        issuer: 'Board',
        verificationId: 'V-2',
      },
    ],
    verificationStatus: 'Pending Verification',
  };
  const statusUnverified = evaluatePersonnelReadiness(unverifiedRecord, '2026-10-15');
  assert.equal(statusUnverified.indicator, 'UNVERIFIED');
  assert.equal(statusUnverified.status, 'UNVERIFIED_CREDENTIALS');

  // Test VALID
  const validRecord: PersonnelRecord = {
    ...baseRecord,
    certifications: [
      {
        id: 'c3',
        name: 'Executive Protection & Escort Protocols',
        completionDate: '2026-01-01',
        expiryDate: '2028-01-01',
        verificationStatus: 'Verified',
        issuer: 'Board',
        verificationId: 'V-3',
      },
    ],
    outstandingRequirements: [],
    verificationStatus: 'Verified',
    lastSupervisorReviewDate: '2026-10-01',
  };
  const statusValid = evaluatePersonnelReadiness(validRecord, '2026-10-15');
  assert.equal(statusValid.indicator, 'VALID');
  assert.equal(statusValid.status, 'DOCS_CURRENT_AWAITING_REVIEW');
});

test('generatePlainEnglishPersonnelSummary satisfies safety boundary and disclaimers', () => {
  const samplePerson: PersonnelRecord = {
    id: 'p-test',
    demoId: 'DEMO-99',
    pmcEmployeeId: 'PMC-ID-099',
    badgeId: 'PRO-9999',
    fullName: 'Morgan Blake',
    displayName: 'Morgan Blake',
    callsign: 'Sentinel-Lead',
    callSign: 'Sentinel-Lead',
    role: 'Team Lead',
    specialisation: 'High-Risk Convoy Navigation & Logistics',
    assignmentSector: 'Sector Bravo (Transit)',
    contactEmail: 'morgan.b@demo.local',
    certifications: [
      {
        id: 'c-test',
        name: 'Defensive Driving & Route Recon',
        completionDate: '2025-02-10',
        expiryDate: '2027-02-10',
        verificationStatus: 'Verified',
        issuer: 'Driver Training Academy',
        verificationId: 'DTA-882',
      },
    ],
    verificationStatus: 'Verified',
    outstandingRequirements: ['Radio frequency sign-off scan', 'Travel visa page photocopy'],
    administrativeNotes: 'Records verified by supervisor.',
    notes: 'Ready for quarterly review.',
    lastSupervisorReviewDate: '2026-10-05',
    reviewedBy: 'Director Holloway',
    tasksCompleted: 12,
    tasksOutstanding: 2,
    requiresReview: false,
  };

  const summary = generatePlainEnglishPersonnelSummary(samplePerson, '2026-10-15');

  // Verify header and contents
  assert.match(summary, /ADMINISTRATIVE READINESS SUMMARY/);
  assert.match(summary, /Morgan Blake/);
  assert.match(summary, /PMC-ID-099/);
  assert.match(summary, /Call Sign/);
  assert.match(summary, /Defensive Driving & Route Recon/);
  assert.match(summary, /Radio frequency sign-off scan/);

  // CRITICAL REQUIREMENT: Must contain the mandatory legal disclaimer
  assert.ok(summary.includes(MANDATORY_LEGAL_DISCLAIMER));
  assert.match(summary, /does not certify combat capability/i);
  assert.match(summary, /medical fitness/i);
  assert.match(summary, /suitability for deployment/i);
  assert.match(summary, /legal eligibility/i);
});
