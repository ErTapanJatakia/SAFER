import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LiveAnnouncer } from './LiveAnnouncer';

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
});

describe('LiveAnnouncer', () => {
  it('exposes one polite, atomic live region for the announcement text', () => {
    act(() => root.render(<LiveAnnouncer announcement="Incident report recorded." />));

    const region = host.querySelector('#a11y-live-region');
    expect(region).toBeTruthy();
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.getAttribute('aria-atomic')).toBe('true');
    expect(region?.textContent).toBe('Incident report recorded.');
    expect(host.querySelectorAll('[aria-live]').length).toBe(1);
  });

  it('clears the live region when there is no current announcement', () => {
    act(() => root.render(<LiveAnnouncer announcement="Saved." />));
    act(() => root.render(<LiveAnnouncer announcement={null} />));

    expect(host.querySelector('#a11y-live-region')?.textContent).toBe('');
  });
});
