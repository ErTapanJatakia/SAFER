import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/components/BrandingSettingsModal.tsx', import.meta.url), 'utf8');

test('empty logo upload surface is a native keyboard-operable button', () => {
  assert.match(source, /<button\s+type="button"\s+aria-controls=\{activeTab === 'top' \? 'top-logo-file-input' : 'bottom-logo-file-input'\}/);
  assert.match(source, /focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2/);
  assert.match(source, /Click to upload \{activeTab === 'top' \? 'Top' : 'Bottom'\} Logo/);
});

test('logo upload button controls the corresponding hidden file inputs', () => {
  assert.match(source, /id="top-logo-file-input"[\s\S]*?ref=\{topFileInputRef\}[\s\S]*?type="file"/);
  assert.match(source, /id="bottom-logo-file-input"[\s\S]*?ref=\{bottomFileInputRef\}[\s\S]*?type="file"/);
  assert.match(source, /topFileInputRef\.current\?\.click\(\)/);
  assert.match(source, /bottomFileInputRef\.current\?\.click\(\)/);
});
