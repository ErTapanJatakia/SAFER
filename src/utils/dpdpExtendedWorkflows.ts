/** DPDP-07–11 synthetic demonstration workflows. No statutory action is executed. */
export type WorkflowStatus = 'received'|'identity-check'|'in-progress'|'awaiting-information'|'completed'|'declined'|'closed';
export interface RequestEvent { id:string; requestId:string; from:WorkflowStatus|null; to:WorkflowStatus; at:string; note:string; }
export interface ConsentPreference { id:string; subjectRef:string; purposeRef:string; preference:'granted'|'withdrawn'|'paused'; updatedAt:string; history: Array<{id:string;preference:'granted'|'withdrawn'|'paused';at:string;note:string}>; }
export interface RetentionReviewTask { id:string; scheduleRef:string; category:string; reviewAt:string; ownerRole:string; state:'scheduled'|'due'|'overdue'|'reviewed'|'deferred'; evaluatedAt:string; note?:string; }
export interface BreachTimelineEvent { id:string; breachRef:string; kind:'discovered'|'recorded'|'contained'|'remediated'|'notification-assessed'|'closed'|'other'; at:string; note:string; }
export interface PrivacyEvidenceItem { id:string; title:string; evidenceType:'policy-reference'|'assessment-reference'|'test-reference'|'meeting-note'|'other'; reference:string; linkedRecordType:'request'|'consent'|'retention'|'breach'|'control'; linkedRecordId:string; ownerRole:string; createdAt:string; verification:'unverified-reference-only'; limitations:string; }
export interface DpdpExtendedWorkspace { schemaVersion:1; workspaceMode:'synthetic-demo'; requestEvents:RequestEvent[]; consentPreferences:ConsentPreference[]; retentionTasks:RetentionReviewTask[]; breachTimeline:BreachTimelineEvent[]; evidenceItems:PrivacyEvidenceItem[]; }
export const EMPTY_DpdpExtendedWorkspace:DpdpExtendedWorkspace={schemaVersion:1,workspaceMode:'synthetic-demo',requestEvents:[],consentPreferences:[],retentionTasks:[],breachTimeline:[],evidenceItems:[]};
const iso=(v:string)=>/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(v)&&Number.isFinite(Date.parse(v));
const text=(v:unknown,n=500):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
const id=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(v);
const REQUEST_TRANSITIONS:Record<WorkflowStatus,WorkflowStatus[]>={received:['identity-check','closed'],'identity-check':['in-progress','awaiting-information','declined','closed'],'in-progress':['awaiting-information','completed','declined','closed'],'awaiting-information':['identity-check','in-progress','closed'],completed:[],declined:[],closed:[]};
function exactKeys(value:unknown,required:string[],optional:string[]=[]):value is Record<string,unknown>{
 try{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null)return false;
  const keys=Reflect.ownKeys(value),allowed=new Set([...required,...optional]);
  if(keys.length<required.length||keys.some(k=>typeof k!=='string'||!allowed.has(k)))return false;
  if(!required.every(k=>keys.includes(k)))return false;
  return keys.every(k=>{const d=Object.getOwnPropertyDescriptor(value,k);return Boolean(d?.enumerable&&'value'in d);});
 }catch{return false;}
}
export function validateDpdpExtendedWorkspace(v:unknown):v is DpdpExtendedWorkspace {
 const top=['schemaVersion','workspaceMode','requestEvents','consentPreferences','retentionTasks','breachTimeline','evidenceItems'];
 if(!exactKeys(v,top))return false;
 const x=v as Record<string,unknown>;
 if(x.schemaVersion!==1||x.workspaceMode!=='synthetic-demo')return false;
 const arrays=top.slice(2).map(k=>x[k]);
 if(!arrays.every(a=>Array.isArray(a)&&a.length<=500))return false;
 const unique=(a:unknown[])=>{
  const seen=new Set<string>();
  return a.every(r=>{
   if(!r||typeof r!=='object'||Array.isArray(r)||!id((r as {id?:unknown}).id))return false;
   const key=(r as {id:string}).id;if(seen.has(key))return false;seen.add(key);return true;
  });
 };
 const [events,prefs,tasks,timeline,evidence]=arrays as unknown[][];
 if(![events,prefs,tasks,timeline,evidence].every(unique))return false;

 const requestGroups=new Map<string,RequestEvent[]>();
 for(const raw of events){
  if(!exactKeys(raw,['id','requestId','from','to','at','note']))return false;
  const a=raw as unknown as RequestEvent;
  if(!id(a.requestId)||!(a.from===null||Object.hasOwn(REQUEST_TRANSITIONS,a.from))||!Object.hasOwn(REQUEST_TRANSITIONS,a.to)||!iso(a.at)||!text(a.note,1000))return false;
  const group=requestGroups.get(a.requestId)??[];group.push(a);requestGroups.set(a.requestId,group);
 }
 for(const group of requestGroups.values()){
  group.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  let previous:RequestEvent|undefined;
  for(const event of group){
   const current=previous?.to??'received';
   if(event.from!==(previous?.to??null)||!REQUEST_TRANSITIONS[current].includes(event.to)
     ||(previous&&Date.parse(event.at)<=Date.parse(previous.at)))return false;
   previous=event;
  }
 }

 for(const raw of prefs){
  if(!exactKeys(raw,['id','subjectRef','purposeRef','preference','updatedAt','history']))return false;
  const p=raw as unknown as ConsentPreference;
  if(!text(p.subjectRef,120)||!text(p.purposeRef,120)||!['granted','withdrawn','paused'].includes(p.preference)||!iso(p.updatedAt)||!Array.isArray(p.history)||p.history.length<1||p.history.length>500)return false;
  const historyIds=new Set<string>();let previousAt=-Infinity;
  for(const h of p.history){
   if(!exactKeys(h,['id','preference','at','note'])||!id(h.id)||historyIds.has(h.id)||!['granted','withdrawn','paused'].includes(h.preference)||!iso(h.at)||!text(h.note,500)||Date.parse(h.at)<=previousAt)return false;
   historyIds.add(h.id);previousAt=Date.parse(h.at);
  }
  const last=p.history[p.history.length-1];
  if(last.preference!==p.preference||last.at!==p.updatedAt)return false;
 }

 for(const raw of tasks){
  if(!exactKeys(raw,['id','scheduleRef','category','reviewAt','ownerRole','state','evaluatedAt'],['note']))return false;
  const a=raw as unknown as RetentionReviewTask;
  if(!id(a.scheduleRef)||!text(a.category,160)||!iso(a.reviewAt)||!text(a.ownerRole,80)||!['scheduled','due','overdue','reviewed','deferred'].includes(a.state)||!iso(a.evaluatedAt)||(a.note!==undefined&&!text(a.note,1000)))return false;
 }
 const breachGroups=new Map<string,BreachTimelineEvent[]>();
 for(const raw of timeline){
  if(!exactKeys(raw,['id','breachRef','kind','at','note']))return false;
  const a=raw as unknown as BreachTimelineEvent;
  if(!id(a.breachRef)||!['discovered','recorded','contained','remediated','notification-assessed','closed','other'].includes(a.kind)||!iso(a.at)||!text(a.note,1000))return false;
  const group=breachGroups.get(a.breachRef)??[];group.push(a);breachGroups.set(a.breachRef,group);
 }
 for(const group of breachGroups.values()){
  group.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  for(let i=1;i<group.length;i++)if(Date.parse(group[i].at)<Date.parse(group[i-1].at))return false;
 }
 for(const raw of evidence){
  if(!exactKeys(raw,['id','title','evidenceType','reference','linkedRecordType','linkedRecordId','ownerRole','createdAt','verification','limitations']))return false;
  const a=raw as unknown as PrivacyEvidenceItem;
  if(!text(a.title,160)||!['policy-reference','assessment-reference','test-reference','meeting-note','other'].includes(a.evidenceType)||!text(a.reference,240)||!['request','consent','retention','breach','control'].includes(a.linkedRecordType)||!id(a.linkedRecordId)||!text(a.ownerRole,80)||!iso(a.createdAt)||a.verification!=='unverified-reference-only'||!text(a.limitations,1000))return false;
 }
 return true;
}
export function transitionRequest(events:RequestEvent[],requestId:string,next:WorkflowStatus,at:string,note:string):RequestEvent|null {
 const prior=events.filter(e=>e.requestId===requestId).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0];
 const current=prior?.to??'received';
 const allowed:Record<WorkflowStatus,WorkflowStatus[]>={received:['identity-check','closed'], 'identity-check':['in-progress','awaiting-information','declined','closed'], 'in-progress':['awaiting-information','completed','declined','closed'], 'awaiting-information':['identity-check','in-progress','closed'],completed:[],declined:[],closed:[]};
 if(!id(requestId)||!iso(at)||!text(note,1000)||!allowed[current].includes(next))return null;
 return {id:'request-event-'+crypto.randomUUID(),requestId,from:prior?.to??null,to:next,at,note};
}
export function updateConsentPreference(prior:ConsentPreference|null,input:{id:string;subjectRef:string;purposeRef:string;preference:ConsentPreference['preference'];at:string;note:string}):ConsentPreference|null {
 if(!id(input.id)||!text(input.subjectRef,120)||!text(input.purposeRef,120)||!iso(input.at)||!text(input.note,500))return null;
 if(prior&&(prior.subjectRef!==input.subjectRef||prior.purposeRef!==input.purposeRef||Date.parse(input.at)<Date.parse(prior.updatedAt)))return null;
 const entry={id:input.id,preference:input.preference,at:input.at,note:input.note};
 return prior?{...prior,preference:input.preference,updatedAt:input.at,history:[...prior.history,entry]}:{id:'preference-'+input.id,subjectRef:input.subjectRef,purposeRef:input.purposeRef,preference:input.preference,updatedAt:input.at,history:[entry]};
}
export function evaluateRetentionTask(task:RetentionReviewTask,now:string):RetentionReviewTask|null {
 if(!iso(now)||!iso(task.reviewAt)||!id(task.id))return null;
 if(task.state==='reviewed'||task.state==='deferred')return {...task,evaluatedAt:now};
 const state=Date.parse(now)>Date.parse(task.reviewAt)?'overdue':Date.parse(now)===Date.parse(task.reviewAt)?'due':'scheduled';
 return {...task,state,evaluatedAt:now};
}
export function appendBreachTimeline(events:BreachTimelineEvent[],item:BreachTimelineEvent):BreachTimelineEvent[]|null {
 if(!id(item.id)||!id(item.breachRef)||!iso(item.at)||!text(item.note,1000)||events.some(e=>e.id===item.id))return null;
 const prior=events.filter(e=>e.breachRef===item.breachRef).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))[0];
 if(prior&&Date.parse(item.at)<Date.parse(prior.at))return null;
 return [item,...events];
}
export function createPrivacyEvidenceItem(input:Omit<PrivacyEvidenceItem,'verification'|'limitations'>):PrivacyEvidenceItem|null {
 if(!id(input.id)||!text(input.title,160)||!text(input.reference,240)||!id(input.linkedRecordId)||!text(input.ownerRole,80)||!iso(input.createdAt))return null;
 return {...input,verification:'unverified-reference-only',limitations:'Reference metadata only; no file is stored, scanned, hashed, independently verified or made immutable.'};
}
export const DPDP_EXTENDED_STORAGE_KEY='safer_dpdp_07_11_demo_v1';
export function createDpdpExtendedRepository(storage:Pick<Storage,'getItem'|'setItem'>) {
 let expected:string|null|undefined;
 return {
  load():DpdpExtendedWorkspace {let raw:string|null;try{raw=storage.getItem(DPDP_EXTENDED_STORAGE_KEY);}catch(e){throw new Error('DPDP extended workspace storage unavailable.',{cause:e});} expected=raw;if(raw===null)return structuredClone(EMPTY_DpdpExtendedWorkspace);if(new TextEncoder().encode(raw).byteLength>1_000_000)throw new Error('DPDP extended workspace exceeds 1 MB.');let value:unknown;try{value=JSON.parse(raw);}catch(e){throw new Error('DPDP extended workspace is malformed.',{cause:e});}if(!validateDpdpExtendedWorkspace(value))throw new Error('DPDP extended workspace failed schema validation.');return structuredClone(value);},
  save(value:DpdpExtendedWorkspace):void {if(!validateDpdpExtendedWorkspace(value))throw new Error('Refusing invalid or non-synthetic DPDP extended data.');const raw=storage.getItem(DPDP_EXTENDED_STORAGE_KEY);if(expected!==undefined&&raw!==expected)throw new Error('DPDP extended workspace changed in another tab; reload before retrying.');const next=JSON.stringify(value);if(new TextEncoder().encode(next).byteLength>1_000_000)throw new Error('DPDP extended workspace exceeds 1 MB.');storage.setItem(DPDP_EXTENDED_STORAGE_KEY,next);if(storage.getItem(DPDP_EXTENDED_STORAGE_KEY)!==next)throw new Error('DPDP extended workspace write verification failed.');expected=next;}
 };
}
