import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CyberHygieneSummaryModal } from './CyberHygieneSummaryModal';
import { ReadinessSummaryModal } from './ReadinessSummaryModal';

let dom: JSDOM;
let root: Root;
let host: HTMLDivElement;

function ModalHarness() {
  const [cyberOpen, setCyberOpen] = useState(false);
  const [readinessOpen, setReadinessOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setCyberOpen(true)}>Open Cyber Hygiene summary</button>
      <button type="button" onClick={() => setReadinessOpen(true)}>Open Readiness summary</button>
      <CyberHygieneSummaryModal isOpen={cyberOpen} onClose={() => setCyberOpen(false)} items={[]} />
      <ReadinessSummaryModal
        isOpen={readinessOpen}
        onClose={() => setReadinessOpen(false)}
        selectedPerson={null}
        roster={[]}
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

describe('summary modal focus management', () => {
  it('labels the Cyber Hygiene summary dialog, traps focus, and restores its opener', () => {
    const opener = Array.from(host.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Open Cyber Hygiene')
    )!;
    opener.focus();
    act(() => opener.click());

    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('cyber-hygiene-summary-title');
    const actions = dialog.querySelectorAll<HTMLButtonElement>('button');
    expect(document.activeElement).toBe(actions[0]);

    actions[actions.length - 1].focus();
    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(actions[0]);

    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('labels the Readiness summary dialog, traps reverse focus, and restores its opener', () => {
    const opener = Array.from(host.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Open Readiness')
    )!;
    opener.focus();
    act(() => opener.click());

    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('readiness-summary-title');
    const actions = dialog.querySelectorAll<HTMLButtonElement>('button');
    expect(document.activeElement).toBe(actions[0]);

    actions[0].focus();
    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    })));
    expect(document.activeElement).toBe(actions[actions.length - 1]);

    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
