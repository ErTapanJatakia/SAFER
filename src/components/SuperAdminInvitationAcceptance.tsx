import React, {useState, type FormEvent} from 'react';
import type {User} from 'firebase/auth';

interface Props { user: User; }

export const SuperAdminInvitationAcceptance: React.FC<Props> = ({user}) => {
  const [orgId,setOrgId]=useState('');
  const [invitationId,setInvitationId]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  const accept=async(event:FormEvent)=>{
    event.preventDefault();
    setBusy(true);setError('');setMessage('');
    try{
      const token=await user.getIdToken();
      const response=await fetch('/api/tenant/invitations/accept',{
        method:'POST',
        headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({orgId:orgId.trim(),invitationId:invitationId.trim()}),
        cache:'no-store',
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(typeof payload.error==='string'?payload.error:'invitation_acceptance_unavailable');
      setMessage(payload.activationRequired
        ?'Invitation accepted. Your Super Admin membership is pending activation; tenant access remains unavailable until the separate activation process is completed.'
        :'Invitation is already accepted and the membership is active.');
    }catch(failure){
      setError(failure instanceof Error?failure.message:'invitation_acceptance_unavailable');
    }finally{setBusy(false);}
  };

  return <section aria-labelledby="super-admin-invitation-heading" className="border-b border-slate-700 bg-slate-900 px-4 py-4 text-slate-100">
    <div className="mx-auto max-w-7xl">
      <h2 id="super-admin-invitation-heading" className="font-semibold">Accept PMC Super Admin invitation</h2>
      <p className="mt-1 text-xs text-slate-300">Use the organisation ID and invitation ID supplied by the Platform Owner. Acceptance requires this signed-in account to match the verified invitee email.</p>
      <form onSubmit={accept} className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <label className="block min-w-0 text-xs font-medium text-slate-300">Organisation ID
          <input required value={orgId} onChange={event=>setOrgId(event.target.value)} pattern="org_[a-f0-9]{32}" maxLength={36} autoComplete="off" spellCheck={false} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" />
        </label>
        <label className="block min-w-0 text-xs font-medium text-slate-300">Invitation ID
          <input required value={invitationId} onChange={event=>setInvitationId(event.target.value)} pattern="[A-Za-z0-9_-]{40,50}" minLength={40} maxLength={50} autoComplete="off" spellCheck={false} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white" />
        </label>
        <button type="submit" disabled={busy||!orgId.trim()||!invitationId.trim()} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-50">{busy?'Accepting…':'Accept invitation'}</button>
      </form>
      {error&&<p role="alert" className="mt-3 text-xs text-red-300">Invitation was not accepted: {error}</p>}
      {message&&<p role="status" className="mt-3 text-xs text-emerald-300">{message}</p>}
    </div>
  </section>;
};
