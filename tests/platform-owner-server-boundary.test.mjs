import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync(new URL('../api/owner/status.js', import.meta.url), 'utf8');
const serverAdmin = readFileSync(new URL('../src/server/firebase-admin.js', import.meta.url), 'utf8');
const browserFirebase = readFileSync(new URL('../src/lib/firebase.ts', import.meta.url), 'utf8');
const firestoreRules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const packageManifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('only the explicit owner status route is present; helpers stay outside api routing', () => {
  assert.equal(existsSync(new URL('../api/_lib', import.meta.url)), false);
  assert.match(route, /owner-status-handler\.mjs/);
  assert.match(route, /platformAdministrators\/\$\{uid\}/);
  assert.doesNotMatch(route, /request\.body|req\.body|collection\(request/);
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
});

test('security override pins body-parser to the patched 1.20.9 release line', () => {
  assert.equal(packageManifest.overrides['body-parser'], '^1.20.9');
});
