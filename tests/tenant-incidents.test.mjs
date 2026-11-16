import test from 'node:test';
import assert from 'node:assert/strict';
import { createTenantIncident, listTenantIncidents, updateTenantIncident } from '../src/server/tenant-incidents.mjs';

const orgId = `org_${'a'.repeat(32)}`;
function membership(uid, role='tenant_employee') {
  return { uid, orgId, role, status:'active', createdAt:new Date(), createdByUid:'seed', updatedAt:new Date(), updatedByUid:'seed', schemaVersion:1 };
}
function fakeDb({ role='tenant_employee', incident=null }={}) {
  const writes=[];
  const docs = new Map([
    [`organisations/${orgId}/members/u1`, membership('u1',role)],
    [`organisations/${orgId}`, { orgId, status:'active' }],
    [`organisations/${orgId}/incidents/inc_${'b'.repeat(32)}`, incident],
  ]);
  const db = {
    writes,
    doc(path) { return { path }; },
    collection(path) {
      return { orderBy() { return this; }, limit() { return this; }, where(field,op,value) { this.filter=[field,op,value]; return this; },
        async get() { const rows=[...docs.entries()].filter(([p,v])=>p.startsWith(path+'/')&&v).filter(([,v])=>!this.filter||v[this.filter[0]]===this.filter[2]); return {docs:rows.map(([p,v])=>({id:p.split('/').at(-1),data:()=>v}))}; } };
    },
    async runTransaction(fn) {
      const tx={
        async get(ref) { const v=docs.get(ref.path); return {exists:!!v,data:()=>v}; },
        create(ref,data) { writes.push({kind:'create',path:ref.path,data}); docs.set(ref.path,data); },
        update(ref,data) { writes.push({kind:'update',path:ref.path,data}); docs.set(ref.path,{...docs.get(ref.path),...data}); },
      };
      return fn(tx);
    },
  };
  return db;
}
const stamp=()=>new Date();
test('employee can create an incident and it is audited', async()=>{
  const db=fakeDb();
  const result=await createTenantIncident({orgId,actorUid:'u1',input:{incidentType:'Equipment Malfunction',title:'Door sensor fault',summary:'Sensor reported intermittent failure.'},database:db,serverTimestamp:stamp});
  assert.match(result.incidentId,/^inc_[a-f0-9]{32}$/);
  assert.equal(db.writes.length,2);
  assert.equal(db.writes[1].data.action,'tenant.incident.created');
});
test('employee incident list is scoped to authenticated reporter UID',async()=>{
  const db=fakeDb();
  const result=await listTenantIncidents({orgId,actorUid:'u1',role:'tenant_employee',database:db});
  assert.deepEqual(result.incidents,[]);
});
test('employee cannot update incidents',async()=>{
  const db=fakeDb();
  await assert.rejects(()=>updateTenantIncident({orgId,actorUid:'u1',incidentId:`inc_${'b'.repeat(32)}`,patch:{status:'Documented & Filed'},database:db,serverTimestamp:stamp}),/role_permission_denied/);
});
test('invalid incident fields are rejected',async()=>{
  const db=fakeDb();
  await assert.rejects(()=>createTenantIncident({orgId,actorUid:'u1',input:{incidentType:'Unknown',title:'x',summary:'y'},database:db,serverTimestamp:stamp}),/invalid_incident_data/);
});

test('incident timestamps require valid timezone-qualified RFC3339 values',async()=>{
 const db=fakeDb();
 const base={incidentType:'Equipment Malfunction',title:'Door sensor fault',summary:'Sensor reported intermittent failure.'};
 for (const dateReported of [
  1730000000000,
  '2026-02-30T10:00:00Z',
  '2026-11-16T10:00:00',
  new Date(Date.now()+60*60*1000).toISOString(),
 ]) {
  await assert.rejects(()=>createTenantIncident({
   orgId,actorUid:'u1',input:{...base,dateReported},database:db,serverTimestamp:stamp,
  }),/invalid_incident_data/);
 }
});

test('incident creation rejects unknown fields and accessor properties without invoking getters',async()=>{
 const db=fakeDb();
 const base={incidentType:'Equipment Malfunction',title:'Door sensor fault',summary:'Sensor reported intermittent failure.'};
 await assert.rejects(()=>createTenantIncident({orgId,actorUid:'u1',input:{...base,healthData:'not permitted'},database:db,serverTimestamp:stamp}),/invalid_incident_data/);
 let evaluated=false;
 const input={...base};
 Object.defineProperty(input,'title',{enumerable:true,get(){evaluated=true;return 'unexpected';}});
 await assert.rejects(()=>createTenantIncident({orgId,actorUid:'u1',input,database:db,serverTimestamp:stamp}),/invalid_incident_data/);
 assert.equal(evaluated,false);
});
test('incident updates reject accessor properties without invoking getters',async()=>{
 const db=fakeDb({role:'tenant_admin'});
 const patch={};
 let evaluated=false;
 Object.defineProperty(patch,'status',{enumerable:true,get(){evaluated=true;return 'Documented & Filed';}});
 await assert.rejects(()=>updateTenantIncident({orgId,actorUid:'u1',incidentId:`inc_${'b'.repeat(32)}`,patch,database:db,serverTimestamp:stamp}),/invalid_incident_data/);
 assert.equal(evaluated,false);
});

test('incident list skips malformed and oversized stored records safely',async()=>{
 const db=fakeDb();
 const valid={
  incidentId:`inc_${'b'.repeat(32)}`,orgId,referenceNumber:'IR-0123456789',
  incidentType:'Equipment Malfunction',dateReported:new Date('2026-01-01T00:00:00Z'),
  title:'Door sensor fault',status:'Under Investigation / Human Review',priority:'Routine',
  summary:'Sensor reported intermittent failure.',reportedByUid:'u1',
  createdAt:new Date('2026-01-01T00:00:00Z'),createdByUid:'u1',
  updatedAt:new Date('2026-01-01T00:00:00Z'),updatedByUid:'u1',
 };
 const corrupt={...valid,title:'x'.repeat(5000)};
 const malformedTimestamp={...valid,dateReported:{toDate(){throw new Error('bad timestamp');}}};
 db.collection=()=>({orderBy(){return this;},where(){return this;},limit(n){this.limitValue=n;return this;},async get(){return {docs:[
  {id:valid.incidentId,data:()=>valid},
  {id:'inc_'+ 'c'.repeat(32),data:()=>corrupt},
  {id:'inc_'+ 'd'.repeat(32),data:()=>malformedTimestamp},
 ]};}});
 const result=await listTenantIncidents({orgId,actorUid:'u1',role:'tenant_employee',database:db,limit:100});
 assert.equal(result.incidents.length,1);
 assert.equal(result.incidents[0].title,'Door sensor fault');
 assert.equal(result.hasMore,false);
});
