import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getDoc, doc} from 'firebase/firestore';
import {readOrganisationProfile, OrganisationProfileError} from './organisationProfile';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...args: unknown[]) => args),
  getDoc: vi.fn(),
}));

const database = {} as any;
const membership = (role: 'owner' | 'admin' | 'manager' | 'viewer' = 'owner') => ({
  uid: 'user-a', orgId: 'org-alpha', role, status: 'active' as const,
});
const profile = {
  orgId: 'org-alpha', displayName: 'Alpha Operations', status: 'active', schemaVersion: 1,
};

beforeEach(() => vi.clearAllMocks());

describe('readOrganisationProfile', () => {
  it('reads the exact organisation document for an active owner', async () => {
    vi.mocked(getDoc).mockResolvedValue({exists: () => true, data: () => profile} as any);
    await expect(readOrganisationProfile(database, membership('owner'))).resolves.toEqual(profile);
    expect(doc).toHaveBeenCalledWith(database, 'organisations', 'org-alpha');
    expect(getDoc).toHaveBeenCalledTimes(1);
  });

  it('reads the exact organisation document for an active admin', async () => {
    vi.mocked(getDoc).mockResolvedValue({exists: () => true, data: () => profile} as any);
    await expect(readOrganisationProfile(database, membership('admin'))).resolves.toEqual(profile);
  });

  it.each(['manager', 'viewer'] as const)('does not issue a Firestore read for %s', async (role) => {
    await expect(readOrganisationProfile(database, membership(role))).rejects.toMatchObject({
      code: 'not-authorised',
    });
    expect(getDoc).not.toHaveBeenCalled();
    expect(doc).not.toHaveBeenCalled();
  });

  it('rejects a profile whose organisation ID does not match the verified membership', async () => {
    vi.mocked(getDoc).mockResolvedValue({exists: () => true, data: () => ({...profile, orgId: 'org-other'})} as any);
    await expect(readOrganisationProfile(database, membership())).rejects.toBeInstanceOf(OrganisationProfileError);
  });

  it('rejects malformed, inactive, oversized and unsupported profile schemas', async () => {
    const invalidProfiles = [
      {...profile, status: 'suspended'},
      {...profile, displayName: ' '},
      {...profile, displayName: 'x'.repeat(121)},
      {...profile, schemaVersion: 2},
      {...profile, unexpected: true},
      null,
    ];
    for (const invalid of invalidProfiles) {
      vi.mocked(getDoc).mockResolvedValue({exists: () => true, data: () => invalid} as any);
      await expect(readOrganisationProfile(database, membership())).rejects.toMatchObject({
        code: 'invalid-profile',
      });
    }
  });


  it('rejects accessor-backed, exotic, symbol-keyed and hostile proxy profile values without running getters', async () => {
    let getterExecuted = false;
    const accessor = Object.defineProperties({}, {
      orgId: {enumerable: true, value: 'org-alpha'},
      displayName: {enumerable: true, get() { getterExecuted = true; return 'Alpha Operations'; }},
      status: {enumerable: true, value: 'active'},
      schemaVersion: {enumerable: true, value: 1},
    });
    const exotic = Object.assign(Object.create({inherited: true}), profile);
    const symbolKeyed = {...profile, [Symbol('unexpected')]: true};
    const hostileProxy = new Proxy(profile, {
      ownKeys() { throw new Error('inspection trap'); },
    });

    for (const invalid of [accessor, exotic, symbolKeyed, hostileProxy]) {
      vi.mocked(getDoc).mockResolvedValue({exists: () => true, data: () => invalid} as any);
      await expect(readOrganisationProfile(database, membership())).rejects.toMatchObject({
        code: 'invalid-profile',
      });
    }
    expect(getterExecuted).toBe(false);
  });

  it('fails closed when the document is missing or Firestore is unavailable', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({exists: () => false} as any);
    await expect(readOrganisationProfile(database, membership())).rejects.toMatchObject({code: 'unavailable'});
    vi.mocked(getDoc).mockRejectedValueOnce(new Error('permission-denied'));
    await expect(readOrganisationProfile(database, membership())).rejects.toMatchObject({code: 'unavailable'});
  });
});
