import { describe, expect, it } from 'vitest';
import { SAFER_FIREBASE_PROJECT_ID, validateFirebaseWebConfig } from './firebaseConfig.ts';

const valid = {
  apiKey: 'public-web-api-key',
  authDomain: 'safer-2026.firebaseapp.com',
  projectId: SAFER_FIREBASE_PROJECT_ID,
  appId: '1:345562773067:web:example',
};

describe('SAFER Firebase web configuration boundary', () => {
  it('accepts a complete configuration for the canonical SAFER project', () => {
    expect(validateFirebaseWebConfig(valid)).toEqual({ configured: true, reason: 'ready' });
  });

  it('rejects a different Firebase project even when all values are present', () => {
    expect(validateFirebaseWebConfig({ ...valid, projectId: 'another-project' }))
      .toEqual({ configured: false, reason: 'unexpected_project' });
  });

  it('rejects a missing or blank required public configuration value', () => {
    expect(validateFirebaseWebConfig({ ...valid, appId: '  ' }))
      .toEqual({ configured: false, reason: 'missing_values' });
  });

  it('does not mistake an absent project identifier for a valid partial configuration', () => {
    expect(validateFirebaseWebConfig({ ...valid, projectId: undefined }))
      .toEqual({ configured: false, reason: 'unexpected_project' });
  });
});
