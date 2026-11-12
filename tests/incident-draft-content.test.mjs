import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const modal = await readFile(new URL('../src/components/IncidentDraftModal.tsx', import.meta.url), 'utf8');

test('incident draft disclaimer and generated narrative wrap long content', () => {
  assert.match(modal, /Neutral Administrative Documentation:[\s\S]*className="min-w-0 break-words \[overflow-wrap:anywhere\]"/);
  assert.match(modal, /leading-relaxed bg-white border border-slate-200 p-2\.5 rounded break-words \[overflow-wrap:anywhere\]/);
  assert.match(modal, /text-xs text-amber-900 bg-amber-50\/70[^"]*break-words \[overflow-wrap:anywhere\]/);
});

test('incident metadata and identifiers do not force cards wider than the modal', () => {
  assert.match(modal, /grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0/);
  assert.match(modal, /font-mono text-xs font-bold text-slate-900 break-all/);
  assert.match(modal, /text-xs break-words \[overflow-wrap:anywhere\]/);
  assert.match(modal, /min-w-0 flex-1/);
});

test('editable incident form and follow-up actions retain narrow-width containment', () => {
  assert.match(modal, /space-y-4 bg-slate-50 border border-slate-300 rounded-lg p-4 min-w-0/);
  assert.match(modal, /grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0/);
  assert.match(modal, /grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0/);
  assert.match(modal, /min-w-0 break-words \[overflow-wrap:anywhere\]/);
});
