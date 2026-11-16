import test from 'node:test';
import assert from 'node:assert/strict';
import {createTenantPersonnel,listTenantPersonnel,updateTenantPersonnel} from '../src/server/tenant-personnel.mjs';

const orgId=`org_${'a'.repeat(32)}`;
function member(role='tenant_admin') {
 return {uid:'u1',orgId,role,status:'active',createdAt:new Date(),createdByUid:'seed',updatedAt:new Date(),updatedByUid:'seed',schemaVersion:1};
}
function db(role='tenant_admin') {
 const docs=new Map([[ `organisations/${orgId}/members/u1`,member(role) ],[ `organisations/${orgId}/members/u2`,{...member('tenant_employee'),uid:'u2'} ],[ `organisations/${orgId}`,{orgId,status:'active'} ]]);
 const writes=[];
 return {writes,records:docs,doc(path){return {path};},collection(path){return {orderBy(){return this;},where(field,operator,value){this.filter={field,operator,value};return this;},limit(n){this.n=n;return this;},async get(){let rows=[...docs.entries()].filter(([p,v])=>p.startsWith(path+'/')&&v);if(this.filter)rows=rows.filter(([,v])=>v[this.filter.field]===this.filter.value);return {docs:rows.slice(0,this.n).map(([p,v])=>({id:p.split('/').at(-1),data:()=>v}))};}};},
 async runTransaction(fn){const tx={async get(ref){const v=docs.get(ref.path);return {exists:!!v,data:()=>v};},create(ref,data){writes.push({kind:'create',path:ref.path,data});docs.set(ref.path,data);},update(ref,data){writes.push({kind:'update',path:ref.path,data});docs.set(ref.path,{...docs.get(ref.path),...data});}};return fn(tx);}};
}
const stamp=()=>new Date();
const validInput={employeeRef:'PMC-001',displayLabel:'Officer 001',operationalRoles:['Site Officer'],specialisations:['Access Control'],assignmentSector:'Sector Alpha (Metropolitan)',readinessStatus:'DOCS_CURRENT_AWAITING_REVIEW',requiresHumanReview:false};
test('Admin creates minimized operational personnel record and audit atomically',async()=>{
 const database=db();
 const result=await createTenantPersonnel({orgId,actorUid:'u1',input:validInput,database,serverTimestamp:stamp});
 assert.match(result.recordId,/^per_[a-f0-9]{32}$/);
 assert.equal(database.writes.length,2);
 assert.equal(database.writes[1].data.action,'tenant.personnel.created');
 assert.equal('healthParticulars' in database.writes[0].data,false);
});
test('Manager can read directory but cannot create records',async()=>{
 const database=db('tenant_manager');
 const listed=await listTenantPersonnel({orgId,database});
 assert.deepEqual(listed.records,[]);
 await assert.rejects(()=>createTenantPersonnel({orgId,actorUid:'u1',input:validInput,database,serverTimestamp:stamp}),/role_permission_denied/);
});
test('Unsupported personal data fields are rejected',async()=>{
 const database=db();
 await assert.rejects(()=>createTenantPersonnel({orgId,actorUid:'u1',input:{...validInput,healthParticulars:'sensitive'},database,serverTimestamp:stamp}),/invalid_personnel_data/);
});
test('Invalid readiness status is rejected',async()=>{
 const database=db();
 await assert.rejects(()=>createTenantPersonnel({orgId,actorUid:'u1',input:{...validInput,readinessStatus:'APPROVED'},database,serverTimestamp:stamp}),/invalid_personnel_data/);
});


test('Super Admin may link a personnel record only to an active employee membership',async()=>{
 const database=db();
 const result=await createTenantPersonnel({orgId,actorUid:'u1',input:{...validInput,employeeUid:'u2'},database,serverTimestamp:stamp});
 const stored=[...database.records.entries()].find(([path])=>path.endsWith(`/personnel/${result.recordId}'))?.[1];
 assert.equal(stored.employeeUid,'u2');
 const invalid=db();
 await assert.rejects(()=>createTenantPersonnel({orgId,actorUid:'u1',input:{...validInput,employeeUid:'unknown-user'},database:invalid,serverTimestamp:stamp}),/active_employee_assignee_required/);
});

test('Employee personnel directory is constrained to the authenticated employee UID',async()=>{
 const database=db('tenant_employee');
 const base={orgId,employeeRef:'PMC-001',displayLabel:'Officer',operationalRoles:[],specialisations:[],assignmentSector:'Sector Alpha (Metropolitan)',readinessStatus:'DOCS_CURRENT_AWAITING_REVIEW',requiresHumanReview:false,createdAt:stamp(),createdByUid:'u1',updatedAt:stamp(),updatedByUid:'u1'};
 database.records.set(`organisations/${orgId}/personnel/own-record`,{...base,recordId:'own-record',employeeUid:'u1'});
 database.records.set(`organisations/${orgId}/personnel/other-record`,{...base,recordId:'other-record',employeeUid:'u2'});
 const result=await listTenantPersonnel({orgId,database,actorUid:'u1',role:'tenant_employee'});
 assert.deepEqual(result.records.map(record=>record.recordId),['own-record']);
});
