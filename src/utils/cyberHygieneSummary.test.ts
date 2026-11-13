import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCyberHygieneMetrics,
  generateCyberHygieneSummary,
  ALL_CYBER_DOMAINS,
} from './cyberHygieneSummary.ts';
import type { CyberHygieneItem } from '../types/index.ts';

const SAMPLE_ITEMS: CyberHygieneItem[] = [
  {
    id: 'test-01',
    domain: 'Device and operating-system updates',
    title: 'OS Patches',
    recommendation: 'Update devices regularly',
    plainEnglishExplanation: 'Fixes software holes',
    status: 'Completed',
    itemType: 'Verified Finding',
    findingNotes: 'All updated',
    lastChecked: '2026-10-14',
    verifiedBy: 'Auditor A',
  },
  {
    id: 'test-02',
    domain: 'Password-manager usage',
    title: 'Password Vault',
    recommendation: 'Use password manager',
    plainEnglishExplanation: 'Prevents password reuse',
    status: 'Outstanding',
    itemType: 'Verified Finding',
    findingNotes: 'Two accounts missing vaults',
    lastChecked: '2026-10-13',
    verifiedBy: 'Auditor B',
  },
  {
    id: 'test-03',
    domain: 'Phishing awareness',
    title: 'Phishing Training',
    recommendation: 'Conduct training',
    plainEnglishExplanation: 'Teaches people to spot fake emails',
    status: 'Completed',
    itemType: 'General Recommendation',
    findingNotes: 'Training completed',
    lastChecked: '2026-10-10',
    verifiedBy: 'Auditor C',
  },
];

test('computeCyberHygieneMetrics accurately calculates statistics', () => {
  const metrics = computeCyberHygieneMetrics(SAMPLE_ITEMS);

  assert.equal(metrics.totalCount, 3);
  assert.equal(metrics.completedCount, 2);
  assert.equal(metrics.outstandingCount, 1);
  assert.equal(metrics.complianceRate, 67); // Math.round(2/3 * 100)
  assert.equal(metrics.verifiedFindingsCount, 2);
  assert.equal(metrics.verifiedCompletedCount, 1);
  assert.equal(metrics.verifiedOutstandingCount, 1);
  assert.equal(metrics.generalRecsCount, 1);
  assert.equal(metrics.generalCompletedCount, 1);
  assert.equal(metrics.generalOutstandingCount, 0);
  assert.equal(metrics.domainsCoveredCount, 3);
});

test('ALL_CYBER_DOMAINS contains exactly 10 requested areas', () => {
  assert.equal(ALL_CYBER_DOMAINS.length, 10);
  assert.ok(ALL_CYBER_DOMAINS.includes('Device and operating-system updates'));
  assert.ok(ALL_CYBER_DOMAINS.includes('Multi-factor authentication'));
  assert.ok(ALL_CYBER_DOMAINS.includes('Password-manager usage'));
  assert.ok(ALL_CYBER_DOMAINS.includes('Phishing awareness'));
  assert.ok(ALL_CYBER_DOMAINS.includes('Secure handling of documents'));
  assert.ok(ALL_CYBER_DOMAINS.includes('Lost-device reporting'));
  assert.ok(ALL_CYBER_DOMAINS.includes('Account access reviews'));
  assert.ok(ALL_CYBER_DOMAINS.includes('Backup and recovery checks'));
  assert.ok(ALL_CYBER_DOMAINS.includes('Suspicious-activity reporting'));
  assert.ok(ALL_CYBER_DOMAINS.includes('Basic incident escalation'));
});

test('generateCyberHygieneSummary produces plain-English briefing text', () => {
  const summary = generateCyberHygieneSummary(SAMPLE_ITEMS, '2026-10-15');

  assert.ok(summary.includes('DEFENSIVE CYBERSECURITY HYGIENE EXECUTIVE BRIEFING'));
  assert.ok(summary.includes('Overall Defensive Compliance Score: 67%'));
  assert.ok(summary.includes('VERIFIED OPERATIONAL FINDINGS'));
  assert.ok(summary.includes('Password Vault'));
  assert.ok(summary.includes('Plain-English Rationale'));
  assert.ok(summary.includes('ADMINISTRATIVE NOTICE & SAFETY BOUNDARY'));
});
