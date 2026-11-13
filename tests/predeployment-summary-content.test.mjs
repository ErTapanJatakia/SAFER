import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const summary = await readFile(new URL('../src/components/PreDeploymentSummaryModal.tsx', import.meta.url), 'utf8');

test('readiness summary header and mandatory notice wrap long content', () => {
  assert.match(summary, /text-xs text-slate-400 break-words/);
  assert.match(summary, /leading-relaxed break-words/);
  assert.match(summary, /p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 min-w-0/);
});

test('outstanding task titles, metadata, descriptions and compliance notes reflow', () => {
  assert.match(summary, /flex flex-wrap items-start justify-between gap-2/);
  assert.match(summary, /font-bold text-slate-900 min-w-0 break-words/);
  assert.match(summary, /text-\[11px\] text-slate-500 font-medium min-w-0 break-words/);
  assert.match(summary, /text-slate-600 leading-relaxed break-words/);
  assert.match(summary, /text-\[11px\] text-slate-700 break-words/);
});

test('category status indicators and plaintext report header can wrap', () => {
  assert.match(summary, /flex flex-wrap items-center gap-x-3 gap-y-1 text-\[11px\]/);
  assert.match(summary, /flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500/);
});

test('supervisory determination controls retain responsive grid layout', () => {
  assert.match(summary, /grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs/);
  assert.match(summary, /className="w-full px-3 py-1\.5/);
});
