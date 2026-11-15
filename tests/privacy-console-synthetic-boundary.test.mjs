import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const component = await readFile(new URL('../src/components/PrivacyConsoleModal.tsx', import.meta.url), 'utf8');

describe('Privacy Console synthetic-data boundary', () => {
  it('requires a session-only acknowledgement before mutations and exports', () => {
    assert.match(component, /const \[demoAcknowledged, setDemoAcknowledged\] = useState\(false\)/);
    assert.match(component, /setDemoAcknowledged\(false\)/);
    assert.match(component, /checked=\{demoAcknowledged\}/);
    assert.match(component, /!storageReady \|\| !demoAcknowledged/);
    assert.match(component, /workflow safeguard, not a PII detector/);
  });

  it('does not persist the acknowledgement as a user preference', () => {
    assert.doesNotMatch(component, /localStorage\.(setItem|getItem).*demoAcknowledged/);
    assert.doesNotMatch(component, /PRIVACY_DEMO_STORAGE_KEY.*demoAcknowledged/);
  });

  it('defers download URL revocation until after the browser click', () => {
    const click = component.indexOf('link.click()');
    const revoke = component.indexOf('setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)');
    assert.ok(click >= 0 && revoke > click);
  });
});
