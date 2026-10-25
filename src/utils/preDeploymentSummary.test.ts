import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePreDeploymentMetrics,
  generatePreDeploymentSummaryText,
  ALL_PREDEPLOYMENT_CATEGORIES,
} from './preDeploymentSummary.ts';
import type { PreDeploymentChecklistItem } from '../types/index.ts';

const SAMPLE_ITEMS: PreDeploymentChecklistItem[] = [
  {
    id: 't-1',
    category: 'Required documentation and approvals',
    task: 'Host Nation Travel Authorisation on File',
    description: 'Verify diplomatic notification filed.',
    status: 'Complete',
    priority: 'High',
    requiresHumanReview: true,
    reviewedBy: 'Director S. Holloway',
  },
  {
    id: 't-2',
    category: 'Training and certification validity',
    task: 'Defensive Driving Certification Audit',
    description: 'Ensure driver credentials active.',
    status: 'Incomplete',
    priority: 'High',
    requiresHumanReview: true,
    reviewedBy: null,
  },
  {
    id: 't-3',
    category: 'Emergency contacts and escalation arrangements',
    task: 'Emergency Hospital Contact Verification',
    description: 'Confirm direct triage line.',
    status: 'Complete',
    priority: 'Medium',
    requiresHumanReview: false,
    reviewedBy: null,
  },
  {
    id: 't-4',
    category: 'First-aid and emergency preparedness documentation',
    task: 'Trauma Kit IFAK Expiry Inspection',
    description: 'Inspect trauma dressings and seal.',
    status: 'Complete',
    priority: 'High',
    requiresHumanReview: true,
    reviewedBy: 'Marcus Vance',
  },
  {
    id: 't-5',
    category: 'Equipment inventory and condition records',
    task: 'Radio Encrypted Frequency Diagnostic',
    description: 'Run keycheck test.',
    status: 'Complete',
    priority: 'Medium',
    requiresHumanReview: false,
    reviewedBy: null,
  },
  {
    id: 't-6',
    category: 'Device and communications security checks',
    task: 'MDM Remote Wipe & Disk Encryption Check',
    description: 'Verify field laptops BitLocker.',
    status: 'Complete',
    priority: 'High',
    requiresHumanReview: true,
    reviewedBy: 'Director S. Holloway',
  },
  {
    id: 't-7',
    category: 'Required briefings and acknowledgements',
    task: 'Pre-Assignment Conduct Briefing Signed',
    description: 'All 4 escort officers signed acknowledgements.',
    status: 'Not Applicable',
    priority: 'Low',
    requiresHumanReview: false,
    reviewedBy: null,
  },
  {
    id: 't-8',
    category: "Outstanding issues requiring a supervisor's review",
    task: 'Secondary Vehicle Backup Driver Credential Waiver',
    description: 'Review contractor credentials before dispatch.',
    status: 'Incomplete',
    priority: 'High',
    requiresHumanReview: true,
    reviewedBy: null,
  },
];

test('preDeploymentSummary: verify all 8 categories are present', () => {
  assert.equal(ALL_PREDEPLOYMENT_CATEGORIES.length, 8);
  assert.ok(ALL_PREDEPLOYMENT_CATEGORIES.includes('Required documentation and approvals'));
  assert.ok(ALL_PREDEPLOYMENT_CATEGORIES.includes('Training and certification validity'));
  assert.ok(ALL_PREDEPLOYMENT_CATEGORIES.includes('Emergency contacts and escalation arrangements'));
  assert.ok(ALL_PREDEPLOYMENT_CATEGORIES.includes('First-aid and emergency preparedness documentation'));
  assert.ok(ALL_PREDEPLOYMENT_CATEGORIES.includes('Equipment inventory and condition records'));
  assert.ok(ALL_PREDEPLOYMENT_CATEGORIES.includes('Device and communications security checks'));
  assert.ok(ALL_PREDEPLOYMENT_CATEGORIES.includes('Required briefings and acknowledgements'));
  assert.ok(ALL_PREDEPLOYMENT_CATEGORIES.includes("Outstanding issues requiring a supervisor's review"));
});

test('preDeploymentSummary: computePreDeploymentMetrics calculates correct counts', () => {
  const metrics = computePreDeploymentMetrics(SAMPLE_ITEMS);
  assert.equal(metrics.totalCount, 8);
  assert.equal(metrics.completeCount, 5);
  assert.equal(metrics.incompleteCount, 2);
  assert.equal(metrics.notApplicableCount, 1);
  // Eligible = 8 - 1 = 7. 5 / 7 = 71%
  assert.equal(metrics.completionRate, 71);
  assert.equal(metrics.reviewedCount, 3);
  assert.equal(metrics.pendingReviewCount, 2);
  assert.equal(metrics.outstandingItems.length, 2);
});

test('preDeploymentSummary: generates report text with prominent outstanding section and mandatory non-authorization notice', () => {
  const report = generatePreDeploymentSummaryText(SAMPLE_ITEMS);

  assert.ok(report.includes('PRE-DEPLOYMENT ADMINISTRATIVE & READINESS REVIEW SUMMARY'));
  assert.ok(report.includes('PROMINENT OUTSTANDING ISSUES REQUIRING SUPERVISOR ATTENTION'));
  assert.ok(report.includes('Secondary Vehicle Backup Driver Credential Waiver'));
  assert.ok(report.includes('MANDATORY REGULATORY & NON-AUTHORISATION DISCLAIMER'));
  assert.ok(report.includes('MUST NEVER state or imply'));
  assert.ok(report.includes('approved solely because'));
  assert.ok(report.includes('checklist items are complete'));
  assert.ok(report.includes('HUMAN SUPERVISOR SIGN-OFF RECORD'));
});
