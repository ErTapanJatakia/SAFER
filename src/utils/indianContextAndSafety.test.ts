import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_INCIDENTS } from '../data/mockData.ts';
import { SAMPLE_INCIDENT_PRESETS, generateStructuredIncidentDraft, INCIDENT_LEGAL_DISCLAIMER } from './incidentDraftGenerator.ts';
import { applyRedactionsToPerson, getSafeExportFilename } from './personnelExport.ts';
import { INDIAN_PERSONNEL_DATA } from '../data/indianPersonnel.ts';
import { isValidDDMMYYYY } from './dateUtils.ts';

test('Indian Context: INITIAL_INCIDENTS covers all 8 specified operational scenarios', () => {
  assert.equal(INITIAL_INCIDENTS.length, 8, 'Must have exactly 8 preloaded Indian demonstration incidents');

  const titles = INITIAL_INCIDENTS.map((i) => i.title.toLowerCase()).join(' ');
  const summaries = INITIAL_INCIDENTS.map((i) => i.summary.toLowerCase()).join(' ');
  const combined = `${titles} ${summaries}`;

  // 1. Unreturned access badge
  assert.ok(combined.includes('unreturned') || combined.includes('badge #v-108'), 'Must cover unreturned access badge');

  // 2. Visitor-log discrepancy
  assert.ok(combined.includes('visitor') && combined.includes('discrepancy'), 'Must cover visitor log discrepancy');

  // 3. Missing equipment inventory item
  assert.ok(combined.includes('missing') && (combined.includes('transceiver') || combined.includes('radio')), 'Must cover missing inventory item');

  // 4. Suspicious email reported by employee
  assert.ok(combined.includes('phishing') || combined.includes('suspicious') && combined.includes('email'), 'Must cover suspicious email reported');

  // 5. Overdue equipment maintenance record
  assert.ok(combined.includes('overdue') && (combined.includes('maintenance') || combined.includes('generator')), 'Must cover overdue maintenance');

  // 6. Lost company device requiring administrative incident report
  assert.ok(combined.includes('lost') && (combined.includes('handset') || combined.includes('device') || combined.includes('smartphone')), 'Must cover lost device');

  // 7. Incomplete handover log
  assert.ok(combined.includes('handover') && combined.includes('log'), 'Must cover incomplete handover log');

  // 8. Safety checklist with outstanding corrective actions
  assert.ok(combined.includes('corridor') || combined.includes('exit') || combined.includes('safety checklist'), 'Must cover safety checklist follow-up');
});

test('Indian Context: All preloaded incidents use Indian locations, DD-MM-YYYY dates and IST times', () => {
  for (const inc of INITIAL_INCIDENTS) {
    // Check Indian states/UT references across locations
    const hasIndianGeo = /Karnataka|Haryana|Telangana|Maharashtra|West Bengal|Uttar Pradesh|Tamil Nadu|Delhi|Bengaluru|Gurugram|Hyderabad|Mumbai|Kolkata|Noida|Pune|Chennai/i.test(inc.location);
    assert.ok(hasIndianGeo, `Incident ${inc.id} must reference a plausible Indian location: ${inc.location}`);

    // Check date format: DD-MM-YYYY and IST time
    assert.match(inc.dateReported, /^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}\s+IST$/, `Incident ${inc.id} must be DD-MM-YYYY HH:mm IST, got: ${inc.dateReported}`);

    const datePart = inc.dateReported.split(' ')[0];
    assert.ok(isValidDDMMYYYY(datePart), `Date ${datePart} must be a valid calendar date`);

    // Reporter must use Call Sign or PMC ID
    assert.ok(inc.reportedBy.includes('Call Sign:') || inc.reportedBy.includes('PMC-ID-'), `Reporter must include Call Sign or PMC-ID: ${inc.reportedBy}`);

    // No visible fictional labels in title, location, or summary
    assert.ok(!inc.title.toLowerCase().includes('fictional'), `Title must not say fictional: ${inc.title}`);
    assert.ok(!inc.location.toLowerCase().includes('fictional'), `Location must not say fictional: ${inc.location}`);
    assert.ok(!inc.summary.toLowerCase().includes('fictional'), `Summary must not say fictional: ${inc.summary}`);
  }
});

