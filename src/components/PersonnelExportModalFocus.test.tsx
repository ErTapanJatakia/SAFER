import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PersonnelExportModal } from './PersonnelExportModal';

let dom: JSDOM;
let root: Root;
let host: HTMLDivElement;

function ModalHarness() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open personnel export</button>
      <PersonnelExportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        person={null}
        personnelList={[]}
      />
    </>
  );
}

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
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

describe('PersonnelExportModal focus management', () => {
  it('moves focus into the labelled export dialog and restores its opener after Escape', () => {
    const opener = host.querySelector<HTMLButtonElement>('button')!;
    opener.focus();
    act(() => opener.click());

    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('export-modal-title');
    const actions = dialog.querySelectorAll<HTMLButtonElement>('button');
    expect(document.activeElement).toBe(actions[0]);

    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    })));

    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('loads validated local export format and redaction defaults when opened', () => {
    window.localStorage.setItem('safer_account_settings_v1', JSON.stringify({
      preferences: { defaultExportFormat: 'pdf', defaultRedactionLevel: 'strict' },
    }));
    const opener = host.querySelector<HTMLButtonElement>('button')!;
    act(() => opener.click());

    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
    const pdfButton = [...dialog.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('.PDF'));
    expect(pdfButton?.className).toContain('bg-blue-900');
    expect(dialog.textContent).toContain('Reset to Saved Defaults');
  });

  it('wraps forward and reverse keyboard focus within the export dialog', () => {
    const opener = host.querySelector<HTMLButtonElement>('button')!;
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
