import React, {useCallback, useEffect, useMemo, useState} from 'react';
import type {User} from 'firebase/auth';

type Role = 'tenant_super_admin'|'tenant_admin'|'tenant_manager'|'tenant_employee'|'tenant_auditor';
type Tab = 'overview'|'incidents'|'personnel'|'evidence'|'checklists'|'reports'|'audit'|'members'|'notifications'|'configuration';
type Row = Record<string, unknown>;
type Membership = {uid:string;orgId:string;role:Role;status:'active';schemaVersion:1};

const TABS: {id:Tab;label:string;roles?:Role[]}[] = [
  {id:'overview',label:'Overview'},
  {id:'incidents',label:'Incidents'},
  {id:'personnel',label:'Personnel',roles:['tenant_super_admin','tenant_admin','tenant_manager','tenant_auditor','tenant_employee']},
  {id:'evidence',label:'Evidence',roles:['tenant_super_admin','tenant_admin','tenant_manager','tenant_auditor']},
  {id:'checklists',label:'Checklists'},
  {id:'reports',label:'Reports'},
  {id:'audit',label:'Audit',roles:['tenant_super_admin','tenant_admin','tenant_auditor']},
  {id:'members',label:'Members',roles:['tenant_super_admin','tenant_admin','tenant_auditor']},
  {id:'notifications',label:'Activity'},
  {id:'configuration',label:'PMC settings',roles:['tenant_super_admin']},
];
const inputClass='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';
const buttonClass='rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-50';
const cardClass='rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm';
const text=(value:unknown)=>typeof value==='string'?value:'';
const array=(value:unknown):Row[]=>Array.isArray(value)?value.filter((item):item is Row=>!!item&&typeof item==='object'):[];

interface Props {user:User;membership:Membership;onLeave:()=>void;}

