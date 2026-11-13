import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('operational UI state is published only after the repository confirms persistence', () => {
  assert.match(app, /await persist\(next\);\s*current\.current = next;\s*publish\(next\);/);
  assert.match(app, /queue\.current = operation\.catch\(\(\) => undefined\);/);
  for (const helper of ['Personnel', 'Incidents', 'Cyber', 'Checklist']) {
    assert.match(app, new RegExp('const commit' + helper + ' ='));
  }
});

test('operational collections are not persisted through fire-and-forget state effects', () => {
  assert.doesNotMatch(app, /useEffect\(\(\) => \{\s*void demoRepository\.replace(?:Personnel|Incidents|CyberHygiene|Checklist)/);
});

test('operational handlers route mutations through confirmed commit operations', () => {
  for (const helper of ['commitPersonnel', 'commitIncidents', 'commitCyber', 'commitChecklist']) {
    assert.match(app, new RegExp(helper + '\\('));
  }
  assert.match(app, /const saved = await commitPersonnel\([\s\S]*?if \(saved\)/);
  assert.match(app, /Incident report \$\{newReport\.referenceNumber\} recorded/);
  assert.match(app, /Cybersecurity item verification status updated/);
  assert.match(app, /Checklist task status updated to/);
  assert.match(app, /Your previous records remain unchanged/);
});

test('Reset Records drains pending writes before clearing storage and publishing baseline state', () => {
  assert.match(app, /await Promise\.all\(\[personnelQueue\.current, incidentsQueue\.current, cyberQueue\.current, checklistQueue\.current\]\)/);
  assert.match(app, /demoRepository\.reset\(\)/);
  assert.match(app, /personnelRef\.current = \[\.\.\.INITIAL_PERSONNEL\]/);
});

test('cross-tab operational changes pause stale UI writes until the user reloads', () => {
  assert.match(app, /window\.addEventListener\('storage', handleExternalStorageChange\)/);
  assert.match(app, /crossTabConflictRef\.current = true/);
  assert.match(app, /Another SAFER tab changed operational records/);
  assert.match(app, /if \(crossTabConflictRef\.current\) throw new Error\('Cross-tab conflict: reload required\.'\)/);
  assert.match(app, /Your previous records remain unchanged/);
});

test('cross-tab conflicts are surfaced by the repository and browser writes require Web Locks', () => {
  const repository = readFileSync(new URL('../src/lib/demoRepository.ts', import.meta.url), 'utf8');
  const provider = readFileSync(new URL('../src/components/DemoGuestWorkspaceProvider.tsx', import.meta.url), 'utf8');
  assert.match(repository, /navigator|options\.locks\.request/);
  assert.match(repository, /currentRaw !== expected/);
  assert.match(repository, /class DemoWriteConflictError/);
  assert.match(provider, /locks: window\.navigator\.locks/);
  assert.match(provider, /requireCrossTabLock: true/);
});

test('cross-tab recovery offers an explicit snapshot download and user-confirmed reload', () => {
  assert.match(app, /serializeDemoConflictSnapshot\(\{/);
  assert.match(app, /link\.download = `safer-demo-conflict-snapshot-/);
  assert.match(app, /link\.click\(\)/);
  assert.match(app, /Download this tab’s records/);
  assert.match(app, /Unsubmitted form fields are not included/);
  assert.match(app, /onClick=\{\(\) => window\.location\.reload\(\)\}/);
  assert.match(app, /role="alert"/);
});
