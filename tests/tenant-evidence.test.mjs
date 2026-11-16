import test from 'node:test';
import assert from 'node:assert/strict';
import {registerTenantEvidence,listTenantEvidence} from '../src/server/tenant-evidence.mjs';
const orgId=`org_${'a'.repeat(32)}`;
function db(role='tenant_admin'){
 const docs=new Map([
 [`organisations/${orgId}/members/u1`,{uid:'u1',orgId,role,status:'active',createdAt:new Date(),createdByUid:'seed',updatedAt:new Date(),updatedByUid:'seed',schemaVersion:1}],
 [`organisations/${orgId}`,{orgId,status:'active'}],
 [`organisations/${orgId}/incidents/inc_${'b'.repeat(32)}`,{incidentId:`inc_${'b'.repeat(32)}`,orgId}],
 ]);
 const writes=[];
 return {writes,doc(path){return {path};},collection(path){return {orderBy(){return this;},limit(n){this.n=n;return this;},async get(){return {docs:[...docs.entries()].filter(([p])=>p.startsWith(path+'/')).slice(0,this.n).map(([p,v])=>({id:p.split('/').at(-1),data:()=>v}))};}};},
 async runTransaction(fn){const tx={async get(ref){const v=docs.get(ref.path);return {exists:!!v,data:()=>v};},create(ref,data){writes.push({path:ref.path,data});docs.set(ref.path,data);}};return fn(tx);}};
}
const input={incidentId:`inc_${'b'.repeat(32)}`,title:'Visitor register scan',fileName:'register.pdf',mediaType:'application/pdf',byteSize:1200};
test('Manager registers unverified evidence metadata and audit atomically',async()=>{
 const database=db('tenant_manager');
 const result=await registerTenantEvidence({orgId,actorUid:'u1',input,database,serverTimestamp:()=>new Date()});
 assert.equal(result.verificationState,'metadata_registered_unverified');
 assert.equal(database.writes.length,2);
 assert.equal(database.writes[0].data.verificationState,'metadata_registered_unverified');
});
test('Employee cannot register evidence',async()=>{
 await assert.rejects(()=>registerTenantEvidence({orgId,actorUid:'u1',input,database:db('tenant_employee'),serverTimestamp:()=>new Date()}),/role_permission_denied/);
});
test('Invalid type and oversized declared file are rejected',async()=>{
 await assert.rejects(()=>registerTenantEvidence({orgId,actorUid:'u1',input:{...input,mediaType:'application/octet-stream'},database:db(),serverTimestamp:()=>new Date()}),/invalid_evidence_data/);
 await assert.rejects(()=>registerTenantEvidence({orgId,actorUid:'u1',input:{...input,byteSize:21*1024*1024},database:db(),serverTimestamp:()=>new Date()}),/invalid_evidence_data/);
});

test('Evidence registration rejects unexpected and cross-tenant metadata fields',async()=>{
 const database=db();
 await assert.rejects(()=>registerTenantEvidence({orgId,actorUid:'u1',input:{...input,orgId:`org_${'b'.repeat(32)}`},database,serverTimestamp:()=>new Date()}),/invalid_evidence_data/);
 await assert.rejects(()=>registerTenantEvidence({orgId,actorUid:'u1',input:{...input,personalData:'sensitive'},database,serverTimestamp:()=>new Date()}),/invalid_evidence_data/);
});
test('Evidence registration rejects accessor-backed metadata without evaluating getters',async()=>{
 const accessorInput={...input};
 Object.defineProperty(accessorInput,'title',{enumerable:true,get(){throw new Error('getter must not execute');}});
 await assert.rejects(()=>registerTenantEvidence({orgId,actorUid:'u1',input:accessorInput,database:db(),serverTimestamp:()=>new Date()}),/invalid_evidence_data/);
});
