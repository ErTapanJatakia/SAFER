import React, { useState } from 'react';
import type { PersonnelRecord } from '../types/index.ts';
import {
  evaluatePersonnelReadiness,
  evaluateCertification,
} from '../utils/readinessRules.ts';
import { toDDMMYYYY } from '../utils/dateUtils.ts';
import {
  Shield,
  X,
  FileText,
  Edit,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building,
  UserCheck,
  Send,
  User,
  HeartPulse,
  MapPin,
  Briefcase,
  Phone,
  Mail,
  Download,
} from 'lucide-react';

interface PersonnelDetailModalProps {
  isOpen: boolean;
  person: PersonnelRecord | null;
  onClose: () => void;
  onEdit: (person: PersonnelRecord) => void;
  onUpdateSupervisorReview: (personId: string, supervisorName: string, reviewNotes: string) => void;
  onOpenSummary: (person: PersonnelRecord) => void;
  onResolveRequirement?: (personId: string, reqText: string) => void;
  onExport?: (person: PersonnelRecord) => void;
}

export const PersonnelDetailModal: React.FC<PersonnelDetailModalProps> = ({
  isOpen,
  person,
  onClose,
  onEdit,
  onUpdateSupervisorReview,
  onOpenSummary,
  onResolveRequirement,
  onExport,
}) => {
  const [showSignOffForm, setShowSignOffForm] = useState(false);
  const [supervisorName, setSupervisorName] = useState('Director S. Holloway');
  const [reviewNote, setReviewNote] = useState('');

  if (!isOpen || !person) return null;

  const readiness = evaluatePersonnelReadiness(person);
  const certs = person.certifications || [];
  const reqs = person.outstandingRequirements || [];
  const workEx = person.workExperience || [];

  const empId = person.pmcEmployeeId || person.demoId || person.badgeId;
  const callSignText = person.callSign || person.callsign || 'Unassigned';
  const rolesList = person.roles && person.roles.length > 0 ? person.roles : [person.role];
  const specList =
    person.specialisations && person.specialisations.length > 0
      ? person.specialisations
      : [person.specialisation || 'General Operations'];

  const handleSignOffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorName.trim()) return;
    onUpdateSupervisorReview(person.id, supervisorName.trim(), reviewNote.trim());
    setShowSignOffForm(false);
    setReviewNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-300">
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white rounded-t-xl flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center text-blue-200 border border-blue-700 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="font-bold text-base text-white">
                  {person.displayName || person.fullName}
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                  PMC ID: {empId}
                </span>
                <span className="text-xs font-mono text-amber-300">
                  Call Sign: {callSignText}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  (Badge: {person.badgeId})
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-0.5 flex flex-wrap gap-1">
                <span>{rolesList.join(', ')}</span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-slate-400">{specList.join('; ')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onExport && (
              <button
                onClick={() => onExport(person)}
                className="px-2.5 py-1.5 rounded-md bg-blue-900 border border-blue-600 text-white hover:bg-blue-800 transition flex items-center space-x-1.5 text-xs font-semibold shadow-xs"
                title="Export Personnel Record (TXT, CSV, XLSX, PDF, DOCX with redaction controls)"
              >
                <Download className="w-3.5 h-3.5 text-blue-200" />
                <span className="hidden sm:inline">Export Personnel Record</span>
                <span className="sm:hidden">Export</span>
              </button>
            )}
            <button
              onClick={() => onOpenSummary(person)}
              className="px-2.5 py-1.5 rounded-md bg-blue-950 border border-blue-700 text-blue-200 hover:text-white hover:bg-blue-900 transition flex items-center space-x-1.5 text-xs font-semibold"
              title="Generate Plain-English Readiness Summary"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Plain-English Summary</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(person);
              }}
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Edit Record"
              aria-label="Edit Record"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-white transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800">
          {/* Status & Indicator Banner */}
          <div className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${readiness.badgeColor}`}>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  Administrative Readiness Status
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${readiness.indicatorBadgeColor}`}>
                  {readiness.indicator}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/70 text-slate-800 border border-slate-300">
                  Record: {person.verificationStatus}
                </span>
              </div>
              <div className="font-bold text-sm mt-1">{readiness.label}</div>
              <p className="text-xs mt-1 opacity-90">{readiness.summaryReason}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] uppercase font-bold opacity-80">Sector Location</div>
              <div className="font-semibold text-xs mt-0.5">{person.assignmentSector}</div>
            </div>
          </div>

          {/* Personal Information & Vital Records Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
              <User className="w-4 h-4 text-blue-900" />
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Personal Profile & Vital Records (Sensitive Operational Data)
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                  Birth Date (DD-MM-YYYY)
                </span>
                <span className="font-semibold text-slate-900 text-xs font-mono">
                  {person.birthDate ? toDDMMYYYY(person.birthDate) : 'Not documented'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                  Blood Group
                </span>
                <span className="font-bold text-rose-800 text-xs">
                  {person.bloodGroup || 'Unknown'}
                  {person.bloodGroupDetails ? ` (${person.bloodGroupDetails})` : ''}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                  Marital Status
                </span>
                <span className="font-semibold text-slate-800 text-xs">
                  {person.maritalStatus || 'Prefer not to disclose'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                  Official Contact Email
                </span>
                <span className="font-semibold text-slate-900 text-xs truncate block" title={person.contactEmail}>
                  {person.contactEmail}
                </span>
              </div>
            </div>

            {person.personalEmail && (
              <div>
                <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                  Personal Email Address
                </span>
                <span className="font-mono text-slate-800 text-xs">{person.personalEmail}</span>
              </div>
            )}

            {person.healthParticulars && (
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded text-amber-950">
                <span className="text-[10px] uppercase text-amber-800 font-bold block mb-0.5">
                  Health Particulars:
                </span>
                <p className="text-xs">{person.healthParticulars}</p>
              </div>
            )}
          </div>

          {/* Residence & Correspondence Addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Residence Address */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs border-b border-slate-200 pb-1">
                <MapPin className="w-3.5 h-3.5 text-blue-900" />
                <span>Residence Address</span>
              </div>
              {person.residenceAddress && person.residenceAddress.addressLine ? (
                <div className="text-xs text-slate-700 leading-snug">
                  <div className="font-medium text-slate-900">{person.residenceAddress.addressLine}</div>
                  <div>
                    {person.residenceAddress.city}, {person.residenceAddress.state}{' '}
                    {person.residenceAddress.postalCode}
                  </div>
                  <div className="font-semibold text-slate-800">{person.residenceAddress.country}</div>
                </div>
              ) : (
                <span className="text-slate-400 italic">No residence address documented.</span>
              )}
            </div>

            {/* Correspondence Address */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-blue-900" />
                  <span>Correspondence Address</span>
                </div>
                {person.sameAsResidenceAddress && (
                  <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-semibold">
                    Same as Residence
                  </span>
                )}
              </div>
              {person.correspondenceAddress && person.correspondenceAddress.addressLine ? (
                <div className="text-xs text-slate-700 leading-snug">
                  <div className="font-medium text-slate-900">
                    {person.correspondenceAddress.addressLine}
                  </div>
                  <div>
                    {person.correspondenceAddress.city}, {person.correspondenceAddress.state}{' '}
                    {person.correspondenceAddress.postalCode}
                  </div>
                  <div className="font-semibold text-slate-800">
                    {person.correspondenceAddress.country}
                  </div>
                </div>
              ) : (
                <span className="text-slate-400 italic">No correspondence address documented.</span>
              )}
            </div>
          </div>

          {/* Work Experience History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-blue-900" />
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Work Experience History ({workEx.length})
                </h4>
              </div>
            </div>

            {workEx.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded text-center text-slate-500 text-xs">
                No past employer records logged.
              </div>
            ) : (
              <div className="space-y-3">
                {workEx.map((we, idx) => (
                  <div
                    key={we.id || idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 text-xs">
                        {we.employerName}
                      </span>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-600">
                        <span className="font-mono">
                          {toDDMMYYYY(we.startDate)} to{' '}
                          {we.currentlyWorkingHere ? (
                            <strong className="text-teal-700">Currently Active</strong>
                          ) : (
                            toDDMMYYYY(we.endDate) || 'N/A'
                          )}
                        </span>
                      </div>
                    </div>

                    {we.employerAddress && (
                      <div className="text-[11px] text-slate-600">
                        <span className="font-medium text-slate-700">Address: </span>
                        {we.employerAddress}
                      </div>
                    )}

                    {we.employerContactNumbers && (
                      <div className="text-[11px] text-slate-600 font-mono">
                        <span className="font-medium text-slate-700 font-sans">Contact(s): </span>
                        {we.employerContactNumbers}
                      </div>
                    )}

                    {we.workDescription && (
                      <p className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200">
                        {we.workDescription}
                      </p>
                    )}

                    {we.skillsInUse && (
                      <div className="text-[11px]">
                        <span className="font-semibold text-slate-700">Skills in Use: </span>
                        <span className="text-slate-600">{we.skillsInUse}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Registered Certifications & Credentials */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
              Registered Credentials & Qualifications ({certs.length})
            </h4>

            <div className="space-y-2.5">
              {certs.map((c) => {
                const evalCert = evaluateCertification(c);
                return (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 text-xs flex items-center space-x-2">
                        <span>{c.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {c.verificationId}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Issuer: {c.issuer} &bull; Verification Status: {c.verificationStatus}
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0">
                      <div className="text-xs font-mono text-slate-700">
                        <span className="text-slate-500 font-sans text-[11px]">Completion Date (DD-MM-YYYY): </span>
                        {toDDMMYYYY(c.completionDate)}
                      </div>
                      <div className="text-xs font-mono mt-0.5">
                        <span className="text-slate-500 font-sans text-[11px]">Expiry Date (DD-MM-YYYY): </span>
                        {c.expiryDate ? (
                          evalCert.status === 'EXPIRED' ? (
                            <span className="text-rose-700 font-bold inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {toDDMMYYYY(c.expiryDate)} (Expired)
                            </span>
                          ) : evalCert.status === 'EXPIRING_SOON' ? (
                            <span className="text-amber-700 font-bold inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {toDDMMYYYY(c.expiryDate)} ({evalCert.daysRemaining}d)
                            </span>
                          ) : (
                            <span className="text-teal-700 font-medium">
                              {toDDMMYYYY(c.expiryDate)}
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500 font-sans text-xs">Non-expiring / Lifetime</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Items Pending Resolution */}
          {reqs.length > 0 && (
            <div className="p-3.5 rounded-lg border border-amber-300 bg-amber-50/70 space-y-2">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Action Items Requiring Resolution ({reqs.length})</span>
              </div>
              <ul className="space-y-1.5 text-xs text-amber-950">
                {reqs.map((r, i) => (
                  <li key={i} className="flex items-start justify-between gap-2">
                    <span className="flex-1">&bull; {r}</span>
                    {onResolveRequirement && (
                      <button
                        type="button"
                        onClick={() => onResolveRequirement(person.id, r)}
                        className="px-2 py-0.5 bg-amber-200/80 hover:bg-amber-300 rounded text-[10px] font-semibold text-amber-900 transition shrink-0"
                      >
                        Resolve
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Supervisory Review & Sign-Off Section */}
          <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-blue-900" />
                <span className="font-bold text-slate-900 text-xs">
                  Human Supervisory Review & Audit Record
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSignOffForm(!showSignOffForm)}
                className="px-2.5 py-1 rounded bg-blue-900 text-white font-semibold text-xs hover:bg-blue-800 transition"
              >
                {showSignOffForm ? 'Cancel Audit' : 'Record Supervisor Sign-Off'}
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div>
                <strong>Last Supervisor Review: </strong>
                {person.lastSupervisorReviewDate
                  ? `${toDDMMYYYY(person.lastSupervisorReviewDate)} by ${person.reviewedBy || 'Supervisor'}`
                  : 'Pending initial supervisory review'}
              </div>
              {person.notes && (
                <div className="bg-white p-2.5 rounded border border-slate-200 text-slate-700 mt-2">
                  <span className="font-bold block text-[11px] text-slate-900 mb-0.5">
                    Administrative Notes:
                  </span>
                  <p className="whitespace-pre-line">{person.notes}</p>
                </div>
              )}
            </div>

            {showSignOffForm && (
              <form onSubmit={handleSignOffSubmit} className="pt-3 border-t border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Supervisor / Auditor Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      placeholder="e.g. Director S. Holloway"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Audit Determination Note
                    </label>
                    <input
                      type="text"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="e.g. Credentials audited against hardcopy transcripts. Cleared for roster."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded text-xs shadow-xs flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Submit Supervisor Verification</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 rounded-b-xl border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>PMC ID: {empId} &bull; Sample Personnel Record (Unverified)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white rounded font-semibold text-xs hover:bg-slate-700"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
