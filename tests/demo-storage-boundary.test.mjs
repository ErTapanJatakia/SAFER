import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const provider = readFileSync(new URL('../src/components/DemoGuestWorkspaceProvider.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('Demo Guest provider fails closed when browser storage cannot be acquired or read', () => {
  assert.match(provider, /try\s*\{[\s\S]*?createDemoRepository\(window\.localStorage,\s*\{/);
  assert.match(provider, /browserRepository\.loadSnapshot\(\)/);
  assert.match(provider, /catch\s*\{\s*return null;/);
  assert.match(provider, /role="alert"[\s\S]*?Browser storage is unavailable/i);
});

test('Reset Records drains pending writes and coordinates cross-tab deletion', () => {
  assert.match(app, /const handleResetDemoData = async \(\) => \{/);
  assert.match(app, /await Promise\.all\(\[personnelQueue\.current, incidentsQueue\.current, cyberQueue\.current, checklistQueue\.current\]\)/);
  assert.match(app, /if \(crossTabConflictRef\.current\) throw new Error\('Cross-tab conflict: reload required\.'\)/);
  assert.match(app, /await demoRepository\.reset\(\)/);
  assert.match(app, /await demoRepository\.reset\(\);[\s\S]*?setPersonnelList\(\[\.\.\.INITIAL_PERSONNEL\]\)/);
  assert.match(app, /Some records may remain/);
  assert.match(app, /showToast\('Reset all demonstration data to baseline prototype state\.'\)/);
});
