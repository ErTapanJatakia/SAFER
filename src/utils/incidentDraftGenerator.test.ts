import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateStructuredIncidentDraft,
  formatStructuredDraftAsText,
  INCIDENT_LEGAL_DISCLAIMER,
  FICTIONAL_INCIDENT_PRESETS,
} from './incidentDraftGenerator.ts';

test('generateStructuredIncidentDraft extracts all 10 required fields from complete notes', () => {
  const sampleNote = FICTIONAL_INCIDENT_PRESETS[0].sourceNotes;
  const draft = generateStructuredIncidentDraft(sampleNote, 'IR-TEST-001');

  assert.equal(draft.incidentReference, 'IR-TEST-001');
  assert.match(draft.dateTime, /14-10-2026/);
  assert.match(draft.locationDescription, /Electronics City|Gate 2/i);
  assert.ok(draft.peopleAndRolesInvolved.length > 0);
  assert.ok(draft.factualChronologicalAccount.length > 0);
  assert.ok(draft.actionsTaken.length > 0);
  assert.ok(draft.witnessInformation !== null);
  assert.ok(draft.evidenceReferences.length > 0);
  assert.ok(draft.outstandingQuestionsAndMissingInfo.length > 0);
  assert.ok(draft.followUpActionsRequiringHumanReview.length > 0);

  // Check unverified claim separation
  assert.ok(draft.unverifiedClaims && draft.unverifiedClaims.length > 0);
});

test('generateStructuredIncidentDraft marks missing fields clearly and NEVER invents them', () => {
  const minimalNote = 'Something went wrong with the radio.';
  const draft = generateStructuredIncidentDraft(minimalNote, 'IR-MINIMAL-001');

  // Must mark missing fields
  assert.match(draft.dateTime, /\[DATE\/TIME NOT PROVIDED/);
  assert.match(draft.locationDescription, /\[LOCATION NOT PROVIDED/);
  assert.match(draft.witnessInformation || '', /\[NO WITNESS INFORMATION PROVIDED/);
  assert.ok(draft.evidenceReferences.some((e) => e.includes('[NO EVIDENCE REFERENCES PROVIDED')));

  // Formatter output must contain mandatory disclaimer
  const formattedText = formatStructuredDraftAsText(draft);
  assert.ok(formattedText.includes(INCIDENT_LEGAL_DISCLAIMER));
  assert.match(formattedText, /does not establish legal conclusions/i);
});

test('formatStructuredDraftAsText formats all 10 fields cleanly', () => {
  const sampleNote = FICTIONAL_INCIDENT_PRESETS[1].sourceNotes;
  const draft = generateStructuredIncidentDraft(sampleNote, 'IR-TEST-002');
  const text = formatStructuredDraftAsText(draft);

  assert.match(text, /1\. INCIDENT REFERENCE:/);
  assert.match(text, /2\. DATE AND TIME:/);
  assert.match(text, /3\. LOCATION DESCRIPTION:/);
  assert.match(text, /4\. PEOPLE OR ROLES INVOLVED/);
  assert.match(text, /5\. FACTUAL CHRONOLOGICAL ACCOUNT:/);
  assert.match(text, /6\. ACTIONS TAKEN/);
  assert.match(text, /7\. WITNESS INFORMATION:/);
  assert.match(text, /8\. EVIDENCE REFERENCES:/);
  assert.match(text, /9\. OUTSTANDING QUESTIONS & MISSING INFORMATION:/);
  assert.match(text, /10\. FOLLOW-UP ACTIONS REQUIRING HUMAN REVIEW:/);
});
