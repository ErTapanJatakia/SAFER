import React, { useState, useMemo } from 'react';
import type {
  PreDeploymentChecklistItem,
  PreDeploymentCategory,
  PreDeploymentStatus,
  FictionalDemonstrationScenario,
} from '../types/index.ts';
import {
  ALL_PREDEPLOYMENT_CATEGORIES,
  computePreDeploymentMetrics,
  generatePreDeploymentSummaryText,
} from '../utils/preDeploymentSummary.ts';
import { DEFAULT_FICTIONAL_SCENARIO } from '../data/mockData.ts';
import { PreDeploymentSummaryModal } from './PreDeploymentSummaryModal.tsx';
import { copyToClipboard } from '../utils/clipboard.ts';
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  AlertCircle,
  HelpCircle,
  Plus,
  Search,
  Filter,
  FileText,
  Copy,
  Check,
  UserCheck,
  AlertTriangle,
  Calendar,
  Building,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PreDeploymentChecklistViewProps {
  items: PreDeploymentChecklistItem[];
  scenario?: FictionalDemonstrationScenario;
  onUpdateStatus: (id: string, status: PreDeploymentStatus) => void;
  onSignOffTask: (id: string, reviewerName: string) => void;
  onAddTask: (item: PreDeploymentChecklistItem) => void;
  onResetScenario?: () => void;
}

