import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const personnelDetail = await readFile(new URL('../src/components/PersonnelDetailModal.tsx', import.meta.url), 'utf8');
const readiness = await readFile(new URL('../src/components/PreDeploymentSummaryModal.tsx', import.meta.url), 'utf8');

test('personnel detail dossier header actions wrap and content padding scales', () => {
  assert.match(personnelDetail, /max-h-\[92vh\] min-w-0 flex flex-col/);
  assert.match(personnelDetail, /px-4 sm:px-6 py-4 bg-slate-900 text-white rounded-t-xl flex flex-col sm:flex-row/);
  assert.match(personnelDetail, /flex flex-wrap items-center gap-2/);
  assert.match(personnelDetail, /p-4 sm:p-6 overflow-y-auto space-y-5/);
  assert.match(personnelDetail, /flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-\[11px\]/);
});

test('pre-deployment summary header, notice, view actions and body reflow', () => {
  assert.match(readiness, /px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3/);
  assert.match(readiness, /px-4 sm:px-6 py-2\.5 text-xs text-amber-900/);
  assert.match(readiness, /flex flex-wrap items-center gap-2/);
  assert.match(readiness, /p-4 sm:p-6 overflow-y-auto space-y-6 flex-1/);
  assert.match(readiness, /flex flex-col sm:flex-row sm:items-center justify-between gap-2/);
});
