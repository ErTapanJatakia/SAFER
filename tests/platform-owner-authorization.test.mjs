import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizePlatformOwner, extractBearerToken } from '../src/server/platform-owner-auth.mjs';
import { createOwnerStatusHandler } from '../src/server/owner-status-handler.mjs';

const ownerRecord = (uid = 'owner-uid') => ({uid,role:'platform_owner',status:'active'});
const ownerSettings = (uid = 'owner-uid') => ({platformOwnerUid:uid,ownerBootstrapStatus:'claimed'});
const ownerUser = (uid = 'owner-uid', overrides = {}) => ({uid,disabled:false,emailVerified:true,...overrides});
const dependencies = (overrides = {}) => ({
  authorizationHeader:'Bearer valid-token',
  verifyIdToken:async (token,checkRevoked) => {
    assert.equal(token,'valid-token');
    assert.equal(checkRevoked,true);
    return {uid:'owner-uid',role:'tenant_admin',platformRole:'platform_owner'};
  },
  readAuthUser:async (uid) => ownerUser(uid),
  readPlatformAdministrator:async (uid) => ownerRecord(uid),
  readPlatformSettings:async () => ownerSettings(),
  ...overrides,
});

test('Bearer parser rejects malformed credentials',()=>{
  assert.equal(extractBearerToken(undefined),null);
  assert.equal(extractBearerToken('Basic abc'),null);
  assert.equal(extractBearerToken('Bearer'),null);
  assert.equal(extractBearerToken('Bearer token with spaces'),null);
  assert.equal(extractBearerToken('Bearer eyJhbGciOiJSUzI1NiJ9.payload.signature'),'eyJhbGciOiJSUzI1NiJ9.payload.signature');
});

test('Owner identity requires verified Firebase identity, enabled user, active principal and claimed bootstrap pointer',async()=>{
  const result=await authorizePlatformOwner(dependencies());
  assert.deepEqual(result,{ok:true,uid:'owner-uid',role:'platform_owner',principal:ownerRecord()});
});

test('missing or malformed Authorization headers fail before token verification',async()=>{
  let calls=0;
  for(const authorizationHeader of [undefined,'Basic token','Bearer token extra']){
    const result=await authorizePlatformOwner(dependencies({
      authorizationHeader,
      verifyIdToken:async()=>{calls+=1;return {uid:'owner-uid'};},
    }));
    assert.equal(result.status,401);
  }
  assert.equal(calls,0);
});

test('invalid, expired and revoked Firebase ID tokens are denied',async()=>{
  for(const code of ['auth/invalid-id-token','auth/id-token-expired','auth/id-token-revoked']){
    const result=await authorizePlatformOwner(dependencies({
      verifyIdToken:async()=>{throw Object.assign(new Error('private detail'),{code});},
    }));
    assert.deepEqual(result,{ok:false,status:401,code:'invalid_identity_token'});
  }
});

test('identity and authority infrastructure errors fail closed without leaking details',async()=>{
  const identityError=await authorizePlatformOwner(dependencies({
    verifyIdToken:async()=>{throw new Error('private infrastructure detail');},
  }));
  assert.equal(identityError.status,503);
  const authorityError=await authorizePlatformOwner(dependencies({
    readPlatformSettings:async()=>{throw new Error('private database detail');},
  }));
  assert.deepEqual(authorityError,{ok:false,status:503,code:'platform_authority_unavailable'});
});

test('disabled or unverified Firebase accounts cannot use a valid Owner record',async()=>{
  for(const user of [ownerUser('owner-uid',{disabled:true}),ownerUser('owner-uid',{emailVerified:false}),null]){
    const result=await authorizePlatformOwner(dependencies({readAuthUser:async()=>user}));
    assert.deepEqual(result,{ok:false,status:403,code:'platform_identity_ineligible'});
  }
});

test('missing, mismatched, tenant-level, revoked and suspended principals are denied',async()=>{
  const records=[null,{uid:'another-uid',role:'platform_owner',status:'active'},
    {uid:'owner-uid',role:'owner',status:'active'},{uid:'owner-uid',role:'tenant_super_admin',status:'active'},
    {uid:'owner-uid',role:'platform_owner',status:'revoked'},{uid:'owner-uid',role:'platform_owner',status:'suspended'}];
  for(const principal of records){
    const result=await authorizePlatformOwner(dependencies({readPlatformAdministrator:async()=>principal}));
    assert.deepEqual(result,{ok:false,status:403,code:'platform_access_denied'});
  }
});

test('bootstrap pointer mismatch or revoked bootstrap state blocks Owner access',async()=>{
  for(const settings of [null,{platformOwnerUid:'another-owner',ownerBootstrapStatus:'claimed'},
    {platformOwnerUid:'owner-uid',ownerBootstrapStatus:'revoked'}]){
    const result=await authorizePlatformOwner(dependencies({readPlatformSettings:async()=>settings}));
    assert.deepEqual(result,{ok:false,status:403,code:'platform_access_denied'});
  }
});

test('client-supplied role claims cannot replace the server authority record',async()=>{
  const result=await authorizePlatformOwner(dependencies({
    verifyIdToken:async()=>({uid:'tenant-admin',platformRole:'platform_owner',role:'platform_owner'}),
    readAuthUser:async(uid)=>ownerUser(uid),
    readPlatformAdministrator:async()=>({uid:'tenant-admin',role:'tenant_admin',status:'active'}),
    readPlatformSettings:async()=>ownerSettings('tenant-admin'),
  }));
  assert.equal(result.status,403);
});

function mockResponse(){
  return {headers:{},statusCode:200,body:null,
    setHeader(name,value){this.headers[name]=value;return this;},
    status(code){this.statusCode=code;return this;},
    json(value){this.body=value;return this;}};
}

test('Owner status endpoint is GET-only, uncached and exposes no UID or tenant data',async()=>{
  const handler=createOwnerStatusHandler({
    verifyIdToken:async()=>({uid:'owner-uid'}),
    readAuthUser:async(uid)=>ownerUser(uid),
    readPlatformAdministrator:async(uid)=>ownerRecord(uid),
    readPlatformSettings:async()=>ownerSettings(),
  });
  const wrongMethod=mockResponse();
  await handler({method:'POST',headers:{authorization:'Bearer token'}},wrongMethod);
  assert.equal(wrongMethod.statusCode,405);
  assert.equal(wrongMethod.headers.Allow,'GET');
  const response=mockResponse();
  await handler({method:'GET',headers:{authorization:'Bearer token'}},response);
  assert.equal(response.statusCode,200);
  assert.deepEqual(response.body,{authenticated:true,platformRole:'platform_owner'});
  assert.equal(response.headers['Cache-Control'],'no-store, max-age=0');
  assert.equal(response.headers['X-Content-Type-Options'],'nosniff');
});
