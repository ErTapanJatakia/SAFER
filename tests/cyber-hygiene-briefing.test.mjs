import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const modal = await readFile(new URL('../src/components/CyberHygieneSummaryModal.tsx', import.meta.url), 'utf8');

test('briefing title and subtitle wrap within the modal header', () => {
  assert.match(modal, /flex items-start gap-2 min-w-0/);
  assert.match(modal, /font-bold text-base text-white break-words \[overflow-wrap:anywhere\]/);
  assert.match(modal, /text-\[11px\] text-slate-300 break-words \[overflow-wrap:anywhere\]/);
  assert.match(modal, /shrink-0/);
});

test('administrative disclaimer and generated report text wrap without horizontal overflow', () => {
  assert.match(modal, /flex items-start gap-2 text-xs text-blue-900 min-w-0/);
  assert.match(modal, /leading-tight min-w-0 break-words \[overflow-wrap:anywhere\]/);
  assert.match(modal, /whitespace-pre-wrap break-words \[overflow-wrap:anywhere\]/);
});

test('briefing actions and footer reflow while retaining their existing actions', () => {
  assert.match(modal, /flex flex-wrap items-center gap-2 min-w-0/);
  assert.match(modal, /onClick=\{handleCopy\}/);
  assert.match(modal, /onClick=\{handleDownload\}/);
  assert.match(modal, /min-w-0 break-words \[overflow-wrap:anywhere\]/);
  assert.match(modal, /onClick=\{onClose\}/);
});
