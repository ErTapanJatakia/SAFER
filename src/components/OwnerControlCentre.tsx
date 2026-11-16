import React, {useCallback, useEffect, useMemo, useState, type FormEvent} from 'react';
import type {User} from 'firebase/auth';

type Organisation = {
  orgId: string;
  displayName: string;
  status: 'provisioning' | 'active' | 'suspended' | 'closed';
  lifecycleStage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type TenantSummary = {orgId: string; generatedAt: string; scope: string; counts: Record<string, number>};

type SupportAction =
  | 'platform:tenant-data:read'
  | 'platform:tenant-data:export';

const SUPPORT_ACTIONS: {value: SupportAction; label: string}[] = [
  {value: 'platform:tenant-data:read', label: 'Read tenant data'},
  {value: 'platform:tenant-data:export', label: 'Export tenant data'},
];

interface OwnerControlCentreProps {
  user: User;
  onOwnerStatusChange: (status: 'owner' | 'not-owner' | 'unavailable') => void;
}

/**
 * Owner-only UI. The component renders only after the server independently
 * confirms the Platform Owner principal; client role claims are never used.
 */
export const OwnerControlCentre: React.FC<OwnerControlCentreProps> = ({user, onOwnerStatusChange}) => {
  const [ownerState, setOwnerState] = useState<'checking' | 'owner' | 'not-owner' | 'unavailable'>('checking');
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [registrySearch, setRegistrySearch] = useState('');
  const [registryStatusFilter, setRegistryStatusFilter] = useState<'all' | Organisation['status']>('all');
  const [loadingRegistry, setLoadingRegistry] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [supportOrgId, setSupportOrgId] = useState('');
  const [supportPurpose, setSupportPurpose] = useState('');
  const [changeReference, setChangeReference] = useState('');
  const [supportActions, setSupportActions] = useState<SupportAction[]>(['platform:tenant-data:read']);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [activeSession, setActiveSession] = useState<{sessionId: string; orgId: string; expiresAt: string; actions: SupportAction[]} | null>(null);
  const [tenantSummary, setTenantSummary] = useState<TenantSummary | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const request = useCallback(async (path: string, method = 'GET', body?: Record<string, unknown>, extraHeaders?: Record<string, string>) => {
    const token = await user.getIdToken();
    const response = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? {'Content-Type': 'application/json'} : {}),
        ...(extraHeaders ?? {}),
      },
      ...(body ? {body: JSON.stringify(body)} : {}),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = typeof payload?.error === 'string' ? payload.error : 'request_failed';
      throw new Error(code);
    }
    return payload;
  }, [user]);

  const filteredOrganisations = useMemo(() => organisations.filter((org) => {
    const matchesStatus = registryStatusFilter === 'all' || org.status === registryStatusFilter;
    const query = registrySearch.trim().toLowerCase();
    const matchesSearch = !query || org.displayName.toLowerCase().includes(query) || org.orgId.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  }), [organisations, registrySearch, registryStatusFilter]);
  const registryCounts = useMemo(() => ({
    total: organisations.length,
    provisioning: organisations.filter((org) => org.status === 'provisioning').length,
    active: organisations.filter((org) => org.status === 'active').length,
    suspended: organisations.filter((org) => org.status === 'suspended').length,
    closed: organisations.filter((org) => org.status === 'closed').length,
  }), [organisations]);

  const loadRegistry = useCallback(async () => {
    setLoadingRegistry(true);
    try {
      const payload = await request('/api/owner/organisations-registry');
      setOrganisations(Array.isArray(payload.organisations) ? payload.organisations : []);
    } catch {
      setError('The organisation registry could not be loaded. No cached registry data is displayed.');
    } finally {
      setLoadingRegistry(false);
    }
  }, [request]);

  useEffect(() => {
    setOwnerState('checking');
    setOrganisations([]);
    setActiveSession(null);
    setTenantSummary(null);
  }, [user.uid]);

  useEffect(() => {
    let current = true;
    void (async () => {
      try {
        await request('/api/owner/status');
        if (!current) return;
        setOwnerState('owner');
      } catch (failure) {
        if (!current) return;
        const code = failure instanceof Error ? failure.message : '';
        setOwnerState(code === 'platform_authority_unavailable' || code.includes('unavailable') || code === 'request_failed'
          ? 'unavailable'
          : 'not-owner');
      }
    })();
    return () => { current = false; };
  }, [request]);

  useEffect(() => {
    if (ownerState === 'owner' || ownerState === 'not-owner' || ownerState === 'unavailable') {
      onOwnerStatusChange(ownerState);
    }
  }, [ownerState, onOwnerStatusChange]);

  useEffect(() => {
    if (ownerState === 'owner') void loadRegistry();
  }, [ownerState, loadRegistry]);

  if (ownerState === 'checking') {
    return <section className="mx-auto max-w-7xl px-4 py-5 text-xs text-slate-300" role="status">Verifying Platform Owner authority…</section>;
  }
  if (ownerState === 'not-owner') return null;
  if (ownerState === 'unavailable') {
    return <section className="mx-auto max-w-7xl px-4 py-5 text-sm text-amber-200" role="status">Platform Owner authority could not be verified. Owner controls remain unavailable; retry by refreshing this page.</section>;
  }

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : '';
      if (['platform_access_denied', 'platform_identity_ineligible', 'unauthenticated', 'invalid_identity_token'].includes(code)) {
        setOwnerState('not-owner');
        setError('Platform Owner authority is no longer active. Sign out and contact the platform operator.');
      } else {
        setError('The requested operation was not completed. Verify the details and retry; no success is assumed.');
      }
    } finally {
      setBusy(false);
    }
  };

  const createOrganisation = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await request('/api/owner/organisations', 'POST', {displayName, superAdminEmail});
      setDisplayName('');
      setSuperAdminEmail('');
      setMessage(`PMC created in provisioning state. Super Admin invitation: ${result.superAdminInvitation?.status || 'pending'}.`);
      await loadRegistry();
    });
  };

  const changeStatus = (orgId: string, status: 'active' | 'suspended' | 'closed') => {
    void run(async () => {
      await request('/api/owner/organisations-registry', 'PATCH', {orgId, status});
      setMessage(`PMC lifecycle updated to ${status}.`);
      await loadRegistry();
    });
  };

  const createSupportSession = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await request('/api/owner/support-access', 'POST', {
        orgId: supportOrgId,
        purpose: supportPurpose,
        changeReference,
        actions: supportActions,
        durationMinutes,
      });
      setActiveSession({sessionId: result.sessionId, orgId: result.orgId, expiresAt: result.expiresAt, actions: [...supportActions]});
      setTenantSummary(null);
      setMessage('Just-in-time support session activated. Its secret identifier is shown once below; keep it out of screenshots and logs.');
    });
  };

  const revokeSupportSession = () => {
    if (!activeSession) return;
    void run(async () => {
      await request('/api/owner/support-access', 'DELETE', {
        sessionId: activeSession.sessionId,
        reason: revokeReason,
        changeReference,
      });
      setActiveSession(null);
      setTenantSummary(null);
      setRevokeReason('');
      setMessage('Support session revoked and the revocation event recorded.');
    });
  };

  const toggleAction = (action: SupportAction) => {
    setSupportActions((current) => current.includes(action)
      ? current.filter((item) => item !== action)
      : [...current, action]);
  };

  const loadTenantSummary = () => {
    if (!activeSession || !activeSession.actions.includes('platform:tenant-data:read')) return;
    void run(async () => {
      const payload = await request(
        `/api/owner/tenant-data?orgId=${encodeURIComponent(activeSession.orgId)}`,
        'GET',
        undefined,
        {'X-Support-Session': activeSession.sessionId},
      );
      setTenantSummary(payload as TenantSummary);
      setMessage('Tenant aggregate summary retrieved and audited. No individual records were exposed.');
    });
  };

  const exportTenantSummary = () => {
    if (!activeSession || !activeSession.actions.includes('platform:tenant-data:export')) return;
    void run(async () => {
      const payload = await request(
        '/api/owner/tenant-data',
        'POST',
        {orgId: activeSession.orgId},
        {'X-Support-Session': activeSession.sessionId},
      );
      setTenantSummary(payload as TenantSummary);
      setMessage('Tenant aggregate summary export prepared and audited. No individual records were exposed.');
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-blue-800 bg-slate-900 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300">SAFER · Platform administration</p>
          <h1 className="mt-2 text-2xl font-bold">Owner Control Centre</h1>
          <p className="mt-2 text-sm text-slate-300">Global platform oversight across onboarded PMCs. Tenant records remain protected by tenant-scoped authorization; support access is separately time-limited and audited.</p>
          <p className="mt-3 text-xs text-emerald-300" role="status">Server-verified Platform Owner authority</p>
        </header>

        {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-xs text-red-200">{error}</p>}
        {message && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-xs text-emerald-200">{message}</p>}

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">PMC registry</h2>
              <p className="mt-1 text-xs text-slate-400">Provisioning, active, suspended and closed organisations.</p>
            </div>
            <button type="button" onClick={() => void loadRegistry()} disabled={loadingRegistry || busy} className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold hover:bg-slate-800 disabled:opacity-50">Refresh registry</button>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Object.entries(registryCounts).map(([label, count]) => <div key={label} className="rounded-lg border border-slate-700 bg-slate-950 p-3"><dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-slate-100">{count}</dd></div>)}
          </dl>
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <label className="block text-xs font-semibold text-slate-300">Search loaded PMCs<input aria-label="Search PMC registry" value={registrySearch} onChange={(event) => setRegistrySearch(event.target.value)} placeholder="Organisation name or ID" className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
            <label className="block text-xs font-semibold text-slate-300">Filter by status<select aria-label="Filter PMC status" value={registryStatusFilter} onChange={(event) => setRegistryStatusFilter(event.target.value as typeof registryStatusFilter)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"><option value="all">All statuses</option><option value="provisioning">Provisioning</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="closed">Closed</option></select></label>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Counts and filters apply to the registry records currently loaded (maximum 100). This is not a platform-wide operational analytics feed.</p>
          {loadingRegistry ? <p className="py-4 text-xs text-slate-400" role="status">Loading registry…</p> : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="border-b border-slate-700 text-slate-400"><tr><th className="py-2 pr-3">PMC</th><th className="py-2 pr-3">Organisation ID</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Lifecycle</th><th className="py-2">Actions</th></tr></thead>
                <tbody>
                  {filteredOrganisations.map((org) => <tr key={org.orgId} className="border-b border-slate-800">
                    <td className="py-3 pr-3 font-semibold text-slate-100">{org.displayName}</td>
                    <td className="py-3 pr-3 font-mono text-[10px] text-slate-400">{org.orgId}</td>
                    <td className="py-3 pr-3"><span className="rounded-full border border-slate-600 px-2 py-1">{org.status}</span></td>
                    <td className="py-3 pr-3 text-slate-400">{org.lifecycleStage || '—'}</td>
                    <td className="py-3"><div className="flex flex-wrap gap-1">
                      {org.status === 'active' && <button type="button" disabled={busy} onClick={() => changeStatus(org.orgId, 'suspended')} className="rounded border border-amber-700 px-2 py-1 text-amber-200 disabled:opacity-50">Suspend</button>}
                      {org.status === 'suspended' && <button type="button" disabled={busy} onClick={() => changeStatus(org.orgId, 'active')} className="rounded border border-emerald-700 px-2 py-1 text-emerald-200 disabled:opacity-50">Reactivate</button>}
                      {['active', 'suspended'].includes(org.status) && <button type="button" disabled={busy} onClick={() => changeStatus(org.orgId, 'closed')} className="rounded border border-red-800 px-2 py-1 text-red-200 disabled:opacity-50">Close</button>}
                    </div></td>
                  </tr>)}
                  {!filteredOrganisations.length && <tr><td colSpan={5} className="py-5 text-center text-slate-500">{organisations.length ? 'No PMCs match the current search and status filter.' : 'No PMC records are currently available.'}</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Onboard a PMC</h2>
            <p className="mt-1 text-xs text-slate-400">Creates a provisioning record and a seven-day invitation for an existing, verified Firebase account.</p>
            <form onSubmit={createOrganisation} className="mt-4 space-y-3">
              <label className="block text-xs text-slate-300">PMC / organisation name
                <input required maxLength={120} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-xs text-slate-300">Initial Super Admin email
                <input required type="email" maxLength={254} value={superAdminEmail} onChange={(event) => setSuperAdminEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" />
              </label>
              <button type="submit" disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-bold hover:bg-blue-600 disabled:opacity-50">Create PMC invitation</button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Just-in-time support access</h2>
            <p className="mt-1 text-xs text-slate-400">Purpose-bound, one-PMC session. This screen exposes only audited aggregate counts, never individual tenant records.</p>
            <form onSubmit={createSupportSession} className="mt-4 space-y-3">
              <label className="block text-xs text-slate-300">Target PMC
                <select required value={supportOrgId} onChange={(event) => setSupportOrgId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white">
                  <option value="">Select an active PMC</option>
                  {organisations.filter((org) => org.status === 'active').map((org) => <option key={org.orgId} value={org.orgId}>{org.displayName}</option>)}
                </select>
              </label>
              <label className="block text-xs text-slate-300">Purpose (20–500 characters)
                <textarea required minLength={20} maxLength={500} value={supportPurpose} onChange={(event) => setSupportPurpose(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" rows={2} />
              </label>
              <label className="block text-xs text-slate-300">Change / ticket reference
                <input required minLength={6} maxLength={100} value={changeReference} onChange={(event) => setChangeReference(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" />
              </label>
              <fieldset className="space-y-2"><legend className="text-xs font-semibold text-slate-300">Requested actions</legend>
                {SUPPORT_ACTIONS.map((action) => <label key={action.value} className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={supportActions.includes(action.value)} onChange={() => toggleAction(action.value)} />{action.label}
                </label>)}
              </fieldset>
              <label className="block text-xs text-slate-300">Session duration
                <select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white">
                  {[5, 10, 15, 20, 25, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
                </select>
              </label>
              <button type="submit" disabled={busy || !supportOrgId || !supportActions.length || !!activeSession} className="rounded-lg border border-amber-700 px-4 py-2.5 text-xs font-bold text-amber-200 hover:bg-amber-950/40 disabled:opacity-50">Activate support session</button>
            </form>
            {activeSession && <div className="mt-4 rounded-lg border border-amber-700 bg-amber-950/30 p-3">
              <p className="text-xs font-semibold text-amber-200">Active session — copy the identifier now</p>
              <p className="mt-2 break-all font-mono text-[10px] text-slate-200">{activeSession.sessionId}</p>
              <p className="mt-1 text-[10px] text-slate-400">PMC: {activeSession.orgId} · Expires: {new Date(activeSession.expiresAt).toLocaleString()}</p>
              <label className="mt-3 block text-xs text-slate-300">Revocation reason
                <input value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} minLength={10} maxLength={500} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" />
              </label>
              {activeSession.actions.includes('platform:tenant-data:read') && <button type="button" disabled={busy} onClick={loadTenantSummary} className="mt-3 mr-2 rounded-lg border border-blue-700 px-3 py-2 text-xs font-semibold text-blue-200 disabled:opacity-50">Read aggregate summary</button>}
              {activeSession.actions.includes('platform:tenant-data:export') && <button type="button" disabled={busy} onClick={exportTenantSummary} className="mt-3 mr-2 rounded-lg border border-cyan-700 px-3 py-2 text-xs font-semibold text-cyan-200 disabled:opacity-50">Prepare aggregate export</button>}
              <button type="button" disabled={busy || revokeReason.trim().length < 10} onClick={revokeSupportSession} className="mt-3 rounded-lg border border-red-800 px-3 py-2 text-xs font-semibold text-red-200 disabled:opacity-50">Revoke support session</button>
            </div>}
            {tenantSummary && <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-3">
              <p className="text-xs font-semibold text-slate-200">Audited aggregate tenant summary</p>
              <p className="mt-1 text-[10px] text-slate-500">PMC: {tenantSummary.orgId} · Generated: {new Date(tenantSummary.generatedAt).toLocaleString()}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {Object.entries(tenantSummary.counts).map(([label, count]) => <div key={label} className="rounded border border-slate-800 p-2"><dt className="text-slate-400">{label}</dt><dd className="mt-1 font-semibold tabular-nums text-slate-100">{count}</dd></div>)}
              </dl>
              <p className="mt-2 text-[10px] text-slate-500">Aggregate counts only. No personal or operational record contents.</p>
            </div>}
          </section>
        </div>

        <p className="text-[11px] text-slate-500">Platform Owner authority is separate from tenant RBAC. All registry mutations and support-session lifecycle events are recorded server-side. The support-session ID is a bearer secret and must be handled accordingly.</p>
      </div>
    </main>
  );
};
