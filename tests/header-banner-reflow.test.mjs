import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const header = await readFile(new URL('../src/components/HeaderBanner.tsx', import.meta.url), 'utf8');

test('header utility controls can wrap without forcing a single narrow row', () => {
  assert.match(header, /flex flex-wrap items-center gap-2 min-w-0/);
  assert.match(header, /flex flex-wrap items-center justify-end gap-2 min-w-0 text-xs/);
});

test('human review mandate remains readable when the viewport is narrow', () => {
  assert.match(header, /flex flex-wrap items-start justify-between gap-2 text-\[11px\] text-slate-400 min-w-0/);
  assert.match(header, /flex items-start gap-1\.5 min-w-0 flex-1/);
  assert.match(header, /min-w-0 break-words/);
  assert.match(header, /shrink-0 mt-1/);
});

test('header status indicators allow their labels and values to wrap', () => {
  assert.match(header, /flex items-center gap-2 text-xs min-w-0/);
  assert.match(header, /font-semibold text-white break-words/);
  assert.match(header, /w-4 h-4 shrink-0/);
});
