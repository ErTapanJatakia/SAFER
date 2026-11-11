import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SearchableMultiSelect } from './SearchableMultiSelect';

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

describe('SearchableMultiSelect accessibility', () => {
  const renderControl = (error: string | null = null) => {
    act(() => {
      root.render(
        <SearchableMultiSelect
          label="Operational roles"
          options={['Security Officer', 'Incident Commander']}
          selectedValues={['Security Officer']}
          onChange={() => undefined}
          required
          error={error}
        />
      );
    });
  };

  it('uses a native button with an accessible name and disclosure state', () => {
    renderControl();
    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Choose Operational roles"]');
    expect(trigger).not.toBeNull();
    expect(trigger?.type).toBe('button');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(trigger?.getAttribute('aria-controls')).toBeTruthy();
  });

  it('opens with search focus and closes on Escape while restoring trigger focus', () => {
    renderControl();
    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Choose Operational roles"]')!;
    act(() => trigger.click());

    const search = host.querySelector<HTMLInputElement>('input[aria-label="Search Operational roles options"]');
    expect(search).not.toBeNull();
    expect(document.activeElement).toBe(search);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    act(() => {
      document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    expect(host.querySelector('[role="group"]')).toBeNull();
  });

  it('associates validation feedback with the trigger and exposes the error', () => {
    renderControl('Select at least one operational role.');
    const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="Choose Operational roles"]')!;
    const error = host.querySelector<HTMLElement>('[role="alert"]');

    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(trigger.getAttribute('aria-describedby')).toBe(error?.id);
    expect(error?.textContent).toContain('Select at least one operational role.');
    expect(host.querySelector('input[aria-label="Search Operational roles options"]')).toBeNull();
  });
});
