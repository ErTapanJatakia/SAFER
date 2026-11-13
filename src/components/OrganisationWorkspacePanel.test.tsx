import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {OrganisationWorkspacePanel} from './OrganisationWorkspacePanel';

let dom: JSDOM;
let host: HTMLElement;
let root: Root;

beforeEach(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', {url: 'http://localhost'});
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  dom.window.close();
});

describe('OrganisationWorkspacePanel', () => {
  it('shows the exact verified organisation locator and role without claiming workspace release', async () => {
    await act(async () => root.render(
      <OrganisationWorkspacePanel database={null} membership={{uid: 'user-a', orgId: 'org-alpha', role: 'owner', status: 'active'}} />,
    ));
    expect(host.textContent).toContain('org-alpha');
    expect(host.textContent).toContain('Organisation owner');
    expect(host.textContent).toContain('Membership verified');
    expect(host.textContent).toContain('Operational workspace access is not released');
    expect(host.textContent).toContain('informational UI guidance');
    expect(host.querySelector('table')).not.toBeNull();
    expect(host.querySelector('th[scope="col"]')?.textContent).toContain('Capability');
  });

  it.each(['manager', 'viewer'] as const)('shows no tenant operational capabilities for %s roles', async (role) => {
    await act(async () => root.render(
      <OrganisationWorkspacePanel database={null} membership={{uid: 'user-a', orgId: 'org-readonly', role, status: 'active'}} />,
    ));
    const rows = [...host.querySelectorAll('tbody tr')];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.textContent?.includes('Not granted'))).toBe(true);
    expect(host.textContent).toContain('Read personnel records');
  });

  it('never advertises membership administration or audit access for any role', async () => {
    for (const role of ['owner', 'admin', 'manager', 'viewer'] as const) {
      await act(async () => root.render(
        <OrganisationWorkspacePanel database={null} membership={{uid: 'user-a', orgId: 'org-safe', role, status: 'active'}} />,
      ));
      const rows = [...host.querySelectorAll('tbody tr')];
      const membership = rows.find((row) => row.textContent?.includes('Manage memberships'));
      const audit = rows.find((row) => row.textContent?.includes('Read audit events'));
      expect(membership?.textContent).toContain('Not granted');
      expect(audit?.textContent).toContain('Not granted');
    }
  });

  it('does not display a simulated audit feed or organisation switching controls', async () => {
    await act(async () => root.render(
      <OrganisationWorkspacePanel database={null} membership={{uid: 'user-a', orgId: 'org-safe', role: 'owner', status: 'active'}} />,
    ));
    expect(host.textContent).toContain('No audit feed or simulated activity is displayed');
    expect(host.querySelector('button')).toBeNull();
  });
});
