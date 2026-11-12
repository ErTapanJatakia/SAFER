import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
const lines = source.split(/\r?\n/);
const ruleIndex = lines.indexOf('/*');
assert.notEqual(ruleIndex, -1, 'all static routes must receive the security policy');
const ruleLines = lines.slice(ruleIndex + 1).filter((line) => line.startsWith('  '));
const headers = new Map(
  ruleLines
    .map((line) => line.trim())
    .filter((line) => !line.startsWith('! '))
    .map((line) => {
      const separator = line.indexOf(':');
      return [line.slice(0, separator).toLowerCase(), line.slice(separator + 1).trim()];
    }),
);
const csp = headers.get('content-security-policy') ?? '';
const directives = new Map(
  csp.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const [name, ...values] = part.split(/\s+/);
    return [name.toLowerCase(), values];
  }),
);

test('Cloudflare Pages applies browser security headers to every static route', () => {
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.equal(headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
});

test('Cloudflare Pages CSP preserves the restrictive application policy', () => {
  assert.deepEqual(directives.get('default-src'), ["'self'"]);
  assert.deepEqual(directives.get('base-uri'), ["'self'"]);
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
  assert.deepEqual(directives.get('script-src'), ["'self'"]);
  assert.deepEqual(directives.get('script-src-attr'), ["'none'"]);
  assert.deepEqual(directives.get('frame-ancestors'), ["'none'"]);
  assert.ok(directives.get('connect-src')?.includes('https://identitytoolkit.googleapis.com'));
  assert.ok(directives.get('connect-src')?.includes('https://firestore.googleapis.com'));
  assert.ok(directives.get('frame-src')?.includes('https://accounts.google.com'));
  assert.ok(!csp.includes('unsafe-eval'), 'production CSP must not permit eval');
});

test('Cloudflare default wildcard CORS header is explicitly removed', () => {
  assert.ok(
    ruleLines.some((line) => line.trim().toLowerCase() === '! access-control-allow-origin'),
    'same-origin static assets must not inherit Pages wildcard Access-Control-Allow-Origin',
  );
});
