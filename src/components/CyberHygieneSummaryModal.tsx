import React, { useState } from 'react';
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

  if (!isOpen) return null;

  const summaryText = generateCyberHygieneSummary(items, '2026-10-15');

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
    link.download = `Cybersecurity-Hygiene-Briefing-2026-10-15.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="font-bold text-base text-white">
                Cybersecurity Hygiene Executive Briefing
              </h3>
              <p className="text-[11px] text-slate-300">
                Plain-English defensive readiness status across all 10 operational domains
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Disclaimer Strip */}
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2.5 flex items-center space-x-2 text-xs text-blue-900">
          <AlertCircle className="w-4 h-4 text-blue-700 shrink-0" />
          <p className="leading-tight">
            <strong className="font-semibold">Administrative Baseline:</strong> Reports defensive hygiene and task tracking only. Does not conduct live scanning, penetration testing, or automated compliance certification.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Generated Briefing Document (.txt)
            </span>
            <div className="flex items-center space-x-2">
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

          <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap border border-slate-800 selection:bg-blue-600 selection:text-white max-h-[50vh]">
            {summaryText}
          </pre>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>Demonstration purposes only &bull; SAFER (Security Administration, Field Readiness, Evidence &amp; Reporting)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
