import { randomBytes } from 'node:crypto';
import { authorizeTenantAction } from './tenant-rbac.mjs';

const ORG_ID = /^org_[a-f0-9]{32}$/;
const UID = /^[A-Za-z0-9_-]{1,128}$/;
const SECTORS = [
  'Sector Alpha (Metropolitan)', 'Sector Bravo (Transit)',
  'Sector Charlie (Static Facility)', 'Sector Delta (Reserve)',
];
const READINESS = [
  'DOCS_CURRENT_AWAITING_REVIEW', 'REQUIRES_HUMAN_REVIEW',
  'FLAGGED_EXPIRED_CERTS', 'UNVERIFIED_CREDENTIALS', 'PENDING_INTAKE_DOCS',
];
const INPUT_FIELDS = new Set([
  'orgId', 'employeeRef', 'displayLabel', 'operationalRoles',
  'specialisations', 'assignmentSector', 'readinessStatus', 'requiresHumanReview',
]);
const FIELDS = [
  'recordId','orgId','employeeRef','displayLabel','operationalRoles','specialisations',
  'assignmentSector','readinessStatus','requiresHumanReview','createdAt','createdByUid',
  'updatedAt','updatedByUid',
].sort();

export class TenantPersonnelError extends Error {
  constructor(code) { super(code); this.name='TenantPersonnelError'; this.code=code; }
}
const fail=(code)=>{ throw new TenantPersonnelError(code); };
function assertOrg(orgId) { if(typeof orgId!=='string'||!ORG_ID.test(orgId)) fail('invalid_request'); }
function boundedString(value,max,required=false) {
  if(typeof value!=='string'||value.length>max||(required&&!value.trim())) fail('invalid_personnel_data');
  return value.trim();
}
function boundedList(value,maxItems,maxLength) {
  if(!Array.isArray(value)||value.length>maxItems||value.some(v=>typeof v!=='string'||!v.trim()||v.length>maxLength)) fail('invalid_personnel_data');
  return [...new Set(value.map(v=>v.trim()))];
}
function validRecord(value, recordId, orgId) {
  if(!value||typeof value!=='object'||Array.isArray(value)) return false;
  const keys=Object.keys(value).sort();
  return keys.length===FIELDS.length && keys.every((k,i)=>k===FIELDS[i])
    && value.recordId===recordId && value.orgId===orgId
    && typeof value.employeeRef==='string' && value.employeeRef.length>0 && value.employeeRef.length<=64
    && (value.displayLabel===undefined || (typeof value.displayLabel==='string'&&value.displayLabel.length<=80))
    && Array.isArray(value.operationalRoles) && value.operationalRoles.length<=10
    && value.operationalRoles.every(v=>typeof v==='string'&&v.length>0&&v.length<=60)
    && Array.isArray(value.specialisations) && value.specialisations.length<=10
    && value.specialisations.every(v=>typeof v==='string'&&v.length>0&&v.length<=80)
    && SECTORS.includes(value.assignmentSector) && READINESS.includes(value.readinessStatus)
    && typeof value.requiresHumanReview==='boolean'
    && value.createdAt!=null && value.updatedAt!=null
    && typeof value.createdByUid==='string' && typeof value.updatedByUid==='string';
}
async function authorize(tx,db,uid,orgId,action) {
  const memberRef=db.doc(`organisations/${orgId}/members/${uid}`);
  const orgRef=db.doc(`organisations/${orgId}`);
  const [member,org]=await Promise.all([tx.get(memberRef),tx.get(orgRef)]);
  if(!member.exists||!org.exists) fail('tenant_membership_required');
  const decision=authorizeTenantAction({
    actorUid:uid,membership:member.data(),organisation:org.data(),
    requestedOrgId:orgId,action,
  });
  if(!decision.allowed) fail(decision.reason);
}
function publicRecord(data) {
  return {
    recordId:data.recordId, employeeRef:data.employeeRef,
    ...(data.displayLabel?{displayLabel:data.displayLabel}:{}),
    operationalRoles:data.operationalRoles, specialisations:data.specialisations,
    assignmentSector:data.assignmentSector, readinessStatus:data.readinessStatus,
    requiresHumanReview:data.requiresHumanReview,
    createdAt:data.createdAt?.toDate?.()?.toISOString?.()??null,
    updatedAt:data.updatedAt?.toDate?.()?.toISOString?.()??null,
  };
}

/** A minimized directory; it deliberately contains no personal/contact/health data. */
export async function listTenantPersonnel({orgId,database,limit=100}) {
  assertOrg(orgId);
  const cap=Math.min(Math.max(Number(limit)||100,1),100);
  const snapshot=await database.collection(`organisations/${orgId}/personnel`)
    .orderBy('updatedAt','desc').limit(cap+1).get();
  const hasMore=snapshot.docs.length>cap;
  const records=snapshot.docs.slice(0,cap).flatMap(doc=>{
    const data=doc.data();
    return validRecord(data,doc.id,orgId)?[publicRecord(data)]:[];
  });
  return {orgId,records,hasMore};
}

