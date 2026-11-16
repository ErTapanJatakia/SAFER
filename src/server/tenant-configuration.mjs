import {randomBytes} from 'node:crypto';
import {authorizeTenantAction} from './tenant-rbac.mjs';

const ORG=/^org_[a-f0-9]{32}$/;
const UID=/^[A-Za-z0-9_-]{1,128}$/;
const TIMEZONES=new Set(['Asia/Kolkata','UTC','Europe/London','Europe/Moscow','Asia/Dubai','Asia/Singapore']);
const FORMATS=new Set(['DD-MM-YYYY','YYYY-MM-DD','MM-DD-YYYY']);
const PRIORITIES=new Set(['Routine','Moderate','High Attention']);
const DEFAULT_SETTINGS=Object.freeze({timezone:'Asia/Kolkata',dateFormat:'DD-MM-YYYY',defaultIncidentPriority:'Routine',checklistReviewDays:7,notificationsEnabled:true});
export class TenantConfigurationError extends Error{constructor(code){super(code);this.name='TenantConfigurationError';this.code=code;}}
const fail=code=>{throw new TenantConfigurationError(code);};
function validSettings(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const keys=Object.keys(value).sort();
 const expected=Object.keys(DEFAULT_SETTINGS).sort();
 return keys.length===expected.length&&keys.every((key,index)=>key===expected[index])
  &&TIMEZONES.has(value.timezone)&&FORMATS.has(value.dateFormat)&&PRIORITIES.has(value.defaultIncidentPriority)
  &&Number.isInteger(value.checklistReviewDays)&&value.checklistReviewDays>=1&&value.checklistReviewDays<=90
  &&typeof value.notificationsEnabled==='boolean';
}
async function readAuthority(tx,database,uid,orgId,action){
 const [member,organisation]=await Promise.all([
  tx.get(database.doc(`organisations/${orgId}/members/${uid}`)),
  tx.get(database.doc(`organisations/${orgId}`)),
 ]);
 if(!member.exists||!organisation.exists)fail('tenant_membership_required');
 const decision=authorizeTenantAction({actorUid:uid,membership:member.data(),organisation:organisation.data(),requestedOrgId:orgId,action});
 if(!decision.allowed)fail(decision.reason);
 return organisation.data();
}
export async function getTenantConfiguration({orgId,actorUid,database}){
 if(!ORG.test(orgId??'')||!UID.test(actorUid??''))fail('invalid_request');
 return database.runTransaction(async tx=>{
  const organisation=await readAuthority(tx,database,actorUid,orgId,'organisation:read');
  const settings=validSettings(organisation.settings)?organisation.settings:DEFAULT_SETTINGS;
  return {orgId,displayName:typeof organisation.displayName==='string'?organisation.displayName:'',status:organisation.status,settings};
 });
}
export async function updateTenantConfiguration({orgId,actorUid,settings,database,serverTimestamp}){
 if(!ORG.test(orgId??'')||!UID.test(actorUid??'')||!database?.runTransaction||typeof serverTimestamp!=='function'||!validSettings(settings))fail('invalid_configuration');
 const orgRef=database.doc(`organisations/${orgId}`);
 const auditRef=database.doc(`organisations/${orgId}/auditEvents/${randomBytes(16).toString('hex')}`);
 const timestamp=serverTimestamp();
 await database.runTransaction(async tx=>{
  await readAuthority(tx,database,actorUid,orgId,'organisation:update');
  tx.update(orgRef,{settings,updatedAt:timestamp});
  tx.create(auditRef,{action:'tenant.organisation.settings_updated',actorUid,orgId,targetOrgId:orgId,occurredAt:timestamp,details:{changedFields:Object.keys(settings).sort()}});
 });
 return {orgId,settings};
}
