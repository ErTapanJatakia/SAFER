import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const notice = readFileSync(new URL('../src/components/DemonstrationNoticeModal.tsx', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const lifecycle = readFileSync(new URL('../docs/operational-data-boundary-design.md', import.meta.url), 'utf8');

test('Demonstration Notice explains browser-local persistence and lack of automatic expiry', () => {
  assert.match(notice, /Demo Guest mode[\s\S]*?browser profile's local storage/i);
  assert.match(notice, /no automatic expiry/i);
  assert.match(notice, /closing a tab, restarting the browser or signing out does not erase them/i);
});

test('Demonstration Notice accurately describes Reset Records scope', () => {
  assert.match(notice, /Reset Records[\s\S]*?four operational Demo Guest record sets/i);
  assert.match(notice, /does not remove theme, accessibility or branding preferences/i);
  assert.match(notice, /not a guarantee of secure erasure/i);
  assert.match(notice, /Exported files are downloaded[\s\S]*?not removed by Reset Records/i);
});

test('README and data-boundary design disclose the same Demo Guest lifecycle', () => {
  assert.match(readme, /have no automatic expiry/i);
  assert.match(readme, /signing out does not erase them/i);
  assert.match(readme, /Reset Records/i);
  assert.match(lifecycle, /no automatic expiry or retention timer/i);
  assert.match(lifecycle, /session revocation[\s\S]*?does not erase the stored records/i);
});
