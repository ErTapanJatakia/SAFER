import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/components/BrandingSettingsModal.tsx', import.meta.url), 'utf8');

test('remove-logo button has a visible keyboard focus indicator', () => {
  assert.match(source, /onClick=\{\(\) => updateCurrent\(\{ dataUrl: null, fileName: undefined \}\)\}\s+className="[^"]*focus-visible:outline[^"]*"/);
});

test('replace-image button has a visible keyboard focus indicator', () => {
  const replaceImageAction = source.slice(source.indexOf('<span>Replace Image</span>') - 900, source.indexOf('<span>Replace Image</span>'));
  assert.match(replaceImageAction, /focus-visible:outline/);
});

test('done button has a visible keyboard focus indicator', () => {
  assert.match(source, /onClick=\{onClose\}\s+className="[^"]*focus-visible:outline[^"]*"\s*>\s*Done/);
});
