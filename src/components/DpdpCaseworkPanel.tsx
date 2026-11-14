import React, { useState } from 'react';
import type {
  PrivacyGovernanceSnapshot, PrincipalRightsCase, RetentionSchedule,
  RetentionDispositionRecord, PersonalDataBreachCase, AccountabilityAssignment,
  AssuranceEvidenceRecord,
} from '../types/dpdpGovernance.ts';
import { canAdvanceRightsCase, approveRetentionDisposition } from '../utils/dpdpGovernance.ts';

const field = 'w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100';
const action = 'rounded-lg border border-teal-600 bg-teal-800 px-3 py-2 text-xs font-semibold text-white';

interface Props {
  snapshot: PrivacyGovernanceSnapshot;
  acknowledged: boolean;
  save: (next: PrivacyGovernanceSnapshot) => boolean;
}
export const DpdpCaseworkPanel: React.FC<Props> = ({ snapshot, acknowledged, save }) => {
  const [subject, setSubject] = useState('');
  const [kind, setKind] = useState<PrincipalRightsCase['requestKind']>('access');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [retentionRule, setRetentionRule] = useState('');
  const [breachSummary, setBreachSummary] = useState('');
  const [breachCategories, setBreachCategories] = useState('');
  const [responsibility, setResponsibility] = useState('');
  const [control, setControl] = useState('');
  const [evidenceRef, setEvidenceRef] = useState('');

  const updateBreach = (item: PersonalDataBreachCase, update: Partial<PersonalDataBreachCase>) => {
    const next = { ...item, ...update };
    save({ ...snapshot, breachCases: snapshot.breachCases.map((entry) => entry.id === item.id ? next : entry) });
  };
  const approveDisposition = (item: RetentionDispositionRecord) => {
    const approved = approveRetentionDisposition(item, 'organisation-owner');
    if (approved) save({ ...snapshot, retentionDispositions: snapshot.retentionDispositions.map((entry) => entry.id === item.id ? approved : entry) });
  };
  const addRightsCase = (event: React.FormEvent) => {
    event.preventDefault();
    if (!acknowledged || !subject.trim() || !description.trim()) return;
    const now = new Date().toISOString();
    const item: PrincipalRightsCase = {
      id: 'rights-' + crypto.randomUUID(), subjectRef: subject.trim(), requestKind: kind,
      description: description.trim(), identityCheck: 'not-started', status: 'received',
      receivedAt: now, updatedAt: now, assignedRole: 'organisation-admin',
      evidenceRefs: [], syntheticOnly: true,
    };
    if (save({ ...snapshot, rightsCases: [item, ...snapshot.rightsCases] })) {
      setSubject(''); setDescription('');
    }
  };
  const advanceCase = (item: PrincipalRightsCase, next: PrincipalRightsCase['status']) => {
    const updated = { ...item, identityCheck: 'synthetic-reference-matched' as const,
      status: next, updatedAt: new Date().toISOString(),
      ...(next === 'completed' ? { decision: 'fulfilled' as const,
        decisionReason: 'Synthetic workflow completion only; no real request was processed.' } : {}) };
    if (canAdvanceRightsCase(item, next, updated.identityCheck))
      save({ ...snapshot, rightsCases: snapshot.rightsCases.map((entry) => entry.id === item.id ? updated : entry) });
  };
  const addSchedule = (event: React.FormEvent) => {
    event.preventDefault();
    if (!acknowledged || !category.trim() || !retentionRule.trim() || !snapshot.purposes[0]) return;
    const item: RetentionSchedule = {
      id: 'retention-' + crypto.randomUUID(), dataCategory: category.trim(),
      purposeId: snapshot.purposes[0].id, retentionRule: retentionRule.trim(),
      reviewAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      ownerRole: 'organisation-admin', status: 'draft',
    };
    if (save({ ...snapshot, retentionSchedules: [item, ...snapshot.retentionSchedules] })) {
      setCategory(''); setRetentionRule('');
    }
  };
  const proposeDisposition = (schedule: RetentionSchedule, disposition: RetentionDispositionRecord['disposition']) => {
    const item: RetentionDispositionRecord = {
      id: 'disposition-' + crypto.randomUUID(), scheduleId: schedule.id, disposition,
      requestedByRole: 'organisation-admin',
      decisionNote: 'Synthetic disposition proposal only; no records were changed or deleted.',
      recordedAt: new Date().toISOString(), executed: false,
    };
    save({ ...snapshot, retentionDispositions: [item, ...snapshot.retentionDispositions] });
  };
  const addBreach = (event: React.FormEvent) => {
    event.preventDefault();
    if (!acknowledged || !breachSummary.trim()) return;
    const now = new Date().toISOString();
    const item: PersonalDataBreachCase = {
      id: 'breach-' + crypto.randomUUID(), reference: 'DEMO-' + now.slice(0,10).replaceAll('-',''),
      discoveredAt: now, recordedAt: now, summary: breachSummary.trim(),
      affectedDataCategories: breachCategories.split(',').map((v) => v.trim()).filter(Boolean),
      affectedSystems: ['Synthetic demonstration environment'], severity: 'unassessed',
      status: 'reported', containmentActions: [], remediationActions: [],
      notificationAssessment: 'not-assessed', ownerRole: 'organisation-admin',
      evidenceRefs: [], syntheticOnly: true,
    };
    if (save({ ...snapshot, breachCases: [item, ...snapshot.breachCases] })) {
      setBreachSummary(''); setBreachCategories('');
    }
  };
  const addAssignment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!acknowledged || !responsibility.trim()) return;
    const item: AccountabilityAssignment = {
      id: 'assignment-' + crypto.randomUUID(), responsibility: responsibility.trim(),
      assignedRole: 'organisation-admin', status: 'assigned',
    };
    if (save({ ...snapshot, assignments: [item, ...snapshot.assignments] })) setResponsibility('');
  };
  const addEvidence = (event: React.FormEvent) => {
    event.preventDefault();
    if (!acknowledged || !control.trim() || !evidenceRef.trim()) return;
    const item: AssuranceEvidenceRecord = {
      id: 'evidence-' + crypto.randomUUID(), controlCode: 'DPDP-CONTROL',
      controlDescription: control.trim(), evidenceRef: evidenceRef.trim(),
      evidenceType: 'review-note', reviewedByRole: 'organisation-admin',
      reviewedAt: new Date().toISOString(),
      limitations: 'Reference only; not independently verified and not proof of compliance.',
    };
    if (save({ ...snapshot, assuranceEvidence: [item, ...snapshot.assuranceEvidence] })) {
      setControl(''); setEvidenceRef('');
    }
  };

  return <div className="space-y-4">
    <section className="space-y-3 rounded-lg border border-slate-700 p-3">
      <h4 className="font-semibold">DPDP-02 · Data principal rights and grievance case register</h4>
      <p className="text-xs text-slate-400">Synthetic identity matching only. No identity documents, real personal data, statutory deadlines or external submissions.</p>
      <form onSubmit={addRightsCase} className="grid gap-2 sm:grid-cols-2">
        <input className={field} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Synthetic subject reference" maxLength={120} required />
        <select className={field} value={kind} onChange={(e) => setKind(e.target.value as PrincipalRightsCase['requestKind'])}>
          <option value="access">Access</option><option value="correction">Correction</option><option value="completion">Completion</option><option value="erasure">Erasure</option><option value="grievance">Grievance</option><option value="other">Other</option>
        </select>
        <textarea className={field + ' sm:col-span-2'} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Synthetic request scope and description" maxLength={3000} required />
        <button className={action} disabled={!acknowledged}>Create synthetic rights case</button>
      </form>
      {snapshot.rightsCases.map((item) => <article key={item.id} className="rounded border border-slate-700 p-2 text-xs">
        <strong>{item.requestKind.toUpperCase()} · {item.subjectRef}</strong>
        <p>Status: {item.status}; identity: {item.identityCheck}; assigned: {item.assignedRole}</p>
        <p className="text-slate-400">{item.description}</p>
        {item.status === 'received' && <button className={action} disabled={!acknowledged} onClick={() => advanceCase(item,'identity-check')}>Start identity-check workflow</button>}
        {item.status === 'identity-check' && <button className={action} disabled={!acknowledged} onClick={() => advanceCase(item,'in-progress')}>Mark synthetic reference matched and progress</button>}
        {item.status === 'in-progress' && <button className={action} disabled={!acknowledged} onClick={() => advanceCase(item,'completed')}>Record demo completion</button>}
      </article>)}
    </section>

    <section className="space-y-3 rounded-lg border border-slate-700 p-3">
      <h4 className="font-semibold">DPDP-03 · Retention schedules and disposition proposals</h4>
      <p className="text-xs text-slate-400">Retention periods are organisation-defined, not statutory. No automated purge or destructive deletion is available.</p>
      <form onSubmit={addSchedule} className="grid gap-2 sm:grid-cols-2">
        <input className={field} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Synthetic data category" maxLength={160} required />
        <input className={field} value={retentionRule} onChange={(e) => setRetentionRule(e.target.value)} placeholder="Organisation-defined retention rule" maxLength={500} required />
        <button className={action} disabled={!acknowledged || snapshot.purposes.length === 0}>Add retention schedule</button>
      </form>
      {snapshot.retentionSchedules.map((item) => <article key={item.id} className="rounded border border-slate-700 p-2 text-xs">
        <strong>{item.dataCategory}</strong><p>{item.retentionRule} · review {item.reviewAt}</p>
        <div className="flex flex-wrap gap-2">{(['retain','restrict-review','delete-after-approval','defer'] as const).map((value) =>
          <button key={value} className={action} disabled={!acknowledged} onClick={() => proposeDisposition(item,value)}>{value}</button>)}</div>
      </article>)}
      {snapshot.retentionDispositions.map((item) => <article key={item.id} className="rounded border border-slate-700 p-2 text-xs"><p>{item.disposition} · approved by: {item.approvedByRole ?? 'pending'} · executed: no</p><p className="text-slate-400">{item.decisionNote}</p>{!item.approvedByRole && <button className={action} disabled={!acknowledged} onClick={() => approveDisposition(item)}>Approve with separate owner role</button>}</article>)}
    </section>

    <section className="space-y-3 rounded-lg border border-slate-700 p-3">
      <h4 className="font-semibold">DPDP-04 · Personal data breach register</h4>
      <p className="text-xs text-slate-400">Synthetic incident tracking only. It cannot notify regulators or affected individuals and does not determine reportability.</p>
      <form onSubmit={addBreach} className="grid gap-2">
        <textarea className={field} value={breachSummary} onChange={(e) => setBreachSummary(e.target.value)} placeholder="Synthetic incident summary" maxLength={3000} required />
        <input className={field} value={breachCategories} onChange={(e) => setBreachCategories(e.target.value)} placeholder="Affected synthetic data categories" maxLength={1000} />
        <button className={action} disabled={!acknowledged}>Create synthetic breach record</button>
      </form>
      {snapshot.breachCases.map((item) => <article key={item.id} className="rounded border border-slate-700 p-2 text-xs">
        <strong>{item.reference} · {item.severity}</strong><p>{item.summary}</p>
        <p>Status: {item.status}; notification assessment: {item.notificationAssessment}</p>
        <p className="text-slate-400">Synthetic action markers only; do not enter actual breach details or notify anyone from this demonstration.</p>
        {item.status === 'reported' && <button className={action} disabled={!acknowledged} onClick={() => updateBreach(item,{status:'assessing',severity:'moderate'})}>Begin assessment (demo)</button>}
        {item.status === 'assessing' && <button className={action} disabled={!acknowledged} onClick={() => updateBreach(item,{status:'contained',containmentActions:['Synthetic containment action recorded'],notificationAssessment:'under-review'})}>Record containment (demo)</button>}
        {item.status === 'contained' && <button className={action} disabled={!acknowledged} onClick={() => updateBreach(item,{status:'remediating',remediationActions:['Synthetic remediation action recorded'],notificationAssessment:'organisation-decided',notificationDecisionNote:'Organisation decision marker only; not a legal reportability assessment.'})}>Record remediation and assessment marker</button>}
        {item.status === 'remediating' && <button className={action} disabled={!acknowledged} onClick={() => updateBreach(item,{status:'closed'})}>Close synthetic case</button>}
      </article>)}
    </section>

    <section className="space-y-3 rounded-lg border border-slate-700 p-3">
      <h4 className="font-semibold">DPDP-05 · Accountability assignments and evidence references</h4>
      <form onSubmit={addAssignment} className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input className={field} value={responsibility} onChange={(e) => setResponsibility(e.target.value)} placeholder="Responsibility to assign to organisation admin" maxLength={500} required />
        <button className={action} disabled={!acknowledged}>Assign responsibility</button>
      </form>
      {snapshot.assignments.map((item) => <p key={item.id} className="text-xs text-slate-300">{item.responsibility} · {item.assignedRole} · {item.status}</p>)}
      <form onSubmit={addEvidence} className="grid gap-2 sm:grid-cols-2">
        <input className={field} value={control} onChange={(e) => setControl(e.target.value)} placeholder="Control / review description" maxLength={500} required />
        <input className={field} value={evidenceRef} onChange={(e) => setEvidenceRef(e.target.value)} placeholder="Evidence reference (no upload)" maxLength={200} required />
        <button className={action} disabled={!acknowledged}>Add evidence reference</button>
      </form>
      {snapshot.assuranceEvidence.map((item) => <p key={item.id} className="text-xs text-slate-400">{item.controlCode} · {item.controlDescription} · {item.evidenceRef} · {item.limitations}</p>)}
    </section>

    <section className="rounded-lg border border-slate-700 p-3">
      <h4 className="font-semibold">DPDP-06 · Security and validation boundary</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">
        <li>Separate browser-local synthetic workspace; no remote writes or operational-record linkage.</li>
        <li>Runtime schema validation, unique IDs, 500-record collection limits, 1 MB storage ceiling, read-back verification and stale-write detection.</li>
        <li>No identity-document upload, production principal data, automatic erasure, statutory notification or public notice delivery.</li>
        <li>Role labels are workflow assignments, not authenticated RBAC enforcement. Firebase Rules remain authoritative for remote data.</li>
        <li>Evidence references are self-entered; no independent verification, immutable audit or compliance certification is claimed.</li>
        <li>Automated regression and emulator-backed security validation remain pending the consolidated validation milestone.</li>
      </ul>
    </section>
  </div>;
};
