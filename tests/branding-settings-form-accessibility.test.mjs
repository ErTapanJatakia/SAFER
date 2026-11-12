import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/components/BrandingSettingsModal.tsx', import.meta.url), 'utf8');

test('display-height range input has a programmatically associated label', () => {
  assert.match(source, /<label htmlFor="branding-logo-height"[\s\S]*?Display Height:/);
  assert.match(source, /<input\s+id="branding-logo-height"\s+type="range"/);
});

test('alternative-text input has a programmatically associated label', () => {
  assert.match(source, /<label htmlFor="branding-logo-alt-text"[\s\S]*?Accessible Alternative Text/);
  assert.match(source, /<input\s+id="branding-logo-alt-text"\s+type="text"/);
});

test('logo upload guidance matches the enforced 2 MB limit and accepted SVG type', () => {
  assert.match(source, /Logo Image \(PNG, JPG\/JPEG, WebP, SVG — Up to 2 MB\)/);
  assert.match(source, /Maximum size 2 MB/);
  assert.match(source, /maxSizeBytes = 2 \* 1024 \* 1024/);
  assert.match(source, /accept="image\/png, image\/jpeg, image\/jpg, image\/webp, image\/svg\+xml"/);
});
