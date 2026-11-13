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
    expect(host.textContent).toContain('owner');
    expect(host.textContent).toContain('Membership verified');
    expect(host.textContent).toContain('Operational workspace access is not released');
    expect(host.textContent).toContain('informational UI guidance');
  });

  it('shows no tenant operational capabilities for manager and viewer roles', async () => {
    for (const role of ['manager', 'viewer'] as const) {
      await act(async () => root.render(
        <OrganisationWorkspacePanel database={null} membership={{uid: 'user-a', orgId: 'org-readonly', role, status: 'active'}} />,
      ));
      const list = host.querySelector('ul');
      expect(list).not.toBeNull();
      expect(list?.textContent).toContain('Read personnel records');
      expect(host.textContent).toContain('Not available in current rules model');
    }
  });

  it('never advertises membership administration or audit access for any role', async () => {
    for (const role of ['owner', 'admin', 'manager', 'viewer'] as const) {
      await act(async () => root.render(
        <OrganisationWorkspacePanel database={null} membership={{uid: 'user-a', orgId: 'org-safe', role, status: 'active'}} />,
      ));
      const items = [...host.querySelectorAll('li')];
      const membership = items.find((item) => item.textContent?.includes('Manage memberships'));
      const audit = items.find((item) => item.textContent?.includes('Read audit events'));
      expect(membership?.textContent).toContain('—');
      expect(audit?.textContent).toContain('—');
    }
  });
});
