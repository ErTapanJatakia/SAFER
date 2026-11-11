import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const incident = await readFile(new URL('../src/components/IncidentReportsView.tsx', import.meta.url), 'utf8');
const personnel = await readFile(new URL('../src/components/PersonnelReadinessView.tsx', import.meta.url), 'utf8');
const cyber = await readFile(new URL('../src/components/CyberHygieneView.tsx', import.meta.url), 'utf8');
const briefing = await readFile(new URL('../src/components/CyberHygieneSummaryModal.tsx', import.meta.url), 'utf8');

test('incident report actions wrap in narrow layouts', () => {
  assert.match(incident, /flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto/);
  assert.match(incident, /flex items-start flex-wrap gap-2 min-w-0/);
  assert.match(incident, /text-lg font-bold text-slate-900 min-w-0 break-words/);
});

test('personnel requirement rows stack and allow long requirements to wrap', () => {
  assert.match(personnel, /flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-800/);
  assert.match(personnel, /flex items-start space-x-2 min-w-0/);
  assert.match(personnel, /self-start sm:self-auto/);
  assert.match(personnel, /flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-auto/);
});

test('cyber hygiene header and action controls wrap on narrow screens', () => {
  assert.match(cyber, /flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto/);
  assert.match(cyber, /max-w-full sm:max-w-\[220px\]/);
});

test('cyber hygiene generated summary avoids forced horizontal overflow', () => {
  assert.match(cyber, /max-w-full overflow-x-hidden whitespace-pre-wrap break-words/);
});

test('cyber hygiene briefing modal reflows header, toolbar, body and footer', () => {
  assert.match(briefing, /px-4 sm:px-6 py-4 flex flex-col sm:flex-row/);
  assert.match(briefing, /flex flex-col sm:flex-row sm:items-center justify-between gap-2/);
  assert.match(briefing, /p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 space-y-4 min-w-0/);
  assert.match(briefing, /flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs/);
  assert.match(briefing, /max-w-full overflow-x-hidden whitespace-pre-wrap break-words/);
});
