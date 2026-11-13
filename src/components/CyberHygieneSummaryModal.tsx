import React, { useState } from 'react';
import { useModalFocus } from '../hooks/useModalFocus.ts';
import { getCurrentISODate } from '../utils/dateUtils.ts';
import type { CyberHygieneItem } from '../types/index.ts';
import { generateCyberHygieneSummary } from '../utils/cyberHygieneSummary.ts';
import { copyToClipboard } from '../utils/clipboard.ts';
import { X, Copy, Check, Download, ShieldCheck, AlertCircle } from 'lucide-react';

interface CyberHygieneSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CyberHygieneItem[];
}

export const CyberHygieneSummaryModal: React.FC<CyberHygieneSummaryModalProps> = ({
  isOpen,
  onClose,
  items,
}) => {
  const [copied, setCopied] = useState(false);
  const modalRef = useModalFocus<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  const summaryText = generateCyberHygieneSummary(items);

  const handleCopy = async () => {
    await copyToClipboard(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cybersecurity-Hygiene-Briefing-${getCurrentISODate()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="cyber-hygiene-summary-dialog-title" className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] min-w-0">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="flex items-start gap-2 min-w-0">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-base text-white break-words [overflow-wrap:anywhere]" id="cyber-hygiene-summary-dialog-title">
                Cybersecurity Hygiene Executive Briefing
              </h3>
              <p className="text-[11px] text-slate-300 break-words [overflow-wrap:anywhere]">
                Plain-English defensive readiness status across all 10 operational domains
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition self-end sm:self-auto shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Disclaimer Strip */}
        <div className="bg-blue-50 border-b border-blue-200 px-4 sm:px-6 py-2.5 flex items-start gap-2 text-xs text-blue-900 min-w-0">
          <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <p className="leading-tight min-w-0 break-words [overflow-wrap:anywhere]">
            <strong className="font-semibold">Administrative Baseline:</strong> Reports defensive hygiene and task tracking only. Does not conduct live scanning, penetration testing, or automated compliance certification.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider min-w-0 break-words">
              Generated Briefing Document (.txt)
            </span>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <button
                onClick={handleCopy}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-teal-600" />
                    <span className="text-teal-700">Copied to Clipboard</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownload}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>

          <pre className="p-3 sm:p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono leading-relaxed max-w-full overflow-x-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] border border-slate-800 selection:bg-blue-600 selection:text-white max-h-[50vh]">
            {summaryText}
          </pre>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 min-w-0">
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            Demonstration purposes only &bull; SAFER (Security Administration, Field Readiness, Evidence &amp; Reporting)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition self-start sm:self-auto shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
