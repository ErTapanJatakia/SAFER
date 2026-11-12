import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/components/BrandingSettingsModal.tsx', import.meta.url), 'utf8');

test('branding upload errors are announced assertively to assistive technology', () => {
  assert.match(source, /role="alert" className="p-3 bg-rose-50/);
});

test('branding upload success messages are announced politely and atomically', () => {
  assert.match(source, /role="status" aria-live="polite" aria-atomic="true"/);
});
