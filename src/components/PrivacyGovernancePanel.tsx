import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardCheck, PlusCircle } from 'lucide-react';
import { createDpdpGovernanceRepository } from '../utils/dpdpGovernanceRepository.ts';
import { canMarkPurposeReviewed, canApproveNoticeForDemo, canRecordSyntheticConsent, createSyntheticWithdrawal, getLatestConsentState } from '../utils/dpdpGovernance.ts';
import type { PrivacyGovernanceSnapshot, PrivacyPurposeRecord, VersionedPrivacyNotice, ConsentLifecycleEvent } from '../types/dpdpGovernance.ts';

const input = 'w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500';
const button = 'rounded-lg border border-teal-600 bg-teal-800 px-3 py-2 text-xs font-semibold text-white';

export const PrivacyGovernancePanel: React.FC = () => {
  const repository = useMemo(() => {
    try { return typeof window === 'undefined' ? null : createDpdpGovernanceRepository(window.localStorage); }
    catch { return null; }
  }, []);
  const [snapshot, setSnapshot] = useState<PrivacyGovernanceSnapshot | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [purposeCode, setPurposeCode] = useState('');
  const [purposeDescription, setPurposeDescription] = useState('');
  const [categories, setCategories] = useState('');
  const [retention, setRetention] = useState('');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [consentSubject, setConsentSubject] = useState('');

  useEffect(() => {
    if (!repository) { setError('Browser storage is unavailable; governance workspace is read-only.'); return; }
    try { setSnapshot(repository.load()); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load governance workspace.'); }
  }, [repository]);

  const save = (next: PrivacyGovernanceSnapshot) => {
    if (!repository || !snapshot || !acknowledged) { setError('Acknowledge synthetic-only use before saving.'); return false; }
    try { repository.save(next); setSnapshot(next); setError(''); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save governance workspace.'); return false; }
  };

  const addPurpose = (event: React.FormEvent) => {
    event.preventDefault();
    if (!purposeCode.trim() || !purposeDescription.trim() || !retention.trim() || !snapshot) return;
    const now = new Date().toISOString();
    const purpose: PrivacyPurposeRecord = {
      id: `purpose-${crypto.randomUUID()}`, purposeCode: purposeCode.trim(),
      purposeDescription: purposeDescription.trim(),
      dataCategories: categories.split(',').map((v) => v.trim()).filter(Boolean),
      processingOperations: ['Synthetic demonstration processing'],
      recipientCategories: ['Organisation-defined recipient category'],
      retentionRule: retention.trim(), groundAssessment: 'not-assessed',
      ownerRole: 'organisation-admin', reviewState: 'draft', createdAt: now, updatedAt: now,
    };
    if (save({ ...snapshot, purposes: [purpose, ...snapshot.purposes] })) {
      setPurposeCode(''); setPurposeDescription(''); setCategories(''); setRetention('');
    }
  };

  const reviewPurpose = (purpose: PrivacyPurposeRecord) => {
    if (!snapshot) return;
    const reviewed = { ...purpose, groundAssessment: 'organisation-reviewed' as const,
      groundReviewNote: 'Organisation review recorded in synthetic demonstration only.',
      reviewState: 'organisation-reviewed' as const, updatedAt: new Date().toISOString() };
    if (canMarkPurposeReviewed({ ...reviewed, reviewState: 'draft' })) {
      save({ ...snapshot, purposes: snapshot.purposes.map((item) => item.id === purpose.id ? reviewed : item) });
    }
  };

  const addNotice = (event: React.FormEvent) => {
    event.preventDefault();
    if (!snapshot || !noticeTitle.trim() || !noticeContent.trim()) return;
    const prior = snapshot.notices.filter((item) => item.noticeCode === 'GENERAL').sort((a,b) => b.version-a.version)[0];
    const notice: VersionedPrivacyNotice = {
      id: `notice-${crypto.randomUUID()}`, noticeCode: 'GENERAL',
      version: (prior?.version ?? 0) + 1, title: noticeTitle.trim(), content: noticeContent.trim(),
      purposeIds: snapshot.purposes.filter((item) => item.reviewState === 'organisation-reviewed').map((item) => item.id),
      status: 'draft', createdAt: new Date().toISOString(),
      ...(prior ? { supersedesNoticeId: prior.id } : {}),
    };
    if (save({ ...snapshot, notices: [notice, ...snapshot.notices] })) { setNoticeTitle(''); setNoticeContent(''); }
  };

  const approveNotice = (notice: VersionedPrivacyNotice) => {
    if (!snapshot || !canApproveNoticeForDemo(notice, snapshot.purposes)) return;
    const approvedAt = new Date().toISOString();
    const nextNotices = snapshot.notices.map((item) => {
      if (item.id === notice.id) return { ...item, status: 'approved-for-demo' as const, approvedAt,
        reviewNote: 'Approved for synthetic demonstration only; not legal approval or public delivery.' };
      if (item.noticeCode === notice.noticeCode && item.version < notice.version &&
          item.status === 'approved-for-demo') return { ...item, status: 'superseded' as const };
      return item;
    });
    save({ ...snapshot, notices: nextNotices });
  };


  const addConsentGrant = (purpose: PrivacyPurposeRecord, notice: VersionedPrivacyNotice) => {
    if (!snapshot || !canRecordSyntheticConsent(purpose, notice, consentSubject.trim())) return;
    const event: ConsentLifecycleEvent = {
      id: 'consent-' + crypto.randomUUID(), subjectRef: consentSubject.trim(),
      purposeId: purpose.id, noticeId: notice.id, noticeVersion: notice.version,
      state: 'granted', recordedAt: new Date().toISOString(),
      source: 'synthetic-manual-entry',
      note: 'Synthetic demonstration event only; not proof of valid consent.',
    };
    if (save({ ...snapshot, consentHistory: [event, ...snapshot.consentHistory] })) setConsentSubject('');
  };

  const withdrawConsent = (grant: ConsentLifecycleEvent) => {
    if (!snapshot) return;
    const event = createSyntheticWithdrawal(grant, 'withdrawal-' + crypto.randomUUID(), new Date().toISOString());
    if (event) save({ ...snapshot, consentHistory: [event, ...snapshot.consentHistory] });
  };

  if (!snapshot) return <div className="rounded-xl border border-slate-700 p-4 text-sm text-slate-300">{error || 'Loading governance workspace…'}</div>;

  return <section className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4" aria-labelledby="dpdp-governance-title">
    <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-teal-400" /><h3 id="dpdp-governance-title" className="font-bold">DPDP governance workspace</h3></div>
    <div className="rounded-lg border border-amber-700/60 bg-amber-950/40 p-3 text-xs text-amber-100">
      <div className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /><p><strong>Synthetic demonstration only.</strong> This workspace does not determine lawful grounds, publish notices, establish valid consent or demonstrate DPDP Act compliance. Do not enter real personal data.</p></div>
      <label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} /><span>I will use synthetic examples only.</span></label>
    </div>
    {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}
    <form onSubmit={addPurpose} className="grid gap-2 rounded-lg border border-slate-700 p-3 sm:grid-cols-2">
      <h4 className="font-semibold sm:col-span-2">Processing purpose register</h4>
      <input className={input} value={purposeCode} onChange={(e) => setPurposeCode(e.target.value)} placeholder="Purpose code" maxLength={60} required />
      <input className={input} value={purposeDescription} onChange={(e) => setPurposeDescription(e.target.value)} placeholder="Purpose description" maxLength={500} required />
      <input className={input} value={categories} onChange={(e) => setCategories(e.target.value)} placeholder="Data categories (comma separated)" maxLength={1000} />
      <input className={input} value={retention} onChange={(e) => setRetention(e.target.value)} placeholder="Organisation-defined retention rule" maxLength={500} required />
      <button className={button} type="submit"><PlusCircle className="mr-1 inline h-4 w-4" />Add purpose</button>
      <p className="text-xs text-slate-400 sm:col-span-2">Grounds are unassessed by default. Record an organisation review only after independent review; no legal basis is preselected.</p>
    </form>
    <div className="space-y-2">{snapshot.purposes.map((purpose) => <article key={purpose.id} className="rounded-lg border border-slate-700 p-3 text-sm">
      <div className="font-semibold">{purpose.purposeCode}: {purpose.purposeDescription}</div>
      <p className="mt-1 text-xs text-slate-400">Ground: {purpose.groundAssessment}; review: {purpose.reviewState}; retention: {purpose.retentionRule}</p>
      {purpose.reviewState === 'draft' && <button className={button + ' mt-2'} onClick={() => reviewPurpose(purpose)} type="button" disabled={!acknowledged}>Record synthetic organisation review</button>}
    </article>)}</div>
    <form onSubmit={addNotice} className="grid gap-2 rounded-lg border border-slate-700 p-3">
      <h4 className="font-semibold">Versioned privacy notice drafts</h4>
      <input className={input} value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} placeholder="Notice title" maxLength={160} required />
      <textarea className={input} value={noticeContent} onChange={(e) => setNoticeContent(e.target.value)} placeholder="Notice content (synthetic draft)" maxLength={12000} rows={4} required />
      <button className={button} type="submit" disabled={!acknowledged}>Create next version</button>
    </form>
    <div className="space-y-2">{snapshot.notices.map((notice) => <article key={notice.id} className="rounded-lg border border-slate-700 p-3 text-sm">
      <div className="font-semibold">{notice.title} · v{notice.version}</div>
      <p className="text-xs text-slate-400">Status: {notice.status}; linked purposes: {notice.purposeIds.length}</p>
      {notice.status === 'draft' && <button className={button + ' mt-2'} type="button" disabled={!acknowledged || !canApproveNoticeForDemo(notice, snapshot.purposes)} onClick={() => approveNotice(notice)}>Approve for demo only</button>}
    </article>)}</div>

    <section className="space-y-3 rounded-lg border border-slate-700 p-3">
      <h4 className="font-semibold">Consent lifecycle ledger</h4>
      <p className="text-xs text-slate-400">Events are appended; current state is derived from history. This is not a legally valid consent mechanism.</p>
      <input className={input} value={consentSubject} onChange={(e) => setConsentSubject(e.target.value)} placeholder="Synthetic subject reference" maxLength={120} />
      {snapshot.notices.filter((notice) => notice.status === 'approved-for-demo').flatMap((notice) =>
        notice.purposeIds.map((purposeId) => {
          const purpose = snapshot.purposes.find((item) => item.id === purposeId);
          if (!purpose) return null;
          const latest = getLatestConsentState(snapshot.consentHistory, consentSubject.trim(), purpose.id);
          return <article key={notice.id + purpose.id} className="rounded border border-slate-700 p-2 text-xs">
            <strong>{purpose.purposeCode} · {notice.title} v{notice.version}</strong>
            <p className="text-slate-400">Current state: {latest?.state ?? 'No event'}</p>
            {!latest && <button className={button + ' mt-2'} type="button" disabled={!acknowledged || !consentSubject.trim()} onClick={() => addConsentGrant(purpose, notice)}>Record synthetic grant</button>}
            {latest?.state === 'granted' && <button className={button + ' mt-2'} type="button" disabled={!acknowledged} onClick={() => withdrawConsent(latest)}>Append withdrawal</button>}
          </article>;
        }))}
      {snapshot.consentHistory.map((event) => <p key={event.id} className="text-xs text-slate-400">{event.subjectRef} · {event.purposeId} · {event.state} · {event.recordedAt}</p>)}
    </section>
  </section>;
};