export const TenantOperationsWorkspace:React.FC<Props>=({user,membership,onLeave})=>{
  const [tab,setTab]=useState<Tab>('overview');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [incidents,setIncidents]=useState<Row[]>([]);
  const [personnel,setPersonnel]=useState<Row[]>([]);
  const [evidence,setEvidence]=useState<Row[]>([]);
  const [checklists,setChecklists]=useState<Row[]>([]);
  const [members,setMembers]=useState<Row[]>([]);
  const [audit,setAudit]=useState<Row[]>([]);
  const [activity,setActivity]=useState<Row[]>([]);
  const [report,setReport]=useState<Row|null>(null);
  const [configuration,setConfiguration]=useState<Row|null>(null);
  const [search,setSearch]=useState('');
  const [incidentForm,setIncidentForm]=useState({title:'',incidentType:'Administrative Discrepancy',priority:'Routine',summary:'',locationLabel:''});
  const [personForm,setPersonForm]=useState({employeeRef:'',displayLabel:'',operationalRoles:'',specialisations:'',assignmentSector:'Sector Alpha (Metropolitan)',readinessStatus:'REQUIRES_HUMAN_REVIEW',employeeUid:''});
  const [checklistForm,setChecklistForm]=useState({task:'',description:'',category:'Required documentation and approvals',priority:'Medium',assignedToUid:''});
  const [evidenceForm,setEvidenceForm]=useState({incidentId:'',title:'',fileName:'',mediaType:'application/pdf',byteSize:0,sha256Claimed:''});
  const [evidenceFile,setEvidenceFile]=useState<File|null>(null);
  const [memberForm,setMemberForm]=useState({email:'',role:'tenant_employee' as Role});
  const [settingsForm,setSettingsForm]=useState({timezone:'Asia/Kolkata',dateFormat:'DD-MM-YYYY',defaultIncidentPriority:'Routine',checklistReviewDays:7,notificationsEnabled:true});

  const request=useCallback(async(path:string,method='GET',body?:Row)=>{
    const token=await user.getIdToken();
    const response=await fetch(path,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});
    const payload=await response.json().catch(()=>({error:'invalid_server_response'}));
    if(!response.ok)throw new Error(text(payload.error)||'request_failed');
    return payload as Row;
  },[user]);

  const load=useCallback(async(target:Tab)=>{
    setBusy(true);setError('');setNotice('');
    try{
      const q=`?orgId=${encodeURIComponent(membership.orgId)}`;
      if(target==='overview'||target==='reports'){
        const value=await request('/api/tenant/reports'+q);setReport(value);
      }
      if(target==='incidents'||target==='overview'){
        const value=await request('/api/tenant/incidents'+q);setIncidents(array(value.records??value.incidents));
      }
      if(target==='personnel'||target==='overview'){
        const value=await request('/api/tenant/personnel'+q);setPersonnel(array(value.records??value.personnel));
      }
      if(target==='evidence'||target==='overview'){
        const value=await request('/api/tenant/evidence'+q);setEvidence(array(value.records??value.evidence));
      }
      if(target==='checklists'||target==='overview'){
        const value=await request('/api/tenant/checklists'+q);setChecklists(array(value.records??value.checklists));
      }
      if(target==='members'){
        const value=await request('/api/tenant/members'+q);setMembers(array(value.members));
      }
      if(target==='audit'){
        const value=await request('/api/tenant/audit'+q);setAudit(array(value.events));
      }
      if(target==='notifications'){
        const value=await request('/api/tenant/notifications'+q);setActivity(array(value.notifications));
      }
      if(target==='configuration'){
        const value=await request('/api/tenant/configuration'+q);
        const settings=(value.settings&&typeof value.settings==='object'?value.settings:{}) as Row;
        setConfiguration(value);
        setSettingsForm({
          timezone:text(settings.timezone)||'Asia/Kolkata',
          dateFormat:text(settings.dateFormat)||'DD-MM-YYYY',
          defaultIncidentPriority:text(settings.defaultIncidentPriority)||'Routine',
          checklistReviewDays:Number(settings.checklistReviewDays)||7,
          notificationsEnabled:settings.notificationsEnabled!==false,
        });
      }
    }catch(e){setError(e instanceof Error?e.message:'request_failed');}
    finally{setBusy(false);}
  },[membership.orgId,request]);

  useEffect(()=>{void load('overview');},[load]);
  const visibleTabs=TABS.filter(item=>!item.roles||item.roles.includes(membership.role));
  const canManage=membership.role==='tenant_super_admin'||membership.role==='tenant_admin';
  const canOperate=canManage||membership.role==='tenant_manager';
  const filteredIncidents=useMemo(()=>incidents.filter(row=>JSON.stringify(row).toLowerCase().includes(search.toLowerCase())),[incidents,search]);

  const run=async(action:()=>Promise<void>)=>{setBusy(true);setError('');setNotice('');try{await action();}catch(e){setError(e instanceof Error?e.message:'operation_failed');}finally{setBusy(false);}};
  const jsonPost=async(path:string,body:Row)=>{await request(path,'POST',body);};
  const jsonPatch=async(path:string,body:Row)=>{await request(path,'PATCH',body);};
  const changeTab=(next:Tab)=>{setTab(next);setSearch('');void load(next);};

  const createIncident=()=>run(async()=>{
    await jsonPost('/api/tenant/incidents',{orgId:membership.orgId,...incidentForm});
    setIncidentForm({title:'',incidentType:'Administrative Discrepancy',priority:'Routine',summary:'',locationLabel:''});
    setNotice('Incident recorded. Human review remains required.');await load('incidents');
  });
  const createPersonnel=()=>run(async()=>{
    await jsonPost('/api/tenant/personnel',{orgId:membership.orgId,employeeRef:personForm.employeeRef,displayLabel:personForm.displayLabel,operationalRoles:personForm.operationalRoles.split(',').map(x=>x.trim()).filter(Boolean),specialisations:personForm.specialisations.split(',').map(x=>x.trim()).filter(Boolean),assignmentSector:personForm.assignmentSector,readinessStatus:personForm.readinessStatus,requiresHumanReview:true,...(personForm.employeeUid?{employeeUid:personForm.employeeUid}:{})});
    setPersonForm({employeeRef:'',displayLabel:'',operationalRoles:'',specialisations:'',assignmentSector:'Sector Alpha (Metropolitan)',readinessStatus:'REQUIRES_HUMAN_REVIEW',employeeUid:''});
    setNotice('Minimised personnel directory record created.');await load('personnel');
  });
  const createChecklist=()=>run(async()=>{
    await jsonPost('/api/tenant/checklists',{orgId:membership.orgId,...checklistForm,requiresHumanReview:true});
    setChecklistForm({task:'',description:'',category:'Required documentation and approvals',priority:'Medium',assignedToUid:''});
    setNotice('Checklist task assigned.');await load('checklists');
  });
  const selectEvidence=async(file:File|null)=>{
    setEvidenceFile(file);
    if(!file){setEvidenceForm({incidentId:'',title:'',fileName:'',mediaType:'application/pdf',byteSize:0,sha256Claimed:''});return;}
    const ext=file.name.toLowerCase().split('.').pop();const mediaType=file.type&&['application/pdf','image/jpeg','image/png','text/plain'].includes(file.type)?file.type:ext==='pdf'?'application/pdf':['jpg','jpeg'].includes(ext??'')?'image/jpeg':ext==='png'?'image/png':ext==='txt'?'text/plain':'application/octet-stream';
    const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
    const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
    setEvidenceForm(current=>({...current,fileName:file.name,byteSize:file.size,mediaType,sha256Claimed:hash,title:current.title||file.name}));
  };
  const registerEvidence=()=>run(async()=>{
    if(!evidenceFile)throw new Error('select_a_local_file_first');
    await jsonPost('/api/tenant/evidence',{orgId:membership.orgId,...evidenceForm});
    setEvidenceFile(null);setEvidenceForm({incidentId:'',title:'',fileName:'',mediaType:'application/pdf',byteSize:0,sha256Claimed:''});
    setNotice('Metadata registered. The file itself was not uploaded; hash is client-claimed and remains unverified.');await load('evidence');
  });
  const inviteMember=()=>run(async()=>{
    await jsonPost('/api/tenant/members',{orgId:membership.orgId,...memberForm});
    setMemberForm({email:'',role:'tenant_employee'});setNotice('Invitation record created. Delivery is not automatic.');await load('members');
  });
  const saveSettings=()=>run(async()=>{
    const value=await request('/api/tenant/configuration','PATCH',{orgId:membership.orgId,settings:settingsForm});
    setConfiguration(value);setNotice('PMC settings saved.');await load('configuration');
  });
  const exportReport=(format:'csv'|'xlsx'|'pdf')=>run(async()=>{
    const value=await request('/api/tenant/reports','POST',{orgId:membership.orgId});
    const rows=Object.entries((value.counts??{}) as Row).map(([metric,count])=>({Metric:metric,Count:String(count)}));
    if(format==='csv'){
      const csv=['Metric,Count',...rows.map(row=>`${row.Metric},${row.Count}`)].join('\\n');
      const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
      const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='safer-tenant-aggregate-report.csv';anchor.click();URL.revokeObjectURL(url);
    }else if(format==='xlsx'){
      const XLSX=await import('xlsx');const sheet=XLSX.utils.json_to_sheet(rows);const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Aggregate Report');XLSX.writeFile(book,'safer-tenant-aggregate-report.xlsx');
    }else{
      const {jsPDF}=await import('jspdf');const pdf=new jsPDF();pdf.setFontSize(16);pdf.text('SAFER PMC Aggregate Report',14,18);pdf.setFontSize(9);pdf.text(`Organisation: ${membership.orgId}`,14,26);pdf.text(`Generated: ${String(value.generatedAt??new Date().toISOString())}`,14,32);rows.forEach((row,index)=>pdf.text(`${row.Metric}: ${row.Count}`,14,44+index*8));pdf.save('safer-tenant-aggregate-report.pdf');
    }
    setNotice(`Aggregate ${format.toUpperCase()} export prepared and audited. No individual records are included.`);
  });
  const updateIncident=(incidentId:string,patch:Row)=>run(async()=>{await jsonPatch('/api/tenant/incidents',{orgId:membership.orgId,incidentId,patch});setNotice('Incident updated and audited.');await load('incidents');});
  const updatePersonnel=(recordId:string,readinessStatus:string)=>run(async()=>{await jsonPatch('/api/tenant/personnel',{orgId:membership.orgId,recordId,patch:{readinessStatus,requiresHumanReview:true}});setNotice('Personnel readiness updated.');await load('personnel');});
  const updateChecklist=(checklistId:string,patch:Row)=>run(async()=>{await jsonPatch('/api/tenant/checklists',{orgId:membership.orgId,checklistId,patch});setNotice('Checklist workflow updated and audited.');await load('checklists');});
  const manageMember=(targetUid:string,action:'members:suspend'|'members:role:assign',targetRole?:Role)=>run(async()=>{await jsonPatch('/api/tenant/members',{orgId:membership.orgId,targetUid,action,...(targetRole?{targetRole}:{})});setNotice('Membership administration change recorded.');await load('members');});
  const titleFor=(value:unknown)=>text(value)||'—';
  const list=(rows:Row[],keys:string[])=>rows.length?rows.map((row,index)=><div key={String(row.incidentId??row.recordId??row.checklistId??row.evidenceId??row.uid??row.eventId??index)} className="border-b border-slate-100 py-3 last:border-0"><div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-sm">{titleFor(row.title??row.displayLabel??row.task??row.action??row.email??row.employeeRef??row.referenceNumber)}</strong><span className="text-[10px] text-slate-500">{titleFor(row.status??row.priority??row.verificationState??row.role)}</span></div><p className="mt-1 break-words text-xs text-slate-600">{keys.map(key=>row[key]===undefined?'':`${key}: ${String(row[key])}`).filter(Boolean).join(' · ')}</p></div>):<p className="py-5 text-sm text-slate-500">No records available in this view.</p>;

  const panel=(heading:string,description:string,children:React.ReactNode)=><section className={cardClass}><div className="mb-4"><h2 className="font-semibold">{heading}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div>{children}</section>;

  return <main className="min-h-[75vh] bg-slate-100 px-3 py-5 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950 p-5 text-white">
        <div><p className="text-[10px] uppercase tracking-[.2em] text-cyan-300">SAFER · PMC workspace</p><h1 className="mt-1 text-xl font-bold">{membership.orgId}</h1><p className="mt-1 text-xs text-slate-300">Verified role: {membership.role.replaceAll('_',' ')}</p></div>
        <button type="button" onClick={onLeave} className="rounded-lg border border-slate-600 px-3 py-2 text-xs">Sign out</button>
      </header>
      <nav aria-label="Tenant operations modules" className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2">{visibleTabs.map(item=><button key={item.id} type="button" aria-current={tab===item.id?'page':undefined} onClick={()=>changeTab(item.id)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${tab===item.id?'bg-slate-900 text-white':'text-slate-600 hover:bg-slate-100'}`}>{item.label}</button>)}</nav>
      {error&&<p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice&&<p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {busy&&<p role="status" className="text-xs text-slate-500">Processing…</p>}
      {tab==='overview'&&<div className="space-y-4">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{Object.entries((report?.counts??{}) as Row).map(([key,value])=><div key={key} className={cardClass}><p className="text-xs capitalize text-slate-500">{key.replaceAll(/([A-Z])/g,' $1')}</p><p className="mt-2 text-2xl font-bold tabular-nums">{String(value)}</p></div>)}</section>
        <div className="grid gap-4 lg:grid-cols-2">{panel('Recent incidents','Tenant-scoped operational records.',list(incidents.slice(0,5),['referenceNumber','status','priority']))}{panel('Outstanding checklists','Assignment and completion status.',list(checklists.filter(row=>row.status==='Incomplete').slice(0,5),['assignedToUid','priority','updatedAt']))}</div>
      </div>}
      {tab==='incidents'&&<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {panel('Incident register','Search and review incidents within this PMC.',<><input className={inputClass} placeholder="Search incident records" value={search} onChange={e=>setSearch(e.target.value)}/>{filteredIncidents.length?filteredIncidents.map(row=><div key={String(row.incidentId)} className="border-b border-slate-100 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{String(row.referenceNumber??row.title??'Incident')}</strong><span className="text-xs text-slate-500">{String(row.incidentType??'')}</span></div><p className="my-1 text-xs text-slate-600">{String(row.summary??'')} · {String(row.locationLabel??'')}</p>{canOperate&&<div className="flex flex-wrap gap-2"><select aria-label="Incident status" className="rounded border border-slate-300 p-1 text-xs" value={String(row.status??'')} onChange={e=>updateIncident(String(row.incidentId),{status:e.target.value})}>{['Logged - Pending Officer Review','Under Investigation / Human Review','Documented & Filed'].map(x=><option key={x}>{x}</option>)}</select><select aria-label="Incident priority" className="rounded border border-slate-300 p-1 text-xs" value={String(row.priority??'Routine')} onChange={e=>updateIncident(String(row.incidentId),{priority:e.target.value})}>{['Routine','Moderate','High Attention'].map(x=><option key={x}>{x}</option>)}</select></div>}</div>):<p className="py-5 text-sm text-slate-500">No incidents found.</p>}</>)}
        {canOperate&&panel('Log incident','Use factual language. Investigation status remains subject to human review.',<div className="space-y-2"><input className={inputClass} placeholder="Incident title" maxLength={160} value={incidentForm.title} onChange={e=>setIncidentForm({...incidentForm,title:e.target.value})}/><select className={inputClass} value={incidentForm.incidentType} onChange={e=>setIncidentForm({...incidentForm,incidentType:e.target.value})}>{['Equipment Malfunction','Access Control Anomaly','Communications Drop','Logistics Delay','Medical First-Aid Event','Administrative Discrepancy'].map(x=><option key={x}>{x}</option>)}</select><select className={inputClass} value={incidentForm.priority} onChange={e=>setIncidentForm({...incidentForm,priority:e.target.value})}>{['Routine','Moderate','High Attention'].map(x=><option key={x}>{x}</option>)}</select><input className={inputClass} placeholder="Location label (optional)" maxLength={120} value={incidentForm.locationLabel} onChange={e=>setIncidentForm({...incidentForm,locationLabel:e.target.value})}/><textarea className={inputClass} rows={4} placeholder="Factual summary" maxLength={2000} value={incidentForm.summary} onChange={e=>setIncidentForm({...incidentForm,summary:e.target.value})}/><button className={buttonClass} disabled={busy||!incidentForm.title.trim()||!incidentForm.summary.trim()} onClick={createIncident}>Record incident</button></div>)}
      </div>}
      {tab==='personnel'&&<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {panel('Personnel directory','Minimised operational directory; no personal, health or contact data is displayed.',list(personnel,['employeeRef','operationalRoles','specialisations','assignmentSector','readinessStatus','requiresHumanReview']))}
        {canManage&&panel('Add personnel reference','Only non-sensitive operational fields are accepted.',<div className="space-y-2"><input className={inputClass} placeholder="PMC employee reference" value={personForm.employeeRef} onChange={e=>setPersonForm({...personForm,employeeRef:e.target.value})}/><input className={inputClass} placeholder="Display label (optional)" value={personForm.displayLabel} onChange={e=>setPersonForm({...personForm,displayLabel:e.target.value})}/><input className={inputClass} placeholder="Operational roles, comma-separated" value={personForm.operationalRoles} onChange={e=>setPersonForm({...personForm,operationalRoles:e.target.value})}/><input className={inputClass} placeholder="Specialisations, comma-separated" value={personForm.specialisations} onChange={e=>setPersonForm({...personForm,specialisations:e.target.value})}/><select className={inputClass} value={personForm.assignmentSector} onChange={e=>setPersonForm({...personForm,assignmentSector:e.target.value})}>{['Sector Alpha (Metropolitan)','Sector Bravo (Transit)','Sector Charlie (Static Facility)','Sector Delta (Reserve)'].map(x=><option key={x}>{x}</option>)}</select><input className={inputClass} placeholder="Employee Firebase UID binding (optional)" value={personForm.employeeUid} onChange={e=>setPersonForm({...personForm,employeeUid:e.target.value})}/><button className={buttonClass} disabled={busy||!personForm.employeeRef.trim()} onClick={createPersonnel}>Create directory record</button></div>)}
      </div>}
      {tab==='evidence'&&<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {panel('Evidence manifest','Metadata-only register. No file bytes are transmitted or stored.',list(evidence,['incidentId','fileName','mediaType','byteSize','sha256Claimed','verificationState','createdAt']))}
        {canOperate&&panel('Register evidence metadata','Select a local file to calculate a client-side SHA-256 claim. This is not secure evidence ingestion.',<div className="space-y-2"><select className={inputClass} value={evidenceForm.incidentId} onChange={e=>setEvidenceForm({...evidenceForm,incidentId:e.target.value})}><option value="">Link to incident</option>{incidents.map(row=><option key={String(row.incidentId)} value={String(row.incidentId)}>{String(row.referenceNumber??row.title??row.incidentId)}</option>)}</select><input className={inputClass} placeholder="Evidence title" value={evidenceForm.title} onChange={e=>setEvidenceForm({...evidenceForm,title:e.target.value})}/><input type="file" accept=".pdf,.jpg,.jpeg,.png,.txt" onChange={e=>void selectEvidence(e.target.files?.[0]??null)} className="w-full text-xs"/><p className="break-all text-[10px] text-slate-500">{evidenceFile? `${evidenceFile.name} · ${evidenceFile.size} bytes · local hash only`:'No local file selected'}</p><button className={buttonClass} disabled={busy||!evidenceForm.incidentId||!evidenceForm.title.trim()||!evidenceFile} onClick={registerEvidence}>Register metadata only</button><p className="text-[11px] text-amber-700">The file remains on this device. The recorded hash is marked unverified. Do not use this as a chain-of-custody system.</p></div>)}
      </div>}
      {tab==='checklists'&&<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {panel('Checklist register','Assigned tasks, status and human-review indicators.',list(checklists,['category','description','assignedToUid','priority','status','requiresHumanReview']))}
        {canOperate&&panel('Assign checklist task','Assignments are checked against active Employee membership.',<div className="space-y-2"><input className={inputClass} placeholder="Task" maxLength={180} value={checklistForm.task} onChange={e=>setChecklistForm({...checklistForm,task:e.target.value})}/><textarea className={inputClass} rows={3} placeholder="Description" maxLength={1200} value={checklistForm.description} onChange={e=>setChecklistForm({...checklistForm,description:e.target.value})}/><select className={inputClass} value={checklistForm.category} onChange={e=>setChecklistForm({...checklistForm,category:e.target.value})}>{['Required documentation and approvals','Training and certification validity','Emergency contacts and escalation arrangements','First-aid and emergency preparedness documentation','Equipment inventory and condition records','Device and communications security checks','Required briefings and acknowledgements',"Outstanding issues requiring a supervisor's review"].map(x=><option key={x}>{x}</option>)}</select><select className={inputClass} value={checklistForm.priority} onChange={e=>setChecklistForm({...checklistForm,priority:e.target.value})}>{['High','Medium','Low'].map(x=><option key={x}>{x}</option>)}</select><input className={inputClass} placeholder="Assignee Firebase UID" value={checklistForm.assignedToUid} onChange={e=>setChecklistForm({...checklistForm,assignedToUid:e.target.value})}/><button className={buttonClass} disabled={busy||!checklistForm.task.trim()||!checklistForm.assignedToUid.trim()} onClick={createChecklist}>Assign task</button></div>)}
      </div>}
      {tab==='reports'&&panel('Operational reports','Aggregate-only counts across tenant modules. No personal or narrative data.',<><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{Object.entries((report?.counts??{}) as Row).map(([key,value])=><div key={key} className="rounded-lg bg-slate-100 p-3"><p className="text-xs text-slate-500">{key}</p><p className="text-xl font-bold">{String(value)}</p></div>)}</div><div className="mt-4 flex flex-wrap gap-2"><button className={buttonClass} disabled={busy||!canManage} onClick={()=>exportReport('csv')}>Export CSV</button><button className={buttonClass} disabled={busy||!canManage} onClick={()=>exportReport('xlsx')}>Export XLSX</button><button className={buttonClass} disabled={busy||!canManage} onClick={()=>exportReport('pdf')}>Export PDF</button><button className="rounded-lg border border-slate-300 px-3 py-2 text-xs" onClick={()=>void load('reports')}>Refresh report</button></div><p className="mt-2 text-[11px] text-slate-500">Report export permission is enforced by the server. Individual records are not exported.</p></>)}
      {tab==='audit'&&panel('Audit trail','Read-only, tenant-scoped metadata. Event details and invitation secrets are not exposed.',<><input className={inputClass} placeholder="Filter by action or actor UID" value={search} onChange={e=>setSearch(e.target.value)}/>{list(audit.filter(row=>JSON.stringify(row).toLowerCase().includes(search.toLowerCase())),['actorUid','targetUid','targetResourceId','occurredAt'])}</>)}
      {tab==='members'&&<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {panel('PMC membership directory','UID, role, status and timestamps only.',list(members,['uid','status','createdAt','updatedAt']))}
        {canManage&&panel('Invite verified account','The invitee must already have a verified Firebase account. Delivery is not automatic.',<div className="space-y-2"><input type="email" className={inputClass} placeholder="Verified Firebase account email" value={memberForm.email} onChange={e=>setMemberForm({...memberForm,email:e.target.value})}/><select className={inputClass} value={memberForm.role} onChange={e=>setMemberForm({...memberForm,role:e.target.value as Role})}>{(membership.role==='tenant_super_admin'?['tenant_admin','tenant_manager','tenant_employee','tenant_auditor']:['tenant_manager','tenant_employee','tenant_auditor']).map(role=><option key={role} value={role}>{role}</option>)}</select><button className={buttonClass} disabled={busy||!memberForm.email.trim()} onClick={inviteMember}>Create invitation</button></div>)}
      </div>}
      {tab==='notifications'&&panel('In-app activity feed','Derived from tenant audit events. This is not email, SMS, push delivery or a read-receipt service.',list(activity,['actorUid','targetResourceId','occurredAt']))}
      {tab==='configuration'&&panel('PMC configuration','Organisation-level settings. Only the PMC Super Admin can change these values.',<div className="max-w-xl space-y-3"><label className="block text-xs font-semibold">Timezone<select className={inputClass} value={settingsForm.timezone} onChange={e=>setSettingsForm({...settingsForm,timezone:e.target.value})}>{['Asia/Kolkata','UTC','Europe/London','Europe/Moscow','Asia/Dubai','Asia/Singapore'].map(x=><option key={x}>{x}</option>)}</select></label><label className="block text-xs font-semibold">Date format<select className={inputClass} value={settingsForm.dateFormat} onChange={e=>setSettingsForm({...settingsForm,dateFormat:e.target.value})}>{['DD-MM-YYYY','YYYY-MM-DD','MM-DD-YYYY'].map(x=><option key={x}>{x}</option>)}</select></label><label className="block text-xs font-semibold">Default incident priority<select className={inputClass} value={settingsForm.defaultIncidentPriority} onChange={e=>setSettingsForm({...settingsForm,defaultIncidentPriority:e.target.value})}>{['Routine','Moderate','High Attention'].map(x=><option key={x}>{x}</option>)}</select></label><label className="block text-xs font-semibold">Checklist review target (days)<input className={inputClass} type="number" min={1} max={90} value={settingsForm.checklistReviewDays} onChange={e=>setSettingsForm({...settingsForm,checklistReviewDays:Number(e.target.value)})}/></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={settingsForm.notificationsEnabled} onChange={e=>setSettingsForm({...settingsForm,notificationsEnabled:e.target.checked})}/>Enable in-app activity feed</label><button className={buttonClass} disabled={busy} onClick={saveSettings}>Save PMC settings</button><p className="text-[11px] text-slate-500">No outbound notification provider is configured.</p></div>)}
    </div>
  </main>;
};
