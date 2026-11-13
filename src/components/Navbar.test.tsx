import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Navbar, type NavigationSection } from './Navbar';

let host: HTMLDivElement;
let root: Root;
let onSelectSection: (section: NavigationSection) => void;

const renderNavbar = (activeSection: NavigationSection = 'dashboard') => {
  act(() => {
    root.render(
      <Navbar
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        personnelReviewCount={2}
        openIncidentsCount={1}
        outstandingChecklistCount={3}
      />
    );
  });
};

const mobileMenuButton = () => host.querySelector('button[aria-label="Toggle navigation menu"]') as HTMLButtonElement;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  onSelectSection = vi.fn<(section: NavigationSection) => void>();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Navbar accessibility', () => {
  it('exposes a named primary navigation landmark and current desktop page', () => {
    renderNavbar('personnel');
    const nav = host.querySelector('nav[aria-label="Primary navigation"]');
    expect(nav).not.toBeNull();
    const personnelButton = [...nav!.querySelectorAll('button')].find(
      (button) => button.textContent?.includes('2. Personnel Readiness')
    );
    expect(personnelButton?.getAttribute('aria-current')).toBe('page');
    const dashboardButton = [...nav!.querySelectorAll('button')].find(
      (button) => button.textContent?.includes('1. Dashboard')
    );
    expect(dashboardButton?.hasAttribute('aria-current')).toBe(false);
  });

  it('exposes mobile menu state and identifies the active section', () => {
    renderNavbar('incidents');
    const menuButton = mobileMenuButton();
    expect(menuButton.tagName).toBe('BUTTON');
    expect(menuButton.getAttribute('aria-expanded')).toBe('false');

    act(() => menuButton.click());

    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    expect(menuButton.getAttribute('aria-controls')).toBe('safer-mobile-navigation');
    const mobileNav = host.querySelector('#safer-mobile-navigation');
    expect(mobileNav).not.toBeNull();
    const activeButton = [...mobileNav!.querySelectorAll('button')].find(
      (button) => button.textContent?.includes('3. Incident Reports')
    );
    expect(activeButton?.getAttribute('aria-current')).toBe('page');
  });

  it('selects a mobile section and closes the menu', () => {
    renderNavbar();
    act(() => mobileMenuButton().click());
    const mobileNav = host.querySelector('#safer-mobile-navigation')!;
    const incidentsButton = [...mobileNav.querySelectorAll('button')].find(
      (button) => button.textContent?.includes('3. Incident Reports')
    ) as HTMLButtonElement;

    act(() => incidentsButton.click());

    expect(onSelectSection).toHaveBeenCalledWith('incidents');
    expect(mobileMenuButton().getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('#safer-mobile-navigation')).toBeNull();
  });
});
