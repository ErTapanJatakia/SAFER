import React, { useState, useEffect } from 'react';
import type {
  PersonnelRecord,
  QualificationItem,
  CertificationType,
  VerificationStatus,
  MaritalStatus,
  BloodGroup,
  StructuredAddress,
  WorkExperienceEntry,
} from '../types/index.ts';
import {
  ALL_OPERATIONAL_ROLES,
  ALL_PROFESSIONAL_SPECIALISATIONS,
  MARITAL_STATUS_OPTIONS,
  BLOOD_GROUP_OPTIONS,
} from '../utils/rolesAndSpecialisations.ts';
import { SearchableMultiSelect } from './SearchableMultiSelect.tsx';
import { isValidDDMMYYYY, toDDMMYYYY, isStartBeforeOrEqualEnd } from '../utils/dateUtils.ts';
import { isValidStrictEmail } from '../utils/securitySanitizer.ts';
import {
  X,
  Plus,
  Trash2,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  MapPin,
  HeartPulse,
  User,
  Calendar,
  CheckCircle2,
  Building,
} from 'lucide-react';

interface PersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: PersonnelRecord) => void;
  initialRecord?: PersonnelRecord | null;
}

const AVAILABLE_CERT_TYPES: CertificationType[] = [
  'Executive Protection & Escort Protocols',
  'First Aid / CPR / AED Advanced',
  'Defensive Driving & Route Recon',
  'Emergency Communications & Satellite radio',
  'Defensive Cyber Hygiene & COMSEC',
  'Crisis De-escalation & Conflict Resolution',
  'Venue Security & Physical Access Control',
  'Logistics & Route Planning',
];

