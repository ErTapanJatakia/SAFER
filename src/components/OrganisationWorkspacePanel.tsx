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

const CAPABILITY_LABELS: ReadonlyArray<{
  key: keyof TenantUiCapabilities;
  label: string;
}> = [
  {key: 'canReadOrganisation', label: 'Read organisation profile'},
  {key: 'canReadPersonnel', label: 'Read personnel records'},
  {key: 'canWritePersonnel', label: 'Create or update personnel records'},
  {key: 'canReadIncidents', label: 'Read incident records'},
  {key: 'canCreateIncidents', label: 'Create incident records'},
  {key: 'canUpdateIncidents', label: 'Update incident records'},
  {key: 'canReadEvidence', label: 'Read evidence records'},
  {key: 'canManageMemberships', label: 'Manage memberships'},
  {key: 'canReadAuditEvents', label: 'Read audit events'},
];

export const OrganisationWorkspacePanel: React.FC<OrganisationWorkspacePanelProps> = ({database, membership}) => {
  const capabilities = TENANT_ROLE_UI_CAPABILITIES[membership.role];

  return (
    <section
      aria-labelledby="verified-organisation-heading"
      className="mt-3 rounded-xl border border-emerald-800 bg-slate-950 p-4"
      data-testid="verified-organisation-workspace"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Membership verified</p>
          <h3 id="verified-organisation-heading" className="mt-1 text-base font-semibold text-white">Organisation workspace context</h3>
          <p className="mt-1 text-xs text-slate-300">Organisation ID: <code className="break-all">{membership.orgId}</code></p>
        </div>
        <span className="rounded-full border border-emerald-700 bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-200">
          {membership.role}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
          <h4 className="text-xs font-semibold text-slate-100">Role capability preview</h4>
          <ul className="mt-2 space-y-1.5 text-xs">
            {CAPABILITY_LABELS.map(({key, label}) => (
              <li key={key} className="flex items-start gap-2">
                <span aria-hidden="true" className={capabilities[key] ? 'text-emerald-300' : 'text-slate-500'}>
                  {capabilities[key] ? '✓' : '—'}
                </span>
                <span className={capabilities[key] ? 'text-slate-200' : 'text-slate-400'}>{label}</span>
                <span className="sr-only">{capabilities[key] ? 'Available in current rules model' : 'Not available in current rules model'}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-3">
          <h4 className="text-xs font-semibold text-amber-100">Workspace release status</h4>
          <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
            Operational workspace access is not released in this authenticated session. Membership verification confirms only the exact membership record; it does not provision data access.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-amber-200/80">
            This capability preview is informational UI guidance. Firestore Security Rules remain authoritative. Membership administration and audit-event access are not available in the current rules model.
          </p>
        </div>
      </div>
      <OrganisationProfilePanel database={database} membership={membership} />
    </section>
  );
};
