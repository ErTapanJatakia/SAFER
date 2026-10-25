import React, { useState, useEffect } from 'react';
import type { CyberHygieneItem, CyberHygieneDomain, CyberItemClassification } from '../types/index.ts';
import { ALL_CYBER_DOMAINS } from '../utils/cyberHygieneSummary.ts';
import { X, ShieldCheck, AlertCircle } from 'lucide-react';

interface CyberItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: CyberHygieneItem) => void;
  itemToEdit: CyberHygieneItem | null;
}

export const CyberItemModal: React.FC<CyberItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  itemToEdit,
}) => {
  const [domain, setDomain] = useState<CyberHygieneDomain>('Device and operating-system updates');
  const [itemType, setItemType] = useState<CyberItemClassification>('General Recommendation');
  const [title, setTitle] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [plainEnglishExplanation, setPlainEnglishExplanation] = useState('');
  const [status, setStatus] = useState<'Completed' | 'Outstanding'>('Outstanding');
  const [findingNotes, setFindingNotes] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (itemToEdit) {
      setDomain(itemToEdit.domain);
      setItemType(itemToEdit.itemType);
      setTitle(itemToEdit.title);
      setRecommendation(itemToEdit.recommendation);
      setPlainEnglishExplanation(itemToEdit.plainEnglishExplanation);
      setStatus(itemToEdit.status);
      setFindingNotes(itemToEdit.findingNotes || '');
      setVerifiedBy(itemToEdit.verifiedBy || '');
    } else {
      setDomain('Device and operating-system updates');
      setItemType('General Recommendation');
      setTitle('');
      setRecommendation('');
      setPlainEnglishExplanation('');
      setStatus('Outstanding');
      setFindingNotes('');
      setVerifiedBy('Ops Lead K. Tanaka');
    }
    setErrorMsg('');
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a control title.');
      return;
    }
    if (!recommendation.trim()) {
      setErrorMsg('Please enter a defensive recommendation.');
      return;
    }
    if (!plainEnglishExplanation.trim()) {
      setErrorMsg('Please provide a plain-English explanation.');
      return;
    }

    const item: CyberHygieneItem = {
      id: itemToEdit?.id || `cyb-custom-${Date.now()}`,
      domain,
      itemType,
      title: title.trim(),
      recommendation: recommendation.trim(),
      plainEnglishExplanation: plainEnglishExplanation.trim(),
      status,
      findingNotes: findingNotes.trim(),
      lastChecked: '2026-10-15',
      verifiedBy: verifiedBy.trim() || null,
    };

    onSave(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-base text-white">
              {itemToEdit ? 'Edit Defensive Control' : 'Add Defensive Control / Finding'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-md flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Classification & Domain Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Classification Type *
              </label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as CyberItemClassification)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium"
              >
                <option value="General Recommendation">General Recommendation (Baseline)</option>
                <option value="Verified Finding">Verified Finding (Audited)</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                General Recommendations are best-practice baselines; Verified Findings record specific operational audits.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Defensive Domain (1 of 10) *
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as CyberHygieneDomain)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium"
              >
                {ALL_CYBER_DOMAINS.map((dom) => (
                  <option key={dom} value={dom}>
                    {dom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Control Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Biometric PIN & Auto-Lock Timeout on Field Tablets"
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900"
            />
          </div>

          {/* Status & Auditor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Completed' | 'Outstanding')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 font-semibold"
              >
                <option value="Outstanding">Outstanding (Remediation Needed)</option>
                <option value="Completed">Completed (Verified Compliant)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Audited By / Reviewer
              </label>
              <input
                type="text"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder="e.g., Ops Lead K. Tanaka"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900"
              />
            </div>
          </div>

          {/* Plain English Explanation */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Plain-English Explanation (Why this matters) *
            </label>
            <textarea
              rows={3}
              value={plainEnglishExplanation}
              onChange={(e) => setPlainEnglishExplanation(e.target.value)}
              placeholder="Explain in plain language why this protective control is necessary for field safety and operations..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 leading-relaxed"
            />
          </div>

          {/* Recommendation */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Operational Recommendation / Protocol Action *
            </label>
            <textarea
              rows={2}
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder="Specific defensive actions team members must execute..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 leading-relaxed"
            />
          </div>

          {/* Finding Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Auditor Finding Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={findingNotes}
              onChange={(e) => setFindingNotes(e.target.value)}
              placeholder="Specific findings, fleet statistics, or gaps identified during check..."
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-100 font-semibold text-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md shadow-xs transition"
            >
              {itemToEdit ? 'Save Changes' : 'Add Control'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
