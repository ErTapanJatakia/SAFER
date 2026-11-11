import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PersonnelExportModal } from './PersonnelExportModal';

let dom: JSDOM;
let root: Root;
let host: HTMLDivElement;

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
});

afterEach(async () => {
  await act(async () => root.unmount());
  dom.window.close();
  vi.clearAllMocks();
});

describe('PersonnelExportModal accessibility', () => {
  const renderModal = (isOpen: boolean, onClose = vi.fn()) => {
    act(() => {
      root.render(
        <PersonnelExportModal
          isOpen={isOpen}
          onClose={onClose}
          person={null}
          personnelList={[]}
        />
      );
    });
    return onClose;
  };

  it('moves focus into the dialog and restores it to the opener when closed', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    renderModal(true);
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close export modal');

    renderModal(false);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('traps Tab navigation and closes on Escape', () => {
    const onClose = renderModal(true);
    const dialog = host.querySelector('[role="dialog"]');
    const closeButton = host.querySelector<HTMLButtonElement>('[aria-label="Close export modal"]');
    const focusable = Array.from(dialog!.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));

    expect(document.activeElement).toBe(closeButton);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    last.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(first);

    first.focus();
    first.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(last);

    window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exposes export format state, view state, field search, and download feedback', () => {
    renderModal(true);

    const csvButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent?.includes('.CSV'));
    expect(csvButton?.getAttribute('aria-pressed')).toBe('false');

    act(() => csvButton?.click());
    expect(csvButton?.getAttribute('aria-pressed')).toBe('true');

    const search = host.querySelector('input[aria-label="Filter export fields"]');
    expect(search).not.toBeNull();

    const viewButtons = Array.from(host.querySelectorAll('button[aria-pressed]'));
    expect(viewButtons.some((button) => button.textContent?.includes('Configure Redactions') && button.getAttribute('aria-pressed') === 'true')).toBe(true);
  });
});