export const PreDeploymentChecklistView: React.FC<PreDeploymentChecklistViewProps> = ({
  items,
  scenario = DEFAULT_FICTIONAL_SCENARIO,
  onUpdateStatus,
  onSignOffTask,
  onAddTask,
  onResetScenario,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScenarioDetails, setShowScenarioDetails] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeSignOffId, setActiveSignOffId] = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState(scenario.leadSupervisor || 'Director S. Holloway');
  const [copiedQuick, setCopiedQuick] = useState(false);

  // New item form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<PreDeploymentCategory>(
    'Required documentation and approvals'
  );
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [newTaskStatus, setNewTaskStatus] = useState<PreDeploymentStatus>('Incomplete');
  const [newTaskAssigned, setNewTaskAssigned] = useState('Safety & Logistics Officer');
  const [newTaskDeadline, setNewTaskDeadline] = useState('2026-10-18');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [taskFormError, setTaskFormError] = useState<string | null>(null);

  const metrics = useMemo(() => computePreDeploymentMetrics(items), [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (selectedStatusFilter === 'OUTSTANDING' && item.status !== 'Incomplete') {
        return false;
      }
      if (selectedStatusFilter === 'COMPLETE' && item.status !== 'Complete') {
        return false;
      }
      if (selectedStatusFilter === 'NOT_APPLICABLE' && item.status !== 'Not Applicable') {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.task.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesNotes = item.complianceNotes?.toLowerCase().includes(query) ?? false;
        const matchesRole = item.assignedRoleOrPerson?.toLowerCase().includes(query) ?? false;
        if (!matchesTitle && !matchesDesc && !matchesNotes && !matchesRole) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedCategory, selectedStatusFilter, searchQuery]);

  const handleQuickCopy = async () => {
    const text = generatePreDeploymentSummaryText(items, scenario, reviewerName, '2026-10-15');
    await copyToClipboard(text);
    setCopiedQuick(true);
    setTimeout(() => setCopiedQuick(false), 2500);
  };

  const handleSignOffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSignOffId && reviewerName.trim()) {
      onSignOffTask(activeSignOffId, reviewerName.trim());
      setActiveSignOffId(null);
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      setTaskFormError('Task Title is required.');
      return;
    }
    setTaskFormError(null);

    const newItem: PreDeploymentChecklistItem = {
      id: `chk-${Date.now()}`,
      task: newTaskTitle.trim(),
      description: newTaskDesc.trim() || 'Pre-deployment administrative verification entry.',
      category: newTaskCategory,
      status: newTaskStatus,
      completed: newTaskStatus === 'Complete',
      priority: newTaskPriority,
      assignedRoleOrPerson: newTaskAssigned.trim() || undefined,
      complianceNotes: newTaskNotes.trim() || undefined,
      requiresHumanReview: true,
      reviewedBy: newTaskStatus === 'Complete' ? reviewerName : null,
      reviewDate: newTaskStatus === 'Complete' ? '2026-10-15' : null,
      targetDeadline: newTaskDeadline,
    };

    onAddTask(newItem);
    setShowAddModal(false);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskNotes('');
    setTaskFormError(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Scenario Context */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-blue-900" />
            <h2 className="text-lg font-bold text-slate-900">
              Pre-Deployment Checklist
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-semibold border border-blue-200">
              8 Readiness Domains
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Conduct administrative and safety-readiness reviews across documentation, certifications, emergency contacts, medical equipment, and briefings prior to operational deployment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setShowSummaryModal(true)}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-md bg-blue-900 text-white hover:bg-blue-800 transition shadow-xs space-x-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>Review Summary Report</span>
          </button>

          <button
            onClick={handleQuickCopy}
            className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-2xs space-x-1.5"
            title="Copy plain text summary report"
          >
            {copiedQuick ? (
              <>
                <Check className="w-4 h-4 text-teal-600" />
                <span className="text-teal-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copy Report</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Mandatory Non-Authorisation & Safety Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded-r-lg shadow-2xs text-xs text-amber-950 flex flex-col sm:flex-row items-start justify-between gap-3">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="font-bold text-amber-900 text-xs uppercase tracking-wide">
              Mandatory Governance & Safety Boundary
            </h3>
            <p className="text-slate-700 leading-relaxed">
              <strong>The application must never state that a person or deployment is approved solely because checklist items are complete.</strong> Checklist items verify administrative documentation and safety readiness. All deployment authorizations require independent affirmative human supervisory review. Tactical routes, target profiles, combat plans, and weapons instructions are strictly excluded.
            </p>
          </div>
        </div>

        {onResetScenario && (
          <button
            onClick={onResetScenario}
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold rounded border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 shrink-0 self-start sm:self-center"
          >
            <RotateCcw className="w-3 h-3 text-amber-700" />
            <span>Reset Demo Scenario</span>
          </button>
        )}
      </div>

      {/* Fictional Demonstration Scenario Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-blue-900" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Demonstration Operational Scenario:
            </span>
            <span className="text-xs font-semibold text-blue-900">
              {scenario.codename}
            </span>
          </div>

          <button
            onClick={() => setShowScenarioDetails(!showScenarioDetails)}
            className="inline-flex items-center text-xs text-blue-900 hover:text-blue-700 font-semibold space-x-1"
          >
            <span>{showScenarioDetails ? 'Hide Scenario Parameters' : 'View Scenario Parameters'}</span>
            {showScenarioDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showScenarioDetails ? (
          <div className="mt-3 text-xs space-y-2 pt-2 border-t border-slate-100 text-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-md">
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Mission Focus</span>
                <span className="font-semibold text-slate-900">{scenario.title}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Demonstration Venue</span>
                <span className="text-slate-900">{scenario.fictionalVenue}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Jurisdiction</span>
                <span className="text-slate-900">{scenario.fictionalJurisdiction}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Lead Supervisor</span>
                <span className="font-semibold text-slate-900">{scenario.leadSupervisor}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed italic">
              {scenario.overviewDescription}
            </p>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span><strong>Principal:</strong> {scenario.title}</span>
            <span>&bull;</span>
            <span><strong>Venue:</strong> {scenario.fictionalVenue}</span>
            <span>&bull;</span>
            <span><strong>Lead:</strong> {scenario.leadSupervisor}</span>
          </div>
        )}
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Checklist Items
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics.totalCount}
          </div>
          <span className="text-[11px] text-slate-500">Across 8 mandatory domains</span>
        </div>

        {/* Completed */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Verified Complete
          </span>
          <div className="mt-2 text-2xl font-bold text-teal-700">
            {metrics.completeCount}
          </div>
          <div className="mt-2 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all"
              style={{ width: `${metrics.completionRate}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {metrics.completionRate}% completion rate (excluding N/A)
          </span>
        </div>

        {/* Outstanding (Incomplete) - Prominently Displayed */}
        <div className="bg-amber-50/70 border-2 border-amber-400 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Outstanding Items
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
              ATTENTION
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">
            {metrics.incompleteCount} Incomplete
          </div>
          <span className="text-[11px] text-amber-800 font-medium">
            Requires human operational resolution
          </span>
        </div>

        {/* Not Applicable */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Not Applicable (N/A)
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-600">
            {metrics.notApplicableCount}
          </div>
          <span className="text-[11px] text-slate-500">Jurisdiction & venue exclusions</span>
        </div>
      </div>

      {/* Prominent Outstanding Items Banner / Queue */}
      {metrics.outstandingItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-700" />
              <h3 className="text-sm font-bold uppercase tracking-wide">
                Prominently Outstanding Items ({metrics.outstandingItems.length})
              </h3>
            </div>
            <button
              onClick={() => setSelectedStatusFilter('OUTSTANDING')}
              className="text-xs text-amber-900 hover:text-amber-950 font-semibold underline"
            >
              Filter view to outstanding
            </button>
          </div>

          <p className="text-xs text-amber-950">
            The following checklist tasks are incomplete or require supervisor intervention before administrative readiness can be certified.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {metrics.outstandingItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-amber-200 rounded-lg p-3 text-xs space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-900">{item.task}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border shrink-0 ${
                      item.priority === 'High'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {item.priority} Priority
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">{item.category}</span>
                  {item.targetDeadline && (
                    <span> &bull; Due: {item.targetDeadline}</span>
                  )}
                </div>
                <p className="text-slate-600 line-clamp-2">{item.description}</p>
                {item.complianceNotes && (
                  <p className="text-[11px] text-amber-900 font-medium bg-amber-50/80 p-1.5 rounded border border-amber-200">
                    <strong>Issue Note:</strong> {item.complianceNotes}
                  </p>
                )}

                {/* Quick Status Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-mono">Status: Incomplete</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onUpdateStatus(item.id, 'Complete')}
                      className="px-2 py-1 text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-300 rounded hover:bg-teal-100"
                    >
                      Mark Complete
                    </button>
                    <button
                      onClick={() => onUpdateStatus(item.id, 'Not Applicable')}
                      className="px-2 py-1 text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300 rounded hover:bg-slate-200"
                    >
                      Mark N/A
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search checklist tasks, notes, or assigned staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 focus:border-blue-900"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-slate-500 font-semibold mr-1 shrink-0 flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1" />
              Status:
            </span>
            {[
              { id: 'ALL', label: 'All Items' },
              { id: 'OUTSTANDING', label: `Outstanding (${metrics.incompleteCount})` },
              { id: 'COMPLETE', label: `Complete (${metrics.completeCount})` },
              { id: 'NOT_APPLICABLE', label: `N/A (${metrics.notApplicableCount})` },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatusFilter(st.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap ${
                  selectedStatusFilter === st.id
                    ? st.id === 'OUTSTANDING'
                      ? 'bg-amber-800 text-white'
                      : 'bg-blue-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Pills (All 8 Categories) */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Filter by Checklist Category (8 Domains):
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition border ${
                selectedCategory === 'ALL'
                  ? 'bg-blue-900 text-white border-blue-900 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              All Categories ({items.length})
            </button>
            {ALL_PREDEPLOYMENT_CATEGORIES.map((cat, idx) => {
              const count = items.filter((i) => i.category === cat).length;
              const hasOutstanding = items.some(
                (i) => i.category === cat && i.status === 'Incomplete'
              );
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition border flex items-center space-x-1 ${
                    selectedCategory === cat
                      ? 'bg-blue-900 text-white border-blue-900 shadow-2xs font-semibold'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{idx + 1}. {cat}</span>
                  <span
                    className={`text-[10px] px-1 rounded ${
                      selectedCategory === cat
                        ? 'bg-blue-800 text-white'
                        : hasOutstanding
                        ? 'bg-amber-100 text-amber-800 font-bold'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Checklist Tasks List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-2">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No Checklist Items Match Filter</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search criteria, category selection, or status filters.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="mt-2 px-3 py-1.5 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-semibold transition"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isComplete = item.status === 'Complete';
            const isIncomplete = item.status === 'Incomplete';
            const isNA = item.status === 'Not Applicable';

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-lg p-4 shadow-xs transition ${
                  isIncomplete
                    ? 'border-amber-300/80 hover:border-amber-400'
                    : isComplete
                    ? 'border-slate-200 bg-white hover:border-slate-300'
                    : 'border-slate-200 bg-slate-50/60 opacity-80'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Column: Task details */}
                  <div className="space-y-2 flex-1">
                    {/* Header line: Badges and Title */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status indicator badge */}
                      {isComplete && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-teal-600" />
                          Complete
                        </span>
                      )}
                      {isIncomplete && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                          <Circle className="w-3 h-3 mr-1 text-amber-700" />
                          Incomplete (Outstanding)
                        </span>
                      )}
                      {isNA && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                          <HelpCircle className="w-3 h-3 mr-1 text-slate-400" />
                          Not Applicable
                        </span>
                      )}

                      {/* Category tag */}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {item.category}
                      </span>

                      {/* Priority badge */}
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          item.priority === 'High'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : item.priority === 'Medium'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {item.priority} Priority
                      </span>
                    </div>

                    {/* Task Title */}
                    <h3
                      className={`font-bold text-sm leading-snug ${
                        isComplete ? 'text-slate-800' : isIncomplete ? 'text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {item.task}
                    </h3>

                    {/* Task Description */}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Compliance Notes if present */}
                    {item.complianceNotes && (
                      <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs text-slate-700 space-y-0.5">
                        <span className="font-semibold text-slate-800 block text-[11px]">
                          Audit & Verification Record:
                        </span>
                        <p>{item.complianceNotes}</p>
                      </div>
                    )}

                    {/* Footer metadata */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                      {item.targetDeadline && (
                        <span className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Target Deadline: {item.targetDeadline}
                        </span>
                      )}
                      {item.assignedRoleOrPerson && (
                        <span>
                          Assigned: <strong className="text-slate-700">{item.assignedRoleOrPerson}</strong>
                        </span>
                      )}
                      {item.reviewedBy ? (
                        <span className="text-teal-700 font-semibold flex items-center">
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          Supervisory Sign-Off: {item.reviewedBy} ({item.reviewDate || '2026-10-15'})
                        </span>
                      ) : item.requiresHumanReview ? (
                        <span className="text-amber-800 font-semibold flex items-center">
                          <AlertCircle className="w-3.5 h-3.5 mr-1" />
                          Awaiting Supervisor Human Sign-off
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Right Column: Status Switcher & Sign-off */}
                  <div className="flex sm:flex-col items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Status Pill Switcher */}
                    <div className="space-y-1 text-right">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Mark Status:
                      </span>
                      <div className="inline-flex rounded-md shadow-2xs border border-slate-300 overflow-hidden bg-white">
                        <button
                          onClick={() => onUpdateStatus(item.id, 'Complete')}
                          className={`px-2.5 py-1 text-xs font-semibold transition ${
                            item.status === 'Complete'
                              ? 'bg-teal-700 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                          title="Mark Complete"
                        >
                          ✓ Complete
                        </button>
                        <button
                          onClick={() => onUpdateStatus(item.id, 'Incomplete')}
                          className={`px-2.5 py-1 text-xs font-semibold border-l border-r border-slate-300 transition ${
                            item.status === 'Incomplete'
                              ? 'bg-amber-800 text-white'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                          title="Mark Incomplete"
                        >
                          ○ Incomplete
                        </button>
                        <button
                          onClick={() => onUpdateStatus(item.id, 'Not Applicable')}
                          className={`px-2.5 py-1 text-xs font-semibold transition ${
                            item.status === 'Not Applicable'
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                          title="Mark Not Applicable"
                        >
                          ⊘ N/A
                        </button>
                      </div>
                    </div>

                    {/* Supervisor Sign-Off Button */}
                    {!item.reviewedBy && item.requiresHumanReview && (
                      <button
                        onClick={() => setActiveSignOffId(item.id)}
                        className="px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-300 rounded text-xs font-semibold hover:bg-amber-100 transition shadow-2xs inline-flex items-center space-x-1"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                        <span>Supervisor Sign-Off</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Human Supervisory Sign-off Modal */}
      {activeSignOffId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 text-blue-900">
              <UserCheck className="w-5 h-5 text-blue-900" />
              <h3 className="font-bold text-base text-slate-900">
                Supervisor Human Sign-Off
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Record that a designated human supervisor has reviewed the documentation, verification records, or mitigations for this item.
            </p>
            <form onSubmit={handleSignOffSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Supervisor Name & Title
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                  required
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSignOffId(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 text-white rounded font-semibold hover:bg-blue-800 transition"
                >
                  Confirm Sign-Off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Checklist Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ClipboardList className="w-5 h-5 text-blue-900" />
                <h3 className="font-bold text-base text-slate-900">Add Pre-Deployment Task</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} noValidate className="space-y-3 text-xs">
              {taskFormError && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-md flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{taskFormError}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Trauma Medical Evacuation Protocol Handshake"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category (8 Domains)</label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value as PreDeploymentCategory)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                  >
                    {ALL_PREDEPLOYMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value as PreDeploymentStatus)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                  >
                    <option value="Incomplete">Incomplete (Outstanding)</option>
                    <option value="Complete">Complete</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Deadline</label>
                  <input
                    type="date"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Role or Person</label>
                <input
                  type="text"
                  value={newTaskAssigned}
                  onChange={(e) => setNewTaskAssigned(e.target.value)}
                  placeholder="e.g. Comms Specialist (Lucas Meyer)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description & Criteria</label>
                <textarea
                  rows={2}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Verification parameters and administrative instructions..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Verification / Compliance Notes</label>
                <textarea
                  rows={2}
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  placeholder="Current findings, permits on file, or pending approvals..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 text-white rounded font-semibold hover:bg-blue-800 transition"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Report Modal */}
      {showSummaryModal && (
        <PreDeploymentSummaryModal
          items={items}
          scenario={scenario}
          onClose={() => setShowSummaryModal(false)}
        />
      )}
    </div>
  );
};
