import test from 'node:test';
import assert from 'node:assert/strict';
import type { PersonnelRecord } from '../types/index.ts';
import {
  getPersonnelExportableFields,
  getRosterExportableFields,
  applyRedactionsToPerson,
  getSafeExportFilename,
  generateTxtExport,
  generateCsvExport,
  generateXlsxExport,
  generatePdfExport,
  generateDocxExport,
  EXPORT_LEGAL_DISCLAIMER,
} from './personnelExport.ts';

const SAMPLE_TEST_PERSON: PersonnelRecord = {
  id: 'pr-test-01',
  pmcEmployeeId: 'PMC-ID-001',
  demoId: 'PMC-ID-001',
  badgeId: 'PMC-ID-8812',
  fullName: 'Veer Bahadur Singh',
  displayName: 'Veer Bahadur Singh',
  callSign: 'Sher-Lead',
  role: 'Security Team Leader',
  roles: ['Security Team Leader', 'Close Protection Officer'],
  specialisation: 'Close Protection & Executive Protection',
  specialisations: ['Close Protection', 'Executive Protection'],
  assignmentSector: 'Sector Alpha (Metropolitan)',
  contactEmail: 'veer.singh@pmc-protops.example.org',
  personalEmail: 'veer-bahadur@email.com',
  birthDate: '14-08-1988',
  maritalStatus: 'Married',
  bloodGroup: 'B+',
  healthParticulars: 'Nil known chronic illnesses. Annual protective endurance exam cleared.',
  residenceAddress: {
    addressLine: 'Plot 42, Sector 17-C, Defence Enclave',
    city: 'Chandigarh',
    state: 'Punjab',
    postalCode: '160017',
    country: 'India',
  },
  correspondenceAddress: {
    addressLine: 'Plot 42, Sector 17-C, Defence Enclave',
    city: 'Chandigarh',
    state: 'Punjab',
    postalCode: '160017',
    country: 'India',
  },
  sameAsResidenceAddress: true,
  workExperience: [
    {
      id: 'we-1',
      employerName: 'Apex Protective Security Services Pvt Ltd',
      employerAddress: 'Barakhamba Road, Connaught Place, New Delhi 110001, India',
      employerContactNumbers: '+91 11 2341 8899',
      startDate: '01-04-2019',
      endDate: '',
      currentlyWorkingHere: true,
      workDescription: 'Lead protective detail supervisor managing corporate principal security.',
      skillsInUse: 'Close Protection, Motorcade Recon',
    },
    {
      id: 'we-2',
      employerName: 'Northern Shield Security Logistics',
      employerAddress: 'Sector 34-A, Chandigarh 160022, India',
      employerContactNumbers: '+91 172 260 4455',
      startDate: '15-06-2013',
      endDate: '28-02-2019',
      currentlyWorkingHere: false,
      workDescription: 'Senior protective security operative.',
      skillsInUse: 'Physical Security, Venue Screening',
    },
  ],
  certifications: [
    {
      id: 'cert-1',
      name: 'Executive Protection & Escort Protocols',
      completionDate: '10-04-2025',
      expiryDate: '10-04-2027',
      verificationStatus: 'Verified',
      issuer: 'Global Protection Standards Board',
      verificationId: 'GPSB-9941-EP',
    },
  ],
  verificationStatus: 'Verified',
  outstandingRequirements: ['Submit updated biennial hearing exam certification scan'],
  administrativeNotes: 'Annual medical documentation on file.',
  notes: 'Team Lead with 11+ years experience in corporate principal protective details.',
  lastSupervisorReviewDate: '18-09-2026',
  reviewedBy: 'Director S. Holloway',
  tasksCompleted: 8,
  tasksOutstanding: 1,
  requiresReview: false,
};

test('getPersonnelExportableFields extracts all fields and employers', () => {
  const fields = getPersonnelExportableFields(SAMPLE_TEST_PERSON);
  assert.ok(fields.length > 20);

  // Check that sensitive fields are marked isSensitive
  const pmcField = fields.find((f) => f.key === 'pmcEmployeeId');
  assert.ok(pmcField);
  assert.equal(pmcField.isSensitive, true);

  const personalEmailField = fields.find((f) => f.key === 'personalEmail');
  assert.ok(personalEmailField);
  assert.equal(personalEmailField.isSensitive, true);

  const healthField = fields.find((f) => f.key === 'healthParticulars');
  assert.ok(healthField);
  assert.equal(healthField.isSensitive, true);

  // Check repeatable employers
  const emp1Name = fields.find((f) => f.key === 'workExperience[0].employerName');
  assert.ok(emp1Name);
  const emp2Name = fields.find((f) => f.key === 'workExperience[1].employerName');
  assert.ok(emp2Name);

  const emp1Phone = fields.find((f) => f.key === 'workExperience[0].employerContactNumbers');
  assert.ok(emp1Phone);
  assert.equal(emp1Phone.isSensitive, true);
});

