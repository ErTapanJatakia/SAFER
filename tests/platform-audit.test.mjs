import assert from 'node:assert/strict';
import test from 'node:test';
import {listPlatformAuditEvents} from '../src/server/platform-audit.mjs';

function fakeDb(docs) {
  const calls=[];
  return {
    calls,
    collection(path) {
      assert.equal(path,'platformAuditEvents');
      return {
        orderBy(field,direction) {
          calls.push(['orderBy',field,direction]);
          return {limit(count) {
            calls.push(['limit',count]);
            return {get:async()=>({docs})};
          }};
        },
      };
    },
  };
}

const valid = (id, data) => ({id,data:()=>data});
const date = new Date('2026-11-17T12:00:00.000Z');

test('returns bounded metadata for both Firebase actor UID and out-of-band actor reference records',async()=>{
  const db=fakeDb([
    valid('event-1',{action:'organisation.status_changed',actorUid:'owner-1',targetOrgId:'org_0123456789abcdef0123456789abcdef',targetUid:'user-2',occurredAt:date,details:{reason:'private',invitationId:'secret'}}),
    valid('event-2',{action:'platform_owner.provisioned',actorReference:'CHG-2026-001',targetUid:'owner-1',occurredAt:date,reason:'private'}),
  ]);
  const result=await listPlatformAuditEvents({database:db,limit:10});
  assert.equal(result.events.length,2);
  assert.equal(result.events[0].actorUid,'owner-1');
  assert.equal(result.events[1].actorReference,'CHG-2026-001');
  assert.equal(JSON.stringify(result).includes('private'),false);
  assert.equal(JSON.stringify(result).includes('invitationId'),false);
  assert.deepEqual(db.calls,[['orderBy','occurredAt','desc'],['limit',11]]);
});

test('skips malformed events and rejects malformed actor, action and timestamps',async()=>{
  const db=fakeDb([
    valid('bad-1',{action:'bad action',actorUid:'owner-1',occurredAt:date}),
    valid('bad-2',{action:'valid.action',actorUid:'',occurredAt:date}),
    valid('bad-3',{action:'valid.action',actorReference:'ok',occurredAt:'not-a-date'}),
    valid('good',{action:'valid.action',actorUid:'owner-1',occurredAt:date}),
  ]);
  const result=await listPlatformAuditEvents({database:db});
  assert.deepEqual(result.events.map(event=>event.eventId),['good']);
});

test('caps reads at 100 and reports whether another page may exist',async()=>{
  const docs=Array.from({length:101},(_,index)=>valid(`event-${index}`,{
    action:'valid.action',actorUid:'owner-1',occurredAt:date,
  }));
  const db=fakeDb(docs);
  const result=await listPlatformAuditEvents({database:db,limit:500});
  assert.equal(result.events.length,100);
  assert.equal(result.hasMore,true);
  assert.deepEqual(db.calls,[['orderBy','occurredAt','desc'],['limit',101]]);
});

test('rejects unavailable database access rather than returning an empty success',async()=>{
  await assert.rejects(listPlatformAuditEvents({database:null}),/platform_audit_unavailable/);
});
