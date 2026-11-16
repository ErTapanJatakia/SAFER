import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = [
  'api/tenant/members.js',
  'api/tenant/invitations/accept.js',
  'api/tenant/invitations/accept-member.js',
  'api/tenant/incidents.js',
  'api/tenant/personnel.js',
  'api/tenant/checklists.js',
  'api/tenant/evidence.js',
  'api/tenant/reports.js',
  'api/owner/organisations.js',
  'api/owner/organisations-registry.js',
  'api/owner/support-access.js',
];

test('all JSON-mutating tenant and Owner API routes enforce a bounded parsed body', () => {
  for (const path of routes) {
    const source = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assert.match(source, /export const config\s*=\s*\{/u, path + ' exports Vercel config');
    assert.match(source, /bodyParser\s*:\s*\{\s*sizeLimit\s*:\s*'64kb'/u, path + ' limits parsed JSON bodies');
  }
});
