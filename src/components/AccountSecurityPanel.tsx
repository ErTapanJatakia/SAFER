import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  reload,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User,
} from 'firebase/auth';
import {publishSessionInvalidation} from '../lib/sessionInvalidation.ts';

interface AccountSecurityPanelProps {
  user: User;
  onUserUpdated?: (user: User) => void;
}

const passwordMeetsPolicy = (value: string) =>
  value.length >= 12 &&
  value.length <= 128 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /[0-9]/.test(value) &&
  /[^A-Za-z0-9]/.test(value);

const errorMessage = (error: unknown): string => {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as {code?: unknown}).code || '')
    : '';
  if (code.includes('wrong-password') || code.includes('invalid-credential')) {
    return 'The supplied verification details were not accepted. Check them and retry.';
  }
  if (code.includes('requires-recent-login')) {
    return 'Recent authentication is required. Sign in again and retry this change.';
  }
  if (code.includes('email-already-in-use')) return 'That email address is already associated with an account.';
  if (code.includes('invalid-email')) return 'Enter a valid email address.';
  if (code.includes('weak-password')) return 'The new password does not meet Firebase password requirements.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Wait before trying again.';
  if (code.includes('network-request-failed')) return 'The network request failed. Check your connection and retry.';
  return 'The account change could not be completed. No success has been assumed.';
};

