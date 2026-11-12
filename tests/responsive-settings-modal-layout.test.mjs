import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const branding = await readFile(new URL('../src/components/BrandingSettingsModal.tsx', import.meta.url), 'utf8');
const themes = await readFile(new URL('../src/components/ThemeSettingsModal.tsx', import.meta.url), 'utf8');
const notice = await readFile(new URL('../src/components/DemonstrationNoticeModal.tsx', import.meta.url), 'utf8');
const personnel = await readFile(new URL('../src/components/PersonnelModal.tsx', import.meta.url), 'utf8');

test('branding settings header, tabs, body and footer reflow on narrow screens', () => {
  assert.match(branding, /px-4 sm:px-6 py-4 flex items-start justify-between gap-3/);
  assert.match(branding, /pt-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row/);
  assert.match(branding, /flex flex-wrap gap-2 min-w-0/);
  assert.match(branding, /p-4 sm:p-6 overflow-y-auto space-y-5/);
  assert.match(branding, /flex flex-col sm:flex-row sm:items-center justify-between gap-2/);
});

test('theme settings content and actions adapt to narrow widths', () => {
  assert.match(themes, /px-4 sm:px-6 py-4 flex items-start justify-between gap-3/);
  assert.match(themes, /px-4 sm:px-6 py-3 bg-amber-50/);
  assert.match(themes, /p-4 sm:p-6 overflow-y-auto space-y-6/);
  assert.match(themes, /flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0/);
});

test('demonstration notice remains readable with a wrapping footer', () => {
  assert.match(notice, /max-h-\[90vh\] min-w-0 my-4 sm:my-8/);
  assert.match(notice, /px-4 sm:px-6 py-4 flex items-start justify-between gap-3/);
  assert.match(notice, /p-4 sm:p-6 overflow-y-auto space-y-5/);
  assert.match(notice, /flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0/);
});

test('personnel form header, body and submit actions reflow on narrow screens', () => {
  assert.match(personnel, /max-h-\[92vh\] min-w-0 my-3 sm:my-6/);
  assert.match(personnel, /px-4 sm:px-6 py-4 flex items-start justify-between gap-3/);
  assert.match(personnel, /p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-700 min-w-0/);
  assert.match(personnel, /flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t/);
  assert.match(personnel, /flex flex-wrap items-center gap-2/);
});
