import React, {useEffect, useState} from 'react';
import type {Firestore} from 'firebase/firestore';
import type {OrganisationMembership, OrganisationRecord} from '../types/organisation.ts';
import {readOrganisationProfile} from '../lib/organisationProfile.ts';

interface OrganisationProfilePanelProps {
  database: Firestore | null;
  membership: OrganisationMembership;
}

export const OrganisationProfilePanel: React.FC<OrganisationProfilePanelProps> = ({database, membership}) => {
  const [profile, setProfile] = useState<OrganisationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    setProfile(null);
    setUnavailable(false);

    if (!database || membership.status !== 'active' || !['owner', 'admin'].includes(membership.role)) {
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    void readOrganisationProfile(database, membership)
      .then((resolved) => { if (active) setProfile(resolved); })
      .catch(() => { if (active) setUnavailable(true); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [database, membership.uid, membership.orgId, membership.role, membership.status]);

  if (membership.role === 'manager' || membership.role === 'viewer') {
    return <p className="mt-3 text-xs text-slate-400">Organisation profile details are not available to this role under the current access rules.</p>;
  }

  return (
    <section aria-labelledby="organisation-profile-heading" className="mt-3 rounded-lg border border-slate-700 bg-slate-900 p-3" data-testid="organisation-profile">
      <h4 id="organisation-profile-heading" className="text-xs font-semibold text-slate-100">Organisation profile</h4>
      {loading && <p role="status" className="mt-2 text-xs text-slate-300">Loading verified organisation profile…</p>}
      {unavailable && <p role="alert" className="mt-2 text-xs text-amber-200">Organisation profile is unavailable. No cached or inferred profile details are shown.</p>}
      {profile && (
        <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
          <div><dt className="text-slate-400">Display name</dt><dd className="mt-0.5 font-medium text-white">{profile.displayName}</dd></div>
          <div><dt className="text-slate-400">Organisation ID</dt><dd className="mt-0.5 break-all font-mono text-slate-200">{profile.orgId}</dd></div>
          <div><dt className="text-slate-400">Status</dt><dd className="mt-0.5 text-emerald-300">Active</dd></div>
          <div><dt className="text-slate-400">Schema version</dt><dd className="mt-0.5 text-slate-200">{profile.schemaVersion}</dd></div>
        </dl>
      )}
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Read-only profile metadata. Firestore Security Rules enforce access; this display does not grant operational access.</p>
    </section>
  );
};
