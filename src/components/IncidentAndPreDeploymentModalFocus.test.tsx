import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IncidentDraftModal } from './IncidentDraftModal';
import { PreDeploymentSummaryModal } from './PreDeploymentSummaryModal';

let dom: JSDOM;
let root: Root;
let host: HTMLDivElement;

function ModalHarness() {
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIncidentOpen(true)}>Open incident draft</button>
      <button type="button" onClick={() => setSummaryOpen(true)}>Open pre-deployment summary</button>
      {incidentOpen && (
        <IncidentDraftModal
          isOpen={incidentOpen}
          onClose={() => setIncidentOpen(false)}
          onSaveToIncidentRoster={() => undefined}
        />
      )}
      {summaryOpen && (
        <PreDeploymentSummaryModal
          items={[]}
          onClose={() => setSummaryOpen(false)}
        />
      )}
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

describe('incident and pre-deployment modal focus management', () => {
  it('labels the incident draft dialog, traps focus, and restores its opener', () => {
    const opener = Array.from(host.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Open incident draft')
    )!;
    opener.focus();
    act(() => opener.click());

    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('incident-draft-dialog-title');
    const actions = dialog.querySelectorAll<HTMLButtonElement>('button');
    expect(document.activeElement).toBe(actions[0]);

    actions[actions.length - 1].focus();
    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(actions[0]);

    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('labels the pre-deployment summary dialog and restores focus after Escape', () => {
    const opener = Array.from(host.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Open pre-deployment summary')
    )!;
    opener.focus();
    act(() => opener.click());

    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('predeployment-summary-dialog-title');
    expect(document.activeElement).toBe(dialog.querySelector('button'));

    act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
