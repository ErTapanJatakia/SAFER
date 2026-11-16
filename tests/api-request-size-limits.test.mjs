import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isRequestBodyTooLarge } from '../src/server/request-body-limit.mjs';

const routes = [
  'api/tenant/members.js',
  'api/tenant/invitations/accept.js',
  'api/tenant/invitations/accept-member.js',
  'api/tenant/invitations/revoke.js',
  'api/tenant/incidents.js',
  'api/tenant/personnel.js',
  'api/tenant/checklists.js',
  'api/tenant/evidence.js',
  'api/tenant/reports.js',
  'api/owner/organisations.js',
  'api/owner/organisations/invitations/revoke.js',
  'api/owner/organisations-registry.js',
  'api/owner/support-access.js',
];

test('all mutation-capable tenant and Owner routes enforce the shared 64 KiB payload guard', () => {
  for (const path of routes) {
    const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assert.match(source, /request-body-limit\.mjs/u, path + ' imports the shared guard');
    assert.match(source, /isRequestBodyTooLarge\((?:request|req)\)/u, path + ' checks the request');
    assert.match(source, /request_body_too_large/u, path + ' returns a bounded error');
    assert.doesNotMatch(source, /export const config\s*=\s*\{\s*api:/u, path + ' does not rely on Next.js-only bodyParser config');
  }
});

test('request guard rejects oversized Content-Length before accessing the parsed body', () => {
  let bodyRead = false;
  const request = {
    headers: { 'content-length': '65537' },
    get body() { bodyRead = true; return {}; },
  };
  assert.equal(isRequestBodyTooLarge(request), true);
  assert.equal(bodyRead, false);
});

test('request guard rejects oversized parsed JSON and accepts bounded payloads', () => {
  assert.equal(isRequestBodyTooLarge({ headers: {}, body: { value: 'x'.repeat(65500) } }), true);
  assert.equal(isRequestBodyTooLarge({ headers: {}, body: { value: 'safe' } }), false);
  assert.equal(isRequestBodyTooLarge({ headers: { 'content-length': 'not-a-number' }, body: {} }), true);
});

test('request guard rejects malformed JSON body access without leaking an exception', () => {
  const request = {
    headers: {},
    get body() { throw new SyntaxError('malformed JSON'); },
  };
  assert.equal(isRequestBodyTooLarge(request), true);
});
