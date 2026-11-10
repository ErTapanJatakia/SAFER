import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const route = config.headers?.find((entry) => entry.source === '/(.*)');
const headers = new Map((route?.headers ?? []).map(({key, value}) => [key.toLowerCase(), value]));
const csp = headers.get('content-security-policy') ?? '';
const directives = new Map(
  csp.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const [name, ...values] = part.split(/\\s+/);
    return [name.toLowerCase(), values];
  }),
);

test('Vercel applies browser security headers to every route', () => {
  assert.ok(route, 'security headers must cover every route');
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.equal(headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
});

test('CSP has restrictive baseline and clickjacking protection', () => {
  assert.deepEqual(directives.get('default-src'), ["'self'"]);
  assert.deepEqual(directives.get('base-uri'), ["'self'"]);
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
  assert.deepEqual(directives.get('script-src'), ["'self'"]);
  assert.deepEqual(directives.get('script-src-attr'), ["'none'"]);
  assert.deepEqual(directives.get('frame-ancestors'), ["'none'"]);
  assert.ok(directives.has('upgrade-insecure-requests'));
  assert.ok(!csp.includes('unsafe-eval'), 'production CSP must not permit eval');
});

test('CSP permits only the external origins required by the current app', () => {
  assert.deepEqual(directives.get('style-src'), [
    "'self'", "'unsafe-inline'", 'https://fonts.googleapis.com',
  ]);
  assert.deepEqual(directives.get('font-src'), [
    "'self'", 'data:', 'https://fonts.gstatic.com',
  ]);
  assert.deepEqual(directives.get('img-src'), ["'self'", 'data:', 'blob:']);
  assert.ok(directives.get('connect-src')?.includes('https://identitytoolkit.googleapis.com'));
  assert.ok(directives.get('connect-src')?.includes('https://securetoken.googleapis.com'));
  assert.ok(directives.get('connect-src')?.includes('https://firestore.googleapis.com'));
  assert.ok(directives.get('connect-src')?.includes('https://safer-2026.firebaseapp.com'));
  assert.ok(directives.get('frame-src')?.includes('https://accounts.google.com'));
  assert.ok(directives.get('frame-src')?.includes('https://safer-2026.firebaseapp.com'));
});
