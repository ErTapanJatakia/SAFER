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
  assert.equal(DEFAULT_ACCESSIBILITY_SETTINGS.spokenAnnouncements, false);
  assert.equal(DEFAULT_ACCESSIBILITY_SETTINGS.speechRate, 'normal');
  assert.equal(DEFAULT_ACCESSIBILITY_SETTINGS.speechVolume, 'high');
});

test('spoken announcement helper is opt-in and applies selected rate and volume', async () => {
  const { speakAccessibilityAnnouncement } = await import('./speech.ts');
  const spoken: Array<{ text: string; rate: number; volume: number }> = [];
  let cancelled = 0;
  class FakeUtterance {
    rate = 1;
    volume = 1;
    constructor(public text: string) {}
  }
  const runtime = {
    speechSynthesis: {
      cancel: () => { cancelled += 1; },
      speak: (utterance: FakeUtterance) => spoken.push(utterance),
    },
    SpeechSynthesisUtterance: FakeUtterance,
  } as unknown as import('./speech.ts').SpeechRuntime;
  assert.equal(speakAccessibilityAnnouncement('Not spoken', {
    spokenAnnouncements: false, speechRate: 'normal', speechVolume: 'high',
  }, runtime), false);
  assert.equal(spoken.length, 0);
  assert.equal(speakAccessibilityAnnouncement('Ready', {
    spokenAnnouncements: true, speechRate: 'slow', speechVolume: 'low',
  }, runtime), true);
  assert.equal(cancelled, 1);
  assert.equal(spoken[0].text, 'Ready');
  assert.equal(spoken[0].rate, 0.85);
  assert.equal(spoken[0].volume, 0.4);
});

test('spoken announcement helper safely handles unavailable speech engines', async () => {
  const { speakAccessibilityAnnouncement } = await import('./speech.ts');
  assert.equal(speakAccessibilityAnnouncement('Ready', {
    spokenAnnouncements: true, speechRate: 'normal', speechVolume: 'high',
  }, undefined), false);
});
