import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useModalFocus } from './useModalFocus';

let dom: JSDOM;
let root: Root;
let host: HTMLDivElement;

function ModalHarness() {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useModalFocus<HTMLDivElement>(isOpen, () => setIsOpen(false));

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open settings</button>
      {isOpen && (
        <div ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1}>
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </div>
      )}
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

describe('useModalFocus', () => {
  it('moves focus into the modal and restores it to the opener on close', () => {
    const opener = host.querySelector('button')!;
    opener.focus();
    act(() => opener.click());

    const actions = host.querySelectorAll<HTMLButtonElement>('[role="dialog"] button');
    expect(document.activeElement).toBe(actions[0]);

    act(() => actions[1].click());
    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));

    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('wraps Tab and Shift+Tab at the modal boundaries', () => {
    const opener = host.querySelector('button')!;
    act(() => opener.click());
    const actions = host.querySelectorAll<HTMLButtonElement>('[role="dialog"] button');
    const first = actions[0];
    const last = actions[1];

    last.focus();
    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(first);

    first.focus();
    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(last);
  });
});
