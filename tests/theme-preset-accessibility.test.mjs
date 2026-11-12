import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const modal = await readFile(new URL('../src/components/ThemeSettingsModal.tsx', import.meta.url), 'utf8');

test('theme preset cards are native buttons operable by keyboard', () => {
  assert.match(modal, /<button\s+type="button"\s+key=\{preset\.id\}[\s\S]*onClick=\{\(\) => onSelectTheme\(preset\.id\)\}/);
  assert.doesNotMatch(modal, /<div\s+key=\{preset\.id\}\s+onClick=\{\(\) => onSelectTheme\(preset\.id\)\}/);
  assert.match(modal, /focus-visible:ring-2 focus-visible:ring-blue-700/);
});

test('theme preset cards expose selected state without relying on colour alone', () => {
  assert.match(modal, /aria-pressed=\{isSelected\}/);
  assert.match(modal, /isSelected && \([\s\S]*?<span[\s\S]*?>[\s\S]*?Active[\s\S]*?<\/span>/);
});
