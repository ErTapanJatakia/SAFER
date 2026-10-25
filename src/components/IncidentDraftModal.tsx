import React, { useState } from 'react';
import type { StructuredIncidentDraft, IncidentReport } from '../types/index.ts';
import {
  generateStructuredIncidentDraft,
  formatStructuredDraftAsText,
  FICTIONAL_INCIDENT_PRESETS,
  INCIDENT_LEGAL_DISCLAIMER,
} from '../utils/incidentDraftGenerator.ts';
import { copyToClipboard } from '../utils/clipboard.ts';
import { sanitizeSafeFilename } from '../utils/securitySanitizer.ts';
import {
  FileText,
  X,
  Copy,
  Check,
  Download,
  ShieldAlert,
  Sparkles,
  Edit3,
  Save,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  FolderPlus,
} from 'lucide-react';

interface IncidentDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToIncidentRoster: (report: IncidentReport) => void;
  initialDraft?: StructuredIncidentDraft | null;
  initialReportTitle?: string;
  initialIncidentType?: IncidentReport['incidentType'];
  initialPriority?: IncidentReport['priority'];
}

export const IncidentDraftModal: React.FC<IncidentDraftModalProps> = ({
  isOpen,
  onClose,
  onSaveToIncidentRoster,
  initialDraft,
  initialReportTitle,
  initialIncidentType,
  initialPriority,
}) => {
  // Input notes state
  const [inputNotes, setInputNotes] = useState(
    initialDraft?.rawNotesProvided || FICTIONAL_INCIDENT_PRESETS[0].sourceNotes
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    initialDraft ? '' : 'preset-1'
  );

  // Generated draft state
  const [draft, setDraft] = useState<StructuredIncidentDraft | null>(
    initialDraft || null
  );

  // Editable mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editableRef, setEditableRef] = useState(initialDraft?.incidentReference || '');
  const [editableDateTime, setEditableDateTime] = useState(initialDraft?.dateTime || '');
  const [editableLocation, setEditableLocation] = useState(initialDraft?.locationDescription || '');
  const [editablePeople, setEditablePeople] = useState(initialDraft?.peopleAndRolesInvolved.join('\n') || '');
  const [editableFacts, setEditableFacts] = useState(initialDraft?.factualChronologicalAccount.join('\n') || '');
  const [editableActions, setEditableActions] = useState(initialDraft?.actionsTaken.join('\n') || '');
  const [editableWitness, setEditableWitness] = useState(initialDraft?.witnessInformation || '');
  const [editableEvidence, setEditableEvidence] = useState(initialDraft?.evidenceReferences.join('\n') || '');
  const [editableQuestions, setEditableQuestions] = useState(initialDraft?.outstandingQuestionsAndMissingInfo.join('\n') || '');
  const [editableFollowUps, setEditableFollowUps] = useState(initialDraft?.followUpActionsRequiringHumanReview.join('\n') || '');
  const [editableUnverified, setEditableUnverified] = useState(initialDraft?.unverifiedClaims?.join('\n') || '');

  // Meta for filing into roster
  const [reportTitle, setReportTitle] = useState(initialReportTitle || 'Access Control Anomaly: Turnstile Scanner Reboot');
  const [incidentType, setIncidentType] = useState<IncidentReport['incidentType']>(
    initialIncidentType || 'Access Control Anomaly'
  );
  const [priority, setPriority] = useState<IncidentReport['priority']>(
    initialPriority || 'Moderate'
  );

  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = FICTIONAL_INCIDENT_PRESETS.find((x) => x.id === presetId);
    if (p) {
      setInputNotes(p.sourceNotes);
      setReportTitle(p.title);
      if (p.category === 'Access Control Anomaly') setIncidentType('Access Control Anomaly');
      if (p.category === 'Equipment Malfunction') setIncidentType('Equipment Malfunction');
      if (p.category === 'Logistics Delay') setIncidentType('Logistics Delay');
      if (p.category === 'Administrative Discrepancy') setIncidentType('Administrative Discrepancy');
    }
  };

  const handleGenerate = () => {
    const generated = generateStructuredIncidentDraft(inputNotes);
    setDraft(generated);
    populateEditableFields(generated);
    setIsEditing(false);
  };

  const populateEditableFields = (d: StructuredIncidentDraft) => {
    setEditableRef(d.incidentReference);
    setEditableDateTime(d.dateTime);
    setEditableLocation(d.locationDescription);
    setEditablePeople(d.peopleAndRolesInvolved.join('\n'));
    setEditableFacts(d.factualChronologicalAccount.join('\n'));
    setEditableActions(d.actionsTaken.join('\n'));
    setEditableWitness(d.witnessInformation || '');
    setEditableEvidence(d.evidenceReferences.join('\n'));
    setEditableQuestions(d.outstandingQuestionsAndMissingInfo.join('\n'));
    setEditableFollowUps(d.followUpActionsRequiringHumanReview.join('\n'));
    setEditableUnverified(d.unverifiedClaims ? d.unverifiedClaims.join('\n') : '');
  };

  const handleSaveEdits = () => {
    if (!draft) return;
    const updated: StructuredIncidentDraft = {
      ...draft,
      incidentReference: editableRef.trim() || draft.incidentReference,
      dateTime: editableDateTime.trim() || draft.dateTime,
      locationDescription: editableLocation.trim() || draft.locationDescription,
      peopleAndRolesInvolved: editablePeople.split('\n').map((l) => l.trim()).filter(Boolean),
      factualChronologicalAccount: editableFacts.split('\n').map((l) => l.trim()).filter(Boolean),
      actionsTaken: editableActions.split('\n').map((l) => l.trim()).filter(Boolean),
      witnessInformation: editableWitness.trim() || null,
      evidenceReferences: editableEvidence.split('\n').map((l) => l.trim()).filter(Boolean),
      outstandingQuestionsAndMissingInfo: editableQuestions.split('\n').map((l) => l.trim()).filter(Boolean),
      followUpActionsRequiringHumanReview: editableFollowUps.split('\n').map((l) => l.trim()).filter(Boolean),
      unverifiedClaims: editableUnverified ? editableUnverified.split('\n').map((l) => l.trim()).filter(Boolean) : undefined,
      lastEditedTimestamp: '2026-10-15',
    };
    setDraft(updated);
    setIsEditing(false);
  };

  const currentFormattedText = draft ? formatStructuredDraftAsText(draft) : '';

  const handleCopy = async () => {
    if (!draft) return;
    await copyToClipboard(currentFormattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!draft) return;
    const cleanRef = sanitizeSafeFilename(draft.incidentReference, 'IR-INCIDENT');
    const filename = `incident_draft_${cleanRef}.txt`;
    const blob = new Blob([currentFormattedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveToRoster = () => {
    if (!draft) return;
    const newReport: IncidentReport = {
      id: `inc-${Date.now()}`,
      referenceNumber: draft.incidentReference,
      title: reportTitle.trim() || `Incident ${draft.incidentReference}`,
      incidentType,
      dateReported: draft.dateTime.includes('[DATE/TIME') ? '2026-10-15 12:00' : draft.dateTime.slice(0, 16),
      reportedBy: draft.peopleAndRolesInvolved[0] || 'Duty Officer (Sample Roster)',
      location: draft.locationDescription.includes('[LOCATION') ? 'Static Facility' : draft.locationDescription,
      summary: draft.factualChronologicalAccount.slice(0, 2).join(' ') || 'Incident documented via structured draft generator.',
      status: 'Under Investigation / Human Review',
      priority,
      structuredDraft: draft,
    };
    onSaveToIncidentRoster(newReport);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col border border-slate-300">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white rounded-t-xl flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-900 flex items-center justify-center text-blue-200 border border-blue-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white">
                  Structured Incident Draft Generator
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  10-Point Schema
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transforms rough operational notes into structured, factual administrative records.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-md transition"
            aria-label="Close incident draft modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legal Disclaimer Strip */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-[11px] flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Neutral Administrative Documentation:</strong> {INCIDENT_LEGAL_DISCLAIMER}
          </span>
        </div>

        {/* Modal Content - Split or Tabbed */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-800">
          {/* Section 1: Input Notes & Sample Presets */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                <Edit3 className="w-3.5 h-3.5 text-blue-900" />
                <span>Enter Incident Notes / Field Observations (Sample or Operational Input)</span>
              </label>

              {/* Sample Presets Picker */}
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Load Sample Preset:</span>
                {FICTIONAL_INCIDENT_PRESETS.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition border ${
                      selectedPresetId === p.id
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Sample #{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={5}
              value={inputNotes}
              onChange={(e) => {
                setInputNotes(e.target.value);
                setSelectedPresetId('');
              }}
              placeholder="Paste or write operational notes here (e.g. date/time, location, officers involved, sequence of events, actions taken, evidence observed)..."
              className="w-full p-3 bg-white border border-slate-300 rounded-md font-mono text-xs focus:ring-1 focus:ring-blue-900 focus:outline-none"
            ></textarea>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Rule: Missing details will be marked with clear tags. No timestamps, quotes, or witnesses will be invented.
              </span>
              <button
                type="button"
                onClick={handleGenerate}
                className="px-4 py-2 bg-blue-900 text-white hover:bg-blue-800 rounded-md font-semibold flex items-center space-x-1.5 transition shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Generate 10-Point Draft</span>
              </button>
            </div>
          </div>

          {/* Section 2: Structured 10-Field Output */}
          {draft && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                    {draft.incidentReference}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900">
                    Generated 10-Point Structured Draft
                  </h4>
                </div>

                <div className="flex items-center space-x-2">
                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold flex items-center space-x-1 shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Draft</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveEdits}
                      className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-semibold flex items-center space-x-1 shadow-2xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Apply Changes</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded text-xs font-semibold flex items-center space-x-1 shadow-2xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded text-xs font-semibold flex items-center space-x-1 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .txt</span>
                  </button>
                </div>
              </div>

              {/* View / Edit Mode */}
              {!isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Field 1 & 2 & 3: Reference, Date/Time, Location */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      1. Incident Reference &amp; Meta
                    </span>
                    <div className="font-mono text-xs font-bold text-slate-900">
                      {draft.incidentReference}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-slate-400" />
                      2. Date &amp; Time
                    </span>
                    <div className={`text-xs ${draft.dateTime.includes('[DATE/TIME') ? 'text-amber-800 italic font-semibold' : 'text-slate-900 font-medium'}`}>
                      {draft.dateTime}
                    </div>
                  </div>

                  {/* Field 3: Location */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center">
                      <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                      3. Location Description
                    </span>
                    <div className={`text-xs ${draft.locationDescription.includes('[LOCATION') ? 'text-amber-800 italic font-semibold' : 'text-slate-900 font-medium'}`}>
                      {draft.locationDescription}
                    </div>
                  </div>

                  {/* Field 4: People or Roles Involved */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center">
                      <Users className="w-3 h-3 mr-1 text-slate-400" />
                      4. People or Roles Involved (Personnel / Role Identifiers)
                    </span>
                    <ul className="space-y-1">
                      {draft.peopleAndRolesInvolved.map((p, i) => (
                        <li key={i} className={`text-xs ${p.includes('[NO SPECIFIC') ? 'text-amber-800 italic' : 'text-slate-800 font-medium'}`}>
                          &bull; {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Field 5: Factual Chronological Account */}
                  <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        5. Factual Chronological Account
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                        Reported Facts
                      </span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {draft.factualChronologicalAccount.map((fact, idx) => (
                        <div key={idx} className="text-xs text-slate-800 leading-relaxed bg-white border border-slate-200 p-2.5 rounded">
                          {fact}
                        </div>
                      ))}
                    </div>

                    {/* Unverified Claims Separation */}
                    {draft.unverifiedClaims && draft.unverifiedClaims.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-200 space-y-1.5">
                        <div className="flex items-center space-x-1.5 text-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="font-bold text-[10px] uppercase">
                            Unverified Claims (Pending Independent Corroboration)
                          </span>
                        </div>
                        {draft.unverifiedClaims.map((claim, idx) => (
                          <div key={idx} className="text-xs text-amber-900 bg-amber-50/70 border border-amber-200 p-2.5 rounded italic">
                            &bull; {claim}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Field 6: Actions Taken */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-slate-400" />
                      6. Actions Taken (As Reported)
                    </span>
                    <ul className="space-y-1">
                      {draft.actionsTaken.map((act, i) => (
                        <li key={i} className={`text-xs ${act.includes('[NO IMMEDIATE') ? 'text-amber-800 italic' : 'text-slate-800'}`}>
                          &bull; {act}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Field 7: Witness Information */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      7. Witness Information
                    </span>
                    <div className={`text-xs ${draft.witnessInformation?.includes('[NO WITNESS') ? 'text-slate-500 italic' : 'text-slate-800'}`}>
                      {draft.witnessInformation || '[NO WITNESS INFORMATION PROVIDED]'}
                    </div>
                  </div>

                  {/* Field 8: Evidence References */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      8. Evidence References
                    </span>
                    <ul className="space-y-1">
                      {draft.evidenceReferences.map((ev, i) => (
                        <li key={i} className={`text-xs ${ev.includes('[NO EVIDENCE') ? 'text-slate-500 italic' : 'text-slate-800'}`}>
                          # {ev}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Field 9: Outstanding Questions and Missing Information */}
                  <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3.5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-amber-900 flex items-center">
                      <HelpCircle className="w-3 h-3 mr-1 text-amber-700" />
                      9. Outstanding Questions &amp; Missing Information
                    </span>
                    <ul className="space-y-1 text-amber-950">
                      {draft.outstandingQuestionsAndMissingInfo.map((q, i) => (
                        <li key={i} className="text-xs">
                          [?] {q}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Field 10: Follow-up Actions Requiring Human Review */}
                  <div className="md:col-span-2 bg-blue-50/50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-blue-950 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-blue-800" />
                      10. Follow-up Actions Requiring Human Review (Administrative)
                    </span>
                    <ul className="space-y-1">
                      {draft.followUpActionsRequiringHumanReview.map((action, i) => (
                        <li key={i} className="text-xs text-slate-800 flex items-start space-x-2">
                          <span className="font-mono text-slate-400 font-semibold">[ ]</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                /* Editable Mode: User can tweak each of the fields */
                <div className="space-y-4 bg-slate-50 border border-slate-300 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                        1. Incident Reference
                      </label>
                      <input
                        type="text"
                        value={editableRef}
                        onChange={(e) => setEditableRef(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                        2. Date and Time
                      </label>
                      <input
                        type="text"
                        value={editableDateTime}
                        onChange={(e) => setEditableDateTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                        3. Location Description
                      </label>
                      <input
                        type="text"
                        value={editableLocation}
                        onChange={(e) => setEditableLocation(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      4. People or Roles Involved (One per line)
                    </label>
                    <textarea
                      rows={2}
                      value={editablePeople}
                      onChange={(e) => setEditablePeople(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      5. Factual Chronological Account (One fact per line)
                    </label>
                    <textarea
                      rows={4}
                      value={editableFacts}
                      onChange={(e) => setEditableFacts(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono"
                    ></textarea>
                  </div>

                  {editableUnverified && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-amber-800 mb-1">
                        Unverified Claims (Pending Corroboration)
                      </label>
                      <textarea
                        rows={2}
                        value={editableUnverified}
                        onChange={(e) => setEditableUnverified(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-amber-300 rounded bg-amber-50/50 text-xs font-mono"
                      ></textarea>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                        6. Actions Taken (As reported by author)
                      </label>
                      <textarea
                        rows={2}
                        value={editableActions}
                        onChange={(e) => setEditableActions(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                        7. Witness Information
                      </label>
                      <textarea
                        rows={2}
                        value={editableWitness}
                        onChange={(e) => setEditableWitness(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                      ></textarea>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      8. Evidence References (One per line)
                    </label>
                    <textarea
                      rows={2}
                      value={editableEvidence}
                      onChange={(e) => setEditableEvidence(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      9. Outstanding Questions &amp; Missing Information
                    </label>
                    <textarea
                      rows={3}
                      value={editableQuestions}
                      onChange={(e) => setEditableQuestions(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-600 mb-1">
                      10. Follow-up Actions Requiring Human Review
                    </label>
                    <textarea
                      rows={3}
                      value={editableFollowUps}
                      onChange={(e) => setEditableFollowUps(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs"
                    ></textarea>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-medium"
                    >
                      Cancel Editing
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdits}
                      className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded font-semibold shadow-xs"
                    >
                      Save Draft Edits
                    </button>
                  </div>
                </div>
              )}

              {/* Section 3: File to Roster Options */}
              <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-semibold text-xs text-slate-900">
                    File this Structured Draft to Active Incident Roster
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-600">
                    <span>Title:</span>
                    <input
                      type="text"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      className="px-2 py-0.5 border border-slate-300 rounded bg-white text-xs"
                    />
                    <span>Priority:</span>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as IncidentReport['priority'])}
                      className="px-2 py-0.5 border border-slate-300 rounded bg-white text-xs"
                    >
                      <option value="Routine">Routine</option>
                      <option value="Moderate">Moderate</option>
                      <option value="High Attention">High Attention</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveToRoster}
                  disabled={savedSuccess}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-md font-semibold text-xs flex items-center space-x-1.5 transition shadow-xs shrink-0"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-teal-300" />
                      <span>Filed to Roster!</span>
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-4 h-4" />
                      <span>Save into Incident Roster</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 rounded-b-xl flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-[11px]">
            SAFER Incident Documentation Engine &bull; Deterministic &amp; Free-Tier
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white rounded-md font-semibold hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
