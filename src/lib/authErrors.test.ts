import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {getAuthErrorMessage} from './authErrors.ts';
describe('safe Firebase authentication diagnostics',()=>{
 it('explains unauthorised domains and provider setup',()=>{assert.match(getAuthErrorMessage({code:'auth/unauthorized-domain'}),/exact hostname/);assert.match(getAuthErrorMessage({code:'auth/operation-not-allowed'}),/Enable Google/);});
 it('distinguishes blocked and closed popups',()=>{assert.match(getAuthErrorMessage({code:'auth/popup-blocked'}),/blocked/);assert.match(getAuthErrorMessage({code:'auth/popup-closed-by-user'}),/closed/);});
 it('never exposes raw SDK messages',()=>{const message=getAuthErrorMessage({code:'auth/internal-error',message:'SECRET_TOKEN'});assert.match(message,/auth\/internal-error/);assert.doesNotMatch(message,/SECRET_TOKEN/);});
 it('does not expose unstructured exception details',()=>{assert.doesNotMatch(getAuthErrorMessage(new Error('private internals')),/private internals/);});
});