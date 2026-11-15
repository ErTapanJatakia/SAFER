import test from 'node:test';
import assert from 'node:assert/strict';
import {createTenantPersonnel,listTenantPersonnel,updateTenantPersonnel} from '../src/server/tenant-personnel.mjs';

const orgId=`org_${'a'.repeat(32)}`;
function member(role='tenant_admin') {
 return {uid:'u1',orgId,role,status:'active',createdAt:new Date(),createdByUid:'seed',updatedAt:new Date(),updatedByUid:'seed',schemaVersion:1};
}
function db(role='tenant_admin') {
 const docs=new Map([[ `organisations/${orgId}/members/u1`,member(role) ],[ `organisations/${orgId}`,{orgId,status:'active'} ]]);
 const writes=[];
 return {writes,doc(path){return {path};},collection(path){return {orderBy(){return this;},limit(n){this.n=n;return this;},async get(){const rows=[...docs.entries()].filter(([p,v])=>p.startsWith(path+'/')&&v);return {docs:rows.slice(0,this.n).map(([p,v])=>({id:p.split('/').at(-1),data:()=>v}))};}};},
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
