import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAuthErrorMessage } from './authErrors.ts';

describe('safe Firebase authentication diagnostics', () => {
  it('explains an unauthorised domain with the exact Firebase setting to check', () => {
    assert.match(getAuthErrorMessage({ code: 'auth/unauthorized-domain', message: 'private detail' }), /authorised domains/);
  });
  it('distinguishes blocked and closed popups', () => {
    assert.match(getAuthErrorMessage({ code: 'auth/popup-blocked' }), /blocked/);
    assert.match(getAuthErrorMessage({ code: 'auth/popup-closed-by-user' }), /closed/);
  });
  it('identifies provider configuration and browser storage failures', () => {
    assert.match(getAuthErrorMessage({ code: 'auth/operation-not-allowed' }), /Google sign-in is disabled/);
    assert.match(getAuthErrorMessage({ code: 'auth/web-storage-unsupported' }), /storage is unavailable/);
  });
  it('returns a safe diagnostic code but never leaks raw SDK messages', () => {
    const message = getAuthErrorMessage({ code: 'auth/internal-error', message: 'SECRET_TOKEN' });
    assert.match(message, /auth\/internal-error/);
    assert.doesNotMatch(message, /SECRET_TOKEN/);
  });
  it('does not expose unstructured exception messages', () => {
    assert.equal(getAuthErrorMessage(new Error('sensitive internals')), 'The account request could not be completed. Check your connection and retry.');
  });
});
