import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createTenantChecklist,listTenantChecklists,updateTenantChecklist} from '../src/server/tenant-checklists.mjs';
const orgId=`org_${'a'.repeat(32)}`;
function db(role='tenant_manager'){const reads=[];const docs=new Map([[ `organisations/${orgId}/members/u1`,{uid:'u1',orgId,role,status:'active',createdAt:new Date(),createdByUid:'seed',updatedAt:new Date(),updatedByUid:'seed',schemaVersion:1} ],[ `organisations/${orgId}/members/u2`,{uid:'u2',orgId,role:'tenant_employee',status:'active',createdAt:new Date(),createdByUid:'seed',updatedAt:new Date(),updatedByUid:'seed',schemaVersion:1} ],[ `organisations/${orgId}`,{orgId,status:'active'} ]]);const writes=[];return {writes,reads,seed(path,value){docs.set(path,value);},doc(path){return {path};},collection(path){return {orderBy(){return this;},where(field,op,value){this.filter=[field,value];return this;},limit(n){this.n=n;return this;},async get(){return {docs:[...docs.entries()].filter(([p,v])=>p.startsWith(path+'/')&&(!this.filter||v[this.filter[0]]===this.filter[1])).slice(0,this.n).map(([p,v])=>({id:p.split('/').at(-1),data:()=>v}))};}};},async runTransaction(fn){const tx={async get(ref){reads.push(ref.path);const v=docs.get(ref.path);return {exists:!!v,data:()=>v};},create(ref,data){writes.push({kind:'create',path:ref.path,data});docs.set(ref.path,data);},update(ref,data){writes.push({kind:'update',path:ref.path,data});docs.set(ref.path,{...docs.get(ref.path),...data});}};return fn(tx);}};}
const input={assignedToUid:'u2',category:'Required documentation and approvals',task:'Verify site induction',description:'Confirm signed induction record.',priority:'High',requiresHumanReview:true};
test('Manager assigns checklist to active employee with audit',async()=>{const database=db();const result=await createTenantChecklist({orgId,actorUid:'u1',input,database,serverTimestamp:()=>new Date()});assert.equal(result.assignedToUid,'u2');assert.equal(database.writes.length,2);});
test('Employee list is scoped to own assigned records',async()=>{const database=db();const result=await listTenantChecklists({orgId,actorUid:'u2',role:'tenant_employee',database});assert.deepEqual(result.records,[]);});
test('Employee cannot update another employee checklist and cannot confirm its existence',async()=>{const database=db('tenant_employee');const checklistId=`chk_${'b'.repeat(32)}`;database.seed(`organisations/${orgId}/checklists/${checklistId}`,{checklistId,orgId,category:'Required documentation and approvals',task:'Synthetic assigned task',description:'Synthetic description',status:'Incomplete',priority:'High',requiresHumanReview:true,complianceNotes:'',assignedToUid:'u1',assignedByUid:'u1',createdAt:new Date(),createdByUid:'u1',updatedAt:new Date(),updatedByUid:'u1'});await assert.rejects(()=>updateTenantChecklist({orgId,actorUid:'u2',checklistId,patch:{status:'Complete'},database,serverTimestamp:()=>new Date()}),/checklist_not_found/);});
test('Invalid checklist assignment and status rejected',async()=>{await assert.rejects(()=>createTenantChecklist({orgId,actorUid:'u1',input:{...input,assignedToUid:'../x'},database:db(),serverTimestamp:()=>new Date()}),/invalid_checklist_data/);});

test('Checklist creation rejects unknown and cross-tenant input fields',async()=>{
 const database=db();
 await assert.rejects(()=>createTenantChecklist({orgId,actorUid:'u1',input:{...input,orgId:`org_${'b'.repeat(32)}`},database,serverTimestamp:()=>new Date()}),/invalid_checklist_data/);
 await assert.rejects(()=>createTenantChecklist({orgId,actorUid:'u1',input:{...input,healthData:'sensitive'},database,serverTimestamp:()=>new Date()}),/invalid_checklist_data/);
});
test('Checklist update rejects accessor-backed patch values without evaluating getters',async()=>{
 const patch={status:'Complete'};
 Object.defineProperty(patch,'complianceNotes',{enumerable:true,get(){throw new Error('getter must not execute');}});
 await assert.rejects(()=>updateTenantChecklist({orgId,actorUid:'u1',checklistId:`chk_${'b'.repeat(32)}`,patch,database:db(),serverTimestamp:()=>new Date()}),/invalid_checklist_data/);
});

test('Checklist PATCH route authorizes role capability before service resource lookup',()=>{
 const route=readFileSync(new URL('../api/tenant/checklists.js',import.meta.url),'utf8');
 assert.match(route,/updateAction=identity\.role==='tenant_employee'\?'checklists:update:assigned':'checklists:update'/);
 assert.match(route,/action:updateAction,assignedToUid:identity\.uid/);
});

test('Read-only auditor is authorized before checklist target lookup',async()=>{
 const database=db('tenant_auditor');
 const checklistId=`chk_${'c'.repeat(32)}`;
 database.seed(`organisations/${orgId}/checklists/${checklistId}`,{
  checklistId,orgId,category:'Required documentation and approvals',task:'Synthetic task',
  description:'Synthetic description',status:'Incomplete',priority:'High',requiresHumanReview:true,
  complianceNotes:'',assignedToUid:'u2',assignedByUid:'u1',createdAt:new Date(),createdByUid:'u1',
  updatedAt:new Date(),updatedByUid:'u1',
 });
 await assert.rejects(()=>updateTenantChecklist({
  orgId,actorUid:'u1',checklistId,patch:{status:'Complete'},database,
  serverTimestamp:()=>new Date(),
 }),/role_permission_denied/);
 assert.equal(database.reads.includes(`organisations/${orgId}/checklists/${checklistId}`),false);
});