/** Create a minimal operational directory record and audit it atomically. */
export async function createTenantPersonnel({orgId,actorUid,input,database,serverTimestamp}) {
  assertOrg(orgId);
  if(!UID.test(actorUid??'')||!database?.runTransaction||typeof serverTimestamp!=='function') fail('invalid_request');
  const descriptors = input && typeof input === 'object' ? Object.getOwnPropertyDescriptors(input) : null;
  if (!descriptors || Array.isArray(input)
    || (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null)
    || Object.getOwnPropertySymbols(input).length > 0
    || Object.keys(descriptors).some((key) => !INPUT_FIELDS.has(key) || !Object.hasOwn(descriptors[key], 'value'))
    || (input.orgId !== undefined && input.orgId !== orgId)) {
    fail('invalid_personnel_data');
  }
  const recordId=`per_${randomBytes(16).toString('hex')}`;
  const ref=database.doc(`organisations/${orgId}/personnel/${recordId}`);
  const audit=database.doc(`organisations/${orgId}/auditEvents/${randomBytes(16).toString('hex')}`);
  const timestamp=serverTimestamp();
  const record={
    recordId,orgId,
    employeeRef:boundedString(input?.employeeRef,64,true),
    displayLabel:input?.displayLabel?boundedString(input.displayLabel,80):'',
    operationalRoles:boundedList(input?.operationalRoles??[],10,60),
    specialisations:boundedList(input?.specialisations??[],10,80),
    assignmentSector:SECTORS.includes(input?.assignmentSector)?input.assignmentSector:fail('invalid_personnel_data'),
    readinessStatus:READINESS.includes(input?.readinessStatus)?input.readinessStatus:fail('invalid_personnel_data'),
    requiresHumanReview:typeof input?.requiresHumanReview==='boolean'?input.requiresHumanReview:fail('invalid_personnel_data'),
    createdAt:timestamp,createdByUid:actorUid,updatedAt:timestamp,updatedByUid:actorUid,
  };
  await database.runTransaction(async tx=>{
    await authorize(tx,database,actorUid,orgId,'personnel:create');
    tx.create(ref,record);
    tx.create(audit,{
      action:'tenant.personnel.created',actorUid,orgId,targetOrgId:orgId,
      targetResourceId:recordId,occurredAt:timestamp,
      details:{employeeRef:record.employeeRef},
    });
  });
  return {recordId,employeeRef:record.employeeRef};
}

/** Update allowlisted operational fields only; personal data and deletion are unsupported. */
export async function updateTenantPersonnel({orgId,actorUid,recordId,patch,database,serverTimestamp}) {
  assertOrg(orgId);
  if(!UID.test(actorUid??'')||!/^per_[a-f0-9]{32}$/.test(recordId??'')
    ||!database?.runTransaction||typeof serverTimestamp!=='function') fail('invalid_request');
  const allowed=['displayLabel','operationalRoles','specialisations','assignmentSector','readinessStatus','requiresHumanReview'];
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).length===0
    ||Object.keys(patch).some(k=>!allowed.includes(k))) fail('invalid_personnel_data');
  const clean={};
  for(const [key,value] of Object.entries(patch)) {
    if(key==='displayLabel') clean[key]=boundedString(value,80);
    else if(key==='operationalRoles') clean[key]=boundedList(value,10,60);
    else if(key==='specialisations') clean[key]=boundedList(value,10,80);
    else if(key==='assignmentSector') { if(!SECTORS.includes(value)) fail('invalid_personnel_data'); clean[key]=value; }
    else if(key==='readinessStatus') { if(!READINESS.includes(value)) fail('invalid_personnel_data'); clean[key]=value; }
    else if(key==='requiresHumanReview') { if(typeof value!=='boolean') fail('invalid_personnel_data'); clean[key]=value; }
  }
  const ref=database.doc(`organisations/${orgId}/personnel/${recordId}`);
  const audit=database.doc(`organisations/${orgId}/auditEvents/${randomBytes(16).toString('hex')}`);
  const timestamp=serverTimestamp();
  await database.runTransaction(async tx=>{
    await authorize(tx,database,actorUid,orgId,'personnel:update');
    const snapshot=await tx.get(ref);
    if(!snapshot.exists||!validRecord(snapshot.data(),recordId,orgId)) fail('personnel_record_not_found');
    tx.update(ref,{...clean,updatedAt:timestamp,updatedByUid:actorUid});
    tx.create(audit,{
      action:'tenant.personnel.updated',actorUid,orgId,targetOrgId:orgId,
      targetResourceId:recordId,occurredAt:timestamp,
      details:{changedFields:Object.keys(clean).sort()},
    });
  });
  return {recordId,updated:Object.keys(clean).sort()};
}