test('Factual Reporting: Incident assistant preserves facts, flags missing info and never fabricates', () => {
  const rawNotes = `Date/Time: 14-10-2026 18:30 IST.
Location: Static Facility Gate 2, Electronics City Phase 1, Bengaluru, Karnataka.
People involved: Security Operations Officer Priya Nair [Call Sign: DRONA-LEAD].
Account: Officer noted badge missing during shift reconciliation. Contractor claimed they left it in their locker.
Actions taken: Electronic access revoked immediately.`;

  const draft = generateStructuredIncidentDraft(rawNotes, 'IR-TEST-INDIA-01');

  // 1. Separate reported facts from unverified claims
  assert.equal(draft.unverifiedClaims?.length, 1);
  assert.ok(draft.unverifiedClaims![0].includes('claimed'));
  assert.ok(draft.factualChronologicalAccount.length > 0);

  // 2. Preserve source timestamps and wording
  assert.match(draft.dateTime, /14-10-2026 18:30 IST/);
  assert.match(draft.locationDescription, /Bengaluru, Karnataka/);

  // 3. Mark missing information cleanly without fabricating
  assert.match(draft.witnessInformation || '', /\[NO WITNESS INFORMATION PROVIDED/);
  assert.ok(draft.evidenceReferences.some((e) => e.includes('[NO EVIDENCE REFERENCES PROVIDED')));

  // 4. Follow-up items require human review
  assert.ok(draft.followUpActionsRequiringHumanReview.length > 0);
  assert.ok(draft.followUpActionsRequiringHumanReview.some((f) => /supervising|supervisory|review/i.test(f)));
});

test('Privacy & Redaction: Safe filenames and granular field masking', () => {
  const person = INDIAN_PERSONNEL_DATA[0];

  // 1. Safe filename does not contain private sensitive data
  const safePdfName = getSafeExportFilename(person, 'pdf');
  assert.match(safePdfName, /^PMC-ID-001_personnel_record_\d{4}-\d{2}-\d{2}\.pdf$/);
  assert.ok(!safePdfName.includes('Veer'));
  assert.ok(!safePdfName.includes('@'));

  // 2. Granular field redaction
  const redactedKeys = new Set(['personalEmail', 'healthParticulars', 'residenceAddress', 'contactEmail']);
  const clone = applyRedactionsToPerson(person, redactedKeys);

  assert.equal(clone.personalEmail, '[REDACTED]');
  assert.equal(clone.healthParticulars, '[REDACTED]');
  assert.equal(clone.contactEmail, '[REDACTED]');
  assert.equal(clone.residenceAddress?.addressLine, '[REDACTED]');
  assert.equal(clone.residenceAddress?.city, '[REDACTED]');

  // Non-redacted fields remain intact
  assert.equal(clone.fullName, person.fullName);
  assert.equal(clone.pmcEmployeeId, 'PMC-ID-001');
  assert.equal(clone.callSign, 'Sher-Lead');
});

test('Cross-Application Consistency: Call Sign and PMC Employee ID consistency across roster', () => {
  for (const p of INDIAN_PERSONNEL_DATA) {
    assert.match(p.pmcEmployeeId, /^PMC-ID-\d{3}$/, `PMC Employee ID must match PMC-ID-XXX: ${p.pmcEmployeeId}`);
    assert.ok(p.callSign && p.callSign.trim().length > 0, `Call Sign must be present: ${p.fullName}`);
    assert.ok(Array.isArray(p.roles) && p.roles.length > 0, `Multiple roles array must be populated for ${p.fullName}`);
    assert.ok(Array.isArray(p.specialisations) && p.specialisations.length > 0, `Specialisations array must be populated for ${p.fullName}`);
  }
});
