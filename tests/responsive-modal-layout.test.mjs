import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const exportModal = await readFile(new URL('../src/components/PersonnelExportModal.tsx', import.meta.url), 'utf8');
const incidentDraft = await readFile(new URL('../src/components/IncidentDraftModal.tsx', import.meta.url), 'utf8');
const cyberItem = await readFile(new URL('../src/components/CyberItemModal.tsx', import.meta.url), 'utf8');
const readiness = await readFile(new URL('../src/components/ReadinessSummaryModal.tsx', import.meta.url), 'utf8');

test('personnel export modal header and body reflow with narrow-screen padding', () => {
  assert.match(exportModal, /px-4 sm:px-6 py-4 bg-slate-900 text-white rounded-t-xl flex flex-col sm:flex-row/);
  assert.match(exportModal, /p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 min-w-0/);
  assert.match(exportModal, /flex flex-wrap items-center bg-slate-200\/80/);
});

test('personnel export preview preserves readable wrapping and vertical scrolling', () => {
  assert.match(exportModal, /max-h-\[460px\] whitespace-pre-wrap break-words/);
  assert.match(exportModal, /flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600/);
});

test('incident draft modal header, disclaimer, body and footer reflow', () => {
  assert.match(incidentDraft, /px-4 sm:px-6 py-4 bg-slate-900 text-white rounded-t-xl flex flex-col sm:flex-row/);
  assert.match(incidentDraft, /px-4 sm:px-6 py-2.5 bg-amber-50 border-b/);
  assert.match(incidentDraft, /p-4 sm:p-6 overflow-y-auto flex-1 space-y-6/);
  assert.match(incidentDraft, /flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500/);
});

test('cyber item modal title and form content fit narrow viewports', () => {
  assert.match(cyberItem, /px-4 sm:px-6 py-4 flex items-start justify-between gap-3/);
  assert.match(cyberItem, /p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs min-w-0/);
  assert.match(cyberItem, /font-bold text-base text-white break-words/);
});

test('readiness summary modal header and footer stack at narrow widths', () => {
  assert.match(readiness, /px-4 sm:px-6 py-4 bg-slate-900 text-white rounded-t-xl flex flex-col sm:flex-row/);
  assert.match(readiness, /p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-900/);
  assert.match(readiness, /flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500/);
});
