import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessibilityMenuModal } from './AccessibilityMenuModal';
import { speakAccessibilityAnnouncement, type SpeechRuntime } from '../utils/speech.ts';

let dom: JSDOM;
let root: Root;
let host: HTMLDivElement;
const onUpdateSettings = vi.fn();

const settings = {
  textSize: '100' as const,
  contrast: 'normal' as const,
  colorMode: 'auto' as const,
  reducedMotion: false,
  focusRing: false,
  largeTargets: false,
  lineSpacing: 'normal' as const,
  letterSpacing: 'normal' as const,
  dyslexicFont: false,
  spokenAnnouncements: false,
  speechRate: 'normal' as const,
  speechVolume: 'high' as const,
};

function ModalHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open accessibility settings</button>
      <AccessibilityMenuModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onResetSettings={vi.fn()}
      />
    </>
  );
}

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  onUpdateSettings.mockClear();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<ModalHarness />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  delete (globalThis as any).SpeechSynthesisUtterance;
  dom.window.close();
});

describe('AccessibilityMenuModal focus management', () => {
  it('moves focus into the labelled dialog and restores the opener after Escape', () => {
    const opener = host.querySelector('button')!;
    opener.focus();
    act(() => opener.click());

    const dialog = host.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('accessibility-menu-title');
    expect(document.activeElement).toBe(dialog?.querySelector('button'));

    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    })));

    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('wraps Tab and Shift+Tab at the dialog boundaries', () => {
    const opener = host.querySelector('button')!;
    act(() => opener.click());

    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
    const actions = dialog.querySelectorAll<HTMLButtonElement>('button');
    const first = actions[0];
    const last = actions[actions.length - 1];

    last.focus();
    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
    })));
    expect(document.activeElement).toBe(first);

    first.focus();
    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    })));
    expect(document.activeElement).toBe(last);
  });
});


describe('AccessibilityMenuModal spoken audio controls', () => {
  it('keeps spoken announcements unavailable when the browser has no speech engine', () => {
    act(() => host.querySelector('button')!.click());
    expect(host.textContent).toContain('Speech synthesis is not available in this browser');
    const toggle = Array.from(host.querySelectorAll('button')).find((button) => button.textContent?.includes('Spoken Announcements Off'));
    expect(toggle?.hasAttribute('disabled')).toBe(true);
  });

  it('exposes opt-in controls and adjustable speech rate and volume when supported', () => {
    class FakeUtterance { constructor(public text: string) {} }
    Object.assign(globalThis, { SpeechSynthesisUtterance: FakeUtterance });
    Object.defineProperty(dom.window, 'speechSynthesis', {
      configurable: true,
      value: { cancel: vi.fn(), speak: vi.fn() },
    });
    act(() => host.querySelector('button')!.click());
    const toggle = Array.from(host.querySelectorAll('button')).find((button) => button.textContent?.includes('Spoken Announcements Off'))!;
    act(() => toggle.click());
    expect(onUpdateSettings).toHaveBeenCalledWith({ spokenAnnouncements: true });
  });

  it('keeps speech opt-in and applies the configured speech rate and volume', () => {
    const spoken: Array<{ text: string; rate: number; volume: number }> = [];
    let cancelled = 0;
    class FakeUtterance {
      rate = 1;
      volume = 1;
      constructor(public text: string) {}
    }
    const runtime = {
      speechSynthesis: { cancel: () => { cancelled += 1; }, speak: (utterance: FakeUtterance) => spoken.push(utterance) },
      SpeechSynthesisUtterance: FakeUtterance,
    } as unknown as SpeechRuntime;
    expect(speakAccessibilityAnnouncement('Silent by default', {
      spokenAnnouncements: false, speechRate: 'normal', speechVolume: 'high',
    }, runtime)).toBe(false);
    expect(speakAccessibilityAnnouncement('Ready', {
      spokenAnnouncements: true, speechRate: 'slow', speechVolume: 'low',
    }, runtime)).toBe(true);
    expect(cancelled).toBe(1);
    expect(spoken[0]).toMatchObject({ text: 'Ready', rate: 0.85, volume: 0.4 });
  });
});
