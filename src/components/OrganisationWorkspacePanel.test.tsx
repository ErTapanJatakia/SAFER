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
    expect(host.textContent).toContain('Membership verified at check time');
    expect(host.textContent).toContain('Active when checked');
    expect(host.textContent).toContain('point-in-time result, not continuous monitoring');
    expect(host.textContent).toContain('re-evaluate each database request');
    expect(host.textContent).toContain('Operational workspace access is not released');
    expect(host.textContent).toContain('informational UI guidance');
    expect(host.textContent).toContain('does not mean the corresponding SAFER screen or workflow is released');
    expect(host.textContent).toContain('Permitted by current Rules');
    expect(host.querySelector('table')).not.toBeNull();
    expect(host.querySelector('th[scope="col"]')?.textContent).toContain('Capability');
  });

  it.each(['manager', 'viewer'] as const)('shows no tenant operational capabilities for %s roles', async (role) => {
    await act(async () => root.render(
      <OrganisationWorkspacePanel database={null} membership={{uid: 'user-a', orgId: 'org-readonly', role, status: 'active'}} />,
    ));
    const rows = [...host.querySelectorAll('tbody tr')];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.textContent?.includes('Not permitted by current Rules'))).toBe(true);
    expect(host.textContent).toContain('Read personnel records');
  });

  it('shows destructive, evidence-write, membership and audit operations as denied for owner and admin', async () => {
    for (const role of ['owner', 'admin'] as const) {
      await act(async () => root.render(
        <OrganisationWorkspacePanel database={null} membership={{uid: 'user-a', orgId: 'org-safe', role, status: 'active'}} />,
      ));
      const rows = [...host.querySelectorAll('tbody tr')];
      for (const label of [
        'Delete personnel records',
        'Delete incident records',
        'Create, update or delete evidence records',
        'Manage memberships',
        'Read audit events',
        'Append or modify audit events',
      ]) {
        const row = rows.find((candidate) => candidate.textContent?.includes(label));
        expect(row?.textContent).toContain('Not permitted by current Rules');
      }
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
