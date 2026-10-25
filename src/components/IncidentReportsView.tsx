import React, { useState } from 'react';
import type { IncidentReport, StructuredIncidentDraft } from '../types/index.ts';
import { IncidentDraftModal } from './IncidentDraftModal.tsx';
import {
  generateStructuredIncidentDraft,
  formatStructuredDraftAsText,
  FICTIONAL_INCIDENT_PRESETS,
  INCIDENT_LEGAL_DISCLAIMER,
} from '../utils/incidentDraftGenerator.ts';
import { copyToClipboard } from '../utils/clipboard.ts';
import {
  FileText,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  X,
  Search,
  Sparkles,
  Copy,
  Check,
  ShieldAlert,
  FileCheck2,
  FolderOpen,
  AlertCircle,
} from 'lucide-react';

interface IncidentReportsViewProps {
  incidents: IncidentReport[];
  onAddIncident: (report: IncidentReport) => void;
  onUpdateStatus: (id: string, status: IncidentReport['status']) => void;
}

export const IncidentReportsView: React.FC<IncidentReportsViewProps> = ({
  incidents,
  onAddIncident,
  onUpdateStatus,
}) => {
  // Modal states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [selectedIncidentForDraft, setSelectedIncidentForDraft] = useState<IncidentReport | null>(null);

  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick form state for standard log
  const [title, setTitle] = useState('');
  const [incidentType, setIncidentType] = useState<IncidentReport['incidentType']>('Equipment Malfunction');
  const [priority, setPriority] = useState<IncidentReport['priority']>('Moderate');
  const [location, setLocation] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [summary, setSummary] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      !search ||
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      inc.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inc.location.toLowerCase().includes(search.toLowerCase()) ||
      inc.reportedBy.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || inc.incidentType === filterType;
    return matchesSearch && matchesType;
  });

  const handleOpenDraftGenerator = (incident?: IncidentReport) => {
    if (incident) {
      setSelectedIncidentForDraft(incident);
    } else {
      setSelectedIncidentForDraft(null);
    }
    setIsDraftModalOpen(true);
  };

  const handleQuickCopyDraft = async (inc: IncidentReport) => {
    const draft = inc.structuredDraft || generateStructuredIncidentDraft(
      `Date/Time: ${inc.dateReported}\nLocation: ${inc.location}\nReporter: ${inc.reportedBy}\nNotes: ${inc.summary}`,
      inc.referenceNumber
    );
    const text = formatStructuredDraftAsText(draft);
    await copyToClipboard(text);
    setCopiedId(inc.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Incident Title is required.');
      return;
    }
    if (!summary.trim()) {
      setFormError('Incident Narrative & Corrective Actions are required.');
      return;
    }
    setFormError(null);

    const refNum = `IR-2026-${Math.floor(1000 + Math.random() * 9000)}-${incidentType.substring(0, 2).toUpperCase()}`;
    const draft = generateStructuredIncidentDraft(
      `Date/Time: 2026-10-15 12:00\nLocation: ${location.trim() || 'Static Facility'}\nReporter: ${reportedBy.trim() || 'Duty Officer'}\nNotes: ${summary.trim()}`,
      refNum
    );

    const newReport: IncidentReport = {
      id: `inc-${Date.now()}`,
      referenceNumber: refNum,
      title: title.trim(),
      incidentType,
      dateReported: new Date().toISOString().replace('T', ' ').substring(0, 16),
      reportedBy: reportedBy.trim() || 'Duty Officer (Demo)',
      location: location.trim() || 'Headquarters Static Facility',
      summary: summary.trim(),
      status: 'Under Investigation / Human Review',
      priority,
      structuredDraft: draft,
    };

    onAddIncident(newReport);
    setIsLogModalOpen(false);
    setTitle('');
    setLocation('');
    setReportedBy('');
    setSummary('');
    setFormError(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Section Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-900" />
            <h2 className="text-lg font-bold text-slate-900">
              Administrative & Operational Incident Reports
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Input field observations to generate a 10-point structured incident draft.
            Preserves the distinction between reported facts, unverified claims, and review prompts without automated legal conclusions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => handleOpenDraftGenerator()}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-md bg-blue-950 text-white hover:bg-blue-900 transition shadow-xs space-x-2 border border-blue-800"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Generate Structured Draft</span>
          </button>

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-md bg-blue-900 text-white hover:bg-blue-800 transition shadow-xs space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Log</span>
          </button>
        </div>
      </div>

      {/* Structured Draft Generator Callout Banner */}
      <div className="bg-slate-900 text-white rounded-lg p-4 sm:p-5 shadow-xs border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-900 text-blue-200 border border-blue-700 font-bold">
              10-Field Schema Active
            </span>
            <span className="font-bold text-sm text-slate-100">
              Convert Raw Incident Notes into Standardized Drafts
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Formats chronological facts, user-reported actions, witness information, evidence references, outstanding missing data, and human review items. Never invents timestamps or evidence.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => handleOpenDraftGenerator()}
            className="px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center space-x-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Open Draft Workspace</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference, title, location, reporter..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center space-x-2">
          <label className="text-xs font-medium text-slate-600">Category:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Categories</option>
            <option value="Access Control Anomaly">Access Control Anomaly</option>
            <option value="Equipment Malfunction">Equipment Malfunction</option>
            <option value="Communications Drop">Communications Drop</option>
            <option value="Logistics Delay">Logistics Delay</option>
            <option value="Medical First-Aid Event">Medical First-Aid Event</option>
            <option value="Administrative Discrepancy">Administrative Discrepancy</option>
          </select>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-3.5">
        {filteredIncidents.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-xs text-slate-500">
            No incident reports matching your criteria.
          </div>
        ) : (
          filteredIncidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs hover:border-slate-300 transition space-y-3.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                    {inc.referenceNumber}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">&bull;</span>
                  <span className="text-xs font-semibold text-blue-900">{inc.incidentType}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      inc.priority === 'High Attention'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : inc.priority === 'Moderate'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    Priority: {inc.priority}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      inc.status === 'Documented & Filed'
                        ? 'bg-teal-50 text-teal-800 border-teal-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {inc.status}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{inc.title}</h3>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">{inc.summary}</p>
              </div>

              {/* 10-Field Structured Badge indicators if draft exists */}
              {inc.structuredDraft && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-semibold text-slate-800">10-Field Draft Attached:</span>
                  <span>People: {inc.structuredDraft.peopleAndRolesInvolved.length}</span>
                  <span>&bull;</span>
                  <span>Facts: {inc.structuredDraft.factualChronologicalAccount.length}</span>
                  <span>&bull;</span>
                  <span>Evidence: {inc.structuredDraft.evidenceReferences.length}</span>
                  <span>&bull;</span>
                  <span>Follow-ups: {inc.structuredDraft.followUpActionsRequiringHumanReview.length}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {inc.dateReported}
                  </span>
                  <span className="flex items-center">
                    <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {inc.reportedBy}
                  </span>
                  <span className="flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {inc.location}
                  </span>
                </div>

                {/* Actions: Open Draft Workspace, Copy Draft Text, Workflow Status */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenDraftGenerator(inc)}
                    className="px-2.5 py-1 bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 rounded text-xs font-semibold flex items-center space-x-1"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>View / Edit 10-Pt Draft</span>
                  </button>

                  <button
                    onClick={() => handleQuickCopyDraft(inc)}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold flex items-center space-x-1 shadow-2xs"
                  >
                    {copiedId === inc.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-teal-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Draft</span>
                      </>
                    )}
                  </button>

                  {inc.status !== 'Documented & Filed' ? (
                    <button
                      onClick={() => onUpdateStatus(inc.id, 'Documented & Filed')}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center space-x-1 pl-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Filed</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(inc.id, 'Under Investigation / Human Review')}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800 pl-2"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Standard Quick Log Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full flex flex-col border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white rounded-t-xl flex items-center justify-between border-b border-slate-800">
              <h3 className="font-bold text-sm text-white">Log Operational Incident</h3>
              <button onClick={() => setIsLogModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} noValidate className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-md flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Incident Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Primary SatCom Unit Low Battery Warning"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Incident Category</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value as IncidentReport['incidentType'])}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Access Control Anomaly">Access Control Anomaly</option>
                    <option value="Equipment Malfunction">Equipment Malfunction</option>
                    <option value="Communications Drop">Communications Drop</option>
                    <option value="Logistics Delay">Logistics Delay</option>
                    <option value="Medical First-Aid Event">Medical First-Aid Event</option>
                    <option value="Administrative Discrepancy">Administrative Discrepancy</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority Attention</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as IncidentReport['priority'])}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High Attention">High Attention</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Location / Post</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Sector Charlie Gate 2"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reported By</label>
                  <input
                    type="text"
                    value={reportedBy}
                    onChange={(e) => setReportedBy(e.target.value)}
                    placeholder="e.g. Duty Officer"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Incident Narrative & Corrective Actions <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Detail factual observations, immediate corrective steps taken, and supervisor notifications..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  required
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 text-white rounded font-semibold hover:bg-blue-800"
                >
                  Save Incident Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10-Point Structured Incident Draft Modal */}
      <IncidentDraftModal
        isOpen={isDraftModalOpen}
        onClose={() => {
          setIsDraftModalOpen(false);
          setSelectedIncidentForDraft(null);
        }}
        onSaveToIncidentRoster={onAddIncident}
        initialDraft={selectedIncidentForDraft?.structuredDraft || (selectedIncidentForDraft ? generateStructuredIncidentDraft(
          `Date/Time: ${selectedIncidentForDraft.dateReported}\nLocation: ${selectedIncidentForDraft.location}\nPeople involved: ${selectedIncidentForDraft.reportedBy}\nAccount: ${selectedIncidentForDraft.summary}`,
          selectedIncidentForDraft.referenceNumber
        ) : null)}
        initialReportTitle={selectedIncidentForDraft?.title}
        initialIncidentType={selectedIncidentForDraft?.incidentType}
        initialPriority={selectedIncidentForDraft?.priority}
      />
    </div>
  );
};
