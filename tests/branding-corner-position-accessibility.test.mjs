import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/components/BrandingSettingsModal.tsx', import.meta.url), 'utf8');

test('corner-position choices are exposed as a labelled group', () => {
  assert.match(source, /id="branding-corner-position-label"[^>]*>\s*Display Corner Position/);
  assert.match(source, /role="group" aria-labelledby="branding-corner-position-label"/);
});

test('Top-Left and Top-Right choices expose their selected states', () => {
  assert.match(source, /aria-pressed=\{topLogo\.position === 'top-left'\}/);
  assert.match(source, /aria-pressed=\{topLogo\.position === 'top-right'\}/);
});

test('Bottom-Left and Bottom-Right choices expose their selected states', () => {
  assert.match(source, /aria-pressed=\{bottomLogo\.position === 'bottom-left'\}/);
  assert.match(source, /aria-pressed=\{bottomLogo\.position === 'bottom-right'\}/);
});
