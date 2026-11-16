import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync(new URL('../api/owner/status.js', import.meta.url), 'utf8');
const supportRoute = readFileSync(new URL('../api/owner/support-access.js', import.meta.url), 'utf8');
const platformAuditRoute = readFileSync(new URL('../api/owner/audit.js', import.meta.url), 'utf8');
const ownerProvisionRoute = readFileSync(new URL('../api/owner/organisations.js', import.meta.url), 'utf8');
const ownerRegistryRoute = readFileSync(new URL('../api/owner/organisations-registry.js', import.meta.url), 'utf8');
const serverAdmin = readFileSync(new URL('../src/server/firebase-admin.js', import.meta.url), 'utf8');
const browserFirebase = readFileSync(new URL('../src/lib/firebase.ts', import.meta.url), 'utf8');
const firestoreRules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const packageManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const vercelConfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('Owner status route delegates to the shared handler; server helpers stay outside API routing', () => {
  assert.equal(existsSync(new URL('../api/_lib', import.meta.url)), false);
  assert.match(route, /owner-status-handler\.mjs/);
  assert.match(route, /platformAdministrators\/\$\{uid\}/);
  assert.doesNotMatch(route, /request\.body|req\.body|collection\(request/);
});

test('all Owner routes use the same authoritative Platform Owner verifier', () => {
  for (const source of [route, supportRoute, ownerProvisionRoute, ownerRegistryRoute]) {
    assert.match(source, /authorizePlatformOwner/);
    assert.match(source, /readPlatformSettings/);
    assert.match(source, /readAuthUser/);
  }
  assert.match(supportRoute, /platform-owner-support-access/);
});

test('Platform audit endpoint is Owner-authenticated and metadata reader is server-side', () => {
  assert.match(platformAuditRoute, /authorizePlatformOwner/);
  assert.match(platformAuditRoute, /authorizePlatformOwnerAction/);
  assert.match(platformAuditRoute, /platform:audit:read/);
  assert.match(platformAuditRoute, /verifyIdToken\(token, checkRevoked\)/);
  assert.match(platformAuditRoute, /listPlatformAuditEvents/);
  assert.match(platformAuditRoute, /Cache-Control/);
});

test('Firebase Admin credentials are server-only and never use VITE-prefixed variables', () => {
  assert.match(serverAdmin, /FIREBASE_SERVICE_ACCOUNT_JSON/);
  assert.doesNotMatch(serverAdmin, /VITE_/);
  assert.doesNotMatch(browserFirebase, /FIREBASE_SERVICE_ACCOUNT_JSON|private_key|client_email/);
});

test('client Firestore rules do not grant platform administrator or audit collection access', () => {
  assert.match(firestoreRules, /match \/\{document=\*\*\}/);
  assert.match(firestoreRules, /allow read, write: if false/);
  assert.doesNotMatch(firestoreRules, /match \/platformAdministrators\//);
  assert.doesNotMatch(firestoreRules, /match \/platformAuditEvents\//);
  assert.doesNotMatch(firestoreRules, /match \/platformSupportSessions\//);
});

test('security override pins body-parser to the patched 1.20.9 release line', () => {
  assert.equal(packageManifest.overrides['body-parser'], '^1.20.9');
});

test('Vercel uses the committed frozen Bun lockfile rather than a stale npm lockfile', () => {
  assert.equal(packageManifest.packageManager, 'bun@1.4.4');
  assert.equal(vercelConfig.installCommand, 'bun install --frozen-lockfile');
});

test('tenant member list validates stored actor IDs and timestamps before serializing',()=>{
 const memberRoute=readFileSync(new URL('../api/tenant/members.js',import.meta.url),'utf8');
 assert.match(memberRoute,/function safeTimestamp\(value\)/);
 assert.match(memberRoute,/safeTimestamp\(value\.createdAt\) === null/);
 assert.match(memberRoute,/safeTimestamp\(value\.updatedAt\) === null/);
 assert.match(memberRoute,/value\.createdByUid/);
 assert.match(memberRoute,/value\.updatedByUid/);
});