test('applyRedactionsToPerson produces redacted clone without mutating original', () => {
  const redactedKeys = new Set<string>([
    'personalEmail',
    'healthParticulars',
    'workExperience[0].employerContactNumbers',
    'residenceAddress.addressLine',
  ]);

  const cloned = applyRedactionsToPerson(SAMPLE_TEST_PERSON, redactedKeys);

  // Cloned should have [REDACTED]
  assert.equal(cloned.personalEmail, '[REDACTED]');
  assert.equal(cloned.healthParticulars, '[REDACTED]');
  assert.equal(cloned.residenceAddress?.addressLine, '[REDACTED]');
  assert.equal(cloned.workExperience?.[0].employerContactNumbers, '[REDACTED]');

  // Non-redacted should remain original
  assert.equal(cloned.fullName, 'Veer Bahadur Singh');
  assert.equal(cloned.callSign, 'Sher-Lead');
  assert.equal(cloned.workExperience?.[0].employerName, 'Apex Protective Security Services Pvt Ltd');
  assert.equal(cloned.workExperience?.[1].employerContactNumbers, '+91 172 260 4455');

  // ORIGINAL RECORD MUST BE UNTOUCHED
  assert.equal(SAMPLE_TEST_PERSON.personalEmail, 'veer-bahadur@email.com');
  assert.equal(SAMPLE_TEST_PERSON.healthParticulars, 'Nil known chronic illnesses. Annual protective endurance exam cleared.');
  assert.equal(SAMPLE_TEST_PERSON.residenceAddress?.addressLine, 'Plot 42, Sector 17-C, Defence Enclave');
  assert.equal(SAMPLE_TEST_PERSON.workExperience?.[0].employerContactNumbers, '+91 11 2341 8899');
});

test('getSafeExportFilename creates non-sensitive filenames', () => {
  const filename = getSafeExportFilename(SAMPLE_TEST_PERSON, 'pdf', '2026-10-18');
  assert.equal(filename, 'PMC-ID-001_personnel_record_2026-10-18.pdf');
  assert.ok(!filename.includes('@'));
  assert.ok(!filename.includes('Chandigarh'));
  assert.ok(!filename.includes('veer-bahadur'));
});

test('generateTxtExport produces clear sections with redacted and non-redacted fields', () => {
  const redactedKeys = new Set<string>(['personalEmail', 'healthParticulars']);
  const txt = generateTxtExport(SAMPLE_TEST_PERSON, redactedKeys);

  assert.ok(txt.includes('Veer Bahadur Singh'));
  assert.ok(txt.includes('Sher-Lead'));
  assert.ok(txt.includes('Personal Email Address          : [REDACTED]'));
  assert.ok(txt.includes('Health Particulars              : [REDACTED]'));
  assert.ok(txt.includes('Apex Protective Security Services Pvt Ltd'));
  assert.ok(txt.includes('Northern Shield Security Logistics'));
  assert.ok(txt.includes(EXPORT_LEGAL_DISCLAIMER));
});

test('generateCsvExport produces RFC 4180 escaped CSV with UTF-8 BOM', () => {
  const redactedKeys = new Set<string>(['personalEmail']);
  const csv = generateCsvExport(SAMPLE_TEST_PERSON, redactedKeys);

  // Starts with BOM
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"Veer Bahadur Singh"'));
  assert.ok(csv.includes('"[REDACTED]"'));
  assert.ok(csv.includes('"Apex Protective Security Services Pvt Ltd"'));
});

test('generateXlsxExport creates binary workbook', () => {
  const redactedKeys = new Set<string>(['personalEmail']);
  const uint8 = generateXlsxExport(SAMPLE_TEST_PERSON, redactedKeys);

  assert.ok(uint8 instanceof Uint8Array);
  assert.ok(uint8.length > 500); // Valid xlsx file has substantial zip header/data
});

test('generatePdfExport creates binary PDF document', () => {
  const redactedKeys = new Set<string>(['personalEmail']);
  const pdfBytes = generatePdfExport(SAMPLE_TEST_PERSON, redactedKeys);

  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.length > 1000);
  // PDF magic header %PDF-
  const header = String.fromCharCode(...pdfBytes.slice(0, 5));
  assert.equal(header, '%PDF-');
});

test('generateDocxExport creates valid Word Document blob', async () => {
  const redactedKeys = new Set<string>(['personalEmail']);
  const blob = await generateDocxExport(SAMPLE_TEST_PERSON, redactedKeys);

  assert.ok(blob);
  assert.ok(blob.size > 2000);
});
