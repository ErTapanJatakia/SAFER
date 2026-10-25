import type { StructuredIncidentDraft } from '../types/index.ts';

export const INCIDENT_LEGAL_DISCLAIMER =
  'ADMINISTRATIVE INCIDENT DRAFT: This document structures factual observations as reported. It does not establish legal conclusions, determine liability, or automate disciplinary determinations. All items require verified human supervisory review.';

export interface IncidentTemplatePreset {
  id: string;
  title: string;
  category: string;
  sourceNotes: string;
}

export const SAMPLE_INCIDENT_PRESETS: IncidentTemplatePreset[] = [
  {
    id: 'preset-1',
    title: 'Unreturned Temporary Contractor Access Badge #V-108',
    category: 'Access Control Anomaly',
    sourceNotes: `Date/Time: 14-10-2026 18:30 IST.
Location: Static Facility Gate 2, Electronics City Phase 1, Bengaluru, Karnataka.
People involved: Security Operations Officer Priya Nair [Call Sign: DRONA-LEAD], Facility Shift Supervisor (Third-party HVAC Vendor).
Account: Third-party HVAC maintenance technician completed scheduled duct inspection at 17:00 IST but exited without surrendering visitor badge #V-108 at the security desk. Security desk officer noticed badge missing during shift reconciliation at 18:00 IST. A contractor supervisor contacted by telephone claimed the technician inadvertently took the badge home in their work jacket.
Actions taken: Security officer deactivated access permissions on badge #V-108 at 18:15 IST via the administrative console. Contractor supervisor agreed to return badge by courier by 10:00 IST on 15-10-2026.
Evidence: Access control gate exit logs for Gate 2; contractor visitor sign-in register ref #REG-BLR-884.
Witnesses: None formally recorded beyond security desk personnel.`,
  },
  {
    id: 'preset-2',
    title: 'Visitor Sign-In Log Discrepancy Requiring Supervisor Review',
    category: 'Administrative Discrepancy',
    sourceNotes: `Date/Time: 12-10-2026 09:15 IST.
Location: Main Access Lobby, Cyber City Sector 24, Gurugram, Haryana.
People involved: Duty Officer Vikram Malhotra [PMC-ID-009], Operations Lead Veer Bahadur Singh [Call Sign: KAVACH-1].
Account: During morning administrative review of previous night physical visitor register, security detected an entry timestamp recorded as 22:45 IST on 11-10-2026 for a facilities inspection team of 3 personnel, but exit register showed only 2 exit signatures recorded at 01:30 IST. Shift officer cross-checked access control turnstile logs and verified all 3 individuals badged out through Turnstile 4 at 01:32 IST. Physical register was missing one signature due to desk clerk oversight.
Actions taken: Shift officer initiated supervisor review flag in the log. Turnstile electronic badge logs printed and stapled to the paper log sheet.
Evidence: Turnstile electronic badge logs; Lobby CCTV camera footage #CAM-LOBBY-02.
Witnesses: Reception desk duty clerk Suresh Verma.`,
  },
  {
    id: 'preset-3',
    title: 'Missing UHF Handheld Transceiver Unit (Motorola #UHF-07)',
    category: 'Equipment Malfunction',
    sourceNotes: `Date/Time: 10-10-2026 14:45 IST.
Location: Comms Equipment Cache Bravo, HITEC City Madhapur, Hyderabad, Telangana.
People involved: Communications Specialist Sunita Rao [Call Sign: GARUDA-COMMS], Protection Officer Gurpreet Singh Dhillon [Call Sign: BHARAT-SHIELD].
Account: Weekly physical inventory reconciliation revealed UHF handheld radio unit #UHF-07 missing from charging cradle slot 7. Equipment custody log indicated unit was issued on 08-10-2026 for a venue advance survey but not signed back into the ledger.
Actions taken: Specialist Sunita Rao contacted Officer Gurpreet Singh Dhillon. Officer Dhillon confirmed transceiver had been secured in the locked escort vehicle glove compartment for safe storage. Unit retrieved, inspected, battery recharged, and custody ledger updated at 16:00 IST.
Evidence: Communications equipment checkout ledger #LEDGER-HYD-04; radio unit serial #APX-UHF-7712.
Witnesses: None.`,
  },
  {
    id: 'preset-4',
    title: 'Suspicious Credential Phishing Email Reported by Employee',
    category: 'Administrative Discrepancy',
    sourceNotes: `Date/Time: 09-10-2026 11:20 IST.
Location: IT Support Desk, Bandra Kurla Complex (BKC), Mumbai, Maharashtra.
People involved: IT Support Lead Sandeep Verma, Operations Lead Veer Bahadur Singh [Call Sign: KAVACH-1].
Account: Administrative executive reported receiving an unsolicited email with subject "URGENT: Verify Your Corporate Payroll and EPF Account Details Before Cutoff" purporting to originate from internal human resources. Header inspection showed sender domain was a spoofed lookalike address (hr-portal-support.in) registered via external registrar. Link led to a generic login credential harvester.
Actions taken: IT security blocked sender domain, purged email from 14 internal mailboxes, and issued security advisory note across operational shifts.
Evidence: Email headers saved as ref #PHISH-20261009-01; web proxy gateway block log.
Witnesses: Administrative executive reporting the email.`,
  },
  {
    id: 'preset-5',
    title: 'Overdue Preventive Maintenance on Command Post Diesel Generator',
    category: 'Equipment Malfunction',
    sourceNotes: `Date/Time: 07-10-2026 16:00 IST.
Location: Backup Power Substation, Sector V, Salt Lake, Kolkata, West Bengal.
People involved: Senior Protection Officer Rajesh Ramanathan [Call Sign: SENTINEL-9], Facilities Officer Suresh Kulkarni.
Account: Scheduled 90-day preventive maintenance and load-bank test for 125 kVA emergency backup generator #GEN-02 was due on 30-09-2026 according to facilities compliance matrix. Maintenance vendor delayed visit due to regional waterlogging. Current operational status shows generator functional on manual test run, but oil change and coolant filter replacement remain overdue by 7 days.
Actions taken: Manual test run conducted; generator started within 8 seconds and held standard output. Vendor escalated via formal notice for priority service visit scheduled for 09-10-2026.
Evidence: Substation run-hour meter log; vendor service contract ref #AM-GEN-KOL-2026.
Witnesses: Substation duty technician.`,
  },
  {
    id: 'preset-6',
    title: 'Lost Operations Mobile Handset Requiring Administrative Report',
    category: 'Administrative Discrepancy',
    sourceNotes: `Date/Time: 05-10-2026 20:30 IST.
Location: Administrative Office Annex, Sector 62, Noida, Uttar Pradesh.
People involved: Logistics Coordinator Ananya Deshmukh [Call Sign: SARATHI-ALPHA], IT Security Lead Sandeep Verma.
Account: Logistics coordinator reported that an administrative operations smartphone (Asset Tag #PMC-MOB-044) was misplaced while in transit between Noida Annex and client liaison office in New Delhi. Officer noticed device missing upon arrival at 19:45 IST.
Actions taken: Immediate remote MDM wipe command was issued by IT support at 20:00 IST; MDM dashboard confirmed remote cryptographic erase executed successfully. SIM card blocked via telecom provider. Device contained zero client PII or sensitive personal records; PIN protection and Knox container were active prior to wipe.
Evidence: MDM server remote wipe acknowledgement certificate ref #MDM-WIPE-044; telecom SIM suspension receipt.
Witnesses: None.`,
  },
  {
    id: 'preset-7',
    title: 'Incomplete Shift Handover Log at Static Security Reception',
    category: 'Administrative Discrepancy',
    sourceNotes: `Date/Time: 03-10-2026 06:15 IST.
Location: Static Facility Reception, Hinjewadi Phase 2, Pune, Maharashtra.
People involved: Facilities Supervisor Suresh Kulkarni [PMC-ID-010], Night Shift Security Guard (unnamed contractor).
Account: Inbound morning shift supervisor noted that the outgoing night shift logbook lacked entries for the 02:00 IST to 06:00 IST window, including physical perimeter patrol confirmations and key checkout status for Facility Server Room 1. Outgoing guard stated patrols were conducted on time and keys remained in key box, but handwritten log was neglected due to medical assistance provided to an unwell night-shift custodian.
Actions taken: Supervisor reviewed CCTV footage confirming patrols occurred at 02:30 IST and 04:45 IST, and server room was never accessed. Formal administrative counseling issued to outgoing guard regarding log diligence.
Evidence: Reception CCTV records for 02:00-06:00 IST window; key vault audit log sheet.
Witnesses: Morning shift duty guard.`,
  },
  {
    id: 'preset-8',
    title: 'Fire Exit Corridor Obstructed by Equipment Crates (Safety Checklist Follow-Up)',
    category: 'Medical First-Aid Event',
    sourceNotes: `Date/Time: 01-10-2026 15:10 IST.
Location: Ground Floor Loading Bay Corridor, Old Mahabalipuram Road (OMR), Chennai, Tamil Nadu.
People involved: Safety Officer Mohammad Zeeshan Khan [Call Sign: CHETAK-TACTICAL], Warehouse Supervisor.
Account: Monthly occupational health and life safety walkthrough identified 4 large wooden equipment shipping crates stacked along Fire Exit Corridor 2, reducing emergency passage width below statutory 1.5-metre clearance standard. Facilities management had been notified on 28-09-2026 during initial checklist audit, but corrective relocation was not completed by the 48-hour deadline.
Actions taken: Safety Officer halted unloading operations, arranged immediate forklift relocation of crates to designated warehouse staging rack, and restored unencumbered exit egress by 16:30 IST.
Evidence: Inspection photographs showing corridor obstruction and subsequent cleared passage; safety audit log ref #SAF-CHN-20261001.
Witnesses: Warehouse shift supervisor.`,
  },
];

