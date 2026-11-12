import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchableMultiSelect } from './SearchableMultiSelect';

let host: HTMLDivElement;
let root: Root;
let onChange: ReturnType<typeof vi.fn>;

const renderControl = (overrides: Partial<React.ComponentProps<typeof SearchableMultiSelect>> = {}) => {
  act(() => {
    root.render(
      <SearchableMultiSelect
        label="Operational roles"
        options={['Supervisor', 'Medic', 'Logistics Officer']}
        selectedValues={[]}
        onChange={onChange}
        {...overrides}
      />
    );
  });
};

const trigger = () => host.querySelector('button[aria-expanded]') as HTMLButtonElement;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  onChange = vi.fn();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('SearchableMultiSelect accessibility and interaction', () => {
  it('uses a native labelled button with disclosure state and required/error semantics', () => {
    renderControl({ required: true, error: 'Choose at least one role.' });
    const button = trigger();
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-required')).toBe('true');
    expect(button.getAttribute('aria-invalid')).toBe('true');
    expect(button.getAttribute('aria-describedby')).toBeTruthy();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Choose at least one role.');
  });

  it('opens the disclosure and moves focus to its labelled search field', async () => {
    renderControl();
    await act(async () => {
      trigger().click();
      await Promise.resolve();
    });
    const search = host.querySelector('input[placeholder="Filter list..."]') as HTMLInputElement;
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBeTruthy();
    expect(search.getAttribute('aria-label')).toBeNull();
    expect(search.labels?.[0]?.textContent).toContain('Filter Operational roles options');
    expect(document.activeElement).toBe(search);
    expect(host.querySelector('[role="group"]')).not.toBeNull();
  });

  it('closes on Escape and restores focus to the disclosure button', async () => {
    renderControl();
    await act(async () => {
      trigger().click();
      await Promise.resolve();
    });
    const search = host.querySelector('input[placeholder="Filter list..."]') as HTMLInputElement;
    await act(async () => {
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger());
    expect(host.querySelector('[role="group"]')).toBeNull();
  });

  it('exposes selected values as removable controls and announces the selection count', () => {
    renderControl({ selectedValues: ['Supervisor'] });
    expect(host.querySelector('[aria-live="polite"]')?.textContent).toContain('1 selected');
    const remove = host.querySelector('button[aria-label="Remove Supervisor"]') as HTMLButtonElement;
    act(() => remove.click());
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('keeps native checkbox semantics for multi-selection and supports custom values', async () => {
    renderControl();
    await act(async () => {
      trigger().click();
      await Promise.resolve();
    });
    const checkbox = [...host.querySelectorAll('input[type="checkbox"]')].find(
      (input) => input.parentElement?.textContent?.includes('Medic')
    ) as HTMLInputElement;
    act(() => checkbox.click());
    expect(onChange).toHaveBeenCalledWith(['Medic']);

    const addCustom = [...host.querySelectorAll('button')].find(
      (button) => button.textContent?.includes('Add custom / unlisted option')
    ) as HTMLButtonElement;
    act(() => addCustom.click());
    const custom = host.querySelector('input[placeholder="Enter custom title..."]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) {
      act(() => {
        setter.call(custom, 'Incident Coordinator');
        custom.dispatchEvent(new Event('input', { bubbles: true }));
        custom.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    const add = [...host.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Add') as HTMLButtonElement;
    act(() => add.click());
    expect(onChange).toHaveBeenCalledWith(['Incident Coordinator']);
  });

  it('closes when Done is activated and returns focus to the trigger', async () => {
    renderControl();
    await act(async () => {
      trigger().click();
      await Promise.resolve();
    });
    const done = [...host.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Done') as HTMLButtonElement;
    act(() => done.click());
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger());
  });
});
