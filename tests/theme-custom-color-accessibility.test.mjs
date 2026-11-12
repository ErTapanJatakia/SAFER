import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const modal = await readFile(new URL('../src/components/ThemeSettingsModal.tsx', import.meta.url), 'utf8');

const controls = [
  ['Primary Accent Color', 'primary', 'safer-custom-theme-primary-value'],
  ['Background Color', 'bg', 'safer-custom-theme-background-value'],
  ['Card Surface Color', 'surface', 'safer-custom-theme-surface-value'],
  ['Text Color', 'text', 'safer-custom-theme-text-value'],
];

test('custom theme hex inputs have programmatically associated visible labels', () => {
  for (const [label, property, id] of controls) {
    assert.match(modal, new RegExp(`<label htmlFor="${id}"[^>]*>\\s*${label}\\s*</label>`));
    assert.match(modal, new RegExp(`<input\\s+type="text"\\s+id="${id}"\\s+value=\\{customTheme\\.${property}\\}`));
  }
});

test('custom theme colour pickers have distinct accessible names', () => {
  for (const [label, property] of controls) {
    assert.match(modal, new RegExp(`<input\\s+type="color"\\s+aria-label="${label} picker"\\s+value=\\{customTheme\\.${property}\\}`));
  }
});
