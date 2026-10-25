import React, { useState, useMemo } from 'react';
import type { CyberHygieneItem, CyberHygieneDomain, CyberItemClassification, FictionalSuspiciousEmail } from '../types/index.ts';
import { INITIAL_SUSPICIOUS_EMAILS } from '../data/mockData.ts';
import {
  computeCyberHygieneMetrics,
  ALL_CYBER_DOMAINS,
  generateCyberHygieneSummary,
} from '../utils/cyberHygieneSummary.ts';
import { CyberHygieneSummaryModal } from './CyberHygieneSummaryModal.tsx';
import { CyberItemModal } from './CyberItemModal.tsx';
import {
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Plus,
  FileText,
  Copy,
  Download,
  Check,
  Smartphone,
  Key,
  Lock,
  Mail,
  FileLock,
  Compass,
  UserCheck,
  HardDrive,
  Eye,
  AlertOctagon,
  Lightbulb,
  ExternalLink,
  Info,
  Edit2,
  Trash2,
  ArrowRight,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface CyberHygieneViewProps {
  items: CyberHygieneItem[];
  onUpdateStatus: (id: string, status: CyberHygieneItem['status']) => void;
  onRunAudit: () => void;
  onSaveItem?: (item: CyberHygieneItem) => void;
  onDeleteItem?: (id: string) => void;
}

export const CyberHygieneView: React.FC<CyberHygieneViewProps> = ({
  items,
  onUpdateStatus,
  onRunAudit,
  onSaveItem,
  onDeleteItem,
}) => {
  // Navigation sub-tabs
  const [activeTab, setActiveTab] = useState<'checklist' | 'phishing' | 'summary'>('checklist');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Outstanding'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | CyberItemClassification>('All');
  const [domainFilter, setDomainFilter] = useState<'All' | CyberHygieneDomain>('All');

  // Modals state
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CyberHygieneItem | null>(null);

  // Phishing Training Lab state
  const [selectedPhishIndex, setSelectedPhishIndex] = useState(0);
  const [showPhishIndicators, setShowPhishIndicators] = useState(false);
  const [reportedPhishMsg, setReportedPhishMsg] = useState(false);

  // Inline feedback
  const [auditSuccessMsg, setAuditSuccessMsg] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Computed metrics
  const metrics = useMemo(() => computeCyberHygieneMetrics(items), [items]);

  const handleRunAudit = () => {
    onRunAudit();
    setAuditSuccessMsg(true);
    setTimeout(() => setAuditSuccessMsg(false), 3500);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEdit = (item: CyberHygieneItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleCopySummary = async () => {
    const text = generateCyberHygieneSummary(items, '2026-10-15');
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    } catch {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    }
  };

  const handleDownloadSummary = () => {
    const text = generateCyberHygieneSummary(items, '2026-10-15');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cybersecurity-Hygiene-Briefing-2026-10-15.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.domain.toLowerCase().includes(q) ||
          item.plainEnglishExplanation.toLowerCase().includes(q) ||
          item.recommendation.toLowerCase().includes(q) ||
          (item.findingNotes && item.findingNotes.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Status
      if (statusFilter !== 'All' && item.status !== statusFilter) {
        return false;
      }

      // Type
      if (typeFilter !== 'All' && item.itemType !== typeFilter) {
        return false;
      }

      // Domain
      if (domainFilter !== 'All' && item.domain !== domainFilter) {
        return false;
      }

      return true;
    });
  }, [items, searchQuery, statusFilter, typeFilter, domainFilter]);

  const getDomainIcon = (domain: CyberHygieneDomain) => {
    switch (domain) {
      case 'Device and operating-system updates':
        return <Smartphone className="w-4 h-4 text-blue-900" />;
      case 'Multi-factor authentication':
        return <Key className="w-4 h-4 text-blue-900" />;
      case 'Password-manager usage':
        return <Lock className="w-4 h-4 text-blue-900" />;
      case 'Phishing awareness':
        return <Mail className="w-4 h-4 text-blue-900" />;
      case 'Secure handling of documents':
        return <FileLock className="w-4 h-4 text-blue-900" />;
      case 'Lost-device reporting':
        return <Compass className="w-4 h-4 text-blue-900" />;
      case 'Account access reviews':
        return <UserCheck className="w-4 h-4 text-blue-900" />;
      case 'Backup and recovery checks':
        return <HardDrive className="w-4 h-4 text-blue-900" />;
      case 'Suspicious-activity reporting':
        return <Eye className="w-4 h-4 text-blue-900" />;
      case 'Basic incident escalation':
      default:
        return <AlertOctagon className="w-4 h-4 text-blue-900" />;
    }
  };

  const currentPhish: FictionalSuspiciousEmail =
    INITIAL_SUSPICIOUS_EMAILS[selectedPhishIndex] || INITIAL_SUSPICIOUS_EMAILS[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-900" />
            <h2 className="text-lg font-bold text-slate-900">
              Defensive Cybersecurity Hygiene & Verification
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Administrative readiness checklist covering 10 defensive operational domains, verified findings, plain-English rationales, and simulated phishing awareness training for protective personnel.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setIsSummaryModalOpen(true)}
            className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-xs space-x-1.5"
          >
            <FileText className="w-4 h-4 text-blue-900" />
            <span>Generate Briefing</span>
          </button>

          <button
            onClick={handleRunAudit}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Synchronize Audit</span>
          </button>
        </div>
      </div>

      {/* Safety Notice & Operational Boundary Banner */}
      <div className="p-3.5 bg-blue-50/80 border-l-4 border-blue-900 rounded-r-lg text-xs text-slate-700 flex items-start space-x-3">
        <Info className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-900 font-semibold">Defensive Administrative Scope:</strong>{' '}
          This section provides defensive checklists, administrative verification tracking, and educational phishing awareness training. It does <em>not</em> conduct live network scanning, penetration testing, surveillance, or password harvesting. Never enter actual passwords, private API keys, or confidential company secrets.
        </div>
      </div>

      {auditSuccessMsg && (
        <div className="p-3 bg-teal-50 border border-teal-300 text-teal-800 rounded-md text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-teal-600" />
          <span>Defensive posture re-evaluated. Audit timestamps synchronized to Oct 15, 2026.</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Rate */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Hygiene Score
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                metrics.complianceRate >= 70
                  ? 'bg-teal-50 text-teal-800'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              {metrics.complianceRate}%
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics.completedCount}{' '}
            <span className="text-sm font-normal text-slate-500">of {metrics.totalCount} completed</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                metrics.complianceRate >= 70 ? 'bg-teal-600' : 'bg-amber-600'
              }`}
              style={{ width: `${metrics.complianceRate}%` }}
            />
          </div>
        </div>

        {/* Verified Findings */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Verified Findings
          </span>
          <div className="mt-2 text-2xl font-bold text-indigo-900">
            {metrics.verifiedOutstandingCount}{' '}
            <span className="text-sm font-normal text-slate-500">
              outstanding ({metrics.verifiedFindingsCount} total)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Audited operational security findings
          </div>
        </div>

        {/* General Recommendations */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            General Recommendations
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-800">
            {metrics.generalCompletedCount}{' '}
            <span className="text-sm font-normal text-slate-500">
              of {metrics.generalRecsCount} implemented
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Defensive SOP baselines & protocols
          </div>
        </div>

        {/* Domains Monitored */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Domains Covered
          </span>
          <div className="mt-2 text-2xl font-bold text-blue-900">
            {metrics.domainsCoveredCount}{' '}
            <span className="text-sm font-normal text-slate-500">of 10 active</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Comprehensive defensive matrix
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-lg px-3 pt-2 space-x-2">
        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'checklist'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>1. Defensive Checklist (10 Domains)</span>
          {metrics.outstandingCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 font-bold">
              {metrics.outstandingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('phishing')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'phishing'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>2. Phishing Awareness Training Lab</span>
          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-200 text-slate-700 font-semibold">
            {INITIAL_SUSPICIOUS_EMAILS.length} Scenarios
          </span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'summary'
              ? 'border-blue-900 text-blue-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>3. Executive Hygiene Briefing (.txt)</span>
        </button>
      </div>

      {/* TAB 1: DEFENSIVE CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search controls, plain-English rationales, domains, or audit notes..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleOpenAdd}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Control / Finding</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center space-x-1 mr-1">
                <Filter className="w-3 h-3" />
                <span>Filters:</span>
              </span>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label="Filter by Status"
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-700 font-medium"
              >
                <option value="All">All Statuses ({items.length})</option>
                <option value="Outstanding">Outstanding ({metrics.outstandingCount})</option>
                <option value="Completed">Completed ({metrics.completedCount})</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                aria-label="Filter by Classification Type"
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-700 font-medium"
              >
                <option value="All">All Classifications</option>
                <option value="Verified Finding">Verified Findings ({metrics.verifiedFindingsCount})</option>
                <option value="General Recommendation">General Recommendations ({metrics.generalRecsCount})</option>
              </select>

              {/* Domain Filter */}
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value as any)}
                aria-label="Filter by Defensive Domain"
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white text-slate-700 font-medium max-w-[220px] truncate"
              >
                <option value="All">All 10 Domains</option>
                {ALL_CYBER_DOMAINS.map((dom) => (
                  <option key={dom} value={dom}>
                    {dom}
                  </option>
                ))}
              </select>

              {(searchQuery || statusFilter !== 'All' || typeFilter !== 'All' || domainFilter !== 'All') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('All');
                    setTypeFilter('All');
                    setDomainFilter('All');
                  }}
                  className="text-[11px] text-blue-900 hover:underline font-semibold ml-auto"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Controls List */}
          {filteredItems.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No defensive controls match your filter.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                  setTypeFilter('All');
                  setDomainFilter('All');
                }}
                className="text-xs text-blue-900 font-semibold underline"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isCompleted = item.status === 'Completed';
                const isVerified = item.itemType === 'Verified Finding';

                return (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-lg p-5 shadow-xs transition space-y-3.5 ${
                      isCompleted ? 'border-slate-200 hover:border-slate-300' : 'border-amber-200/80 bg-amber-50/20'
                    }`}
                  >
                    {/* Top Row: Domain, Title, Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-slate-100 rounded-md shrink-0 mt-0.5">
                          {getDomainIcon(item.domain)}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {/* Classification Badge */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isVerified
                                  ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                                  : 'bg-slate-100 text-slate-800 border-slate-300'
                              }`}
                            >
                              {item.itemType}
                            </span>

                            {/* Domain Tag */}
                            <span className="text-[11px] font-medium text-slate-500">
                              {item.domain}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm text-slate-900 leading-snug">
                            {item.title}
                          </h3>

                          <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>Audited: {item.lastChecked}</span>
                            <span>&bull;</span>
                            <span>Reviewer: {item.verifiedBy || 'Unassigned'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Badge & Quick Status Switch */}
                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => onUpdateStatus(item.id, isCompleted ? 'Outstanding' : 'Completed')}
                          aria-label={`Mark ${item.title} as ${isCompleted ? 'Outstanding' : 'Completed'}`}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition shadow-2xs ${
                            isCompleted
                              ? 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100'
                              : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-teal-700" />
                              <span>Completed</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                              <span>Outstanding</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Plain English Explanation Box */}
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-md text-xs text-slate-700 flex items-start space-x-2.5">
                      <Lightbulb className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-blue-900 block mb-0.5">
                          Plain-English Explanation:
                        </span>
                        <p className="leading-relaxed">{item.plainEnglishExplanation}</p>
                      </div>
                    </div>

                    {/* Operational Recommendation & Action Required */}
                    <div className="text-xs text-slate-800 space-y-1 bg-slate-50 p-3 rounded-md border border-slate-200">
                      <span className="font-semibold text-slate-900 block text-[11px] uppercase tracking-wider">
                        Operational Recommendation:
                      </span>
                      <p className="leading-relaxed text-slate-700">{item.recommendation}</p>
                    </div>

                    {/* Verified Finding Notes (if available) */}
                    {item.findingNotes && (
                      <div className="text-xs bg-slate-100/80 p-2.5 rounded-md border border-slate-200 flex items-start space-x-2">
                        <span className="font-bold text-slate-800 shrink-0 text-[11px]">
                          Audit Finding:
                        </span>
                        <span className="text-slate-600 leading-relaxed">{item.findingNotes}</span>
                      </div>
                    )}

                    {/* Bottom Actions: Edit, Delete */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        Task Control ID: {item.id}
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                          aria-label={`Edit ${item.title}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit / Sign-off</span>
                        </button>

                        {onDeleteItem && (
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PHISHING AWARENESS TRAINING LAB */}
      {activeTab === 'phishing' && (
        <div className="space-y-6">
          {/* Header Explanation */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-2">
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5 text-blue-900" />
              <h3 className="font-bold text-base text-slate-900">
                Suspicious Email Awareness Training Lab
              </h3>
            </div>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Protection operatives, drivers, and close protection officers are frequent targets for spear-phishing, fake IT security resets, and spoofed executive itinerary adjustments. Review these realistic sample email scenarios to train team members to spot subtle deception techniques before reacting.
            </p>
          </div>

          {/* Scenario Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {INITIAL_SUSPICIOUS_EMAILS.map((phish, idx) => (
              <button
                key={phish.id}
                onClick={() => {
                  setSelectedPhishIndex(idx);
                  setShowPhishIndicators(false);
                  setReportedPhishMsg(false);
                }}
                className={`p-3 text-left rounded-lg border transition text-xs flex flex-col justify-between space-y-1 ${
                  selectedPhishIndex === idx
                    ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-bold truncate">Scenario {idx + 1}</div>
                <div className={`text-[11px] line-clamp-2 ${selectedPhishIndex === idx ? 'text-blue-100' : 'text-slate-500'}`}>
                  {phish.scenarioName}
                </div>
              </button>
            ))}
          </div>

          {/* Email Simulation Display */}
          <div className="bg-white border border-slate-300 rounded-xl shadow-md overflow-hidden">
            {/* Fake Email Client Toolbar */}
            <div className="bg-slate-100 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                </div>
                <span className="text-xs font-semibold text-slate-600 ml-2">
                  Mail Client Preview &bull; Awareness Training Scenario #{selectedPhishIndex + 1}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPhishIndicators(!showPhishIndicators)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition shadow-2xs ${
                    showPhishIndicators
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showPhishIndicators ? 'Hide Red Flags' : 'Inspect Red Flags (Show Explanations)'}</span>
                </button>
              </div>
            </div>

            {/* Email Headers */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/60 space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                    From:
                  </span>
                  <span className="font-bold text-slate-900">{currentPhish.senderName}</span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    &lt;{currentPhish.senderAddress}&gt;
                  </span>
                </div>
                <span className="text-slate-400 text-[11px]">{currentPhish.dateSent}</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                  To:
                </span>
                <span className="text-slate-700">ops-team-duty@prot-ops.example.org</span>
              </div>

              <div className="flex items-start space-x-2 pt-1 border-t border-slate-200/60">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] shrink-0 mt-0.5">
                  Subject:
                </span>
                <span className="font-bold text-slate-900 text-sm">{currentPhish.subject}</span>
              </div>
            </div>

            {/* Email Body */}
            <div className="p-6 bg-white space-y-4">
              <div className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed bg-white border border-slate-100 p-4 rounded-md">
                {currentPhish.body}
              </div>

              {/* Action Simulation: Report to SOC */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setReportedPhishMsg(true);
                      setTimeout(() => setReportedPhishMsg(false), 4000);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-blue-900 text-white hover:bg-blue-800 transition shadow-2xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                    <span>Report as Phishing to Ops SOC</span>
                  </button>

                  <button
                    onClick={() => setShowPhishIndicators(!showPhishIndicators)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    <span>{showPhishIndicators ? 'Close Analysis' : 'Show Red Flags'}</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-500">
                  Sample awareness training scenario for defensive personnel
                </span>
              </div>

              {reportedPhishMsg && (
                <div className="p-3 bg-teal-50 border border-teal-300 text-teal-800 rounded-md text-xs flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-teal-600" />
                  <span>
                    Excellent defensive reaction! Simulated report submitted to Security Operations Cell (SOC).
                  </span>
                </div>
              )}
            </div>

            {/* Revealed Red Flags & Threat Breakdown */}
            {showPhishIndicators && (
              <div className="bg-amber-50/70 border-t-2 border-amber-500 p-6 space-y-4">
                <div className="flex items-center space-x-2 text-amber-900">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h4 className="font-bold text-sm">
                    Identified Deception Indicators & Red Flags ({currentPhish.suspiciousIndicators.length})
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentPhish.suspiciousIndicators.map((ind, i) => (
                    <div
                      key={i}
                      className="bg-white p-3.5 rounded-lg border border-amber-200 shadow-2xs space-y-1 text-xs"
                    >
                      <span className="font-bold text-amber-900 flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>{ind.flag}</span>
                      </span>
                      <p className="text-slate-600 leading-relaxed text-[11px]">{ind.explanation}</p>
                    </div>
                  ))}
                </div>

                {/* Educational Takeaway & SOP Response */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-1 text-xs">
                    <span className="font-bold text-blue-900 block uppercase tracking-wider text-[11px]">
                      Key Educational Takeaway:
                    </span>
                    <p className="text-slate-700 leading-relaxed">{currentPhish.educationalTakeaway}</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-1 text-xs">
                    <span className="font-bold text-teal-900 block uppercase tracking-wider text-[11px]">
                      Recommended Operational Response:
                    </span>
                    <p className="text-slate-700 leading-relaxed">{currentPhish.recommendedResponse}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EXECUTIVE HYGIENE BRIEFING */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Defensive Cybersecurity Hygiene Executive Summary
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Formatted plain-English report ready for supervisory review and administrative records.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleCopySummary}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition shadow-xs"
              >
                {copyFeedback ? (
                  <>
                    <Check className="w-4 h-4 text-teal-600" />
                    <span className="text-teal-700 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadSummary}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-100 p-6 rounded-lg border border-slate-800 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap selection:bg-blue-600 selection:text-white">
            {generateCyberHygieneSummary(items, '2026-10-15')}
          </div>
        </div>
      )}

      {/* Modals */}
      <CyberHygieneSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        items={items}
      />

      <CyberItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={(item) => {
          if (onSaveItem) {
            onSaveItem(item);
          }
        }}
        itemToEdit={editingItem}
      />
    </div>
  );
};