// Backward compatibility alias
export const FICTIONAL_INCIDENT_PRESETS = SAMPLE_INCIDENT_PRESETS;

/**
 * Parses user-provided raw incident notes into a structured 10-field draft.
 * STRICT POLICY:
 * - Never invents timestamps, quotations, witnesses, evidence, or actions.
 * - Clearly marks missing information.
 * - Separates reported facts, unverified claims, and review prompts.
 * - Avoids legal conclusions or determination of fault.
 */
export function generateStructuredIncidentDraft(
  rawNotes: string,
  referenceOverride?: string
): StructuredIncidentDraft {
  const text = rawNotes.trim();
  const lower = text.toLowerCase();

  // 1. Reference
  const ref =
    referenceOverride ||
    `IR-2026-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;

  // 2. Date and Time Extraction
  let dateTime = '';
  // Check for common date/time formats
  const dateTimeRegex = /(?:date\/time|date|time|at|on)?:?\s*(\d{2}-\d{2}-\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?(?:\s*IST)?)?|\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?|\d{1,2}:\d{2}(?:\s*(?:hrs|am|pm|hours|IST))?|[a-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}(?:\s+at\s+\d{1,2}:\d{2})?)/i;
  const matchDateTime = text.match(dateTimeRegex);

  // Specific keyword extractions
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^(?:date(?:\/time)?|time):/i.test(line)) {
      dateTime = line.replace(/^(?:date(?:\/time)?|time):\s*/i, '');
      break;
    }
  }

  if (!dateTime && matchDateTime && matchDateTime[1] && matchDateTime[1].length > 3) {
    dateTime = matchDateTime[1];
  }

  if (!dateTime) {
    dateTime = '[DATE/TIME NOT PROVIDED IN SOURCE NOTES — REQUIRES HUMAN INVESTIGATION]';
  }

  // 3. Location Description
  let location = '';
  for (const line of lines) {
    if (/^location:/i.test(line)) {
      location = line.replace(/^location:\s*/i, '');
      break;
    }
  }

  if (!location) {
    // Attempt detection of location phrases
    const locMatch = text.match(/(?:at|near|location:?)\s+([A-Z][a-zA-Z0-9\s,-]+(?:Gate|Facility|Perimeter|Station|Corridor|Cache|Highway|Exit|Center|Headquarters|Building|Avenue|Street|Interchange|Lobby|Complex|Substation|Desk|Bay|Sector|City|Road)[\w\s,-]*)/i);
    if (locMatch && locMatch[1]) {
      location = locMatch[1].trim();
    }
  }

  if (!location) {
    location = '[LOCATION NOT PROVIDED IN SOURCE NOTES — REQUIRES HUMAN SPECIFICATION]';
  }

  // 4. People or Roles Involved
  const peopleRoles: string[] = [];
  for (const line of lines) {
    if (/^(?:people|personnel|roles|people involved|staff):/i.test(line)) {
      const parts = line.replace(/^(?:people|personnel|roles|people involved|staff):\s*/i, '').split(/[,;]/);
      for (const p of parts) {
        if (p.trim()) peopleRoles.push(p.trim());
      }
      break;
    }
  }

  if (peopleRoles.length === 0) {
    // Look for recognizable personnel identifiers or roles
    const idMatches = text.match(/(?:Officer|Supervisor|Lead|Specialist|Tech|Coordinator|Director|Executive|Guard|Clerk)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|Call\s*Sign:\s*[\w-]+|Callsign\s+[\w-]+|\[?PMC-ID-\d{3}\]?|\[PRO-\d{4}\]|PRO-\d{4}/gi);
    if (idMatches) {
      for (const id of idMatches) {
        if (!peopleRoles.includes(id.trim())) peopleRoles.push(id.trim());
      }
    }
  }

  if (peopleRoles.length === 0) {
    peopleRoles.push('[NO SPECIFIC PERSONNEL IDENTIFIERS PROVIDED IN SOURCE NOTES — AUDIT SHIFT ROSTER]');
  }

  // 5. Factual Chronological Account & Unverified Claims
  const chronologicalFacts: string[] = [];
  const unverifiedClaims: string[] = [];

  // Parse lines that describe events
  for (const rawLine of lines) {
    // Skip meta lines like "Location:", "Date:", "Witnesses:"
    if (/^(?:date|time|location|people|witnesses|evidence|actions|actions taken):/i.test(rawLine)) {
      continue;
    }

    const cleanLine = rawLine.replace(/^(?:account|narrative|notes|summary):\s*/i, '');
    const sentences = cleanLine.split(/(?<=[.?!])\s+/).filter(Boolean);

    for (const sentence of sentences) {
      if (/\b(?:claimed|alleged|allegedly|rumored|suspected|assumed|believed)\b/i.test(sentence)) {
        unverifiedClaims.push(sentence);
      } else {
        chronologicalFacts.push(sentence);
      }
    }
  }

  if (chronologicalFacts.length === 0) {
    chronologicalFacts.push('[NO CHRONOLOGICAL SEQUENCE RECORDED — ONLY SUMMARY OR RAW NOTES PROVIDED]');
  }

  // 6. Actions Taken (Only as reported, never invented!)
  const actionsTaken: string[] = [];
  for (const line of lines) {
    if (/^(?:actions|actions taken|remediation):/i.test(line)) {
      const act = line.replace(/^(?:actions|actions taken|remediation):\s*/i, '');
      if (act) actionsTaken.push(act);
    }
  }

  if (actionsTaken.length === 0) {
    // Search for verb phrases indicating action
    for (const line of lines) {
      if (/\b(?:immediately|switched|radioed|notified|quarantined|issued|secured|initiated|revoked|conducted|inspected|locked)\b/i.test(line)) {
        if (!actionsTaken.includes(line)) {
          actionsTaken.push(line);
        }
      }
    }
  }

  if (actionsTaken.length === 0) {
    actionsTaken.push('[NO IMMEDIATE ACTIONS DOCUMENTED IN SOURCE NOTES — REQUIRES CLARIFICATION]');
  }

  // 7. Witness Information
  let witnessInfo: string | null = null;
  for (const line of lines) {
    if (/^(?:witnesses|witness information|witness):/i.test(line)) {
      witnessInfo = line.replace(/^(?:witnesses|witness information|witness):\s*/i, '');
      break;
    }
  }

  if (!witnessInfo || witnessInfo.toLowerCase() === 'none' || witnessInfo.toLowerCase() === 'none.' || witnessInfo.toLowerCase() === 'none formally recorded besides queuing staff.') {
    if (witnessInfo && witnessInfo.toLowerCase().includes('queuing')) {
      witnessInfo = witnessInfo;
    } else {
      witnessInfo = '[NO WITNESS INFORMATION PROVIDED IN SOURCE NOTES]';
    }
  }

  // 8. Evidence References
  const evidenceRefs: string[] = [];
  for (const line of lines) {
    if (/^(?:evidence|evidence references|cctv|logs):/i.test(line)) {
      const ev = line.replace(/^(?:evidence|evidence references|cctv|logs):\s*/i, '');
      if (ev) evidenceRefs.push(ev);
    }
  }

  if (evidenceRefs.length === 0) {
    // Match potential evidence tokens
    const evMatches = text.match(/(?:cctv|camera|log|serial\s*(?:number|no|#)?|sheet|recording|audit log|log ref)\s*[:#\w\s-]+/gi);
    if (evMatches) {
      for (const m of evMatches) {
        if (!evidenceRefs.includes(m.trim())) evidenceRefs.push(m.trim());
      }
    }
  }

  if (evidenceRefs.length === 0) {
    evidenceRefs.push('[NO EVIDENCE REFERENCES PROVIDED IN SOURCE NOTES — VERIFY LOGBOOKS AND ACCESS ARCHIVES]');
  }

  // 9. Outstanding Questions and Missing Information
  const outstandingQuestions: string[] = [];
  if (dateTime.includes('[DATE/TIME NOT PROVIDED')) {
    outstandingQuestions.push('What was the precise date and time of incident occurrence?');
  }
  if (location.includes('[LOCATION NOT PROVIDED')) {
    outstandingQuestions.push('What specific room, sector, checkpoint, or geographic coordinate did this occur at?');
  }
  if (peopleRoles.some((p) => p.includes('[NO SPECIFIC PERSONNEL'))) {
    outstandingQuestions.push('Which specific duty officers, contractors, or staff members were on scene or affected?');
  }
  if (unverifiedClaims.length > 0) {
    outstandingQuestions.push('Can the unverified claim(s) be corroborated through physical telemetry, sensor logs, or official witness statements?');
  }
  outstandingQuestions.push('Has the operational supervisor or duty commander been verbally briefed?');
  outstandingQuestions.push('Is any replacement equipment or permanent hardware repair required before next operational cycle?');

  // 10. Follow-up Actions Requiring Human Review (Administrative only, no legal conclusions!)
  const followUpActions: string[] = [
    'Supervising Officer review and factual verification sign-off.',
    'Log archive preservation (CCTV footage export, equipment serial documentation, or network packet logs).',
    'Follow up with affected facility / operational cell lead on remedial action verification.',
    'Close administrative incident ticket upon verified documentation completion.',
  ];

  return {
    incidentReference: ref,
    dateTime,
    locationDescription: location,
    peopleAndRolesInvolved: peopleRoles,
    factualChronologicalAccount: chronologicalFacts,
    actionsTaken,
    witnessInformation: witnessInfo,
    evidenceReferences: evidenceRefs,
    outstandingQuestionsAndMissingInfo: outstandingQuestions,
    followUpActionsRequiringHumanReview: followUpActions,
    unverifiedClaims: unverifiedClaims.length > 0 ? unverifiedClaims : undefined,
    rawNotesProvided: text,
    lastEditedTimestamp: '2026-10-15',
  };
}

/**
 * Formats a StructuredIncidentDraft into a clear plain-English standardized document string.
 */
export function formatStructuredDraftAsText(draft: StructuredIncidentDraft): string {
  const lines: string[] = [];

  lines.push(`================================================================`);
  lines.push(`PROTECTION OPERATIONS: STRUCTURED INCIDENT REPORT DRAFT`);
  lines.push(`Incident Reference: ${draft.incidentReference}`);
  lines.push(`================================================================`);
  lines.push(``);

  lines.push(`1. INCIDENT REFERENCE:`);
  lines.push(`   ${draft.incidentReference}`);
  lines.push(``);

  lines.push(`2. DATE AND TIME:`);
  lines.push(`   ${draft.dateTime}`);
  lines.push(``);

  lines.push(`3. LOCATION DESCRIPTION:`);
  lines.push(`   ${draft.locationDescription}`);
  lines.push(``);

  lines.push(`4. PEOPLE OR ROLES INVOLVED (Personnel / Role Identifiers):`);
  for (const person of draft.peopleAndRolesInvolved) {
    lines.push(`   * ${person}`);
  }
  lines.push(``);

  lines.push(`5. FACTUAL CHRONOLOGICAL ACCOUNT:`);
  lines.push(`   [REPORTED FACTS - PROVIDED BY AUTHOR]:`);
  for (const fact of draft.factualChronologicalAccount) {
    lines.push(`   - ${fact}`);
  }
  if (draft.unverifiedClaims && draft.unverifiedClaims.length > 0) {
    lines.push(``);
    lines.push(`   [UNVERIFIED CLAIMS - PENDING INDEPENDENT CORROBORATION]:`);
    for (const claim of draft.unverifiedClaims) {
      lines.push(`   ? ${claim}`);
    }
  }
  lines.push(``);

  lines.push(`6. ACTIONS TAKEN (As Reported by Author):`);
  for (const act of draft.actionsTaken) {
    lines.push(`   * ${act}`);
  }
  lines.push(``);

  lines.push(`7. WITNESS INFORMATION:`);
  lines.push(`   ${draft.witnessInformation || '[NO WITNESS INFORMATION PROVIDED IN SOURCE NOTES]'}`);
  lines.push(``);

  lines.push(`8. EVIDENCE REFERENCES:`);
  for (const ev of draft.evidenceReferences) {
    lines.push(`   # ${ev}`);
  }
  lines.push(``);

  lines.push(`9. OUTSTANDING QUESTIONS & MISSING INFORMATION:`);
  for (let i = 0; i < draft.outstandingQuestionsAndMissingInfo.length; i++) {
    lines.push(`   [?] ${i + 1}. ${draft.outstandingQuestionsAndMissingInfo[i]}`);
  }
  lines.push(``);

  lines.push(`10. FOLLOW-UP ACTIONS REQUIRING HUMAN REVIEW:`);
  for (let i = 0; i < draft.followUpActionsRequiringHumanReview.length; i++) {
    lines.push(`   [ ] ${i + 1}. ${draft.followUpActionsRequiringHumanReview[i]}`);
  }
  lines.push(``);

  lines.push(`----------------------------------------------------------------`);
  lines.push(INCIDENT_LEGAL_DISCLAIMER);
  lines.push(`----------------------------------------------------------------`);

  return lines.join('\n');
}
