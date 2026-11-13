import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ClipboardList, Database, Download, ShieldCheck, X } from 'lucide-react';
import {
  EMPTY_PRIVACY_DEMO_WORKSPACE,
  type PrivacyDemoWorkspace,
  type PrivacyGrievance,
  type PrivacyProcessingActivity,
  type PrivacyRightsRequest,
} from '../types/privacy.ts';
import { createPrivacyDemoRepository } from '../utils/privacyRepository.ts';
import { createPrivacyDemoExport } from '../utils/privacyExport.ts';

type Tab = 'overview' | 'processing' | 'notices' | 'requests' | 'grievances' | 'consent' | 'retention';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'processing', label: 'Processing activities' },
  { id: 'notices', label: 'Notice drafts' },
  { id: 'requests', label: 'Rights requests' },
  { id: 'grievances', label: 'Grievances' },
  { id: 'consent', label: 'Consent events' },
  { id: 'retention', label: 'Retention reviews' },
];

const inputClass = 'w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400';
const buttonClass = 'rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400';
const primaryButtonClass = 'rounded-lg border border-teal-500 bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300';

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export const PrivacyConsoleModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [workspace, setWorkspace] = useState<PrivacyDemoWorkspace>(EMPTY_PRIVACY_DEMO_WORKSPACE);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [error, setError] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [activityPurpose, setActivityPurpose] = useState('');
  const [activityCategories, setActivityCategories] = useState('');
  const [activityRecipients, setActivityRecipients] = useState('');
  const [activityRetention, setActivityRetention] = useState('');
  const [activityAssessment, setActivityAssessment] = useState<PrivacyProcessingActivity['legalAssessment']>('not-assessed');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [requestKind, setRequestKind] = useState<PrivacyRightsRequest['requestKind']>('access');
  const [requestDescription, setRequestDescription] = useState('');
  const [grievanceCategory, setGrievanceCategory] = useState('General');
  const [grievanceDescription, setGrievanceDescription] = useState('');
  const [consentSubject, setConsentSubject] = useState('');
  const [consentPurpose, setConsentPurpose] = useState('');
  const [retentionCategory, setRetentionCategory] = useState('');
  const [retentionNote, setRetentionNote] = useState('');

  const repository = useMemo(() => {
    try {
      if (typeof window === 'undefined') return null;
      return createPrivacyDemoRepository(window.localStorage);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (!repository) {
      setStorageReady(false);
      setError('Browser storage is unavailable. The privacy console is read-only until storage access is restored.');
      return;
    }
    try {
      setWorkspace(repository.loadWorkspace());
      setStorageReady(true);
      setError(null);
    } catch (cause) {
      setStorageReady(false);
      setError(cause instanceof Error ? cause.message : 'Privacy workspace could not be loaded.');
    }
  }, [isOpen, repository]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const persist = (next: PrivacyDemoWorkspace): boolean => {
    if (!repository || !storageReady) {
      setError('The privacy workspace has not passed its storage and integrity checks. No changes were saved.');
      return false;
    }
    try {
      repository.saveWorkspace(next);
      setWorkspace(next);
      setError(null);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save privacy workspace.');
      return false;
    }
  };

  const addRequest = (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestDescription.trim()) return;
    const now = new Date().toISOString();
    const record: PrivacyRightsRequest = {
      id: newId('request'), subjectRef: 'synthetic-demo-subject',
      requestKind, description: requestDescription.trim(), status: 'submitted',
      submittedAt: now, updatedAt: now,
    };
    if (persist({ ...workspace, rightsRequests: [record, ...workspace.rightsRequests] })) setRequestDescription('');
  };

  const addGrievance = (event: React.FormEvent) => {
    event.preventDefault();
    if (!grievanceDescription.trim()) return;
    const now = new Date().toISOString();
    const record: PrivacyGrievance = {
      id: newId('grievance'), subjectRef: 'synthetic-demo-subject',
      category: grievanceCategory, description: grievanceDescription.trim(),
      status: 'open', submittedAt: now, updatedAt: now,
    };
    if (persist({ ...workspace, grievances: [record, ...workspace.grievances] })) setGrievanceDescription('');
  };

  const updateRequestStatus = (id: string, status: PrivacyRightsRequest['status']) => {
    const now = new Date().toISOString();
    persist({ ...workspace, rightsRequests: workspace.rightsRequests.map((record) =>
      record.id === id ? { ...record, status, updatedAt: now } : record) });
  };

  const updateGrievanceStatus = (id: string, status: PrivacyGrievance['status']) => {
    const now = new Date().toISOString();
    persist({ ...workspace, grievances: workspace.grievances.map((record) =>
      record.id === id ? { ...record, status, updatedAt: now } : record) });
  };

  const addNotice = (event: React.FormEvent) => {
    event.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;
    const next = {
      ...workspace,
      noticeDrafts: [{
        id: newId('notice'), title: noticeTitle.trim(), content: noticeContent.trim(),
        versionLabel: 'Draft', updatedAt: new Date().toISOString(),
      }, ...workspace.noticeDrafts],
    };
    if (persist(next)) {
      setNoticeTitle('');
      setNoticeContent('');
    }
  };

  const addConsentEvent = (event: React.FormEvent) => {
    event.preventDefault();
    if (!consentSubject.trim() || !consentPurpose.trim()) return;
    const saved = persist({ ...workspace, consentEvents: [{
      id: newId('consent'), subjectRef: consentSubject.trim(), purposeRef: consentPurpose.trim(),
      event: 'granted', recordedAt: new Date().toISOString(),
      note: 'Manually recorded synthetic demonstration event; not proof of legally valid consent.',
    }, ...workspace.consentEvents] });
    if (saved) {
      setConsentSubject('');
      setConsentPurpose('');
    }
  };

  const addProcessingActivity = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activityPurpose.trim() || !activityRetention.trim()) return;
    const splitValues = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
    const record: PrivacyProcessingActivity = {
      id: newId('activity'), purpose: activityPurpose.trim(),
      dataCategories: splitValues(activityCategories), recipients: splitValues(activityRecipients),
      retentionDescription: activityRetention.trim(), legalAssessment: activityAssessment,
    };
    if (persist({ ...workspace, processingActivities: [record, ...workspace.processingActivities] })) {
      setActivityPurpose(''); setActivityCategories(''); setActivityRecipients(''); setActivityRetention('');
      setActivityAssessment('not-assessed');
    }
  };

  const exportWorkspace = () => {
    if (!repository || !storageReady) {
      setError('The privacy workspace has not passed its storage and integrity checks. No export was created.');
      return;
    }
    try {
      const latestWorkspace = repository.loadWorkspace();
      const blob = new Blob([createPrivacyDemoExport(latestWorkspace)], { type: 'application/json;charset=utf-8' });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `safer-privacy-demo-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setWorkspace(latestWorkspace);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create the privacy demo export.');
    }
  };

  const addRetentionReview = (event: React.FormEvent) => {
    event.preventDefault();
    if (!retentionCategory.trim() || !retentionNote.trim()) return;
    const saved = persist({ ...workspace, retentionReviews: [{
      id: newId('retention'), dataCategory: retentionCategory.trim(),
      reviewNote: retentionNote.trim(), status: 'reviewed',
      reviewedAt: new Date().toISOString(),
    }, ...workspace.retentionReviews] });
    if (saved) {
      setRetentionCategory('');
      setRetentionNote('');
    }
  };

  const counts = [
    { label: 'Processing activities', count: workspace.processingActivities.length },
    { label: 'Notice drafts', count: workspace.noticeDrafts.length },
    { label: 'Rights requests', count: workspace.rightsRequests.length },
    { label: 'Grievances', count: workspace.grievances.length },
    { label: 'Consent events', count: workspace.consentEvents.length },
    { label: 'Retention reviews', count: workspace.retentionReviews.length },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-sm sm:p-5"
      role="dialog" aria-modal="true" aria-labelledby="privacy-console-title">
      <section ref={dialogRef} className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-700 bg-slate-950 px-5 py-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-teal-400" />
            <div>
              <h2 id="privacy-console-title" className="text-lg font-bold">Privacy Operations Console</h2>
              <p className="mt-1 text-xs text-slate-400">Privacy notices, request tracking, consent records and retention reviews.</p>
            </div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className={buttonClass} aria-label="Close Privacy Console"><X className="h-4 w-4" /></button>
        </header>

        <div className="border-b border-amber-700/60 bg-amber-950/50 px-5 py-3 text-xs text-amber-100">
          <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p><strong>Demonstration workspace only.</strong> All records are synthetic and stored in this browser. Entries are not statutory submissions, legally operative notices or proof of valid consent. Do not enter real personal or sensitive information.</p>
          </div>
        </div>

        <nav aria-label="Privacy console sections" className="flex gap-1 overflow-x-auto border-b border-slate-700 bg-slate-950/60 px-4 py-2">
          {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${activeTab === tab.id ? 'border border-teal-700 bg-teal-950 text-teal-200' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {tab.label}
          </button>)}
        </nav>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {error && <div role="alert" className="rounded-lg border border-rose-700 bg-rose-950/50 p-3 text-sm text-rose-200">{error}</div>}

          {activeTab === 'overview' && <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {counts.map((item) => <div key={item.label} className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                <p className="text-xs text-slate-400">{item.label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{item.count}</p>
              </div>)}
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-teal-400" /> Operating boundary</h3>
              <p className="mt-2 text-sm text-slate-300">This console is a local administrative prototype. It does not calculate statutory deadlines, decide legal bases, contact a regulator or data subject, or execute deletion against operational records.</p>
            </div>
          </>}

          {activeTab === 'processing' && <section className="space-y-4">
            <form onSubmit={addProcessingActivity} className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
              <h3 className="text-sm font-semibold">Add a synthetic processing activity</h3>
              <input className={inputClass} value={activityPurpose} onChange={(e) => setActivityPurpose(e.target.value)} placeholder="Purpose of processing (synthetic example)" aria-label="Processing activity purpose" maxLength={240} required />
              <input className={inputClass} value={activityCategories} onChange={(e) => setActivityCategories(e.target.value)} placeholder="Data categories, separated by commas" aria-label="Processing data categories" maxLength={600} />
              <input className={inputClass} value={activityRecipients} onChange={(e) => setActivityRecipients(e.target.value)} placeholder="Recipient categories, separated by commas" aria-label="Processing recipients" maxLength={600} />
              <textarea className={inputClass} value={activityRetention} onChange={(e) => setActivityRetention(e.target.value)} placeholder="Retention description or manual review note — do not invent a statutory period" aria-label="Processing retention description" rows={2} maxLength={1000} required />
              <label className="block space-y-1 text-xs text-slate-300">Assessment note
                <select className={inputClass} value={activityAssessment} onChange={(e) => setActivityAssessment(e.target.value as PrivacyProcessingActivity['legalAssessment'])} aria-label="Processing activity assessment note">
                  <option value="not-assessed">Not assessed</option><option value="organization-reviewed">Organisation marked as reviewed</option>
                </select>
              </label>
              <p className="text-xs text-amber-200">This is an internal tracking label only. It does not establish a lawful basis, necessity, proportionality or legal compliance.</p>
              <button className={primaryButtonClass} type="submit" disabled={!storageReady}>Save synthetic activity</button>
            </form>
            {workspace.processingActivities.map((activity) => <article key={activity.id} className="rounded-xl border border-slate-700 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{activity.purpose}</strong><span className="text-xs text-amber-300">{activity.legalAssessment === 'not-assessed' ? 'Not assessed' : 'Marked reviewed'}</span></div>
              <p className="mt-2 text-xs text-slate-300"><strong>Data categories:</strong> {activity.dataCategories.length ? activity.dataCategories.join(', ') : 'Not specified'}</p>
              <p className="mt-1 text-xs text-slate-300"><strong>Recipients:</strong> {activity.recipients.length ? activity.recipients.join(', ') : 'Not specified'}</p>
              <p className="mt-2 text-sm text-slate-300"><strong>Retention note:</strong> {activity.retentionDescription}</p>
            </article>)}
            {workspace.processingActivities.length === 0 && <p className="text-sm text-slate-400">No synthetic processing activities recorded.</p>}
          </section>}

          {activeTab === 'notices' && <section className="space-y-4">
            <form onSubmit={addNotice} className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
              <h3 className="text-sm font-semibold">Create a notice draft</h3>
              <input className={inputClass} value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} placeholder="Draft title" aria-label="Notice draft title" maxLength={120} required />
              <textarea className={inputClass} value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} placeholder="Draft text — verify all organisation-specific statements before use" aria-label="Notice draft content" rows={4} maxLength={8000} required />
              <button className={primaryButtonClass} type="submit" disabled={!storageReady}>Save draft</button>
            </form>
            {workspace.noticeDrafts.map((notice) => <article key={notice.id} className="rounded-xl border border-slate-700 p-4">
              <div className="flex flex-wrap justify-between gap-2"><h4 className="font-semibold">{notice.title}</h4><span className="text-xs text-amber-300">Draft only</span></div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{notice.content}</p>
              <p className="mt-2 text-[11px] text-slate-500">Updated {new Date(notice.updatedAt).toLocaleString()}</p>
            </article>)}
            {workspace.noticeDrafts.length === 0 && <p className="text-sm text-slate-400">No notice drafts have been created.</p>}
          </section>}

          {activeTab === 'requests' && <section className="space-y-4">
            <form onSubmit={addRequest} className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
              <h3 className="text-sm font-semibold">Add a synthetic rights-request example</h3>
              <select className={inputClass} value={requestKind} onChange={(e) => setRequestKind(e.target.value as PrivacyRightsRequest['requestKind'])} aria-label="Request type">
                <option value="access">Access</option><option value="correction">Correction</option><option value="erasure">Erasure</option><option value="other">Other</option>
              </select>
              <textarea className={inputClass} value={requestDescription} onChange={(e) => setRequestDescription(e.target.value)} placeholder="Synthetic request description" aria-label="Request description" rows={3} maxLength={3000} required />
              <button className={primaryButtonClass} type="submit">Add demo request</button>
            </form>
            {workspace.rightsRequests.map((record) => <article key={record.id} className="rounded-xl border border-slate-700 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm capitalize">{record.requestKind} request</strong>
                <select className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs" value={record.status} onChange={(e) => updateRequestStatus(record.id, e.target.value as PrivacyRightsRequest['status'])} disabled={!storageReady} aria-label={`Status for ${record.id}`}>
                  <option value="submitted">Submitted (demo)</option><option value="under_review">Under review</option><option value="completed">Completed</option><option value="rejected">Rejected</option>
                </select>
              </div><p className="mt-2 text-sm text-slate-300">{record.description}</p><p className="mt-2 text-[11px] text-slate-500">{new Date(record.submittedAt).toLocaleString()}</p>
            </article>)}
            {workspace.rightsRequests.length === 0 && <p className="text-sm text-slate-400">No synthetic requests recorded.</p>}
          </section>}

          {activeTab === 'grievances' && <section className="space-y-4">
            <form onSubmit={addGrievance} className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
              <h3 className="text-sm font-semibold">Add a synthetic grievance example</h3>
              <input className={inputClass} value={grievanceCategory} onChange={(e) => setGrievanceCategory(e.target.value)} placeholder="Category" aria-label="Grievance category" maxLength={100} required />
              <textarea className={inputClass} value={grievanceDescription} onChange={(e) => setGrievanceDescription(e.target.value)} placeholder="Synthetic grievance description" aria-label="Grievance description" rows={3} maxLength={3000} required />
              <button className={primaryButtonClass} type="submit">Add demo grievance</button>
            </form>
            {workspace.grievances.map((record) => <article key={record.id} className="rounded-xl border border-slate-700 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{record.category}</strong>
                <select className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs" value={record.status} onChange={(e) => updateGrievanceStatus(record.id, e.target.value as PrivacyGrievance['status'])} disabled={!storageReady} aria-label={`Status for ${record.id}`}>
                  <option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
                </select>
              </div><p className="mt-2 text-sm text-slate-300">{record.description}</p><p className="mt-2 text-[11px] text-slate-500">{new Date(record.submittedAt).toLocaleString()}</p>
            </article>)}
            {workspace.grievances.length === 0 && <p className="text-sm text-slate-400">No synthetic grievances recorded.</p>}
          </section>}

          {activeTab === 'consent' && <section className="space-y-4">
            <form onSubmit={addConsentEvent} className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
              <h3 className="text-sm font-semibold">Record a synthetic consent event</h3>
              <input className={inputClass} value={consentSubject} onChange={(e) => setConsentSubject(e.target.value)} placeholder="Synthetic subject reference" aria-label="Synthetic subject reference" maxLength={120} required />
              <input className={inputClass} value={consentPurpose} onChange={(e) => setConsentPurpose(e.target.value)} placeholder="Purpose reference" aria-label="Purpose reference" maxLength={120} required />
              <button className={primaryButtonClass} type="submit">Record demo event</button>
            </form>
            <p className="rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-100">This ledger records a demonstration event only. It does not establish that consent is required, valid, informed or freely given for any real processing activity.</p>
            {workspace.consentEvents.map((event) => <article key={event.id} className="rounded-xl border border-slate-700 p-4 text-sm">
              <strong>{event.subjectRef}</strong><p className="mt-1 text-slate-300">Purpose: {event.purposeRef}</p><p className="mt-1 text-xs text-slate-500">{event.event} · {new Date(event.recordedAt).toLocaleString()}</p>
            </article>)}
            {workspace.consentEvents.length === 0 && <p className="text-sm text-slate-400">No synthetic consent events recorded.</p>}
          </section>}

          {activeTab === 'retention' && <section className="space-y-4">
            <form onSubmit={addRetentionReview} className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
              <h3 className="text-sm font-semibold">Record a manual retention review</h3>
              <input className={inputClass} value={retentionCategory} onChange={(e) => setRetentionCategory(e.target.value)} placeholder="Synthetic data category" aria-label="Retention data category" maxLength={120} required />
              <textarea className={inputClass} value={retentionNote} onChange={(e) => setRetentionNote(e.target.value)} placeholder="Review note and decision rationale" aria-label="Retention review note" rows={3} maxLength={3000} required />
              <button className={primaryButtonClass} type="submit">Save review</button>
            </form>
            <p className="rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-100">Reviews are notes only. No timer, legal retention period or deletion action is performed. Operational records remain untouched.</p>
            {workspace.retentionReviews.map((review) => <article key={review.id} className="rounded-xl border border-slate-700 p-4">
              <strong className="text-sm">{review.dataCategory}</strong><p className="mt-2 text-sm text-slate-300">{review.reviewNote}</p><p className="mt-2 text-[11px] text-slate-500">Reviewed {review.reviewedAt ? new Date(review.reviewedAt).toLocaleString() : '—'}</p>
            </article>)}
            {workspace.retentionReviews.length === 0 && <p className="text-sm text-slate-400">No retention reviews recorded.</p>}
          </section>}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-700 bg-slate-950 px-5 py-3">
          <span className="text-[11px] text-slate-500">Synthetic Demo Guest data · Browser-local storage</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportWorkspace} className={buttonClass} disabled={!storageReady}><Download className="mr-1 inline h-3.5 w-3.5" />Export JSON</button>
            <button type="button" onClick={onClose} className={buttonClass}>Close</button>
          </div>
        </footer>
      </section>
    </div>
  );
};
