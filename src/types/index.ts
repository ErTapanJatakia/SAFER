export type CertificationType =
  | 'Executive Protection & Escort Protocols'
  | 'First Aid / CPR / AED Advanced'
  | 'Defensive Driving & Route Recon'
  | 'Emergency Communications & Satellite radio'
  | 'Defensive Cyber Hygiene & COMSEC'
  | 'Crisis De-escalation & Conflict Resolution'
  | 'Venue Security & Physical Access Control'
  | 'Logistics & Route Planning';

export type VerificationStatus =
  | 'Verified'
  | 'Pending Verification'
  | 'Unverified'
  | 'Audit Flagged';

export interface QualificationItem {
  id: string;
  name: string;
  completionDate: string; // YYYY-MM-DD
  expiryDate: string | null; // YYYY-MM-DD or null if non-expiring
  verificationStatus: VerificationStatus;
  issuer: string;
  verificationId: string;
}

export type Certification = QualificationItem & {
  issuedDate?: string;
};

export type AdministrativeReadinessStatus =
  | 'DOCS_CURRENT_AWAITING_REVIEW'
  | 'REQUIRES_HUMAN_REVIEW'
  | 'FLAGGED_EXPIRED_CERTS'
  | 'UNVERIFIED_CREDENTIALS'
  | 'PENDING_INTAKE_DOCS';

export type MaritalStatus =
  | 'Single'
  | 'Married'
  | 'Divorced'
  | 'Widowed'
  | 'Separated'
  | 'Other'
  | 'Prefer not to disclose';

export type BloodGroup =
  | 'A+'
  | 'A−'
  | 'B+'
  | 'B−'
  | 'AB+'
  | 'AB−'
  | 'O+'
  | 'O−'
  | 'Other / Rare Blood Group'
  | 'Unknown'
  | 'Not Tested'
  | 'Prefer not to disclose';

export interface StructuredAddress {
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface WorkExperienceEntry {
  id: string;
  employerName: string;
  employerAddress: string;
  employerContactNumbers: string;
  startDate: string; // DD-MM-YYYY
  endDate: string; // DD-MM-YYYY
  currentlyWorkingHere: boolean;
  workDescription: string;
  skillsInUse: string;
}

export interface PersonnelRecord {
  id: string;
  pmcEmployeeId: string; // e.g. "PMC-ID-001"
  demoId?: string; // backward-compatibility alias
  badgeId: string; // independent field, placeholder "PMC-ID-XXX"
  fullName: string;
  displayName: string;
  callSign: string; // "Call Sign" across application
  callsign?: string; // backward-compatibility alias
  role: string;
  roles?: string[]; // Multiple operational roles
  specialisation: string;
  specialisations?: string[]; // Multiple professional specialisations
  assignmentSector: 'Sector Alpha (Metropolitan)' | 'Sector Bravo (Transit)' | 'Sector Charlie (Static Facility)' | 'Sector Delta (Reserve)';
  contactEmail: string; // Official contact email
  personalEmail?: string; // Personal Email Address e.g. "e.g. veer-bahadur@email.com"
  birthDate?: string; // DD-MM-YYYY
  maritalStatus?: MaritalStatus;
  bloodGroup?: BloodGroup;
  bloodGroupDetails?: string; // For rare phenotypes
  healthParticulars?: string; // "Mention any Diseases, Illness, or Health Concerns."
  residenceAddress?: StructuredAddress;
  correspondenceAddress?: StructuredAddress;
  sameAsResidenceAddress?: boolean;
  workExperience?: WorkExperienceEntry[];
  certifications: QualificationItem[];
  verificationStatus: VerificationStatus;
  outstandingRequirements: string[];
  administrativeNotes: string;
  notes: string;
  lastSupervisorReviewDate: string | null;
  reviewedBy: string | null;
  tasksCompleted: number;
  tasksOutstanding: number;
  requiresReview: boolean;
}

export interface StructuredIncidentDraft {
  incidentReference: string;
  dateTime: string;
  locationDescription: string;
  peopleAndRolesInvolved: string[];
  factualChronologicalAccount: string[];
  actionsTaken: string[];
  witnessInformation: string | null;
  evidenceReferences: string[];
  outstandingQuestionsAndMissingInfo: string[];
  followUpActionsRequiringHumanReview: string[];
  unverifiedClaims?: string[];
  rawNotesProvided: string;
  lastEditedTimestamp?: string;
}

export interface IncidentReport {
  id: string;
  referenceNumber: string;
  title: string;
  incidentType: 'Equipment Malfunction' | 'Access Control Anomaly' | 'Communications Drop' | 'Logistics Delay' | 'Medical First-Aid Event' | 'Administrative Discrepancy';
  dateReported: string;
  reportedBy: string;
  location: string;
  summary: string;
  status: 'Logged - Pending Officer Review' | 'Under Investigation / Human Review' | 'Documented & Filed';
  priority: 'Routine' | 'Moderate' | 'High Attention';
  structuredDraft?: StructuredIncidentDraft;
}

export type CyberHygieneDomain =
  | 'Device and operating-system updates'
  | 'Multi-factor authentication'
  | 'Password-manager usage'
  | 'Phishing awareness'
  | 'Secure handling of documents'
  | 'Lost-device reporting'
  | 'Account access reviews'
  | 'Backup and recovery checks'
  | 'Suspicious-activity reporting'
  | 'Basic incident escalation';

export type CyberItemClassification = 'General Recommendation' | 'Verified Finding';

export interface CyberHygieneItem {
  id: string;
  domain: CyberHygieneDomain;
  title: string;
  recommendation: string;
  plainEnglishExplanation: string;
  status: 'Completed' | 'Outstanding';
  itemType: CyberItemClassification;
  findingNotes: string;
  lastChecked: string;
  verifiedBy: string | null;
}

export interface FictionalSuspiciousEmail {
  id: string;
  scenarioName: string;
  senderName: string;
  senderAddress: string;
  dateSent: string;
  subject: string;
  body: string;
  suspiciousIndicators: {
    flag: string;
    explanation: string;
  }[];
  educationalTakeaway: string;
  recommendedResponse: string;
}

export type PreDeploymentCategory =
  | 'Required documentation and approvals'
  | 'Training and certification validity'
  | 'Emergency contacts and escalation arrangements'
  | 'First-aid and emergency preparedness documentation'
  | 'Equipment inventory and condition records'
  | 'Device and communications security checks'
  | 'Required briefings and acknowledgements'
  | "Outstanding issues requiring a supervisor's review";

export type PreDeploymentStatus = 'Complete' | 'Incomplete' | 'Not Applicable';

export interface PreDeploymentChecklistItem {
  id: string;
  category: PreDeploymentCategory;
  task: string;
  description: string;
  status: PreDeploymentStatus;
  completed?: boolean;
  priority: 'High' | 'Medium' | 'Low';
  complianceNotes?: string;
  assignedRoleOrPerson?: string;
  requiresHumanReview: boolean;
  reviewedBy?: string | null;
  reviewDate?: string | null;
  targetDeadline?: string;
}

export interface FictionalDemonstrationScenario {
  id: string;
  codename: string;
  title: string;
  operationType: string;
  fictionalJurisdiction: string;
  fictionalVenue: string;
  startDate: string;
  targetEndDate: string;
  leadSupervisor: string;
  overviewDescription: string;
  administrativeScope: string;
  keySafetyDirectives: string[];
}

