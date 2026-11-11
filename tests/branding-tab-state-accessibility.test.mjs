import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/components/BrandingSettingsModal.tsx', import.meta.url), 'utf8');

test('Top Logo selector exposes its selected state', () => {
  assert.match(source, /aria-pressed=\{activeTab === 'top'\}/);
});

test('Bottom Logo selector exposes its selected state', () => {
  assert.match(source, /aria-pressed=\{activeTab === 'bottom'\}/);
});