export const AccountSecurityPanel: React.FC<AccountSecurityPanelProps> = ({user, onUserUpdated}) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const providerIds = useMemo(
    () => new Set((user.providerData || []).map((provider) => provider.providerId)),
    [user.uid, user.providerData],
  );
  const hasPasswordProvider = providerIds.has('password');
  const hasGoogleProvider = providerIds.has('google.com');
  const canReauthenticate = hasPasswordProvider || hasGoogleProvider;
  const activeUidRef = useRef(user.uid);

  useEffect(() => {
    activeUidRef.current = user.uid;
    return () => {
      // Async operations started for this identity must not continue into a
      // later account session after this panel is replaced or unmounted.
      if (activeUidRef.current === user.uid) activeUidRef.current = '';
    };
  }, [user.uid]);

  useEffect(() => {
    setDisplayName(user.displayName || '');
  }, [user.uid, user.displayName]);

  useEffect(() => {
    // Never carry credential material or pending feedback across account identities.
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setNewEmail('');
    setEmailCurrentPassword('');
    setError('');
    setMessage('');
    setBusy(false);
  }, [user.uid]);

  const run = async (action: (isCurrent: () => boolean) => Promise<void>) => {
    const requestUid = user.uid;
    const isCurrent = () => activeUidRef.current === requestUid;
    if (!isCurrent()) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action(isCurrent);
    } catch (failure) {
      if (isCurrent()) setError(errorMessage(failure));
    } finally {
      if (isCurrent()) setBusy(false);
    }
  };

  const reauthenticate = async (password: string) => {
    if (hasPasswordProvider) {
      if (!user.email || !password) throw new Error('Current password is required.');
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      return;
    }
    if (hasGoogleProvider) {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
      return;
    }
    throw new Error('This sign-in provider is not supported for sensitive account changes.');
  };

  const saveDisplayName = () => {
    const normalized = displayName.trim();
    if (normalized.length < 2 || normalized.length > 70 || /[<>]/.test(normalized)) {
      setError('Display name must be 2–70 characters and cannot contain angle brackets.');
      setMessage('');
      return;
    }
    void run(async () => {
      await updateProfile(user, {displayName: normalized});
      await reload(user);
      onUserUpdated?.(user);
      setDisplayName(user.displayName || normalized);
      setMessage('Display name updated.');
    });
  };

  const refreshAccountDetails = () => {
    void run(async () => {
      await reload(user);
      onUserUpdated?.(user);
      setDisplayName(user.displayName || '');
      setMessage('Account details refreshed from Firebase.');
    });
  };

  const changePassword = () => {
    if (!hasPasswordProvider) {
      setError('Password changes are available only for accounts with an email/password sign-in method.');
      return;
    }
    if (!passwordMeetsPolicy(newPassword)) {
      setError('Use 12–128 characters with uppercase, lowercase, a number and a special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('The new password must differ from the current password.');
      return;
    }
    void run(async () => {
      await reauthenticate(currentPassword);
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated. Other sessions may require sign-in again.');
      publishSessionInvalidation();
    });
  };

  const changeEmail = () => {
    const normalized = newEmail.trim();
    if (!canReauthenticate) {
      setError('This sign-in provider does not currently support a verified email change in SAFER.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Enter a valid new email address.');
      return;
    }
    if (normalized.toLowerCase() === (user.email || '').toLowerCase()) {
      setError('The new email address must differ from the current address.');
      return;
    }
    void run(async () => {
      await reauthenticate(emailCurrentPassword);
      await verifyBeforeUpdateEmail(user, normalized);
      setEmailCurrentPassword('');
      setNewEmail('');
      setMessage('A verification link has been sent to the new address. The account email changes only after verification.');
    });
  };

  return (
    <section aria-labelledby="account-security-heading" className="border-b border-slate-700 bg-slate-900 px-4 py-4 text-sm text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div>
          <h2 id="account-security-heading" className="font-semibold">Account profile &amp; security</h2>
          <p className="mt-1 text-xs text-slate-300">Manage your Firebase account identity. Sensitive changes require fresh provider-aware authentication.</p>
        </div>
        <form onSubmit={(event) => {event.preventDefault(); saveDisplayName();}} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-xs font-medium text-slate-300">Display name
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={70} autoComplete="name" className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-400" />
          </label>
          <button type="submit" disabled={busy} className="rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold hover:bg-slate-800 disabled:opacity-50">Save profile</button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-400">Signed-in email: {user.email || 'Not available'}</p>
          <button type="button" onClick={refreshAccountDetails} disabled={busy} className="rounded border border-slate-600 px-3 py-1.5 text-xs hover:bg-slate-800 disabled:opacity-50">Refresh account details</button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={(event) => {event.preventDefault(); changePassword();}} className="space-y-2 rounded-lg border border-slate-700 p-3">
            <h3 className="text-xs font-semibold">Change password</h3>
            {hasPasswordProvider ? (
              <>
                <label className="block text-xs text-slate-300">Current password
                  <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <label className="block text-xs text-slate-300">New password
                  <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required minLength={12} maxLength={128} className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <label className="block text-xs text-slate-300">Confirm new password
                  <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
                </label>
                <p className="text-[11px] text-slate-400">12–128 characters, including uppercase, lowercase, a number and a special character.</p>
                <button type="submit" disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold hover:bg-blue-600 disabled:opacity-50">Update password</button>
              </>
            ) : (
              <p className="text-xs text-slate-400">This account has no email/password provider. Password changes are not available for this sign-in method.</p>
            )}
          </form>

          <form onSubmit={(event) => {event.preventDefault(); changeEmail();}} className="space-y-2 rounded-lg border border-slate-700 p-3">
            <h3 className="text-xs font-semibold">Change email address</h3>
            <p className="text-[11px] text-slate-400">Current address: {user.email || 'Not available'}</p>
            {hasPasswordProvider && (
              <label className="block text-xs text-slate-300">Current password
                <input type="password" value={emailCurrentPassword} onChange={(event) => setEmailCurrentPassword(event.target.value)} autoComplete="current-password" required className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
              </label>
            )}
            <label className="block text-xs text-slate-300">New email address
              <input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} autoComplete="email" required className="mt-1 w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
            </label>
            {!canReauthenticate && <p className="text-xs text-amber-300">This provider is not supported for email changes yet.</p>}
            {hasGoogleProvider && !hasPasswordProvider && <p className="text-xs text-slate-400">Google sign-in will open for re-authentication before the change is requested.</p>}
            <button type="submit" disabled={busy || !canReauthenticate} className="rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold hover:bg-slate-800 disabled:opacity-50">Request email change</button>
          </form>
        </div>
        {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
        {message && <p role="status" aria-live="polite" className="text-xs text-emerald-300">{message}</p>}
      </div>
    </section>
  );
};
