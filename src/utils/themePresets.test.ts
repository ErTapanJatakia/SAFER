import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_PRESETS,
  DEFAULT_THEME_ID,
  DEFAULT_TOP_LOGO,
  DEFAULT_BOTTOM_LOGO,
  DEFAULT_ACCESSIBILITY_SETTINGS,
} from './themePresets.ts';

test('THEME_PRESETS has all 19 presets covering standard, high_vis, and camouflage', () => {
  assert.equal(THEME_PRESETS.length, 20); // 6 standard, 9 high_vis, 5 camouflage = 20 presets total

  const ids = THEME_PRESETS.map((p) => p.id);
  // Verify standard
  assert.ok(ids.includes('blue-white'));
  assert.ok(ids.includes('green-white'));
  assert.ok(ids.includes('green-black'));
  assert.ok(ids.includes('black-white'));
  assert.ok(ids.includes('red-green'));
  assert.ok(ids.includes('multicolour-rgby'));

  // Verify high-vis & environmental
  assert.ok(ids.includes('bright-daylight-desert'));
  assert.ok(ids.includes('high-contrast-outdoor'));
  assert.ok(ids.includes('tropical-jungle'));
  assert.ok(ids.includes('maritime-coastal'));
  assert.ok(ids.includes('mountain-snow'));
  assert.ok(ids.includes('night-low-glare'));
  assert.ok(ids.includes('neutral-slate-monochrome'));
  assert.ok(ids.includes('warm-earth-sand'));
  assert.ok(ids.includes('dark-graphite-amber'));

  // Verify camouflage
  assert.ok(ids.includes('camo-woodland'));
  assert.ok(ids.includes('camo-naval'));
  assert.ok(ids.includes('camo-urban'));
  assert.ok(ids.includes('camo-desert'));
  assert.ok(ids.includes('camo-tactical-black'));
});

test('Camouflage themes have pattern classes and solid surfaces', () => {
  const camos = THEME_PRESETS.filter((p) => p.category === 'camouflage');
  assert.equal(camos.length, 5);
  for (const c of camos) {
    assert.ok(c.colors.camoPattern, `Camouflage theme ${c.id} must define a camoPattern class`);
    assert.ok(c.colors.surface, `Camouflage theme ${c.id} must define a solid surface color`);
    assert.ok(c.colors.text, `Camouflage theme ${c.id} must define a readable text color`);
  }
});

test('Default settings are sane and safe', () => {
  assert.equal(DEFAULT_THEME_ID, 'blue-white');
  assert.equal(DEFAULT_TOP_LOGO.position, 'top-left');
  assert.equal(DEFAULT_BOTTOM_LOGO.position, 'bottom-left');
  assert.equal(DEFAULT_ACCESSIBILITY_SETTINGS.textSize, '100');
  assert.equal(DEFAULT_ACCESSIBILITY_SETTINGS.contrast, 'normal');
});
