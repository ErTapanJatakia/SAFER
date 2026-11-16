import test from 'node:test';
import assert from 'node:assert/strict';
import {getTenantConfiguration,updateTenantConfiguration} from '../src/server/tenant-configuration.mjs';
const orgId=`org_${'a'.repeat(32)}`;
function db(role='tenant_super_admin'){
 const docs=new Map([[ `organisations/${orgId}/members/u1`,{uid:'u1',orgId,role,status:'active',createdAt:new Date(),createdByUid:'seed',updatedAt:new Date(),updatedByUid:'seed',schemaVersion:1} ],[ `organisations/${orgId}`,{orgId,displayName:'Synthetic PMC',status:'active'} ]]);
 const writes=[];
 return {docs,writes,doc(path){return {path};},async runTransaction(fn){const tx={async get(ref){const value=docs.get(ref.path);return {exists:!!value,data:()=>value};},update(ref,value){writes.push({kind:'update',path:ref.path,value});docs.set(ref.path,{...docs.get(ref.path),...value});},create(ref,value){writes.push({kind:'create',path:ref.path,value});docs.set(ref.path,value);}};return fn(tx);}};
}
const settings={timezone:'Asia/Kolkata',dateFormat:'DD-MM-YYYY',defaultIncidentPriority:'Routine',checklistReviewDays:14,notificationsEnabled:true};
test('Super Admin reads safe defaults for an unconfigured PMC',async()=>{const database=db();const result=await getTenantConfiguration({orgId,actorUid:'u1',database});assert.equal(result.displayName,'Synthetic PMC');assert.equal(result.settings.timezone,'Asia/Kolkata');});
test('Super Admin updates allowlisted PMC settings with audit event',async()=>{const database=db();const result=await updateTenantConfiguration({orgId,actorUid:'u1',settings,database,serverTimestamp:()=>new Date()});assert.deepEqual(result.settings,settings);assert.equal(database.writes.length,2);assert.equal(database.writes[1].value.action,'tenant.organisation.settings_updated');});
test('Admin cannot change organisation-level PMC settings',async()=>{const database=db('tenant_admin');await assert.rejects(()=>updateTenantConfiguration({orgId,actorUid:'u1',settings,database,serverTimestamp:()=>new Date()}),/role_permission_denied/);});
test('Rejects unknown settings and unsafe values',async()=>{const database=db();await assert.rejects(()=>updateTenantConfiguration({orgId,actorUid:'u1',settings:{...settings,ownerUid:'attacker'},database,serverTimestamp:()=>new Date()}),/invalid_configuration/);});
