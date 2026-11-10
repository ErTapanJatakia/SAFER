import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {AuthGate} from './AuthGate';
import {resolveTenantMembership} from '../lib/tenantMembership';
import {onAuthStateChanged, signOut} from 'firebase/auth';

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../lib/firebase.ts', () => ({auth: {name: 'test-auth'}, db: {name: 'test-db'}, isFirebaseConfigured: true}));
vi.mock('../lib/tenantMembership.ts', () => ({
  resolveTenantMembership: vi.fn(),
  TenantMembershipError: class TenantMembershipError extends Error {},
}));

const authUser = (uid: string, email = uid + '@example.test') => ({uid, email, emailVerified: true});
let authListener: ((user: ReturnType<typeof authUser> | null) => void) | undefined;

function emitAuth(user: ReturnType<typeof authUser> | null) {
  act(() => authListener?.(user));
}

beforeEach(() => {
  authListener = undefined;
  vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
    authListener = callback as typeof authListener;
    return vi.fn();
  });
  vi.mocked(signOut).mockImplementation(async () => {
    authListener?.(null);
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('AuthGate organisation membership UI', () => {
  it('does not attempt membership resolution for Demo Guest', async () => {
    render(<AuthGate><div>Protected app shell</div></AuthGate>);
    await screen.findByText('Continue as Demo Guest');
    fireEvent.click(screen.getByText('Continue as Demo Guest'));
    expect(await screen.findByText('Demo Guest session')).toBeTruthy();
    expect(screen.queryByLabelText('Organisation ID')).toBeNull();
    expect(resolveTenantMembership).not.toHaveBeenCalled();
  });

  it('resolves only the entered organisation for the currently authenticated UID', async () => {
    vi.mocked(resolveTenantMembership).mockResolvedValue({uid:'user-a', orgId:'org-a', role:'manager', status:'active'});
    render(<AuthGate><div>Protected app shell</div></AuthGate>);
    await screen.findByText('Continue as Demo Guest');
    emitAuth(authUser('user-a'));
    const field = await screen.findByLabelText('Organisation ID');
    fireEvent.change(field, {target:{value:'org-a'}});
    fireEvent.click(screen.getByRole('button', {name:'Verify membership'}));
    await screen.findByText(/Verified active membership/);
    expect(resolveTenantMembership).toHaveBeenCalledTimes(1);
    expect(resolveTenantMembership).toHaveBeenCalledWith({name:'test-db'}, {uid:'user-a'}, 'org-a');
    expect(screen.getByText(/Role: manager/)).toBeTruthy();
  });

  it('shows a generic failure and never displays a role when lookup is denied', async () => {
    vi.mocked(resolveTenantMembership).mockRejectedValue(new Error('permission-denied'));
    render(<AuthGate><div>Protected app shell</div></AuthGate>);
    await screen.findByText('Continue as Demo Guest');
    emitAuth(authUser('user-a'));
    fireEvent.change(await screen.findByLabelText('Organisation ID'), {target:{value:'org-a'}});
    fireEvent.click(screen.getByRole('button', {name:'Verify membership'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Membership could not be verified.');
    expect(screen.queryByText(/Role:/)).toBeNull();
  });

  it('discards a pending lookup when the organisation locator changes', async () => {
    let finish!: (value: {uid:string;orgId:string;role:'owner';status:'active'}) => void;
    vi.mocked(resolveTenantMembership).mockReturnValue(new Promise(resolve => {finish = resolve;}));
    render(<AuthGate><div>Protected app shell</div></AuthGate>);
    await screen.findByText('Continue as Demo Guest');
    emitAuth(authUser('user-a'));
    const field = await screen.findByLabelText('Organisation ID');
    fireEvent.change(field, {target:{value:'org-a'}});
    fireEvent.click(screen.getByRole('button', {name:'Verify membership'}));
    fireEvent.change(field, {target:{value:'org-b'}});
    await act(async () => finish({uid:'user-a',orgId:'org-a',role:'owner',status:'active'}));
    expect(screen.queryByText(/Verified active membership/)).toBeNull();
    expect(screen.queryByText(/Role: owner/)).toBeNull();
  });

  it('clears membership state on account switch and sign-out', async () => {
    vi.mocked(resolveTenantMembership).mockResolvedValue({uid:'user-a', orgId:'org-a', role:'admin', status:'active'});
    render(<AuthGate><div>Protected app shell</div></AuthGate>);
    await screen.findByText('Continue as Demo Guest');
    emitAuth(authUser('user-a'));
    fireEvent.change(await screen.findByLabelText('Organisation ID'), {target:{value:'org-a'}});
    fireEvent.click(screen.getByRole('button', {name:'Verify membership'}));
    await screen.findByText(/Verified active membership/);
    emitAuth(authUser('user-b'));
    await waitFor(() => expect(screen.queryByText(/Verified active membership/)).toBeNull());
    expect(screen.getByLabelText('Organisation ID')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Organisation ID'), {target:{value:'org-b'}});
    fireEvent.click(screen.getByRole('button', {name:'Verify membership'}));
    await screen.findByText(/Verified active membership/);
    fireEvent.click(screen.getByRole('button', {name:'Sign out'}));
    await screen.findByText('Continue as Demo Guest');
    expect(screen.queryByText(/Verified active membership/)).toBeNull();
    expect(resolveTenantMembership).toHaveBeenCalledTimes(2);
  });
});
