import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CyberHygieneView } from './CyberHygieneView';

let host: HTMLDivElement;
let root: Root;

const renderView = () => {
  act(() => {
    root.render(
      <CyberHygieneView
        items={[]}
        onUpdateStatus={vi.fn()}
        onRunAudit={vi.fn()}
      />
    );
  });
};

const tab = (name: string) => host.querySelector(`[data-cyber-tab="${name}"]`) as HTMLButtonElement;

const press = (element: HTMLElement, key: string) => {
  act(() => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
};

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Cyber Hygiene tabs accessibility', () => {
  it('exposes a labelled tablist with selected tab and linked tab panel', () => {
    renderView();
    const tablist = host.querySelector('[role="tablist"][aria-label="Cyber hygiene sections"]');
    expect(tablist).not.toBeNull();
    expect(tab('checklist').getAttribute('aria-selected')).toBe('true');
    expect(tab('checklist').getAttribute('aria-controls')).toBe('cyber-panel-checklist');
    expect(tab('checklist').tabIndex).toBe(0);
    expect(tab('phishing').tabIndex).toBe(-1);

    const panel = host.querySelector('#cyber-panel-checklist[role="tabpanel"]');
    expect(panel?.getAttribute('aria-labelledby')).toBe('cyber-tab-checklist');
  });

  it('supports arrow-key navigation with roving focus and selection', () => {
    renderView();
    tab('checklist').focus();
    press(tab('checklist'), 'ArrowRight');
    expect(document.activeElement).toBe(tab('phishing'));
    expect(tab('phishing').getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('#cyber-panel-phishing[role="tabpanel"]')).not.toBeNull();

    press(tab('phishing'), 'ArrowRight');
    expect(document.activeElement).toBe(tab('summary'));
    expect(tab('summary').getAttribute('aria-selected')).toBe('true');

    press(tab('summary'), 'ArrowRight');
    expect(document.activeElement).toBe(tab('checklist'));
    expect(tab('checklist').getAttribute('aria-selected')).toBe('true');
  });

  it('supports Home and End keys to reach the first and last tab', () => {
    renderView();
    press(tab('checklist'), 'End');
    expect(document.activeElement).toBe(tab('summary'));
    expect(tab('summary').getAttribute('aria-selected')).toBe('true');

    press(tab('summary'), 'Home');
    expect(document.activeElement).toBe(tab('checklist'));
    expect(tab('checklist').getAttribute('aria-selected')).toBe('true');
  });
});
