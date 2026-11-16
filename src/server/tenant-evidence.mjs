import { randomBytes } from 'node:crypto';
import { authorizeTenantAction } from './tenant-rbac.mjs';

const ORG_ID=/^org_[a-f0-9]{32}$/;
const UID=/^[A-Za-z0-9_-]{1,128}$/;
const INCIDENT=/^inc_[a-f0-9]{32}$/;
const MIME_TYPES=new Set(['application/pdf','image/jpeg','image/png','text/plain']);
const INPUT_FIELDS=new Set(['orgId','incidentId','title','fileName','mediaType','byteSize','sha256Claimed']);
function safeInput(value) {
 if(!value||typeof value!=='object'||Array.isArray(value)
  ||(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)
  ||Object.getOwnPropertySymbols(value).length>0) return false;
 const descriptors=Object.getOwnPropertyDescriptors(value);
 return Object.keys(descriptors).every(key=>INPUT_FIELDS.has(key)&&Object.hasOwn(descriptors[key],'value'));
}
const FIELDS=['evidenceId','orgId','incidentId','title','fileName','mediaType','byteSize','sha256Claimed','verificationState','createdAt','createdByUid'].sort();
export class TenantEvidenceError extends Error {
 constructor(code){super(code);this.name='TenantEvidenceError';this.code=code;}
}
const fail=code=>{throw new TenantEvidenceError(code);};
function safeTimestamp(value){try{const date=value instanceof Date?value:value?.toDate?.();return date instanceof Date&&Number.isFinite(date.getTime())?date.toISOString():null;}catch{return null;}}
function valid(data,id,orgId){
 if(!data||typeof data!=='object'||Array.isArray(data))return false;
 const keys=Object.keys(data).sort();
 return keys.length===FIELDS.length&&keys.every((k,i)=>k===FIELDS[i])
  &&data.evidenceId===id&&data.orgId===orgId&&INCIDENT.test(data.incidentId??'')
  &&typeof data.title==='string'&&data.title.trim().length>0&&data.title.length<=160
  &&typeof data.fileName==='string'&&data.fileName.trim().length>0&&data.fileName.length<=180&&!/[\\/]/.test(data.fileName)
  &&MIME_TYPES.has(data.mediaType)&&Number.isInteger(data.byteSize)&&data.byteSize>0&&data.byteSize<=20*1024*1024
  &&(data.sha256Claimed===null||/^[a-f0-9]{64}$/i.test(data.sha256Claimed??''))
  &&data.verificationState==='metadata_registered_unverified'
  &&safeTimestamp(data.createdAt)!==null&&UID.test(data.createdByUid??'');
}
async function authorize(tx,db,uid,orgId,action){
 const [m,o]=await Promise.all([
  tx.get(db.doc(`organisations/${orgId}/members/${uid}`)),
  tx.get(db.doc(`organisations/${orgId}`)),
 ]);
 if(!m.exists||!o.exists)fail('tenant_membership_required');
 const decision=authorizeTenantAction({actorUid:uid,membership:m.data(),organisation:o.data(),requestedOrgId:orgId,action});
 if(!decision.allowed)fail(decision.reason);
}
export async function listTenantEvidence({orgId,database,limit=100}){
 if(!ORG_ID.test(orgId??''))fail('invalid_request');
 const cap=Math.min(Math.max(Number(limit)||100,1),100);
 const snap=await database.collection(`organisations/${orgId}/evidence`).orderBy('createdAt','desc').limit(cap+1).get();
 const hasMore=snap.docs.length>cap;
 const records=snap.docs.slice(0,cap).flatMap(doc=>{
  const d=doc.data();
  return valid(d,doc.id,orgId)?[{
   evidenceId:d.evidenceId,incidentId:d.incidentId,title:d.title,fileName:d.fileName,
   mediaType:d.mediaType,byteSize:d.byteSize,sha256Claimed:d.sha256Claimed,
   verificationState:d.verificationState,
   createdAt:safeTimestamp(d.createdAt),createdByUid:d.createdByUid,
  }]:[];
 });
 return {orgId,records,hasMore};
}
/** Register metadata only. This endpoint does not upload, store, scan, or verify a file. */
export async function registerTenantEvidence({orgId,actorUid,input,database,serverTimestamp}){
 if(!ORG_ID.test(orgId??'')||!UID.test(actorUid??'')||!database?.runTransaction||typeof serverTimestamp!=='function')fail('invalid_request');
 if(!safeInput(input)||(input.orgId!==undefined&&input.orgId!==orgId))fail('invalid_evidence_data');
 const incidentId=input?.incidentId;
 if(!INCIDENT.test(incidentId??''))fail('invalid_evidence_data');
 const title=typeof input?.title==='string'?input.title.trim():'';
 const fileName=typeof input?.fileName==='string'?input.fileName.trim():'';
 if(!title||title.length>160||!fileName||fileName.length>180||/[\\/]/.test(fileName))fail('invalid_evidence_data');
 if(!MIME_TYPES.has(input?.mediaType)||!Number.isInteger(input?.byteSize)||input.byteSize<1||input.byteSize>20*1024*1024)fail('invalid_evidence_data');
 const sha256Claimed=input?.sha256Claimed??null;
 if(sha256Claimed!==null&&(typeof sha256Claimed!=='string'||!/^[a-f0-9]{64}$/i.test(sha256Claimed)))fail('invalid_evidence_data');
 const evidenceId=`ev_${randomBytes(16).toString('hex')}`;
 const ref=database.doc(`organisations/${orgId}/evidence/${evidenceId}`);
 const incidentRef=database.doc(`organisations/${orgId}/incidents/${incidentId}`);
 const audit=database.doc(`organisations/${orgId}/auditEvents/${randomBytes(16).toString('hex')}`);
 const timestamp=serverTimestamp();
 await database.runTransaction(async tx=>{
  await authorize(tx,database,actorUid,orgId,'evidence:register');
  const incident=await tx.get(incidentRef);
  if(!incident.exists||incident.data().orgId!==orgId||incident.data().incidentId!==incidentId)fail('incident_not_found');
  const record={evidenceId,orgId,incidentId,title,fileName,mediaType:input.mediaType,byteSize:input.byteSize,sha256Claimed,verificationState:'metadata_registered_unverified',createdAt:timestamp,createdByUid:actorUid};
  tx.create(ref,record);
  tx.create(audit,{action:'tenant.evidence.metadata_registered',actorUid,orgId,targetOrgId:orgId,targetResourceId:evidenceId,occurredAt:timestamp,details:{incidentId,verificationState:record.verificationState}});
 });
 return {evidenceId,incidentId,verificationState:'metadata_registered_unverified'};
}
