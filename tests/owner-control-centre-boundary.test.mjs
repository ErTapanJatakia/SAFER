import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const ownerUi = readFileSync(new URL('../src/components/OwnerControlCentre.tsx', import.meta.url), 'utf8');
const authGate = readFileSync(new URL('../src/components/AuthGate.tsx', import.meta.url), 'utf8');

test('Owner Control Centre requires independent server-side Owner verification before rendering controls', () => {
  assert.match(ownerUi, /request\('\/api\/owner\/status'\)/);
  assert.match(ownerUi, /setOwnerState\('owner'\)/);
  assert.match(ownerUi, /ownerState === 'not-owner'/);
  assert.match(ownerUi, /onOwnerStatusChange\(ownerState\)/);
  assert.doesNotMatch(ownerUi, /platformRole|customClaims|localStorage|sessionStorage/);
});

test('Owner Control Centre routes registry and provisioning mutations through Owner APIs', () => {
  assert.match(ownerUi, /\/api\/owner\/organisations-registry/);
  assert.match(ownerUi, /\/api\/owner\/organisations/);
  assert.match(ownerUi, /\/api\/owner\/support-access/);
  assert.match(ownerUi, /\/api\/owner\/tenant-data/);
  assert.match(ownerUi, /X-Support-Session/);
  assert.match(ownerUi, /cache: 'no-store'/);
  assert.match(ownerUi, /Authorization:.*Bearer/);
});

test('Owner UI does not expose tenant data browsing or direct Firestore access', () => {
  assert.doesNotMatch(ownerUi, /firebase\/firestore|from ['"]firebase-admin/);
  assert.match(ownerUi, /aggregate counts/);
  assert.match(ownerUi, /Read aggregate summary/);
  assert.match(ownerUi, /Prepare aggregate export/);
  assert.doesNotMatch(ownerUi, /platform:tenant-data:write/);
  assert.match(ownerUi, /purpose/);
  assert.match(ownerUi, /changeReference/);
});

test('AuthGate defers authenticated workspace routing until Owner authority is resolved', () => {
  assert.match(authGate, /<OwnerControlCentre user=\{user\} onOwnerStatusChange=\{setOwnerStatus\} \/>/);
  assert.match(authGate, /ownerStatus === 'checking'/);
  assert.match(authGate, /ownerStatus === 'not-owner'/);
  assert.match(authGate, /setOwnerStatus\('checking'\)/);
  assert.match(authGate, /ownerStatus === 'owner' \|\| ownerStatus === 'checking'/);
});
