import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LiveAnnouncer } from './LiveAnnouncer';

let host: HTMLDivElement;
let root: Root;

const renderAnnouncement = (announcement: string | null) => {
  act(() => {
    root.render(<LiveAnnouncer announcement={announcement} />);
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

describe('LiveAnnouncer accessibility', () => {
  it('exposes a polite, atomic status region for assistive technology', () => {
    renderAnnouncement('Personnel record saved.');
    const region = host.querySelector('[role="status"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.getAttribute('aria-atomic')).toBe('true');
    expect(region?.textContent).toBe('Personnel record saved.');
  });

  it('updates the same persistent live region when a new announcement arrives', () => {
    renderAnnouncement('Personnel record saved.');
    const region = host.querySelector('[role="status"]');
    renderAnnouncement('Incident report recorded.');
    expect(host.querySelector('[role="status"]')).toBe(region);
    expect(region?.textContent).toBe('Incident report recorded.');
  });

  it('clears announcement content without removing the live region', () => {
    renderAnnouncement('Personnel record saved.');
    const region = host.querySelector('[role="status"]');
    renderAnnouncement(null);
    expect(host.querySelector('[role="status"]')).toBe(region);
    expect(region?.textContent).toBe('');
  });
});
