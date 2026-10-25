import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCyberPosture,
  generateCyberHygieneSummary,
  CYBER_LEGAL_DISCLAIMER,
} from './cyberHygieneRules.ts';
import type { CyberHygieneItem } from '../types/index.ts';

test('computeCyberPosture calculates completion rate and distinguishes verified findings from general recommendations', () => {
  const sampleItems: CyberHygieneItem[] = [
    {
      id: 'c1',
      domain: 'Device and operating-system updates',
      title: 'OS Patches',
      recommendation: 'Update devices.',
      plainEnglishExplanation: 'Fixes bugs.',
      status: 'Completed',
      itemType: 'Verified Finding',
      findingNotes: 'Verified on Oct 14.',
      lastChecked: '2026-10-14',
      verifiedBy: 'Sec Officer',
    },
    {
      id: 'c2',
      domain: 'Multi-factor authentication',
      title: 'Hardware Token MFA',
      recommendation: 'Use hardware keys.',
      plainEnglishExplanation: 'Stops phishing.',
      status: 'Completed',
      itemType: 'General Recommendation',
      findingNotes: '',
      lastChecked: '2026-10-12',
      verifiedBy: null,
    },
    {
      id: 'c3',
      domain: 'Backup and recovery checks',
      title: 'Cold Storage Backup Test',
      recommendation: 'Verify restore.',
      plainEnglishExplanation: 'Ensures data recovery.',
      status: 'Outstanding',
      itemType: 'Verified Finding',
      findingNotes: 'Q3 restore drill pending.',
      lastChecked: '2026-10-01',
      verifiedBy: 'Auditor',
    },
  ];

  const metrics = computeCyberPosture(sampleItems);
  assert.equal(metrics.totalItems, 3);
  assert.equal(metrics.completedCount, 2);
  assert.equal(metrics.outstandingCount, 1);
  assert.equal(metrics.completionPercentage, 67);
  assert.equal(metrics.verifiedFindingsCount, 2);
  assert.equal(metrics.generalRecommendationsCount, 1);
  assert.equal(metrics.outstandingFindingsCount, 1);
});

test('generateCyberHygieneSummary outputs plain-English text with mandatory defensive disclaimer', () => {
  const sampleItems: CyberHygieneItem[] = [
    {
      id: 'c1',
      domain: 'Phishing awareness',
      title: 'Suspicious Email Drills',
      recommendation: 'Check sender address.',
      plainEnglishExplanation: 'Prevents credential leaks.',
      status: 'Outstanding',
      itemType: 'Verified Finding',
      findingNotes: 'Scheduled drill for team.',
      lastChecked: '2026-10-15',
      verifiedBy: 'Sec Lead',
    },
  ];

  const summary = generateCyberHygieneSummary(sampleItems, '2026-10-15');
  assert.match(summary, /DEFENSIVE CYBERSECURITY HYGIENE AUDIT BRIEFING/);
  assert.match(summary, /Phishing awareness/);
  assert.match(summary, /\[VERIFIED FINDING\]/);
  assert.match(summary, /Prevents credential leaks/);
  assert.ok(summary.includes(CYBER_LEGAL_DISCLAIMER));
  assert.match(summary, /No active vulnerability scans/i);
});
