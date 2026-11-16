import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync(new URL('../api/owner/status.js', import.meta.url), 'utf8');
const supportRoute = readFileSync(new URL('../api/owner/support-access.js', import.meta.url), 'utf8');
const tenantDataRoute = readFileSync(new URL('../api/owner/tenant-data.js', import.meta.url), 'utf8');
const tenantDataService = readFileSync(new URL('../src/server/platform-owner-tenant-data.mjs', import.meta.url), 'utf8');
const ownerProvisionRoute = readFileSync(new URL('../api/owner/organisations.js', import.meta.url), 'utf8');
const ownerRegistryRoute = readFileSync(new URL('../api/owner/organisations-registry.js', import.meta.url), 'utf8');
const serverAdmin = readFileSync(new URL('../src/server/firebase-admin.js', import.meta.url), 'utf8');
const browserFirebase = readFileSync(new URL('../src/lib/firebase.ts', import.meta.url), 'utf8');
const firestoreRules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const packageManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const vercelConfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));

test('Owner status route delegates to the shared handler; server helpers stay outside API routing', () => {
  assert.equal(existsSync(new URL('../api/_lib', import.meta.url)), false);
  assert.ok(route.includes('owner-status-handler.mjs'));
  assert.ok(route.includes('platformAdministrators/${uid}'));
  assert.ok(!route.includes('request.body'));
  assert.ok(!route.includes('req.body'));
  assert.ok(!route.includes('collection(request'));
});

test('all Owner routes use the authoritative Platform Owner verifier and support-access scope', () => {
  // The status route delegates to a shared handler with authoritative verifier dependencies.
  assert.ok(route.includes('readPlatformSettings'));
  assert.ok(route.includes('readAuthUser'));
  for (const source of [supportRoute, ownerProvisionRoute, ownerRegistryRoute, tenantDataRoute]) {
    assert.ok(source.includes('authorizePlatformOwner'));
    assert.ok(source.includes('readPlatformSettings'));
    assert.ok(source.includes('readAuthUser'));
  }
  assert.ok(supportRoute.includes('platform-owner-support-access'));
  assert.ok(tenantDataRoute.includes('X-Support-Session'));
  assert.ok(tenantDataService.includes('authorizePlatformSupportAccess'));
  assert.ok(tenantDataService.includes('tenant_aggregate_counts_only'));
  assert.ok(!tenantDataService.includes('database.doc(') || !tenantDataService.includes('request'));
});

test('Firebase Admin credentials are server-only and never use VITE-prefixed variables', () => {
  assert.ok(serverAdmin.includes('FIREBASE_SERVICE_ACCOUNT_JSON'));
  assert.ok(!serverAdmin.includes('VITE_'));
  assert.ok(!browserFirebase.includes('FIREBASE_SERVICE_ACCOUNT_JSON'));
  assert.ok(!browserFirebase.includes('private_key'));
  assert.ok(!browserFirebase.includes('client_email'));
});

test('client Firestore rules do not grant platform administrator or audit collection access', () => {
  assert.ok(firestoreRules.includes('match /{document=**}'));
  assert.ok(firestoreRules.includes('allow read, write: if false'));
  assert.ok(!firestoreRules.includes('match /platformAdministrators/'));
  assert.ok(!firestoreRules.includes('match /platformAuditEvents/'));
  assert.ok(!firestoreRules.includes('match /platformSupportSessions/'));
});

test('security override pins body-parser to the patched 1.20.9 release line', () => {
  assert.equal(packageManifest.overrides['body-parser'], '^1.20.9');
});

test('Vercel uses the committed frozen Bun lockfile rather than a stale npm lockfile', () => {
  assert.equal(packageManifest.packageManager, 'bun@1.4.4');
  assert.equal(vercelConfig.installCommand, 'bun install --frozen-lockfile');
});
