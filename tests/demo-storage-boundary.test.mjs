import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const provider = readFileSync(new URL('../src/components/DemoGuestWorkspaceProvider.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('Demo Guest provider fails closed when browser storage cannot be acquired or read', () => {
  assert.match(provider, /try\s*\{[\s\S]*?createDemoRepository\(window\.localStorage\)/);
  assert.match(provider, /browserRepository\.loadSnapshot\(\)/);
  assert.match(provider, /catch\s*\{\s*return null;/);
  assert.match(provider, /role="alert"[\s\S]*?Browser storage is unavailable/i);
});

test('Reset Records reports partial storage failure instead of claiming success', () => {
  assert.match(app, /const handleResetDemoData = \(\) => \{\s*try\s*\{\s*demoRepository\.reset\(\);\s*\}\s*catch\s*\{[\s\S]*?Some records may remain/i);
  assert.match(app, /setPersonnelList\(INITIAL_PERSONNEL\)[\s\S]*?showToast\('Reset all demonstration data to baseline prototype state\.'\)/);
});