export const PersonnelModal: React.FC<PersonnelModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialRecord,
}) => {
  const isEditing = Boolean(initialRecord);

  // Identity States
  const [pmcEmployeeId, setPmcEmployeeId] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [callSign, setCallSign] = useState('');

  // Operational Roles & Specialisations
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedSpecialisations, setSelectedSpecialisations] = useState<string[]>([]);
  const [assignmentSector, setAssignmentSector] = useState<PersonnelRecord['assignmentSector']>(
    'Sector Alpha (Metropolitan)'
  );

  // Contact & Personal Information
  const [contactEmail, setContactEmail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>('Single');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('A+');
  const [bloodGroupDetails, setBloodGroupDetails] = useState('');
  const [healthParticulars, setHealthParticulars] = useState('');

  // Residence Address
  const [residenceAddress, setResidenceAddress] = useState<StructuredAddress>({
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });

  // Correspondence Address & Sync
  const [correspondenceAddress, setCorrespondenceAddress] = useState<StructuredAddress>({
    addressLine: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });
  const [sameAsResidenceAddress, setSameAsResidenceAddress] = useState(false);

  // Repeatable Work Experience
  const [workExperience, setWorkExperience] = useState<WorkExperienceEntry[]>([]);

  // Administrative / Certification States
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('Verified');
  const [notes, setNotes] = useState('');
  const [tasksCompleted, setTasksCompleted] = useState<number>(10);
  const [tasksOutstanding, setTasksOutstanding] = useState<number>(2);
  const [requiresReview, setRequiresReview] = useState<boolean>(false);
  const [outstandingReqs, setOutstandingReqs] = useState<string[]>([]);
  const [newReqInput, setNewReqInput] = useState('');

  // Qualifications list
  const [certifications, setCertifications] = useState<QualificationItem[]>([]);

  // Error Message
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize form when opened or record changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialRecord) {
      setPmcEmployeeId(initialRecord.pmcEmployeeId || initialRecord.demoId || 'PMC-ID-001');
      setBadgeId(initialRecord.badgeId || 'PMC-ID-XXX');
      setFullName(initialRecord.fullName || '');
      setDisplayName(initialRecord.displayName || initialRecord.fullName || '');
      setCallSign(initialRecord.callSign || initialRecord.callsign || '');
      setSelectedRoles(
        initialRecord.roles && initialRecord.roles.length > 0
          ? initialRecord.roles
          : initialRecord.role
          ? [initialRecord.role]
          : ['Security Officer']
      );
      setSelectedSpecialisations(
        initialRecord.specialisations && initialRecord.specialisations.length > 0
          ? initialRecord.specialisations
          : initialRecord.specialisation
          ? [initialRecord.specialisation]
          : ['Close Protection']
      );
      setAssignmentSector(initialRecord.assignmentSector || 'Sector Alpha (Metropolitan)');
      setContactEmail(initialRecord.contactEmail || '');
      setPersonalEmail(initialRecord.personalEmail || '');
      setBirthDate(toDDMMYYYY(initialRecord.birthDate) || '');
      setMaritalStatus(initialRecord.maritalStatus || 'Single');
      setBloodGroup(initialRecord.bloodGroup || 'A+');
      setBloodGroupDetails(initialRecord.bloodGroupDetails || '');
      setHealthParticulars(initialRecord.healthParticulars || '');

      const res = initialRecord.residenceAddress || {
        addressLine: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
      };
      setResidenceAddress(res);

      const isSame = Boolean(initialRecord.sameAsResidenceAddress);
      setSameAsResidenceAddress(isSame);
      if (isSame) {
        setCorrespondenceAddress({ ...res });
      } else {
        setCorrespondenceAddress(
          initialRecord.correspondenceAddress || {
            addressLine: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'India',
          }
        );
      }

      setWorkExperience(
        initialRecord.workExperience && initialRecord.workExperience.length > 0
          ? initialRecord.workExperience.map((we) => ({
              ...we,
              startDate: toDDMMYYYY(we.startDate),
              endDate: toDDMMYYYY(we.endDate),
            }))
          : []
      );

      setVerificationStatus(initialRecord.verificationStatus || 'Verified');
      setNotes(initialRecord.notes || initialRecord.administrativeNotes || '');
      setTasksCompleted(initialRecord.tasksCompleted ?? 10);
      setTasksOutstanding(initialRecord.tasksOutstanding ?? 2);
      setRequiresReview(initialRecord.requiresReview ?? false);
      setOutstandingReqs(initialRecord.outstandingRequirements || []);
      setCertifications(
        initialRecord.certifications?.map((c) => ({
          ...c,
          completionDate: toDDMMYYYY(c.completionDate),
          expiryDate: c.expiryDate ? toDDMMYYYY(c.expiryDate) : null,
        })) || []
      );
    } else {
      // Defaults for brand new record
      setPmcEmployeeId('PMC-ID-001');
      setBadgeId('PMC-ID-XXX');
      setFullName('');
      setDisplayName('');
      setCallSign('');
      setSelectedRoles(['Close Protection Officer']);
      setSelectedSpecialisations(['Close Protection']);
      setAssignmentSector('Sector Alpha (Metropolitan)');
      setContactEmail('');
      setPersonalEmail('');
      setBirthDate('');
      setMaritalStatus('Single');
      setBloodGroup('A+');
      setBloodGroupDetails('');
      setHealthParticulars('');
      setResidenceAddress({
        addressLine: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
      });
      setCorrespondenceAddress({
        addressLine: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
      });
      setSameAsResidenceAddress(false);
      setWorkExperience([]);
      setVerificationStatus('Verified');
      setNotes('');
      setTasksCompleted(10);
      setTasksOutstanding(2);
      setRequiresReview(false);
      setOutstandingReqs(['Submit updated biennial hearing exam certification scan']);
      setCertifications([
        {
          id: `cert-${Date.now()}-1`,
          name: 'First Aid / CPR / AED Advanced',
          completionDate: '10-01-2025',
          expiryDate: '10-01-2027',
          verificationStatus: 'Verified',
          issuer: 'Emergency Trauma Response Council',
          verificationId: `ETRC-${Math.floor(1000 + Math.random() * 9000)}-FA`,
        },
      ]);
    }
    setErrorMsg(null);
  }, [isOpen, initialRecord]);

  if (!isOpen) return null;

  // Residence Address validation check
  const isResidenceAddressValid = Boolean(
    residenceAddress.addressLine.trim() &&
    residenceAddress.city.trim() &&
    residenceAddress.state.trim() &&
    residenceAddress.country.trim()
  );

  // Keep Correspondence Address synchronised if checkbox is checked
  const handleResidenceAddressChange = (field: keyof StructuredAddress, value: string) => {
    const updated = { ...residenceAddress, [field]: value };
    setResidenceAddress(updated);
    if (sameAsResidenceAddress) {
      setCorrespondenceAddress(updated);
    }
  };

  const handleSameAsResidenceToggle = (checked: boolean) => {
    setSameAsResidenceAddress(checked);
    if (checked) {
      setCorrespondenceAddress({ ...residenceAddress });
    } else {
      setCorrespondenceAddress({
        addressLine: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
      });
    }
  };

  // Work Experience Handlers
  const handleAddEmployer = () => {
    const newEntry: WorkExperienceEntry = {
      id: `we-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      employerName: '',
      employerAddress: '',
      employerContactNumbers: '',
      startDate: '',
      endDate: '',
      currentlyWorkingHere: false,
      workDescription: '',
      skillsInUse: '',
    };
    setWorkExperience([...workExperience, newEntry]);
  };

  const handleUpdateEmployer = (id: string, updates: Partial<WorkExperienceEntry>) => {
    setWorkExperience(
      workExperience.map((we) => {
        if (we.id === id) {
          const updated = { ...we, ...updates };
          if (updates.currentlyWorkingHere) {
            updated.endDate = '';
          }
          return updated;
        }
        return we;
      })
    );
  };

  const handleRemoveEmployer = (id: string) => {
    setWorkExperience(workExperience.filter((we) => we.id !== id));
  };

  // Certifications Handlers
  const handleAddCertification = () => {
    const newCert: QualificationItem = {
      id: `cert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: AVAILABLE_CERT_TYPES[0],
      completionDate: '15-10-2025',
      expiryDate: '15-10-2027',
      verificationStatus: 'Verified',
      issuer: 'Protective Standards Institute',
      verificationId: `PSI-${Math.floor(1000 + Math.random() * 9000)}-REG`,
    };
    setCertifications([...certifications, newCert]);
  };

  const handleUpdateCert = (id: string, field: keyof QualificationItem, value: any) => {
    setCertifications(
      certifications.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleRemoveCert = (id: string) => {
    setCertifications(certifications.filter((c) => c.id !== id));
  };

  // Requirements Handlers
  const handleAddReq = () => {
    if (newReqInput.trim()) {
      setOutstandingReqs([...outstandingReqs, newReqInput.trim()]);
      setNewReqInput('');
    }
  };

  const handleRemoveReq = (index: number) => {
    setOutstandingReqs(outstandingReqs.filter((_, i) => i !== index));
  };

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!pmcEmployeeId.trim()) {
      setErrorMsg('PMC Employee ID is required.');
      return;
    }
    if (!badgeId.trim()) {
      setErrorMsg('Badge ID is required.');
      return;
    }
    if (!callSign.trim()) {
      setErrorMsg('Call Sign is required.');
      return;
    }
    if (!contactEmail.trim() || !isValidStrictEmail(contactEmail.trim())) {
      setErrorMsg('A valid official Contact Email is required (e.g. user@organisation.example).');
      return;
    }

    if (personalEmail.trim() && !isValidStrictEmail(personalEmail.trim())) {
      setErrorMsg('Personal Email Address must be a valid email format (e.g. user@example.org).');
      return;
    }

    if (birthDate.trim() && !isValidDDMMYYYY(birthDate.trim())) {
      setErrorMsg('Birth Date must be in valid DD-MM-YYYY format (e.g. 14-08-1988).');
      return;
    }

    // Validate certifications dates
    for (const cert of certifications) {
      if (!cert.completionDate.trim() || !isValidDDMMYYYY(cert.completionDate.trim())) {
        setErrorMsg(`Certification "${cert.name}" Completion Date must be in DD-MM-YYYY format.`);
        return;
      }
      if (cert.expiryDate && cert.expiryDate.trim() && !isValidDDMMYYYY(cert.expiryDate.trim())) {
        setErrorMsg(`Certification "${cert.name}" Expiry Date must be in DD-MM-YYYY format.`);
        return;
      }
    }

    // Validate work experiences dates
    for (const we of workExperience) {
      if (we.startDate.trim() && !isValidDDMMYYYY(we.startDate.trim())) {
        setErrorMsg(`Work experience for "${we.employerName || 'Employer'}" Start Date must be in DD-MM-YYYY format.`);
        return;
      }
      if (!we.currentlyWorkingHere && we.endDate.trim() && !isValidDDMMYYYY(we.endDate.trim())) {
        setErrorMsg(`Work experience for "${we.employerName || 'Employer'}" End Date must be in DD-MM-YYYY format.`);
        return;
      }
      if (!we.currentlyWorkingHere && we.startDate.trim() && we.endDate.trim()) {
        if (!isStartBeforeOrEqualEnd(we.startDate.trim(), we.endDate.trim())) {
          setErrorMsg(`Work experience for "${we.employerName || 'Employer'}" Start Date must be before or equal to End Date.`);
          return;
        }
      }
    }

    const primaryRole = selectedRoles.length > 0 ? selectedRoles[0] : 'Security Officer';
    const primarySpec = selectedSpecialisations.length > 0 ? selectedSpecialisations[0] : 'Close Protection';

    const savedRecord: PersonnelRecord = {
      id: initialRecord?.id || `pr-${Date.now()}`,
      pmcEmployeeId: pmcEmployeeId.trim(),
      demoId: pmcEmployeeId.trim(),
      badgeId: badgeId.trim(),
      fullName: fullName.trim(),
      displayName: displayName.trim() || fullName.trim(),
      callSign: callSign.trim(),
      callsign: callSign.trim(),
      role: primaryRole,
      roles: selectedRoles.length > 0 ? selectedRoles : [primaryRole],
      specialisation: primarySpec,
      specialisations: selectedSpecialisations.length > 0 ? selectedSpecialisations : [primarySpec],
      assignmentSector,
      contactEmail: contactEmail.trim(),
      personalEmail: personalEmail.trim() || undefined,
      birthDate: birthDate.trim() || undefined,
      maritalStatus,
      bloodGroup,
      bloodGroupDetails: bloodGroup === 'Other / Rare Blood Group' ? bloodGroupDetails.trim() : undefined,
      healthParticulars: healthParticulars.trim() || undefined,
      residenceAddress,
      correspondenceAddress: sameAsResidenceAddress ? residenceAddress : correspondenceAddress,
      sameAsResidenceAddress,
      workExperience,
      certifications,
      verificationStatus,
      outstandingRequirements: outstandingReqs,
      administrativeNotes: notes.trim(),
      notes: notes.trim(),
      lastSupervisorReviewDate: initialRecord?.lastSupervisorReviewDate || null,
      reviewedBy: initialRecord?.reviewedBy || null,
      tasksCompleted: Number(tasksCompleted),
      tasksOutstanding: Number(tasksOutstanding),
      requiresReview: Boolean(requiresReview),
    };

    onSave(savedRecord);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="personnel-modal-title"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[92vh] my-6">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-blue-400" />
            <h3 id="personnel-modal-title" className="font-bold text-base text-white">
              {isEditing ? 'Edit Personnel Profile & Credentials' : 'Create Personnel Record'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-md flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Professional Identity & Identifiers */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <ShieldCheck className="w-4 h-4 text-blue-900" />
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                1. Professional Identity & Identifiers
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  PMC Employee ID *
                </label>
                <input
                  type="text"
                  required
                  value={pmcEmployeeId}
                  onChange={(e) => setPmcEmployeeId(e.target.value)}
                  placeholder="PMC-ID-001"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">(e.g. PMC-ID-001)</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Badge ID *
                </label>
                <input
                  type="text"
                  required
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  placeholder="PMC-ID-XXX"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Physical credential reference</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Call Sign *
                </label>
                <input
                  type="text"
                  required
                  value={callSign}
                  onChange={(e) => setCallSign(e.target.value)}
                  placeholder="e.g. Sher-Lead"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Operational tactical handle</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Veer Bahadur Singh"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Display / Preferred Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Veer Bahadur Singh"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Roles, Specialisations & Sector Assignment */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <Briefcase className="w-4 h-4 text-blue-900" />
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                2. Operational Role(s) & Professional Specialisation(s)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SearchableMultiSelect
                label="Operational Role(s)"
                options={ALL_OPERATIONAL_ROLES}
                selectedValues={selectedRoles}
                onChange={setSelectedRoles}
                placeholder="Search and select operational roles..."
                required
              />

              <SearchableMultiSelect
                label="Professional Specialisation(s)"
                options={ALL_PROFESSIONAL_SPECIALISATIONS}
                selectedValues={selectedSpecialisations}
                onChange={setSelectedSpecialisations}
                placeholder="Search and select specialisations..."
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Sector Assignment *
                </label>
                <select
                  value={assignmentSector}
                  onChange={(e) =>
                    setAssignmentSector(e.target.value as PersonnelRecord['assignmentSector'])
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs bg-white focus:ring-1 focus:ring-blue-900"
                >
                  <option value="Sector Alpha (Metropolitan)">Sector Alpha (Metropolitan)</option>
                  <option value="Sector Bravo (Transit)">Sector Bravo (Transit)</option>
                  <option value="Sector Charlie (Static Facility)">Sector Charlie (Static Facility)</option>
                  <option value="Sector Delta (Reserve)">Sector Delta (Reserve)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Official Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. veer.singh@pmc-protops.example.org"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Additional Personal Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <HeartPulse className="w-4 h-4 text-blue-900" />
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                3. Additional Personal Information (Treated as Sensitive)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Personal Email Address
                </label>
                <input
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  placeholder="e.g. veer-bahadur@email.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Birth Date (DD-MM-YYYY)
                </label>
                <input
                  type="text"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  placeholder="14-08-1988"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs font-mono focus:ring-1 focus:ring-blue-900 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Format: DD-MM-YYYY</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Marital Status
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs bg-white focus:ring-1 focus:ring-blue-900"
                >
                  {MARITAL_STATUS_OPTIONS.map((ms) => (
                    <option key={ms} value={ms}>
                      {ms}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs bg-white focus:ring-1 focus:ring-blue-900"
                >
                  {BLOOD_GROUP_OPTIONS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Standard ABO/Rh and rare phenotype selections supported.
                </p>

                {bloodGroup === 'Other / Rare Blood Group' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={bloodGroupDetails}
                      onChange={(e) => setBloodGroupDetails(e.target.value)}
                      placeholder="Specify rare phenotype (e.g. Rh-null, Bombay Oh, Duffy-null)"
                      className="w-full px-3 py-1.5 border border-amber-300 bg-amber-50 rounded-md text-xs focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Health Particulars (Optional)
                </label>
                <textarea
                  rows={2}
                  value={healthParticulars}
                  onChange={(e) => setHealthParticulars(e.target.value)}
                  placeholder="Mention any Diseases, Illness, or Health Concerns."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Optional administrative disclosure. Excluded from general AI summaries.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Residence & Correspondence Addresses */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <MapPin className="w-4 h-4 text-blue-900" />
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                4. Residence & Correspondence Addresses
              </h4>
            </div>

            {/* Residence Address Fields */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
              <span className="font-bold text-xs text-slate-900 block">
                Residence Address *
              </span>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Address Line *
                </label>
                <input
                  type="text"
                  value={residenceAddress.addressLine}
                  onChange={(e) => handleResidenceAddressChange('addressLine', e.target.value)}
                  placeholder="Plot / Flat / Street Name"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    City / Locality *
                  </label>
                  <input
                    type="text"
                    value={residenceAddress.city}
                    onChange={(e) => handleResidenceAddressChange('city', e.target.value)}
                    placeholder="City"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    State / Region *
                  </label>
                  <input
                    type="text"
                    value={residenceAddress.state}
                    onChange={(e) => handleResidenceAddressChange('state', e.target.value)}
                    placeholder="State"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={residenceAddress.postalCode}
                    onChange={(e) => handleResidenceAddressChange('postalCode', e.target.value)}
                    placeholder="PIN / ZIP"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Country *
                  </label>
                  <input
                    type="text"
                    value={residenceAddress.country}
                    onChange={(e) => handleResidenceAddressChange('country', e.target.value)}
                    placeholder="Country"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Checkbox: "Correspondence Address is the same as Residence Address" */}
            <div className="py-1">
              <label
                className={`inline-flex items-center space-x-2 text-xs font-semibold cursor-pointer select-none ${
                  !isResidenceAddressValid ? 'opacity-50 cursor-not-allowed' : 'text-slate-900'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={!isResidenceAddressValid}
                  checked={sameAsResidenceAddress}
                  onChange={(e) => handleSameAsResidenceToggle(e.target.checked)}
                  className="rounded text-blue-900 focus:ring-blue-800 disabled:opacity-50"
                />
                <span>Correspondence Address is the same as Residence Address</span>
              </label>
              {!isResidenceAddressValid && (
                <p className="text-[10px] text-amber-700 mt-0.5">
                  Complete required Residence Address components above to enable this checkbox and correspondence fields.
                </p>
              )}
            </div>

            {/* Correspondence Address Fields */}
            <div
              className={`p-3.5 rounded-lg border transition space-y-3 ${
                !isResidenceAddressValid || sameAsResidenceAddress
                  ? 'bg-slate-100/70 border-slate-200 text-slate-400'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">
                  Correspondence Address
                </span>
                {sameAsResidenceAddress && (
                  <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Synchronized with Residence Address
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                  Address Line
                </label>
                <input
                  type="text"
                  disabled={!isResidenceAddressValid || sameAsResidenceAddress}
                  value={correspondenceAddress.addressLine}
                  onChange={(e) =>
                    setCorrespondenceAddress({ ...correspondenceAddress, addressLine: e.target.value })
                  }
                  placeholder="Plot / Flat / Street Name"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    City / Locality
                  </label>
                  <input
                    type="text"
                    disabled={!isResidenceAddressValid || sameAsResidenceAddress}
                    value={correspondenceAddress.city}
                    onChange={(e) =>
                      setCorrespondenceAddress({ ...correspondenceAddress, city: e.target.value })
                    }
                    placeholder="City"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    State / Region
                  </label>
                  <input
                    type="text"
                    disabled={!isResidenceAddressValid || sameAsResidenceAddress}
                    value={correspondenceAddress.state}
                    onChange={(e) =>
                      setCorrespondenceAddress({ ...correspondenceAddress, state: e.target.value })
                    }
                    placeholder="State"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    disabled={!isResidenceAddressValid || sameAsResidenceAddress}
                    value={correspondenceAddress.postalCode}
                    onChange={(e) =>
                      setCorrespondenceAddress({ ...correspondenceAddress, postalCode: e.target.value })
                    }
                    placeholder="PIN / ZIP"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                    Country
                  </label>
                  <input
                    type="text"
                    disabled={!isResidenceAddressValid || sameAsResidenceAddress}
                    value={correspondenceAddress.country}
                    onChange={(e) =>
                      setCorrespondenceAddress({ ...correspondenceAddress, country: e.target.value })
                    }
                    placeholder="Country"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Repeatable Work Experience */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-blue-900" />
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  5. Work Experience History ({workExperience.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={handleAddEmployer}
                className="px-3 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Employer</span>
              </button>
            </div>

            {workExperience.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-500">
                No past employer records logged yet. Click <strong>Add Employer</strong> to record previous security details.
              </div>
            ) : (
              <div className="space-y-4">
                {workExperience.map((we, index) => (
                  <div
                    key={we.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 relative"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-bold text-xs text-slate-900">
                        Employer #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmployer(we.id)}
                        className="text-rose-600 hover:text-rose-800 text-xs flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Employer</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Employer Name *
                        </label>
                        <input
                          type="text"
                          value={we.employerName}
                          onChange={(e) => handleUpdateEmployer(we.id, { employerName: e.target.value })}
                          placeholder="e.g. Apex Protective Services Pvt Ltd"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Employer Contact Numbers (International / Multiple)
                        </label>
                        <input
                          type="text"
                          value={we.employerContactNumbers}
                          onChange={(e) =>
                            handleUpdateEmployer(we.id, { employerContactNumbers: e.target.value })
                          }
                          placeholder="+91 11 2341 8899, +91 98110 54321"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                        Employer Address
                      </label>
                      <input
                        type="text"
                        value={we.employerAddress}
                        onChange={(e) => handleUpdateEmployer(we.id, { employerAddress: e.target.value })}
                        placeholder="Street, City, Postal Code, Country"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Employment Start Date (DD-MM-YYYY)
                        </label>
                        <input
                          type="text"
                          value={we.startDate}
                          onChange={(e) => handleUpdateEmployer(we.id, { startDate: e.target.value })}
                          placeholder="01-04-2019"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Employment End Date (DD-MM-YYYY)
                        </label>
                        <input
                          type="text"
                          disabled={we.currentlyWorkingHere}
                          value={we.endDate}
                          onChange={(e) => handleUpdateEmployer(we.id, { endDate: e.target.value })}
                          placeholder={we.currentlyWorkingHere ? 'Currently Active' : '28-02-2023'}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>

                      <div className="pb-1.5">
                        <label className="inline-flex items-center space-x-2 text-xs font-semibold cursor-pointer text-slate-800">
                          <input
                            type="checkbox"
                            checked={we.currentlyWorkingHere}
                            onChange={(e) =>
                              handleUpdateEmployer(we.id, { currentlyWorkingHere: e.target.checked })
                            }
                            className="rounded text-blue-900 focus:ring-blue-800"
                          />
                          <span>Currently working here</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Work Description
                        </label>
                        <textarea
                          rows={2}
                          value={we.workDescription}
                          onChange={(e) =>
                            handleUpdateEmployer(we.id, { workDescription: e.target.value })
                          }
                          placeholder="Duties, operational scope, principal protection details..."
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                          Skills in Use
                        </label>
                        <textarea
                          rows={2}
                          value={we.skillsInUse}
                          onChange={(e) => handleUpdateEmployer(we.id, { skillsInUse: e.target.value })}
                          placeholder="e.g. Close Protection, Motorcade Recon, Threat Assessment"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 6: Qualifications & Certifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                6. Training Credentials & Certifications ({certifications.length})
              </h4>
              <button
                type="button"
                onClick={handleAddCertification}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center space-x-1 border border-slate-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Certification</span>
              </button>
            </div>

            <div className="space-y-3">
              {certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <select
                      value={cert.name}
                      onChange={(e) => handleUpdateCert(cert.id, 'name', e.target.value)}
                      className="px-2 py-1 border border-slate-300 rounded text-xs font-semibold bg-white max-w-sm"
                    >
                      {AVAILABLE_CERT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleRemoveCert(cert.id)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                      aria-label="Remove certification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                        Completion Date (DD-MM-YYYY) *
                      </label>
                      <input
                        type="text"
                        value={cert.completionDate}
                        onChange={(e) => handleUpdateCert(cert.id, 'completionDate', e.target.value)}
                        placeholder="10-04-2025"
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                        Expiry Date (DD-MM-YYYY)
                      </label>
                      <input
                        type="text"
                        value={cert.expiryDate || ''}
                        onChange={(e) =>
                          handleUpdateCert(cert.id, 'expiryDate', e.target.value ? e.target.value : null)
                        }
                        placeholder="10-04-2027 (blank if lifetime)"
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                        Issuer Name
                      </label>
                      <input
                        type="text"
                        value={cert.issuer}
                        onChange={(e) => handleUpdateCert(cert.id, 'issuer', e.target.value)}
                        placeholder="Issuing body"
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                        Status
                      </label>
                      <select
                        value={cert.verificationStatus}
                        onChange={(e) =>
                          handleUpdateCert(
                            cert.id,
                            'verificationStatus',
                            e.target.value as VerificationStatus
                          )
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                      >
                        <option value="Verified">Verified</option>
                        <option value="Pending Verification">Pending Verification</option>
                        <option value="Unverified">Unverified</option>
                        <option value="Audit Flagged">Audit Flagged</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: Outstanding Requirements & Supervisor Review */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                7. Outstanding Action Items & Administrative Compliance
              </h4>
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-slate-800">
                Action Items Pending Resolution
              </label>
              <div className="space-y-1.5">
                {outstandingReqs.map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-amber-50/60 border border-amber-200 rounded text-xs text-amber-900"
                  >
                    <span>{req}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveReq(idx)}
                      className="text-amber-700 hover:text-rose-700 ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="text"
                  value={newReqInput}
                  onChange={(e) => setNewReqInput(e.target.value)}
                  placeholder="e.g. Schedule advanced protective driving refresher..."
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddReq();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddReq}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-700"
                >
                  Add Item
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Supervisory & Administrative Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Audit notes, detail qualifications, intake observations..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <span className="text-[11px] text-slate-500 font-mono">
              Sensitive Personal Details Stored Locally In Browser
            </span>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-md text-xs font-semibold shadow-xs flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-teal-300" />
                <span>{isEditing ? 'Save Changes' : 'Create Record'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
