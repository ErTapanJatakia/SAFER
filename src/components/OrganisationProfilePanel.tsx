import React, {useEffect, useState} from 'react';
import type {Firestore} from 'firebase/firestore';
import type {OrganisationMembership, OrganisationRecord} from '../types/organisation.ts';
import {readOrganisationProfile} from '../lib/organisationProfile.ts';

interface OrganisationProfilePanelProps {
  database: Firestore | null;
  membership: OrganisationMembership;
}

interface ProfileRequestState {
  database: Firestore | null;
  uid: string;
  orgId: string;
  role: OrganisationMembership['role'];
  status: OrganisationMembership['status'];
  loading: boolean;
  unavailable: boolean;
  profile: OrganisationRecord | null;
}

const matchesRequest = (
  state: ProfileRequestState | null,
  database: Firestore | null,
  membership: OrganisationMembership,
) => Boolean(state
  && state.database === database
  && state.uid === membership.uid
  && state.orgId === membership.orgId
  && state.role === membership.role
  && state.status === membership.status);

export const OrganisationProfilePanel: React.FC<OrganisationProfilePanelProps> = ({database, membership}) => {
  const [requestState, setRequestState] = useState<ProfileRequestState | null>(null);
  const isPrivilegedMember = membership.status === 'active'
    && (membership.role === 'owner' || membership.role === 'admin');
  const currentState = matchesRequest(requestState, database, membership) ? requestState : null;

  useEffect(() => {
    let active = true;
    const request: ProfileRequestState = {
      database,
      uid: membership.uid,
      orgId: membership.orgId,
      role: membership.role,
      status: membership.status,
      loading: Boolean(database && membership.status === 'active'
        && (membership.role === 'owner' || membership.role === 'admin')),
      unavailable: false,
      profile: null,
    };
    setRequestState(request);

    if (!request.loading || !database) {
      return () => { active = false; };
    }

    void readOrganisationProfile(database, membership)
      .then((profile) => {
        if (active) setRequestState({...request, loading: false, profile});
      })
      .catch(() => {
        if (active) setRequestState({...request, loading: false, unavailable: true});
      });

    return () => { active = false; };
  }, [database, membership.uid, membership.orgId, membership.role, membership.status]);

  if (membership.role === 'manager' || membership.role === 'viewer') {
    return <p className="mt-3 text-xs text-slate-400">Organisation profile details are not available to this role under the current access rules.</p>;
  }

  if (!isPrivilegedMember) {
    return <p className="mt-3 text-xs text-slate-400">An active owner or administrator membership is required to view organisation profile metadata.</p>;
  }

  return (
    <section aria-labelledby="organisation-profile-heading" className="mt-3 rounded-lg border border-slate-700 bg-slate-900 p-3" data-testid="organisation-profile">
      <h4 id="organisation-profile-heading" className="text-xs font-semibold text-slate-100">Organisation profile</h4>
      {currentState?.loading && <p role="status" className="mt-2 text-xs text-slate-300">Loading verified organisation profile…</p>}
      {currentState?.unavailable && <p role="alert" className="mt-2 text-xs text-amber-200">Organisation profile is unavailable. No cached or inferred profile details are shown.</p>}
      {currentState?.profile && (
        <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
          <div><dt className="text-slate-400">Display name</dt><dd className="mt-0.5 font-medium text-white">{currentState.profile.displayName}</dd></div>
          <div><dt className="text-slate-400">Organisation ID</dt><dd className="mt-0.5 break-all font-mono text-slate-200">{currentState.profile.orgId}</dd></div>
          <div><dt className="text-slate-400">Status</dt><dd className="mt-0.5 text-emerald-300">Active</dd></div>
          <div><dt className="text-slate-400">Schema version</dt><dd className="mt-0.5 text-slate-200">{currentState.profile.schemaVersion}</dd></div>
        </dl>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Read-only profile metadata. Firestore Security Rules enforce access; this display does not grant operational access.</p>
    </section>
  );
};
