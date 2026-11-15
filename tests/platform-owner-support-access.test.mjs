import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPlatformSupportSession,
  revokePlatformSupportSession,
  authorizePlatformSupportAccess,
} from '../src/server/platform-owner-support-access.mjs';

const principal = {uid:'owner-1',role:'platform_owner',status:'active'};
const orgId = 'org_0123456789abcdef0123456789abcdef';
const input = {
  actorUid:'owner-1',principal,orgId,
  purpose:'Client-requested investigation of a reported access control issue.',
  changeReference:'CHG-2026-042',
  actions:['platform:tenant-data:read'],
  durationMinutes:15,now:Date.parse('2026-11-16T10:00:00Z'),
  serverTimestamp:()=>new Date('2026-11-16T10:00:00Z'),
};

function fakeDb({organisation={orgId,status:'active'}}={}) {
  const documents=new Map([[ `organisations/${orgId}`, organisation ]]);
  const events=[];
  const db={
    doc(path){return {path};},
    collection(path){assert.equal(path,'platformAuditEvents');return {doc:()=>({path:`platformAuditEvents/audit-${events.length+1}`})};},
    async runTransaction(callback){
      const writes=[];
      const tx={
        async get(ref){const value=documents.get(ref.path);return {exists:value!==undefined,data:()=>value};},
        create(ref,value){writes.push({type:'create',ref,value});},
        update(ref,value){writes.push({type:'update',ref,value});},
      };
      await callback(tx);
      for(const write of writes){
        if(write.type==='create'){
          if(documents.has(write.ref.path)) throw new Error('already_exists');
          documents.set(write.ref.path,write.value);
          if(write.ref.path.startsWith('platformAuditEvents/')) events.push(write.value);
        } else {
          const current=documents.get(write.ref.path);
          if(!current) throw new Error('not_found');
          documents.set(write.ref.path,{...current,...write.value});
        }
      }
    },
  };
  return {db,documents,events};
}

test('creates one-owner one-tenant purpose-bound session with expiry and audit event',async()=>{
  const {db,documents,events}=fakeDb();
  const session=await createPlatformSupportSession({...input,database:db});
  const stored=documents.get(`platformSupportSessions/${session.sessionId}`);
  assert.equal(stored.actorUid,'owner-1');
  assert.equal(stored.orgId,orgId);
  assert.equal(stored.status,'active');
  assert.equal(stored.expiresAt.getTime(),input.now+15*60*1000);
  assert.equal(events[0].action,'platform.support_access.activated');
  assert.equal(session.actions[0],'platform:tenant-data:read');
});

test('refuses broad, invalid, duplicate or excessive support grants',async()=>{
  const {db}=fakeDb();
  await assert.rejects(createPlatformSupportSession({...input,database:db,actions:['platform:security:manage']}),/invalid_support_actions/);
  await assert.rejects(createPlatformSupportSession({...input,database:db,actions:['platform:tenant-data:write']}),/invalid_support_actions/);
  await assert.rejects(createPlatformSupportSession({...input,database:db,actions:['platform:tenant-data:read','platform:tenant-data:read']}),/invalid_support_actions/);
  await assert.rejects(createPlatformSupportSession({...input,database:db,durationMinutes:31}),/invalid_support_duration/);
  await assert.rejects(createPlatformSupportSession({...input,database:db,purpose:'help'}),/support purpose/);
  await assert.rejects(createPlatformSupportSession({...input,database:db,principal:{...principal,status:'revoked'}}),/active_platform_owner_required/);
});

test('does not create a session for a missing or inactive organisation',async()=>{
  const {db}=fakeDb({organisation:{orgId,status:'suspended'}});
  await assert.rejects(createPlatformSupportSession({...input,database:db}),/active_support_organisation_required/);
});

test('authorizes only the same owner, target organisation, action and unexpired session',async()=>{
  const {db,events}=fakeDb();
  const session=await createPlatformSupportSession({...input,database:db});
  const allowed=await authorizePlatformSupportAccess({
    actorUid:'owner-1',principal,sessionId:session.sessionId,orgId,action:'platform:tenant-data:read',
    database:db,serverTimestamp:input.serverTimestamp,now:input.now+1000,
  });
  assert.equal(allowed.orgId,orgId);
  assert.equal(events.at(-1).action,'platform.support_access.action_authorized');
  await assert.rejects(authorizePlatformSupportAccess({
    actorUid:'owner-2',principal:{...principal,uid:'owner-2'},sessionId:session.sessionId,orgId,
    action:'platform:tenant-data:read',database:db,serverTimestamp:input.serverTimestamp,now:input.now+1000,
  }),/support_session_owner_mismatch/);
  await assert.rejects(authorizePlatformSupportAccess({
    actorUid:'owner-1',principal,sessionId:session.sessionId,orgId,
    action:'platform:tenant-data:export',database:db,serverTimestamp:input.serverTimestamp,now:input.now+1000,
  }),/support_access_scope_mismatch/);
  await assert.rejects(authorizePlatformSupportAccess({
    actorUid:'owner-1',principal,sessionId:session.sessionId,orgId,
    action:'platform:tenant-data:read',database:db,serverTimestamp:input.serverTimestamp,now:input.now+16*60*1000,
  }),/support_session_expired_or_revoked/);
});

test('revokes active sessions and blocks subsequent use',async()=>{
  const {db,documents,events}=fakeDb();
  const session=await createPlatformSupportSession({...input,database:db});
  await revokePlatformSupportSession({
    actorUid:'owner-1',principal,sessionId:session.sessionId,
    reason:'Support task completed and access is no longer required.',
    changeReference:'CHG-2026-043',database:db,serverTimestamp:input.serverTimestamp,
  });
  assert.equal(documents.get(`platformSupportSessions/${session.sessionId}`).status,'revoked');
  assert.equal(events.at(-1).action,'platform.support_access.revoked');
  await assert.rejects(authorizePlatformSupportAccess({
    actorUid:'owner-1',principal,sessionId:session.sessionId,orgId,
    action:'platform:tenant-data:read',database:db,serverTimestamp:input.serverTimestamp,now:input.now+1000,
  }),/support_session_expired_or_revoked/);
});


test('rejects malformed expiry metadata rather than treating it as an unlimited session',async()=>{
  const {db,documents}=fakeDb();
  const session=await createPlatformSupportSession({...input,database:db});
  documents.get(`platformSupportSessions/${session.sessionId}`).expiresAt='not-a-timestamp';
  await assert.rejects(authorizePlatformSupportAccess({
    actorUid:'owner-1',principal,sessionId:session.sessionId,orgId,
    action:'platform:tenant-data:read',database:db,
    serverTimestamp:input.serverTimestamp,now:input.now+1000,
  }),/support_session_expired_or_revoked/);
});
