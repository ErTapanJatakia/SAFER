import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizePlatformOwner, extractBearerToken } from '../api/_lib/platform-owner-auth.mjs';
import { createOwnerStatusHandler } from '../api/_lib/owner-status-handler.mjs';

const ownerRecord = (uid = 'owner-uid') => ({ uid, role: 'platform_owner', status: 'active' });

test('Bearer parser rejects missing, malformed, and non-Bearer credentials', () => {
  assert.equal(extractBearerToken(undefined), null);
  assert.equal(extractBearerToken('Basic abc'), null);
  assert.equal(extractBearerToken('Bearer'), null);
  assert.equal(extractBearerToken('Bearer token with spaces'), null);
  assert.equal(extractBearerToken('Bearer eyJhbGciOiJSUzI1NiJ9.payload.signature'), 'eyJhbGciOiJSUzI1NiJ9.payload.signature');
});

test('valid verified identity and active authoritative platform record are required', async () => {
  const result = await authorizePlatformOwner({
    authorizationHeader: 'Bearer valid-token',
    verifyIdToken: async (token, checkRevoked) => {
      assert.equal(token, 'valid-token');
      assert.equal(checkRevoked, true);
      return { uid: 'owner-uid' };
    },
    readPlatformAdministrator: async (uid) => ownerRecord(uid),
  });
  assert.deepEqual(result, { ok: true, uid: 'owner-uid', role: 'platform_owner' });
});

test('missing and malformed Authorization headers fail before identity lookup', async () => {
  let verificationCalls = 0;
  for (const authorizationHeader of [undefined, 'Basic token', 'Bearer token extra']) {
    const result = await authorizePlatformOwner({
      authorizationHeader,
      verifyIdToken: async () => { verificationCalls += 1; return { uid: 'owner-uid' }; },
      readPlatformAdministrator: async () => ownerRecord(),
    });
    assert.equal(result.status, 401);
  }
  assert.equal(verificationCalls, 0);
});

test('invalid, expired, and revoked Firebase ID tokens are denied', async () => {
  for (const code of ['auth/invalid-id-token', 'auth/id-token-expired', 'auth/id-token-revoked']) {
    const result = await authorizePlatformOwner({
      authorizationHeader: 'Bearer invalid-token',
      verifyIdToken: async () => { throw Object.assign(new Error('private detail'), { code }); },
      readPlatformAdministrator: async () => ownerRecord(),
    });
    assert.deepEqual(result, { ok: false, status: 401, code: 'invalid_identity_token' });
  }
});

test('identity verification infrastructure errors fail closed as unavailable', async () => {
  const result = await authorizePlatformOwner({
    authorizationHeader: 'Bearer token',
    verifyIdToken: async () => { throw new Error('private infrastructure detail'); },
    readPlatformAdministrator: async () => ownerRecord(),
  });
  assert.deepEqual(result, { ok: false, status: 503, code: 'identity_verification_unavailable' });
});

test('missing, mismatched, tenant-level, and revoked principals are denied', async () => {
  const records = [
    null,
    { uid: 'another-uid', role: 'platform_owner', status: 'active' },
    { uid: 'owner-uid', role: 'owner', status: 'active' },
    { uid: 'owner-uid', role: 'tenant_super_admin', status: 'active' },
    { uid: 'owner-uid', role: 'platform_owner', status: 'revoked' },
    { uid: 'owner-uid', role: 'platform_owner', status: 'suspended' },
  ];
  for (const principal of records) {
    const result = await authorizePlatformOwner({
      authorizationHeader: 'Bearer token',
      verifyIdToken: async () => ({ uid: 'owner-uid', platformRole: 'platform_owner' }),
      readPlatformAdministrator: async () => principal,
    });
    assert.deepEqual(result, { ok: false, status: 403, code: 'platform_access_denied' });
  }
});

test('client-supplied role claims are ignored; the server record is authoritative', async () => {
  const result = await authorizePlatformOwner({
    authorizationHeader: 'Bearer token',
    verifyIdToken: async () => ({ uid: 'tenant-admin', platformRole: 'platform_owner', role: 'platform_owner' }),
    readPlatformAdministrator: async () => ({ uid: 'tenant-admin', role: 'tenant_admin', status: 'active' }),
  });
  assert.equal(result.status, 403);
});

test('Firestore authority lookup failures fail closed without leaking details', async () => {
  const result = await authorizePlatformOwner({
    authorizationHeader: 'Bearer token',
    verifyIdToken: async () => ({ uid: 'owner-uid' }),
    readPlatformAdministrator: async () => { throw new Error('private database detail'); },
  });
  assert.deepEqual(result, { ok: false, status: 503, code: 'platform_authority_unavailable' });
});

function mockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

test('owner status endpoint is GET-only, uncached, and returns no UID or tenant data', async () => {
  const handler = createOwnerStatusHandler({
    verifyIdToken: async () => ({ uid: 'owner-uid' }),
    readPlatformAdministrator: async (uid) => ownerRecord(uid),
  });
  const wrongMethodResponse = mockResponse();
  await handler({ method: 'POST', headers: { authorization: 'Bearer token' } }, wrongMethodResponse);
  assert.equal(wrongMethodResponse.statusCode, 405);
  assert.equal(wrongMethodResponse.headers.Allow, 'GET');

  const response = mockResponse();
  await handler({ method: 'GET', headers: { authorization: 'Bearer token' } }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { authenticated: true, platformRole: 'platform_owner' });
  assert.equal(response.headers['Cache-Control'], 'no-store, max-age=0');
  assert.equal(response.headers['X-Content-Type-Options'], 'nosniff');
});
