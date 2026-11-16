import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const production = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'));
const emulator = JSON.parse(readFileSync(new URL('../firebase.emulator.json', import.meta.url), 'utf8'));
const productionRules = readFileSync(new URL('../firestore.production.rules', import.meta.url), 'utf8');
const candidateRules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('Firebase production config selects the deny-all ruleset', () => {
  assert.equal(production.firestore.rules, 'firestore.production.rules');
  assert.match(productionRules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
});

test('emulator config explicitly selects candidate tenant rules', () => {
  assert.equal(emulator.firestore.rules, 'firestore.rules');
  assert.match(candidateRules, /function activeTenantRole\(orgId\)/);
  assert.notEqual(emulator.firestore.rules, production.firestore.rules);
});

test('Firestore authorization suites explicitly use emulator configuration', () => {
  assert.match(packageJson.scripts['test:firestore-rules'], /--config firebase\.emulator\.json/);
  assert.match(packageJson.scripts['test:tenant-membership'], /--config firebase\.emulator\.json/);
});
