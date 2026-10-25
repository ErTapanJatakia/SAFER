import React, { useState } from 'react';
import type { PersonnelRecord } from '../types/index.ts';
import {
  generatePlainEnglishPersonnelSummary,
  generatePlainEnglishRosterSummary,
  MANDATORY_LEGAL_DISCLAIMER,
} from '../utils/readinessRules.ts';
import { copyToClipboard } from '../utils/clipboard.ts';
import { sanitizeSafeFilename } from '../utils/securitySanitizer.ts';
import {
  FileText,
  X,
  Copy,
  Check,
  Download,
  ShieldAlert,
  Users,
  User,
  Info,
} from 'lucide-react';

interface ReadinessSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPerson: PersonnelRecord | null;
  roster: PersonnelRecord[];
}

export const ReadinessSummaryModal: React.FC<ReadinessSummaryModalProps> = ({
  isOpen,
  onClose,
  selectedPerson,
  roster,
}) => {
  const [viewMode, setViewMode] = useState<'individual' | 'roster'>(
    selectedPerson ? 'individual' : 'roster'
  );
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setViewMode(selectedPerson ? 'individual' : 'roster');
      setCopied(false);
    }
  }, [isOpen, selectedPerson]);

  if (!isOpen) return null;

  const currentSummary =
    viewMode === 'individual' && selectedPerson
      ? generatePlainEnglishPersonnelSummary(selectedPerson)
      : generatePlainEnglishRosterSummary(roster);

  const handleCopy = async () => {
    await copyToClipboard(currentSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const cleanId = selectedPerson
      ? sanitizeSafeFilename(selectedPerson.pmcEmployeeId || selectedPerson.demoId || selectedPerson.badgeId || 'PERSONNEL', 'PERSONNEL')
      : 'ROSTER';
    const filename =
      viewMode === 'individual' && selectedPerson
        ? `readiness_summary_${cleanId}.txt`
        : `roster_readiness_briefing_${new Date().toISOString().slice(0, 10)}.txt`;

    const blob = new Blob([currentSummary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-300">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white rounded-t-xl flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-blue-900/80 border border-blue-700 flex items-center justify-center text-blue-200">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Plain-English Administrative Readiness Summary
              </h3>
              <p className="text-[11px] text-slate-400">
                Administrative documentation & credential status report (Text-formatted)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition"
            aria-label="Close summary modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher & Action Bar */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            {selectedPerson && (
              <button
                onClick={() => setViewMode('individual')}
                className={`px-3 py-1.5 rounded-md font-semibold flex items-center space-x-1.5 transition ${
                  viewMode === 'individual'
                    ? 'bg-blue-900 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Individual ({selectedPerson.displayName || selectedPerson.fullName})</span>
              </button>
            )}

            <button
              onClick={() => setViewMode('roster')}
              className={`px-3 py-1.5 rounded-md font-semibold flex items-center space-x-1.5 transition ${
                viewMode === 'roster'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Full Roster Briefing ({roster.length} profiles)</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 rounded-md font-semibold flex items-center space-x-1.5 transition shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-blue-900 text-white hover:bg-blue-800 rounded-md font-semibold flex items-center space-x-1.5 transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .txt</span>
            </button>
          </div>
        </div>

        {/* Mandatory Scope Boundary Banner */}
        <div className="p-4 bg-amber-50/90 border-b border-amber-200 text-amber-900 text-xs flex items-start space-x-3">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-[11px] uppercase tracking-wider text-amber-800">
              Mandatory Administrative Scope Boundary
            </span>
            <p className="text-[11px] leading-relaxed text-amber-900">
              {MANDATORY_LEGAL_DISCLAIMER}
            </p>
          </div>
        </div>

        {/* Content Body: Monospaced Text Readout */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed select-text">
          <pre className="whitespace-pre-wrap font-mono text-[11px] sm:text-xs">
            {currentSummary}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 rounded-b-xl flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center">
            <Info className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Plain-English format for supervisory briefings and compliance records
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white rounded-md font-semibold hover:bg-slate-700"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
};
