import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readiness = await readFile(new URL('../src/components/ReadinessSummaryModal.tsx', import.meta.url), 'utf8');
const incident = await readFile(new URL('../src/components/IncidentDraftModal.tsx', import.meta.url), 'utf8');
const cyberItem = await readFile(new URL('../src/components/CyberItemModal.tsx', import.meta.url), 'utf8');

test('readiness summary view and export controls reflow on narrow screens', () => {
  assert.match(readiness, /px-4 sm:px-6 py-3 bg-slate-100 border-b border-slate-200 flex flex-col sm:flex-row/);
  assert.match(readiness, /flex flex-wrap items-center gap-2 min-w-0/);
  assert.match(readiness, /p-4 bg-amber-50\/90[^"]*flex items-start gap-3 min-w-0/);
  assert.match(readiness, /space-y-0\.5 min-w-0 break-words/);
  assert.match(readiness, /whitespace-pre-wrap/);
});

test('incident draft generation and draft toolbar actions wrap', () => {
  assert.match(incident, /flex flex-col sm:flex-row sm:items-center justify-between gap-3/);
  assert.match(incident, /flex flex-wrap items-center gap-2/);
  assert.match(incident, /flex flex-col sm:flex-row sm:items-center justify-between gap-3/);
  assert.match(incident, /flex flex-wrap items-center gap-2 text-\[11px\] text-slate-600 min-w-0/);
  assert.match(incident, /min-w-0 flex-1/);
});

test('cyber item errors and form actions remain usable at narrow widths', () => {
  assert.match(cyberItem, /flex items-start gap-2 min-w-0/);
  assert.match(cyberItem, /min-w-0 break-words/);
  assert.match(cyberItem, /flex flex-wrap items-center justify-end gap-2/);
});
