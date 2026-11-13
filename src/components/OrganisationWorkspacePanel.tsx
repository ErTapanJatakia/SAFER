import React from 'react';
import type {Firestore} from 'firebase/firestore';
import {OrganisationProfilePanel} from './OrganisationProfilePanel.tsx';
import {
  TENANT_ROLE_UI_CAPABILITIES,
  type OrganisationMembership,
  type TenantUiCapabilities,
} from '../types/organisation.ts';

interface OrganisationWorkspacePanelProps {
  database: Firestore | null;
  membership: OrganisationMembership;
}

const ROLE_LABELS: Record<OrganisationMembership['role'], string> = {
  owner: 'Organisation owner',
  admin: 'Organisation administrator',
  manager: 'Manager',
  viewer: 'Viewer',
};

const CAPABILITY_LABELS: ReadonlyArray<{
  key: keyof TenantUiCapabilities;
  label: string;
  area: 'Organisation' | 'Personnel' | 'Incidents' | 'Evidence' | 'Administration';
}> = [
  {key: 'canReadOrganisation', label: 'Read organisation profile', area: 'Organisation'},
  {key: 'canReadPersonnel', label: 'Read personnel records', area: 'Personnel'},
  {key: 'canWritePersonnel', label: 'Create or update personnel records', area: 'Personnel'},
  {key: 'canDeletePersonnel', label: 'Delete personnel records', area: 'Personnel'},
  {key: 'canReadIncidents', label: 'Read incident records', area: 'Incidents'},
  {key: 'canCreateIncidents', label: 'Create incident records', area: 'Incidents'},
  {key: 'canUpdateIncidents', label: 'Update incident records', area: 'Incidents'},
  {key: 'canDeleteIncidents', label: 'Delete incident records', area: 'Incidents'},
  {key: 'canReadEvidence', label: 'Read evidence records', area: 'Evidence'},
  {key: 'canWriteEvidence', label: 'Create, update or delete evidence records', area: 'Evidence'},
  {key: 'canManageMemberships', label: 'Manage memberships', area: 'Administration'},
  {key: 'canReadAuditEvents', label: 'Read audit events', area: 'Administration'},
  {key: 'canWriteAuditEvents', label: 'Append or modify audit events', area: 'Administration'},
];

export const OrganisationWorkspacePanel: React.FC<OrganisationWorkspacePanelProps> = ({database, membership}) => {
  const capabilities = TENANT_ROLE_UI_CAPABILITIES[membership.role];

  return (
    <section
      aria-labelledby="verified-organisation-heading"
      className="mt-3 rounded-xl border border-emerald-800 bg-slate-950 p-4"
      data-testid="verified-organisation-workspace"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Membership verified at check time</p>
          <h3 id="verified-organisation-heading" className="mt-1 text-base font-semibold text-white">Organisation workspace</h3>
          <dl className="mt-2 grid gap-x-5 gap-y-1 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-slate-400">Organisation ID</dt>
              <dd className="mt-0.5 break-all font-mono text-slate-200">{membership.orgId}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Verified session role</dt>
              <dd className="mt-0.5 font-medium text-slate-100">{ROLE_LABELS[membership.role]}</dd>
            </div>
          </dl>
        </div>
        <span className="rounded-full border border-emerald-700 bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-200">
          Active when checked
        </span>
      </header>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section aria-labelledby="role-capability-heading" className="rounded-lg border border-slate-700 bg-slate-900 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 id="role-capability-heading" className="text-xs font-semibold text-slate-100">Role capability matrix</h4>
            <span className="text-[10px] text-slate-400">Current Firestore Rules model</span>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-[10px] uppercase tracking-wide text-slate-400">
                  <th scope="col" className="py-2 pr-3 font-medium">Area</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Capability</th>
                  <th scope="col" className="py-2 text-right font-medium">Current status</th>
                </tr>
              </thead>
              <tbody>
                {CAPABILITY_LABELS.map(({key, label, area}) => {
                  const granted = capabilities[key];
                  return (
                    <tr key={key} className="border-b border-slate-800 last:border-0">
                      <td className="py-2 pr-3 text-slate-400">{area}</td>
                      <td className="py-2 pr-3 text-slate-200">{label}</td>
                      <td className="py-2 text-right">
                        <span className={granted ? 'font-medium text-emerald-300' : 'font-medium text-slate-400'}>
                          {granted ? 'Permitted by current Rules' : 'Not permitted by current Rules'}
                        </span>
                        <span className="sr-only">{granted ? 'Capability is granted in the current rules model' : 'Capability is not granted in the current rules model'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="rounded-lg border border-amber-800 bg-amber-950/30 p-3">
          <h4 className="text-xs font-semibold text-amber-100">Workspace release status</h4>
          <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
            Operational workspace access is not released in this authenticated session. Membership verification confirms only the exact membership record; it does not provision operational data access.
          </p>
          <div className="mt-3 border-t border-amber-800/70 pt-3">
            <h5 className="text-xs font-semibold text-amber-100">Unavailable controls</h5>
            <ul className="mt-1 space-y-1 text-xs text-amber-100/90">
              <li>Membership invitations and role administration</li>
              <li>Audit-event browsing and security activity feed</li>
              <li>Organisation switching and tenant provisioning</li>
            </ul>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-amber-200/80">
            “Permitted” describes the current Firestore Rules model only; it does not mean the corresponding SAFER screen or workflow is released. Membership status is a point-in-time result, not continuous monitoring; it may change after this check. Firestore Security Rules re-evaluate each database request and remain authoritative. This matrix is informational UI guidance, not authorization. No audit feed or simulated activity is displayed.
          </p>
        </aside>
      </div>
      <OrganisationProfilePanel database={database} membership={membership} />
    </section>
  );
};
