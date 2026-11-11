import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessibilityMenuModal } from './AccessibilityMenuModal';
import { DEFAULT_ACCESSIBILITY_SETTINGS } from '../utils/themePresets';

let dom: JSDOM;
let root: Root;
let host: HTMLDivElement;
let onUpdateSettings: ReturnType<typeof vi.fn>;

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
  onUpdateSettings = vi.fn();
  act(() => root.render(
    <AccessibilityMenuModal
      isOpen
      onClose={vi.fn()}
      settings={DEFAULT_ACCESSIBILITY_SETTINGS}
      onUpdateSettings={onUpdateSettings}
      onResetSettings={vi.fn()}
    />
  ));
});

afterEach(async () => {
  await act(async () => root.unmount());
  dom.window.close();
});

describe('AccessibilityMenuModal preferences', () => {
  it('exposes selected colour-scheme, line-spacing, and letter-spacing options as pressed states', () => {
    expect(host.querySelector('button[aria-pressed="true"]')?.textContent).toBe('100%');
    expect(Array.from(host.querySelectorAll('button[aria-pressed="true"]')).map((button) => button.textContent))
      .toEqual(expect.arrayContaining(['100%', 'auto', 'normal', 'Standard Spacing']));
  });

  it('updates browser control colour scheme without claiming to change the SAFER theme', () => {
    const darkButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'dark');
    expect(darkButton).toBeTruthy();
    act(() => darkButton!.click());
    expect(onUpdateSettings).toHaveBeenCalledWith({ colorMode: 'dark' });
    expect(host.textContent).toContain("the SAFER theme palette remains unchanged");
  });

  it('states that preferences do not certify WCAG conformance', () => {
    expect(host.textContent).toContain('do not certify WCAG conformance');
    expect(host.textContent).not.toContain('This interface implements WCAG 2.2 AA accessibility practices');
  });
});
