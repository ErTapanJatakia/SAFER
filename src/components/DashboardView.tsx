import React from 'react';
import type { PersonnelRecord, IncidentReport, PreDeploymentChecklistItem } from '../types/index.ts';
import {
  evaluatePersonnelReadiness,
  evaluateCertification,
  computeOperationalMetrics,
} from '../utils/readinessRules.ts';
import {
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileCheck2,
  ShieldAlert,
  ArrowRight,
  Shield,
  Activity,
  FileText,
  UserCheck,
} from 'lucide-react';
import type { NavigationSection } from './Navbar.tsx';
import { SaferWordmark } from './SaferWordmark.tsx';

interface DashboardViewProps {
  personnelList: PersonnelRecord[];
  incidentList: IncidentReport[];
  checklistItems: PreDeploymentChecklistItem[];
  onNavigate: (section: NavigationSection) => void;
  onSelectPersonnel: (person: PersonnelRecord) => void;
  onOpenAddPersonnel: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  personnelList,
  incidentList,
  checklistItems,
  onNavigate,
  onSelectPersonnel,
  onOpenAddPersonnel,
}) => {
  const metrics = computeOperationalMetrics(personnelList);

  // Filter items requiring urgent human attention
  const urgentPersonnel = personnelList.filter((p) => {
    const status = evaluatePersonnelReadiness(p);
    return status.status === 'FLAGGED_EXPIRED_CERTS' || status.status === 'REQUIRES_HUMAN_REVIEW';
  });

  const completedChecklistCount = checklistItems.filter(
    (i) => i.status === 'Complete' || i.completed
  ).length;
  const outstandingChecklistCount = checklistItems.filter(
    (i) => i.status === 'Incomplete'
  ).length;
  const totalChecklistCount = checklistItems.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Notice: Scope & Safety with SAFER Wordmark */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-600 shadow-xs p-5 rounded-r-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SaferWordmark variant="hero" />
        <div className="flex items-center space-x-2 shrink-0 self-start md:self-auto">
          <button
            onClick={onOpenAddPersonnel}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-md bg-blue-900 text-white hover:bg-blue-800 transition shadow-xs"
          >
            + Add Personnel Record
          </button>
          <button
            onClick={() => onNavigate('personnel')}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition"
          >
            View Roster
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Personnel Tracked */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Total Personnel Roster
            </span>
            <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">{metrics.totalPersonnel}</div>
            <span className="text-xs text-slate-500 font-medium">4 Sectors Active</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Current Documentation:</span>
            <span className="font-semibold text-teal-700">{metrics.docsCurrentCount} on file</span>
          </div>
        </div>

        {/* Metric 2: Items Requiring Human Review */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Requires Human Review
            </span>
            <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-amber-900">{metrics.requiringHumanReviewCount}</div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
              Action Queue
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-600 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Expiring within 45 days:</span>
            <span className="font-semibold text-amber-800">{metrics.expiringSoonCertsCount} certs</span>
          </div>
        </div>

        {/* Metric 3: Expired Certifications */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Expired Certifications
            </span>
            <div className="w-8 h-8 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-rose-900">{metrics.expiredCertsCount}</div>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded">
              High Priority
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-600 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Immediate re-qual:</span>
            <span className="font-semibold text-rose-700">Flagged on file</span>
          </div>
        </div>

        {/* Metric 4: Tasks Completed vs Outstanding */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Administrative Tasks
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-slate-900">
              {metrics.overallTaskCompletionRate}%
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {metrics.totalTasksCompleted} / {metrics.totalTasksCompleted + metrics.totalTasksOutstanding} Completed
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-900 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.overallTaskCompletionRate}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Urgent Human Review Queue + Operational Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Human Review Queue (2 Columns) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold text-sm text-slate-900">
                Personnel Items Requiring Human Review ({urgentPersonnel.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate('personnel')}
              className="text-xs font-medium text-blue-900 hover:text-blue-700 flex items-center"
            >
              Manage in Roster <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {urgentPersonnel.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No personnel records currently flagged for review.
              </div>
            ) : (
              urgentPersonnel.map((person) => {
                const evalResult = evaluatePersonnelReadiness(person);
                // Collect specific warning certs
                const flaggedCerts = person.certifications.filter((c) => {
                  const ev = evaluateCertification(c);
                  return ev.status === 'EXPIRED' || ev.status === 'EXPIRING_SOON';
                });

                return (
                  <div
                    key={person.id}
                    className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          {person.fullName}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          [Call Sign: {person.callSign || person.callsign}]
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {person.role}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center space-x-2">
                        <span>Badge: {person.badgeId}</span>
                        <span>&bull;</span>
                        <span>{person.assignmentSector}</span>
                      </div>
                      {/* Flagged reasons */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {flaggedCerts.map((c) => {
                          const ev = evaluateCertification(c);
                          const isExpired = ev.status === 'EXPIRED';
                          return (
                            <span
                              key={c.id}
                              className={`text-[10px] px-2 py-0.5 rounded font-medium border flex items-center gap-1 ${
                                isExpired
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              {c.name}: {isExpired ? `Expired (${Math.abs(ev.daysRemaining || 0)}d ago)` : `Expires in ${ev.daysRemaining || 0}d`}
                            </span>
                          );
                        })}
                        {person.requiresReview && flaggedCerts.length === 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-medium border bg-amber-50 text-amber-800 border-amber-300">
                            Supervisory quarterly review pending
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${evalResult.badgeColor}`}>
                        {evalResult.label}
                      </span>
                      <button
                        onClick={() => onSelectPersonnel(person)}
                        className="text-xs font-medium text-blue-900 hover:text-blue-700 underline"
                      >
                        Inspect Dossier & Notes
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span>
              <strong>Note:</strong> Items in this queue require supervisor signature before administrative sign-off is completed.
            </span>
            <span className="text-slate-400 font-mono">Prototype System Environment</span>
          </div>
        </div>

        {/* Operational Overview & Fast Access Side Cards */}
        <div className="space-y-4">
          {/* Pre-Deployment Readiness Widget */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="w-4 h-4 text-blue-900" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pre-Deployment Checklist
                </h4>
                {outstandingChecklistCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">
                    {outstandingChecklistCount} Due
                  </span>
                )}
              </div>
              <button
                onClick={() => onNavigate('checklist')}
                className="text-[11px] text-blue-900 font-semibold hover:underline"
              >
                Full Checklist
              </button>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Verification Progress</span>
                <span className="font-semibold text-slate-900">
                  {completedChecklistCount} of {totalChecklistCount} verified
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-teal-600 h-full rounded-full transition-all"
                  style={{ width: `${(completedChecklistCount / totalChecklistCount) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs">
              {checklistItems.slice(0, 3).map((item) => {
                const isComplete = item.status === 'Complete' || item.completed;
                return (
                  <div key={item.id} className="flex items-start space-x-2 text-slate-700">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        isComplete ? 'text-teal-600' : 'text-slate-300'
                      }`}
                    />
                    <span className={`line-clamp-1 ${isComplete ? 'text-slate-600' : 'text-slate-900 font-medium'}`}>
                      {item.task}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Incident Log Snippet */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recent Incidents ({incidentList.length})
                </h4>
              </div>
              <button
                onClick={() => onNavigate('incidents')}
                className="text-[11px] text-blue-900 font-semibold hover:underline"
              >
                View All
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {incidentList.slice(0, 2).map((inc) => (
                <div key={inc.id} className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 truncate max-w-[190px]">
                      {inc.title}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                        inc.priority === 'High Attention'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {inc.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{inc.summary}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Defensive Cybersecurity Status */}
          <div className="bg-slate-900 text-white rounded-lg p-5 shadow-xs border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-teal-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Defensive Cyber Posture
                </h4>
              </div>
              <span className="text-[10px] font-mono bg-teal-900/60 text-teal-300 border border-teal-700/60 px-1.5 py-0.5 rounded">
                AUDITED
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              Hardware token 2FA enforced, encrypted Signal/Matrix protocols verified. Zero automated targeting or offensive capabilities.
            </p>
            <button
              onClick={() => onNavigate('cybersecurity')}
              className="mt-3 w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded transition flex items-center justify-center space-x-1"
            >
              <span>Inspect Cyber Hygiene Rules</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
