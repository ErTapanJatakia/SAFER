import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessibilityMenuModal } from './AccessibilityMenuModal';

let dom: JSDOM;
let root: Root;
let host: HTMLDivElement;

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
        onUpdateSettings={vi.fn()}
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
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<ModalHarness />));
});

afterEach(async () => {
  await act(async () => root.unmount());
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
