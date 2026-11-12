import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CyberHygieneView } from './CyberHygieneView';

let host: HTMLDivElement;
let root: Root;

const renderView = (items: React.ComponentProps<typeof CyberHygieneView>['items'] = []) => {
  act(() => {
    root.render(
      <CyberHygieneView
        items={items}
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
  it('exposes phishing scenarios as labelled pressed-state controls and announces selection', () => {
    renderView();
    act(() => tab('phishing').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const group = host.querySelector('[role="group"][aria-label="Phishing training scenarios"]');
    expect(group).not.toBeNull();

    const scenarios = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-phish-scenario]'));
    expect(scenarios.length).toBeGreaterThan(1);
    expect(scenarios[0].getAttribute('aria-pressed')).toBe('true');
    expect(scenarios[1].getAttribute('aria-pressed')).toBe('false');
    expect(scenarios[1].getAttribute('aria-label')).toMatch(/^Load scenario 2:/);

    act(() => scenarios[1].dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(scenarios[0].getAttribute('aria-pressed')).toBe('false');
    expect(scenarios[1].getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[role="status"][aria-live="polite"]')?.textContent).toContain('Scenario 2 of');
    expect(host.querySelector('[role="status"][aria-live="polite"]')?.getAttribute('aria-atomic')).toBe('true');
  });

  it('announces phishing analysis and simulated reporting state to assistive technology', () => {
    renderView();
    act(() => tab('phishing').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const inspect = host.querySelector<HTMLButtonElement>('button[aria-label="Inspect phishing indicators"]');
    expect(inspect).not.toBeNull();
    expect(inspect?.getAttribute('aria-expanded')).toBe('false');
    expect(inspect?.getAttribute('aria-controls')).toBe('phishing-indicators');

    act(() => inspect?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(inspect?.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('#phishing-indicators[role="region"][aria-label="Phishing indicators and recommended response"]')).not.toBeNull();

    const report = host.querySelector<HTMLButtonElement>('[data-phish-report]');
    expect(report?.textContent).toContain('Report as Phishing to Ops SOC');
    act(() => report?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const feedback = Array.from(host.querySelectorAll('[role="status"][aria-live="polite"]'))
      .find((element) => element.textContent?.includes('Simulated report submitted'));
    expect(feedback).not.toBeUndefined();
  });

  it('announces live result counts when defensive control filters change', () => {
    const items = [{
      id: 'cyber-a11y-01',
      domain: 'Multi-factor authentication' as const,
      title: 'MFA enforcement',
      recommendation: 'Require MFA for privileged accounts.',
      plainEnglishExplanation: 'MFA adds a second verification factor.',
      status: 'Completed' as const,
      itemType: 'General Recommendation' as const,
      findingNotes: '',
      lastChecked: '12-11-2026',
      verifiedBy: null,
    }];
    renderView(items);

    const resultStatus = host.querySelector('[data-cyber-filter-results][role="status"][aria-live="polite"]');
    expect(resultStatus?.textContent).toContain('Showing 1 of 1 defensive controls');
    expect(resultStatus?.getAttribute('aria-atomic')).toBe('true');

    const statusFilter = host.querySelector<HTMLSelectElement>('select[aria-label="Filter by Status"]');
    expect(statusFilter).not.toBeNull();
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
      setter?.call(statusFilter, 'Outstanding');
      statusFilter?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(resultStatus?.textContent).toContain('Showing 0 of 1 defensive controls');
  });

});
