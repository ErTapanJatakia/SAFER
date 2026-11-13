import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {OrganisationProfilePanel} from './OrganisationProfilePanel';
import {readOrganisationProfile} from '../lib/organisationProfile';

vi.mock('../lib/organisationProfile', () => ({readOrganisationProfile: vi.fn()}));

let dom: JSDOM;
let host: HTMLElement;
let root: Root;
const database = {} as any;
const member = (role: 'owner' | 'admin' | 'manager' | 'viewer') => ({
  uid: 'user-a', orgId: 'org-alpha', role, status: 'active' as const,
});

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', {url: 'http://localhost'});
  Object.assign(globalThis, {window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true});
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  vi.clearAllMocks();
});

afterEach(async () => {
  await act(async () => root.unmount());
  dom.window.close();
});

describe('OrganisationProfilePanel', () => {
  it('renders the validated read-only profile for an owner', async () => {
    vi.mocked(readOrganisationProfile).mockResolvedValue({
      orgId: 'org-alpha', displayName: 'Alpha Operations', status: 'active', schemaVersion: 1,
    });
    await act(async () => root.render(<OrganisationProfilePanel database={database} membership={member('owner')} />));
    expect(readOrganisationProfile).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('Alpha Operations');
    expect(host.textContent).toContain('Read-only profile metadata');
  });

  it('renders the validated read-only profile for an admin', async () => {
    vi.mocked(readOrganisationProfile).mockResolvedValue({
      orgId: 'org-alpha', displayName: 'Alpha Operations', status: 'active', schemaVersion: 1,
    });
    await act(async () => root.render(<OrganisationProfilePanel database={database} membership={member('admin')} />));
    expect(readOrganisationProfile).toHaveBeenCalledTimes(1);
  });

  it.each(['manager', 'viewer'] as const)('never requests profile metadata for %s', async (role) => {
    await act(async () => root.render(<OrganisationProfilePanel database={database} membership={member(role)} />));
    expect(readOrganisationProfile).not.toHaveBeenCalled();
    expect(host.textContent).toContain('not available to this role');
  });

  it('does not show stale profile data after the selected organisation changes', async () => {
    vi.mocked(readOrganisationProfile).mockResolvedValue({
      orgId: 'org-alpha', displayName: 'Alpha Operations', status: 'active', schemaVersion: 1,
    });
    await act(async () => root.render(<OrganisationProfilePanel database={database} membership={member('owner')} />));
    vi.mocked(readOrganisationProfile).mockResolvedValue({
      orgId: 'org-beta', displayName: 'Beta Operations', status: 'active', schemaVersion: 1,
    });
    await act(async () => root.render(<OrganisationProfilePanel database={database} membership={{...member('owner'), orgId: 'org-beta'}} />));
    expect(host.textContent).toContain('Beta Operations');
    expect(host.textContent).not.toContain('Alpha Operations');
  });

  it('fails closed when the profile cannot be retrieved', async () => {
    vi.mocked(readOrganisationProfile).mockRejectedValue(new Error('unavailable'));
    await act(async () => root.render(<OrganisationProfilePanel database={database} membership={member('owner')} />));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('No cached or inferred profile details');
  });
});
