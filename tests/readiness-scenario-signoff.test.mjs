import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const summary = await readFile(new URL('../src/components/PreDeploymentSummaryModal.tsx', import.meta.url), 'utf8');

test('scenario context metadata wraps long values within its responsive grid', () => {
  assert.match(summary, /rounded-lg p-4 text-xs space-y-2 min-w-0/);
  assert.match(summary, /font-bold text-slate-900 text-sm min-w-0 break-words/);
  assert.match(summary, /grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-600 pt-1 min-w-0/);
  assert.equal((summary.match(/className="min-w-0 break-words"/g) || []).length, 4);
  assert.match(summary, /font-medium break-words/);
});

test('supervisory review heading and helper text reflow without changing the form action', () => {
  assert.match(summary, /flex flex-wrap items-start gap-2 min-w-0 text-blue-900/);
  assert.match(summary, /font-bold text-sm text-slate-900 min-w-0 break-words/);
  assert.match(summary, /text-xs text-slate-600 break-words/);
  assert.match(summary, /onSubmit={handleConfirmSignOff}/);
});

test('supervisory form columns and labels remain constrained on narrow screens', () => {
  assert.match(summary, /grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs min-w-0/);
  assert.match(summary, /block font-semibold text-slate-700 mb-1 break-words/);
  assert.match(summary, /className="w-full px-3 py-1\.5/);
  assert.match(summary, /className="w-full px-2\.5 py-1\.5/);
});
