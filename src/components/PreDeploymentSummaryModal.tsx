import React, { useState } from 'react';
import type { PreDeploymentChecklistItem, FictionalDemonstrationScenario } from '../types/index.ts';
import {
  computePreDeploymentMetrics,
  generatePreDeploymentSummaryText,
} from '../utils/preDeploymentSummary.ts';
import { copyToClipboard } from '../utils/clipboard.ts';
import { sanitizeSafeFilename } from '../utils/securitySanitizer.ts';
import {
  X,
  Copy,
  Check,
  Download,
  AlertTriangle,
  ClipboardList,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface PreDeploymentSummaryModalProps {
  items: PreDeploymentChecklistItem[];
  scenario?: FictionalDemonstrationScenario;
  onClose: () => void;
  onSupervisorSignOff?: (supervisorName: string, determination: string) => void;
}

export const PreDeploymentSummaryModal: React.FC<PreDeploymentSummaryModalProps> = ({
  items,
  scenario,
  onClose,
  onSupervisorSignOff,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'structured' | 'plaintext'>('structured');
  const [supervisorName, setSupervisorName] = useState(
    scenario?.leadSupervisor || 'Director S. Holloway'
  );
  const [determination, setDetermination] = useState<string>('ENDORSED_FOR_ADMINISTRATIVE_FILING');
  const [signOffSaved, setSignOffSaved] = useState(false);

  const metrics = computePreDeploymentMetrics(items);
  const reportText = generatePreDeploymentSummaryText(
    items,
    scenario,
    supervisorName,
    '2026-10-15'
  );

  const handleCopy = async () => {
    await copyToClipboard(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const scenarioId = sanitizeSafeFilename(scenario?.id || 'NCR-SETU-01', 'NCR-SETU-01');
    link.download = `Pre-Deployment-Readiness-Summary-${scenarioId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmSignOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSupervisorSignOff && supervisorName.trim()) {
      onSupervisorSignOff(supervisorName.trim(), determination);
    }
    setSignOffSaved(true);
    setTimeout(() => setSignOffSaved(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Pre-Deployment Readiness Summary for Human Review
              </h2>
              <p className="text-xs text-slate-400">
                Administrative & Safety-Readiness Review &bull; Demonstration Operational Scenario
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close summary modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandatory Safety Notice Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-900 flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            <strong>Mandatory Human Supervisory Mandate:</strong> This checklist provides administrative and safety-readiness tracking only. The application and this report <strong>must never state or imply that any person or deployment is approved solely because checklist items are complete</strong>. Final deployment authorization requires affirmative, independent human supervisory review.
          </p>
        </div>

        {/* View Switcher Tabs & Actions */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('structured')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'structured'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              Structured Review View
            </button>
            <button
              onClick={() => setActiveTab('plaintext')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'plaintext'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              Raw Plaintext Report (.txt)
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-teal-700">Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Report</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-900 text-white hover:bg-blue-800 transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .txt</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {activeTab === 'structured' ? (
            <div className="space-y-6">
              {/* Scenario Context Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {scenario?.codename || 'Operation Pacific Horizon (Administrative Demo)'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-medium">
                    Demonstration Operational Scenario
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div>
                    <span className="font-semibold text-slate-700">Mission Subject: </span>
                    {scenario?.title}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Demonstration Venue: </span>
                    {scenario?.fictionalVenue}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Jurisdiction: </span>
                    {scenario?.fictionalJurisdiction}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Target Dates: </span>
                    {scenario?.startDate} to {scenario?.targetEndDate}
                  </div>
                </div>
              </div>

              {/* KPI Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Total Controls
                  </span>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {metrics.totalCount} items
                  </div>
                  <span className="text-[10px] text-slate-500">Across 8 categories</span>
                </div>

                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 shadow-2xs">
                  <span className="text-[11px] font-semibold text-teal-700 uppercase tracking-wider">
                    Completed
                  </span>
                  <div className="mt-1 text-xl font-bold text-teal-800">
                    {metrics.completeCount}
                  </div>
                  <span className="text-[10px] text-teal-600">
                    {metrics.completionRate}% completion rate
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 shadow-2xs">
                  <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                    Outstanding
                  </span>
                  <div className="mt-1 text-xl font-bold text-amber-900">
                    {metrics.incompleteCount}
                  </div>
                  <span className="text-[10px] text-amber-700 font-semibold">Requires Review</span>
                </div>

                <div className="bg-slate-100 border border-slate-300 rounded-lg p-3 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Not Applicable
                  </span>
                  <div className="mt-1 text-xl font-bold text-slate-700">
                    {metrics.notApplicableCount}
                  </div>
                  <span className="text-[10px] text-slate-500">Scope exclusions</span>
                </div>
              </div>

              {/* Prominent Outstanding Items */}
              <div className="border border-amber-300 bg-amber-50/70 rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-2 text-amber-900">
                  <AlertCircle className="w-5 h-5 text-amber-700" />
                  <h3 className="font-bold text-sm uppercase tracking-wide">
                    Outstanding Issues Requiring Human Supervisor Attention ({metrics.outstandingItems.length})
                  </h3>
                </div>

                {metrics.outstandingItems.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">
                    No outstanding items flagged. All checklist entries are completed or marked not applicable.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {metrics.outstandingItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="bg-white border border-amber-200 rounded-md p-3 text-xs space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">
                            {index + 1}. {item.task}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                              item.priority === 'High'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {item.priority} Priority
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Category: <span className="text-slate-700">{item.category}</span>
                          {item.assignedRoleOrPerson && (
                            <span> &bull; Assigned: {item.assignedRoleOrPerson}</span>
                          )}
                          {item.targetDeadline && (
                            <span> &bull; Target: {item.targetDeadline}</span>
                          )}
                        </div>
                        <p className="text-slate-600 leading-relaxed">{item.description}</p>
                        {item.complianceNotes && (
                          <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700">
                            <strong>Compliance Note:</strong> {item.complianceNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Categorical Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-900" />
                  <span>Category-by-Category Readiness Audit (8 Domains)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {metrics.categoryBreakdown.map((cat, idx) => (
                    <div
                      key={cat.category}
                      className="border border-slate-200 rounded-lg p-3 bg-white text-xs space-y-2 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-slate-900">
                          {idx + 1}. {cat.category}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold shrink-0">
                          {cat.complete}/{cat.total}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                        <span className="flex items-center text-teal-700">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-teal-600" />
                          {cat.complete} Complete
                        </span>
                        <span className="flex items-center text-amber-800 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-700" />
                          {cat.incomplete} Outstanding
                        </span>
                        {cat.notApplicable > 0 && (
                          <span className="flex items-center text-slate-400">
                            <HelpCircle className="w-3.5 h-3.5 mr-1" />
                            {cat.notApplicable} N/A
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Human Supervisor Determination Sign-Off Form */}
              <div className="border border-blue-900/20 bg-blue-50/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-2 text-blue-900">
                  <UserCheck className="w-5 h-5 text-blue-900" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Human Supervisory Review Record
                  </h3>
                </div>
                <p className="text-xs text-slate-600">
                  Record the supervisory review determination for operational archives.
                </p>

                <form onSubmit={handleConfirmSignOff} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Supervisor Name & Title
                    </label>
                    <input
                      type="text"
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Determination
                    </label>
                    <select
                      value={determination}
                      onChange={(e) => setDetermination(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900"
                    >
                      <option value="ENDORSED_FOR_ADMINISTRATIVE_FILING">
                        Endorsed for Administrative Filing
                      </option>
                      <option value="REMEDIATION_REQUIRED">
                        Remediation Required (Outstanding Issues)
                      </option>
                      <option value="PENDING_HUMAN_REVIEW">
                        Pending Supervisory Verification
                      </option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-semibold rounded-md transition shadow-2xs flex items-center justify-center space-x-1"
                    >
                      {signOffSaved ? (
                        <>
                          <Check className="w-4 h-4 text-teal-300" />
                          <span>Review Recorded</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>Confirm Sign-off</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Text report formatted for copy, export, or audit records:</span>
                <span className="font-mono">Plaintext Format &bull; UTF-8</span>
              </div>
              <textarea
                readOnly
                value={reportText}
                rows={22}
                className="w-full font-mono text-xs p-4 bg-slate-900 text-slate-200 rounded-lg border border-slate-700 leading-relaxed focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Sample Demonstration &bull; Non-Tactical Administrative Review
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 text-slate-800 hover:bg-slate-300 rounded-md text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
