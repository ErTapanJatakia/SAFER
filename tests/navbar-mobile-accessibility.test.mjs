import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const navbar = await readFile(new URL('../src/components/Navbar.tsx', import.meta.url), 'utf8');

test('primary navigation and mobile menu expose an explicit accessible relationship', () => {
  assert.match(navbar, /<nav aria-label="Primary navigation"/);
  assert.match(navbar, /aria-label="Toggle navigation menu"[\s\S]*aria-expanded=\{mobileMenuOpen\}[\s\S]*aria-controls="safer-mobile-navigation"/);
  assert.match(navbar, /id="safer-mobile-navigation"/);
});

test('mobile navigation identifies the active page and wraps long section labels', () => {
  assert.match(navbar, /aria-current=\{isActive \? 'page' : undefined\}/);
  assert.match(navbar, /min-w-0 break-words \[overflow-wrap:anywhere\] text-left/);
  assert.match(navbar, /justify-between gap-2 px-3 py-2\.5/);
});

test('mobile active-section indicator remains constrained on narrow screens', () => {
  assert.match(navbar, /md:hidden flex items-center gap-2 text-white font-medium text-sm min-w-0 flex-1/);
  assert.match(navbar, /font-semibold text-slate-100 min-w-0 break-words \[overflow-wrap:anywhere\]/);
});
