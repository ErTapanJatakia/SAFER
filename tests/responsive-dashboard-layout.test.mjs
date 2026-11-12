import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const dashboard = await readFile(
  new URL('../src/components/DashboardView.tsx', import.meta.url),
  'utf8',
);
const checklist = await readFile(
  new URL('../src/components/PreDeploymentChecklistView.tsx', import.meta.url),
  'utf8',
);

test('dashboard banner actions wrap instead of forcing a single row', () => {
  const actionContainer = dashboard.match(/<div className="([^"]*self-start md:self-auto[^"]*)">/)?.[1] ?? '';
  for (const className of ['flex', 'flex-wrap', 'items-center', 'gap-2', 'self-start', 'md:self-auto']) {
    assert.ok(actionContainer.split(/\\s+/).includes(className), `Missing responsive class: ${className}`);
  }
  assert.doesNotMatch(dashboard, /flex items-center space-x-2 shrink-0 self-start md:self-auto/);
});

test('human-review queue heading and action reflow below the small breakpoint', () => {
  assert.match(dashboard, /flex flex-col sm:flex-row sm:items-center justify-between gap-3/);
  assert.match(dashboard, /font-bold text-sm text-slate-900 min-w-0 break-words/);
});

test('checklist status filters wrap instead of requiring horizontal scrolling', () => {
  assert.match(checklist, /flex flex-wrap items-center gap-1 w-full sm:w-auto/);
  assert.doesNotMatch(checklist, /flex items-center space-x-1 w-full sm:w-auto overflow-x-auto/);
});

test('checklist status controls can wrap within narrow cards', () => {
  assert.match(checklist, /inline-flex flex-wrap rounded-md shadow-2xs/);
  assert.match(checklist, /flex flex-col items-stretch sm:items-end justify-between gap-3 min-w-0/);
});
