import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/components/BrandingSettingsModal.tsx', import.meta.url), 'utf8');

test('close button declares button type and visible keyboard focus', () => {
  assert.match(source, /type="button"\s+onClick=\{onClose\}\s+className="[^"]*focus-visible:outline[^"]*"\s+aria-label="Close Branding Settings"/);
});

test('restore-default button declares button type and visible keyboard focus', () => {
  assert.match(source, /<button\s+type="button"\s+onClick=\{\(\) => \{\s+onResetLogos\(\);\s+setSuccessMsg\('Restored default branding layout\.'\);\s+\}\}\s+className="[^"]*focus-visible:outline[^"]*"\s+title="Restore default branding layout"/);
});
