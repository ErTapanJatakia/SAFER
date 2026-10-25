import React, { useState, useMemo } from 'react';
import type { PersonnelRecord, VerificationStatus } from '../types/index.ts';
import {
  evaluatePersonnelReadiness,
  evaluateCertification,
  type RecordIndicatorStatus,
} from '../utils/readinessRules.ts';
import { toDDMMYYYY } from '../utils/dateUtils.ts';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  Clock,
  Shield,
  CheckCircle,
  HelpCircle,
  FileText,
  AlertCircle,
  Check,
  CheckCircle2,
  ShieldAlert,
  Download,
} from 'lucide-react';

interface PersonnelReadinessViewProps {
  personnelList: PersonnelRecord[];
  onOpenAddModal: () => void;
  onOpenEditModal: (person: PersonnelRecord) => void;
  onOpenDetailModal: (person: PersonnelRecord) => void;
  onDeletePerson: (id: string) => void;
  onOpenReadinessSummary: (person?: PersonnelRecord) => void;
  onResolveRequirement?: (personId: string, requirementText: string) => void;
  onOpenExport?: (person?: PersonnelRecord | null) => void;
}

export const PersonnelReadinessView: React.FC<PersonnelReadinessViewProps> = ({
  personnelList,
  onOpenAddModal,
  onOpenEditModal,
  onOpenDetailModal,
  onDeletePerson,
  onOpenReadinessSummary,
  onResolveRequirement,
  onOpenExport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedIndicatorFilter, setSelectedIndicatorFilter] = useState<string>('ALL');
  const [selectedVerificationFilter, setSelectedVerificationFilter] = useState<string>('ALL');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('ALL');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter and search logic
  const filteredPersonnel = useMemo(() => {
    return personnelList.filter((person) => {
      const query = searchQuery.toLowerCase().trim();

      // Search matches: name, PMC employee ID, badge ID, Call Sign, role, specialisation, or any qualification name
      const matchesSearch =
        !query ||
        person.fullName.toLowerCase().includes(query) ||
        (person.displayName && person.displayName.toLowerCase().includes(query)) ||
        (person.pmcEmployeeId && person.pmcEmployeeId.toLowerCase().includes(query)) ||
        (person.demoId && person.demoId.toLowerCase().includes(query)) ||
        person.badgeId.toLowerCase().includes(query) ||
        (person.callSign && person.callSign.toLowerCase().includes(query)) ||
        (person.callsign && person.callsign.toLowerCase().includes(query)) ||
        person.role.toLowerCase().includes(query) ||
        (person.roles && person.roles.some((r) => r.toLowerCase().includes(query))) ||
        (person.specialisation && person.specialisation.toLowerCase().includes(query)) ||
        (person.specialisations && person.specialisations.some((s) => s.toLowerCase().includes(query))) ||
        person.contactEmail.toLowerCase().includes(query) ||
        person.certifications.some((c) => c.name.toLowerCase().includes(query) || c.issuer.toLowerCase().includes(query));

      // Role filter
      const matchesRole = selectedRole === 'ALL' || person.role === selectedRole;

      // Sector filter
      const matchesSector = selectedSectorFilter === 'ALL' || person.assignmentSector === selectedSectorFilter;

      // Verification Status filter
      const matchesVerification =
        selectedVerificationFilter === 'ALL' || person.verificationStatus === selectedVerificationFilter;

      // Indicator filter: VALID, EXPIRING, EXPIRED, UNVERIFIED
      const readiness = evaluatePersonnelReadiness(person);
      let matchesIndicator = true;
      if (selectedIndicatorFilter !== 'ALL') {
        matchesIndicator = readiness.indicator === selectedIndicatorFilter;
      }

      return matchesSearch && matchesRole && matchesSector && matchesVerification && matchesIndicator;
    });
  }, [
    personnelList,
    searchQuery,
    selectedRole,
    selectedIndicatorFilter,
    selectedVerificationFilter,
    selectedSectorFilter,
  ]);

  const personToDelete = personnelList.find((p) => p.id === deleteConfirmId);

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeletePerson(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  // Indicator counts for quick filter buttons
  const validCount = personnelList.filter((p) => evaluatePersonnelReadiness(p).indicator === 'VALID').length;
  const expiringCount = personnelList.filter((p) => evaluatePersonnelReadiness(p).indicator === 'EXPIRING').length;
  const expiredCount = personnelList.filter((p) => evaluatePersonnelReadiness(p).indicator === 'EXPIRED').length;
  const unverifiedCount = personnelList.filter((p) => evaluatePersonnelReadiness(p).indicator === 'UNVERIFIED').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Section Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-900" />
            <h2 className="text-lg font-bold text-slate-900">
              Personnel Administrative Readiness & Qualifications
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Audit operational records, qualification completion and expiry dates, verification statuses, and outstanding requirements.
            Clear indicators report administrative standing only.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Button to Generate Plain-English Readiness Summary */}
          <button
            onClick={() => onOpenReadinessSummary()}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs space-x-2"
          >
            <FileText className="w-4 h-4 text-blue-300" />
            <span>Generate Readiness Summary</span>
          </button>

          {/* Button to Export Full Personnel Roster */}
          {onOpenExport && (
            <button
              onClick={() => onOpenExport(null)}
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-md bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition shadow-xs space-x-1.5"
              title="Export Full Personnel Roster (TXT, CSV, XLSX, PDF, DOCX with redaction controls)"
            >
              <Download className="w-4 h-4 text-blue-700" />
              <span>Export Roster</span>
            </button>
          )}

          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-md bg-blue-900 text-white hover:bg-blue-800 transition shadow-xs space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Personnel Record</span>
          </button>
        </div>
      </div>

      {/* Indicator Quick Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() =>
            setSelectedIndicatorFilter(selectedIndicatorFilter === 'VALID' ? 'ALL' : 'VALID')
          }
          className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
            selectedIndicatorFilter === 'VALID'
              ? 'bg-teal-50 border-teal-500 shadow-2xs ring-1 ring-teal-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500">Valid Records</div>
            <div className="text-lg font-bold text-teal-800 mt-0.5">{validCount}</div>
          </div>
          <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold">
            <CheckCircle className="w-4 h-4 text-teal-700" />
          </span>
        </button>

        <button
          onClick={() =>
            setSelectedIndicatorFilter(selectedIndicatorFilter === 'EXPIRING' ? 'ALL' : 'EXPIRING')
          }
          className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
            selectedIndicatorFilter === 'EXPIRING'
              ? 'bg-amber-50 border-amber-500 shadow-2xs ring-1 ring-amber-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500">Expiring (&lt;45d)</div>
            <div className="text-lg font-bold text-amber-800 mt-0.5">{expiringCount}</div>
          </div>
          <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">
            <Clock className="w-4 h-4 text-amber-700" />
          </span>
        </button>

        <button
          onClick={() =>
            setSelectedIndicatorFilter(selectedIndicatorFilter === 'EXPIRED' ? 'ALL' : 'EXPIRED')
          }
          className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
            selectedIndicatorFilter === 'EXPIRED'
              ? 'bg-rose-50 border-rose-500 shadow-2xs ring-1 ring-rose-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500">Expired Records</div>
            <div className="text-lg font-bold text-rose-800 mt-0.5">{expiredCount}</div>
          </div>
          <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-700" />
          </span>
        </button>

        <button
          onClick={() =>
            setSelectedIndicatorFilter(selectedIndicatorFilter === 'UNVERIFIED' ? 'ALL' : 'UNVERIFIED')
          }
          className={`p-3 rounded-lg border text-left transition flex items-center justify-between ${
            selectedIndicatorFilter === 'UNVERIFIED'
              ? 'bg-purple-50 border-purple-500 shadow-2xs ring-1 ring-purple-500'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500">Unverified Records</div>
            <div className="text-lg font-bold text-purple-800 mt-0.5">{unverifiedCount}</div>
          </div>
          <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-xs font-bold">
            <ShieldAlert className="w-4 h-4 text-purple-700" />
          </span>
        </button>
      </div>

      {/* Control Bar: Search & Multi-Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="md:col-span-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, demo ID, role, qual..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none"
            />
          </div>

          {/* Indicator Status Filter */}
          <div>
            <select
              value={selectedIndicatorFilter}
              onChange={(e) => setSelectedIndicatorFilter(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white text-slate-700 focus:ring-1 focus:ring-blue-900 focus:outline-none font-medium"
            >
              <option value="ALL">All Indicators (Valid / Expiring / Expired / Unverified)</option>
              <option value="VALID">Valid Records Only</option>
              <option value="EXPIRING">Expiring Soon Only (&lt;45 Days)</option>
              <option value="EXPIRED">Expired Qualifications Only</option>
              <option value="UNVERIFIED">Unverified / Pending Intake Only</option>
            </select>
          </div>

          {/* Verification Status Filter */}
          <div>
            <select
              value={selectedVerificationFilter}
              onChange={(e) => setSelectedVerificationFilter(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white text-slate-700 focus:ring-1 focus:ring-blue-900 focus:outline-none"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="Verified">Verified</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Unverified">Unverified</option>
              <option value="Audit Flagged">Audit Flagged</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white text-slate-700 focus:ring-1 focus:ring-blue-900 focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="Team Lead">Team Lead</option>
              <option value="Protection Officer">Protection Officer</option>
              <option value="Communications Specialist">Communications Specialist</option>
              <option value="Logistics Coordinator">Logistics Coordinator</option>
              <option value="Driver / Route Specialist">Driver / Route Specialist</option>
            </select>
          </div>
        </div>

        {/* Results Counter & Reset */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong>{filteredPersonnel.length}</strong> of <strong>{personnelList.length}</strong> personnel records
          </span>
          {(searchQuery || selectedRole !== 'ALL' || selectedIndicatorFilter !== 'ALL' || selectedVerificationFilter !== 'ALL' || selectedSectorFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRole('ALL');
                setSelectedIndicatorFilter('ALL');
                setSelectedVerificationFilter('ALL');
                setSelectedSectorFilter('ALL');
              }}
              className="text-blue-900 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Personnel Roster Cards */}
      {filteredPersonnel.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-xs">
          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No personnel records found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or filter selections.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredPersonnel.map((person) => {
            const readiness = evaluatePersonnelReadiness(person);
            const reqs = person.outstandingRequirements || [];

            return (
              <div
                key={person.id}
                className="bg-white border border-slate-200 rounded-lg shadow-xs hover:border-slate-300 transition overflow-hidden"
              >
                {/* Header Strip: Identification, Role, Specialisation, Indicators */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100">
                  <div className="space-y-1.5">
                    {/* PMC ID, Full Name, Call Sign, Badge ID */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-100 border border-slate-800">
                        PMC ID: {person.pmcEmployeeId || person.demoId || person.badgeId}
                      </span>
                      <span className="font-bold text-base text-slate-900">
                        {person.displayName || person.fullName}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        Call Sign: {person.callSign || person.callsign}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        Badge: {person.badgeId}
                      </span>
                    </div>

                    {/* Role(s) & Professional Specialisation(s) */}
                    <div className="text-xs text-slate-700 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-bold text-blue-950">
                        {person.roles && person.roles.length > 0 ? person.roles.join(', ') : person.role}
                      </span>
                      <span>&bull;</span>
                      <span className="font-medium text-slate-800">
                        Specialisation:{' '}
                        <strong className="font-semibold text-slate-900">
                          {person.specialisations && person.specialisations.length > 0
                            ? person.specialisations.join('; ')
                            : person.specialisation}
                        </strong>
                      </span>
                      <span>&bull;</span>
                      <span className="text-slate-500">{person.assignmentSector}</span>
                    </div>
                  </div>

                  {/* Clear Indicators: Valid / Expiring / Expired / Unverified + Verification Badge */}
                  <div className="flex flex-col sm:items-end justify-center shrink-0 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs flex items-center space-x-1 ${readiness.indicatorBadgeColor}`}
                      >
                        {readiness.indicator === 'VALID' && <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                        {readiness.indicator === 'EXPIRING' && <Clock className="w-3.5 h-3.5 mr-1" />}
                        {readiness.indicator === 'EXPIRED' && <AlertTriangle className="w-3.5 h-3.5 mr-1" />}
                        {readiness.indicator === 'UNVERIFIED' && <ShieldAlert className="w-3.5 h-3.5 mr-1" />}
                        <span>{readiness.indicator}</span>
                      </span>

                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          person.verificationStatus === 'Verified'
                            ? 'bg-teal-50 text-teal-800 border-teal-300'
                            : person.verificationStatus === 'Pending Verification'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {person.verificationStatus}
                      </span>
                    </div>

                    <div className="text-[11px] font-medium text-slate-600 sm:text-right">
                      {readiness.label}
                    </div>
                  </div>
                </div>

                {/* Training and Qualifications List */}
                <div className="p-4 sm:p-5 bg-slate-50/40 border-b border-slate-100 space-y-2">
                  <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    Training & Qualifications ({person.certifications.length})
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {person.certifications.map((cert) => {
                      const evalCert = evaluateCertification(cert);
                      const isExpired = evalCert.status === 'EXPIRED';
                      const isExpiringSoon = evalCert.status === 'EXPIRING_SOON';
                      const isNonExpiring = evalCert.status === 'NON_EXPIRING';

                      return (
                        <div
                          key={cert.id}
                          className={`p-2.5 rounded-md border text-xs space-y-1 ${
                            isExpired
                              ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                              : isExpiringSoon
                              ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                              : 'bg-white border-slate-200 text-slate-900'
                          }`}
                        >
                          <div className="font-bold truncate text-[11px] sm:text-xs" title={cert.name}>
                            {cert.name}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Completed: {cert.completionDate}</span>
                            <span
                              className={`font-semibold ${
                                isExpired
                                  ? 'text-rose-700'
                                  : isExpiringSoon
                                  ? 'text-amber-700'
                                  : 'text-slate-600'
                              }`}
                            >
                              {isExpired
                                ? `Expired (${Math.abs(evalCert.daysRemaining || 0)}d ago)`
                                : isExpiringSoon
                                ? `Expires in ${evalCert.daysRemaining}d`
                                : isNonExpiring
                                ? 'No Expiry'
                                : `Exp: ${cert.expiryDate}`}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5 border-t border-slate-100">
                            <span className="truncate max-w-[130px]">{cert.issuer}</span>
                            <span className="font-mono text-[9px] px-1 py-0.2 bg-slate-100 rounded">
                              {cert.verificationStatus}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Outstanding Administrative Requirements List */}
                <div className="p-4 sm:p-5 bg-white border-b border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className={`w-3.5 h-3.5 ${reqs.length > 0 ? 'text-amber-600' : 'text-teal-600'}`} />
                      <span className="text-[11px] uppercase font-bold text-slate-700 tracking-wider">
                        Outstanding Administrative Requirements ({reqs.length})
                      </span>
                    </div>
                    {reqs.length === 0 ? (
                      <span className="text-[11px] font-semibold text-teal-700 flex items-center">
                        <Check className="w-3 h-3 mr-1" />
                        All Clear
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-800">
                        Pending Supervisory Resolution
                      </span>
                    )}
                  </div>

                  {reqs.length > 0 ? (
                    <ul className="space-y-1.5 pt-1">
                      {reqs.map((req, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between text-xs text-slate-800 bg-amber-50/50 border border-amber-200/80 px-3 py-1.5 rounded"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0"></span>
                            <span>{req}</span>
                          </div>
                          {onResolveRequirement && (
                            <button
                              onClick={() => onResolveRequirement(person.id, req)}
                              className="text-[10px] text-blue-900 font-semibold hover:underline shrink-0 ml-3"
                            >
                              Resolve
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      No outstanding administrative requirements pending on file.
                    </p>
                  )}
                </div>

                {/* Footer Strip: Notes, Tasks, and Action Buttons */}
                <div className="p-4 sm:p-5 bg-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Notes Preview */}
                  <div className="flex-1 text-xs text-slate-600">
                    <strong className="text-slate-800 font-semibold">Notes: </strong>
                    <span className="italic">{person.notes || person.administrativeNotes || 'No notes on file.'}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {/* Individual Plain-English Summary Button */}
                    <button
                      onClick={() => onOpenReadinessSummary(person)}
                      aria-label={`Generate readiness summary for ${person.displayName || person.fullName}`}
                      className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded text-xs font-semibold flex items-center space-x-1.5 transition shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-300" />
                      <span>Readiness Summary</span>
                    </button>

                    {/* Export Personnel Record Button */}
                    {onOpenExport && (
                      <button
                        onClick={() => onOpenExport(person)}
                        aria-label={`Export personnel record for ${person.displayName || person.fullName}`}
                        className="px-3 py-1.5 bg-blue-900 text-white hover:bg-blue-800 rounded text-xs font-semibold flex items-center space-x-1.5 transition shadow-2xs"
                        title="Export Personnel Record (TXT, CSV, XLSX, PDF, DOCX with redaction controls)"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-200" />
                        <span>Export Record</span>
                      </button>
                    )}

                    <button
                      onClick={() => onOpenDetailModal(person)}
                      aria-label={`View dossier for ${person.fullName}`}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded text-xs font-semibold flex items-center space-x-1 transition shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Dossier</span>
                    </button>

                    <button
                      onClick={() => onOpenEditModal(person)}
                      aria-label={`Edit record for ${person.fullName}`}
                      className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded text-xs font-semibold flex items-center space-x-1 transition shadow-2xs"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(person.id)}
                      aria-label={`Remove record for ${person.fullName}`}
                      className="px-3 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded text-xs font-semibold flex items-center space-x-1 transition shadow-2xs"
                      title="Remove record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && personToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">Remove Personnel Record?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove the personnel record for{' '}
              <strong className="text-slate-900">{personToDelete.displayName || personToDelete.fullName}</strong> ({personToDelete.pmcEmployeeId || personToDelete.demoId || personToDelete.badgeId})?
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-700 rounded hover:bg-rose-800 shadow-xs"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
