import React, { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useModalFocus } from './useModalFocus';

let dom: JSDOM;
let root: Root;
let host: HTMLDivElement;

function ModalHarness() {
  const [isOpen, setIsOpen] = React.useState(false);
  const modalRef = useModalFocus<HTMLDivElement>(isOpen, () => setIsOpen(false));

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>Open settings</button>
      {isOpen && (
        <div ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1}>
          <button type="button" disabled>Disabled action</button>
          <button type="button" hidden>Hidden action</button>
          <div aria-hidden="true"><button type="button">Hidden from assistive technology</button></div>
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </div>
      )}
    </>
  );
}

function InitiallyOpenModalHarness() {
  const modalRef = useModalFocus<HTMLDivElement>(true, () => undefined);
  return (
    <div ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1}>
      <button type="button">Modal action</button>
    </div>
  );
}

function CustomInitialFocusHarness() {
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const modalRef = useModalFocus<HTMLDivElement>(true, () => undefined, initialFocusRef);
  return (
    <div ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1}>
      <button type="button">Close</button>
      <button ref={initialFocusRef} type="button">I Understand</button>
    </div>
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
  it('moves focus to the first eligible control and restores it to the opener on close', () => {
    const opener = host.querySelector('button')!;
    opener.focus();
    act(() => opener.click());

    const actions = host.querySelectorAll<HTMLButtonElement>('[role="dialog"] button');
    expect(document.activeElement).toBe(actions[3]);

    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));

    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('wraps Tab and Shift+Tab across eligible modal controls', () => {
    const opener = host.querySelector('button')!;
    act(() => opener.click());
    const actions = host.querySelectorAll<HTMLButtonElement>('[role="dialog"] button');
    const first = actions[3];
    const last = actions[4];

    last.focus();
    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(first);

    first.focus();
    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(last);
  });

  it('honours a valid custom initial-focus target inside the modal', () => {
    act(() => root.render(<CustomInitialFocusHarness />));
    expect(document.activeElement).toBe(host.querySelector('button:nth-of-type(2)'));
    expect(document.activeElement?.textContent).toBe('I Understand');
  });

  it('restores focus to a connected opener when the modal component unmounts', () => {
    const externalOpener = document.createElement('button');
    externalOpener.textContent = 'Open modal';
    document.body.appendChild(externalOpener);
    externalOpener.focus();

    act(() => root.render(<InitiallyOpenModalHarness />));
    expect(document.activeElement).toBe(host.querySelector('[role="dialog"] button'));

    act(() => root.render(null));
    expect(document.activeElement).toBe(externalOpener);

    externalOpener.remove();
  });
});
