import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('operational UI state is published only after the repository confirms persistence', () => {
  assert.match(app, /await persist\(next\);\s*current\.current = next;\s*publish\(next\);/);
  assert.match(app, /queue\.current = operation\.catch\(\(\) => undefined\);/);
  assert.match(app, /const commitPersonnel =/);
  assert.match(app, /const commitIncidents =/);
  assert.match(app, /const commitCyber =/);
  assert.match(app, /const commitChecklist =/);
});

test('operational collections are not persisted through fire-and-forget state effects', () => {
  assert.doesNotMatch(app, /useEffect\(\(\) => \{\s*void demoRepository\.replace(?:Personnel|Incidents|CyberHygiene|Checklist)/);
});

test('operational success messages are emitted by confirmed commit operations', () => {
  assert.match(app, /await commitPersonnel\([\s\S]*?Updated' : 'Created'\)[\s\S]*?if \(saved\)/);
  assert.match(app, /commitIncidents\([\s\S]*?Incident report/);
  assert.match(app, /commitCyber\([\s\S]*?Cybersecurity item verification status updated/);
  assert.match(app, /commitChecklist\([\s\S]*?Checklist task status updated/);
  assert.match(app, /Your previous records remain unchanged/);
});

test('Reset Records drains pending writes before clearing storage and publishing baseline state', () => {
  assert.match(app, /await Promise\.all\(\[personnelQueue\.current, incidentsQueue\.current, cyberQueue\.current, checklistQueue\.current\]\)/);
  assert.match(app, /demoRepository\.reset\(\)/);
  assert.match(app, /personnelRef\.current = \[\.\.\.INITIAL_PERSONNEL\]/);
});
