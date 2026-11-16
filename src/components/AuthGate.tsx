import React, {useEffect, useRef, useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {auth, db, isFirebaseConfigured} from '../lib/firebase.ts';
import {resolveTenantMembership, type TenantMembership} from '../lib/tenantMembership.ts';
import {createSessionLifecycle} from '../lib/sessionLifecycle.ts';
import {getAuthErrorMessage} from '../lib/authErrors.ts';
import {beginAuthFlow, cleanupStaleAuthFlowMarker, endAuthFlow} from '../lib/sessionHygiene.ts';
import {publishSessionInvalidation, subscribeToSessionInvalidation} from '../lib/sessionInvalidation.ts';
import {enterDemoGuest} from '../lib/dataBoundary.ts';
import {DemoGuestWorkspaceProvider} from './DemoGuestWorkspaceProvider.tsx';
import {AccountSecurityPanel} from './AccountSecurityPanel.tsx';
import {OwnerControlCentre} from './OwnerControlCentre.tsx';
import {TenantOperationsWorkspace} from './TenantOperationsWorkspace.tsx';
import {SuperAdminInvitationAcceptance} from './SuperAdminInvitationAcceptance.tsx';
import {LOCALE_OPTIONS, applyLocaleDocumentSettings, getLocale, setLocale, translate, type SupportedLocale} from '../i18n/locale.ts';
import {getAccountPreferences} from '../utils/accountSettings.ts';
import {startSessionInactivityMonitor} from '../lib/sessionInactivity.ts';

type AuthMode = 'signin' | 'register' | 'reset' | 'verify';

interface AuthGateProps {
  children: React.ReactNode;
}

const passwordMeetsPolicy = (value: string) =>
  value.length >= 12 &&
  value.length <= 128 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /[0-9]/.test(value) &&
  /[^A-Za-z0-9]/.test(value);

export const AuthGate: React.FC<AuthGateProps> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authObserverFailed, setAuthObserverFailed] = useState(false);
  const [authObserverRetry, setAuthObserverRetry] = useState(0);
  const [demoGuest, setDemoGuest] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [locale, setLocaleState] = useState<SupportedLocale>(getLocale);
  const [preferencesRevision, setPreferencesRevision] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [organisationId, setOrganisationId] = useState('');
  const [membership, setMembership] = useState<TenantMembership | null>(null);
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [membershipError, setMembershipError] = useState('');
  const [ownerStatus, setOwnerStatus] = useState<'checking' | 'owner' | 'not-owner' | 'unavailable'>('checking');
  const sessionLifecycleRef = useRef(createSessionLifecycle());
  const lastAuthUidRef = useRef<string | null | undefined>(undefined);

  useEffect(() => { applyLocaleDocumentSettings(); }, []);

  const handleLocaleChange = (nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale);
    setLocale(nextLocale);
  };

  useEffect(() => {
    const refreshPreferences = () => setPreferencesRevision((revision) => revision + 1);
    window.addEventListener('safer:preferences-changed', refreshPreferences);
    return () => window.removeEventListener('safer:preferences-changed', refreshPreferences);
  }, []);

  useEffect(() => {
    if (!user && !demoGuest) return;
    const timeoutMinutes = getAccountPreferences().inactivityTimeoutMinutes;
    const expireSession = () => {
      publishSessionInvalidation();
      sessionLifecycleRef.current.beginSignOut();
      setMembership(null);
      setOrganisationId('');
      setMembershipBusy(false);
      setMembershipError('');
      setDemoGuest(false);
      setError('');
      setMessage(`Session ended after ${timeoutMinutes} minutes of inactivity. Sign in again to continue.`);
      if (user && auth) {
        void signOut(auth).catch(() => {
          if (auth.currentUser?.uid === user.uid) {
            sessionLifecycleRef.current.startAuthenticated(user.uid);
          }
          setError('Automatic sign-out could not be completed. Your Firebase account remains active; please sign out manually.');
          setPreferencesRevision((revision) => revision + 1);
        });
      } else {
        sessionLifecycleRef.current.endSession();
      }
    };
    return startSessionInactivityMonitor(window, timeoutMinutes * 60 * 1000, expireSession);
  }, [user, demoGuest, preferencesRevision]);

  useEffect(() => {
    // Remove only SAFER's short-lived OAuth diagnostic marker; preserve Firebase
    // persistence, cookies, preferences and all unrelated browser storage.
    cleanupStaleAuthFlowMarker();
  }, []);

  useEffect(() => subscribeToSessionInvalidation(() => {
    // A different tab crossed an account/session boundary. Revoke the local
    // Demo Guest capability immediately; never carry its workspace forward.
    // Invalidate pending membership work but retain the still-valid Firebase
    // identity so this tab can perform a fresh membership check.
    sessionLifecycleRef.current.invalidate();
    setMembershipBusy(false);
    setMembership(null);
    setOrganisationId('');
    setMembershipError('');
    setDemoGuest(false);
  }), []);

  useEffect(() => {
    const firebaseAuth = auth;
    if (!firebaseAuth) {
      setLoading(false);
      return;
    }
    setAuthObserverFailed(false);
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      const nextUid = nextUser?.uid ?? null;
      const previousUid = lastAuthUidRef.current;
      if ((previousUid === undefined && nextUid !== null)
        || (previousUid !== undefined && previousUid !== nextUid)) {
        // Any real auth identity transition ends an explicit Demo Guest choice.
        // Do not allow a later sign-out callback to resurrect that old workspace.
        setDemoGuest(false);
        // An authenticated tab must invalidate any peer Demo Guest workspace,
        // including when this tab restores an already-signed-in account at startup.
        publishSessionInvalidation();
      }
      setAuthObserverFailed(false);
      lastAuthUidRef.current = nextUid;
      // Invalidate pending lookups so an old identity cannot restore stale authority.
      if (nextUser) sessionLifecycleRef.current.startAuthenticated(nextUser.uid);
      else sessionLifecycleRef.current.endSession();
      setMembershipBusy(false);
      // Membership is session-only and must never survive an auth identity change.
      setMembership(null);
      setOrganisationId('');
      setMembershipError('');
      setOwnerStatus('checking');
      if (nextUser && !nextUser.emailVerified) {
        setVerificationEmail(nextUser.email || '');
        setMode('verify');
        void signOut(firebaseAuth);
        setUser(null);
      } else {
        setUser(nextUser);
      }
      setLoading(false);
    }, () => {
      // An observer failure makes the account state uncertain. Revoke every
      // local workspace capability and invalidate work in this and peer tabs.
      sessionLifecycleRef.current.endSession();
      lastAuthUidRef.current = null;
      setDemoGuest(false);
      publishSessionInvalidation();
      setMembership(null);
      setOrganisationId('');
      setMembershipBusy(false);
      setMembershipError('');
      setUser(null);
      setLoading(false);
      setAuthObserverFailed(true);
      setError('Unable to verify the current account session. Please retry account verification.');
    });
  }, [authObserverRetry]);

  const retryAuthObserver = () => {
    setError('');
    setLoading(true);
    setAuthObserverRetry((retry) => retry + 1);
  };

  const clearFeedback = () => {
    setError('');
    setMessage('');
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    clearFeedback();
    try {
      await action();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    if (mode === 'register') {
      if (!passwordMeetsPolicy(password)) {
        setError('Use 12–128 characters with uppercase, lowercase, a number and a special character.');
        return;
      }
      if (password !== confirmPassword) {
        setError('The passwords do not match.');
        return;
      }
      void run(async () => {
        const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
        setVerificationEmail(credential.user.email || email.trim());
        try {
          await sendEmailVerification(credential.user);
        } finally {
          await signOut(firebaseAuth);
        }
        setMode('verify');
        setPassword('');
        setConfirmPassword('');
        setMessage('Account created. Verify your email before signing in.');
      });
      return;
    }
    if (mode === 'reset') {
      void run(async () => {
        await sendPasswordResetEmail(firebaseAuth, email.trim());
        setMessage('If an account exists for that address, password-reset instructions have been sent.');
      });
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    void run(async () => {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      if (!credential.user.emailVerified) {
        try {
          await sendEmailVerification(credential.user);
        } finally {
          setVerificationEmail(credential.user.email || email.trim());
          await signOut(firebaseAuth);
          setMode('verify');
          setMessage('Email verification is required. A verification message has been requested.');
        }
      }
    });
  };

  const handleGoogle = () => {
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    void run(async () => {
      // Per-tab diagnostic marker only; never stores credentials or identity.
      // If sessionStorage is unavailable, Google sign-in still proceeds.
      beginAuthFlow();
      try {
        const provider = new GoogleAuthProvider();
        const credential = await signInWithPopup(firebaseAuth, provider);
        if (!credential.user.emailVerified) {
          await signOut(firebaseAuth);
          throw new Error('Google account email is not verified.');
        }
      } finally {
        endAuthFlow();
      }
    });
  };

  const handleRefreshVerification = () => {
    if (!auth) return;
    void run(async () => {
      // The verification link is completed outside this signed-out session.
      // A fresh sign-in rehydrates and verifies the Firebase user state.
      setMode('signin');
      setMessage('Sign in again. SAFER will re-check your verified email status.');
    });
  };

  const handleResendVerification = () => {
    if (!auth || !verificationEmail) return;
    setEmail(verificationEmail);
    setMode('signin');
    setMessage('Sign in with your email and password to request another verification message.');
  };

  const handleResolveMembership = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !db) {
      setMembership(null);
      setMembershipError('Organisation membership verification is unavailable in this deployment.');
      return;
    }
    const requestedUid = user.uid;
    const requestedOrganisationId = organisationId.trim();
    const requestToken = sessionLifecycleRef.current.beginRequest();
    if (!requestToken || requestToken.uid !== requestedUid || requestToken.orgId !== requestedOrganisationId) {
      setMembership(null);
      setMembershipBusy(false);
      setMembershipError('Membership could not be verified. Check the organisation ID or contact its authorised administrator.');
      return;
    }
    setMembershipBusy(true);
    setMembership(null);
    setMembershipError('');
    try {
      const resolved = await resolveTenantMembership(db, {uid: requestedUid}, requestedOrganisationId);
      if (sessionLifecycleRef.current.isCurrent(requestToken)) {
        // Keep the verified result in memory only; never persist roles or tenant authority.
        setMembership(resolved);
      }
    } catch {
      if (sessionLifecycleRef.current.isCurrent(requestToken)) {
        setMembershipError('Membership could not be verified. Check the organisation ID or contact its authorised administrator.');
      }
    } finally {
      if (sessionLifecycleRef.current.isCurrent(requestToken)) setMembershipBusy(false);
    }
  };

  const leaveAccount = () => {
    const firebaseAuth = auth;
    // Signal peer tabs before local teardown, including Demo Guest-only deployments.
    publishSessionInvalidation();
    sessionLifecycleRef.current.beginSignOut();
    setMembershipBusy(false);
    setMembership(null);
    setOrganisationId('');
    setMembershipError('');
    setDemoGuest(false);
    if (!firebaseAuth) return;
    void signOut(firebaseAuth).catch(() => {
      // Firebase may still hold the same authenticated identity when sign-out
      // fails. Restore the in-memory lifecycle to match that verified state;
      // never infer a session from stale React state alone.
      const currentUid = firebaseAuth.currentUser?.uid;
      if (currentUid && user?.uid === currentUid) {
        sessionLifecycleRef.current.startAuthenticated(currentUid);
      }
      setError('Unable to complete sign-out. Your account session remains active; please retry.');
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100" role="status">{translate('checkingSession')}</div>;
  }

  if (user || demoGuest) {
    return (
      <>
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-slate-950 px-4 py-2 text-xs text-slate-100">
          <span>{user ? `Signed in: ${user.email || 'verified account'}` : 'Demo Guest session'}</span>
          <button type="button" onClick={leaveAccount} className="rounded border border-slate-600 px-3 py-1.5 hover:bg-slate-800">{translate('logout')}</button>
        </div>
        {error && <p role="alert" className="border-b border-red-800 bg-red-950/60 px-4 py-2 text-xs text-red-200">{error}</p>}
        {!!user && (
          <>
          <AccountSecurityPanel user={user} onUserUpdated={setUser} />
          <OwnerControlCentre user={user} onOwnerStatusChange={setOwnerStatus} />
          {ownerStatus === 'checking' && <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-slate-400" role="status">Checking platform and tenant access…</p>}
          {ownerStatus === 'not-owner' && <section aria-labelledby="organisation-access-heading" className="border-b border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100">
            <div className="mx-auto flex max-w-7xl flex-col gap-2">
              <div>
                <h2 id="organisation-access-heading" className="font-semibold">{translate('membership')}</h2>
                <p className="text-xs text-slate-300">Enter the organisation ID supplied through your authorised onboarding process. SAFER checks only your exact membership record.</p>
              </div>
              <form onSubmit={handleResolveMembership} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="flex-1 text-xs font-medium text-slate-300">Organisation ID
                  <input
                    value={organisationId}
                    onChange={(event) => {sessionLifecycleRef.current.selectOrganisation(event.target.value); setMembershipBusy(false); setOrganisationId(event.target.value); setMembership(null); setMembershipError('');}}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={128}
                    pattern="[A-Za-z0-9_-]{1,128}"
                    aria-describedby="organisation-id-help"
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-400"
                    placeholder="Enter organisation ID"
                  />
                </label>
                <button type="submit" disabled={membershipBusy || !organisationId.trim() || !db} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
                  {membershipBusy ? 'Checking…' : translate('verifyMembership')}
                </button>
              </form>
              <p id="organisation-id-help" className="text-[11px] text-slate-400">The ID is a locator, not a password or access token. Membership status is held in memory only.</p>
              {membershipError && <p role="alert" className="text-xs text-red-300">{membershipError}</p>}
              {membership && <p role="status" className="text-xs text-emerald-300">Verified active membership · Role: {membership.role} · Organisation: {membership.orgId}</p>}
            </div>
          </section>}
          {ownerStatus==='not-owner'&&<SuperAdminInvitationAcceptance user={user} />}
          </>
        )}
        {demoGuest && !user ? (
          <>
            <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-950">
              <strong>Demo workspace:</strong> This session uses browser-local demonstration data only. Use synthetic records; do not enter real personal, personnel, incident or operational information.
            </div>
            <DemoGuestWorkspaceProvider accessState={enterDemoGuest(1)}>{children}</DemoGuestWorkspaceProvider>
          </>
        ) : ownerStatus === 'owner' || ownerStatus === 'checking' || ownerStatus === 'unavailable' ? null : membership ? (
          <TenantOperationsWorkspace user={user} membership={membership} onLeave={leaveAccount} />
        ) : (
          <main className="min-h-[60vh] bg-slate-950 px-4 py-10 text-slate-100">
            <section className="mx-auto max-w-3xl rounded-xl border border-amber-700 bg-slate-900 p-6">
              <h1 className="text-lg font-semibold">Account verified — workspace access pending</h1>
              <p className="mt-2 text-sm text-slate-300">Your authenticated session is active. Enter your PMC organisation ID above and verify your exact active membership to open its tenant-scoped operations workspace.</p>
              <p className="mt-3 text-xs text-amber-200">No operational data is loaded until membership is verified. Server APIs enforce permissions independently; production Firestore client rules remain deny-all.</p>
            </section>
          </main>
        )}
      </>
    );
  }

  return (
    <main
      className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 flex items-center justify-center"
      onContextMenu={(event) => {
        // Suppress only the mouse right-click menu on the signed-out auth screen.
        // Authenticated and Demo Guest workspaces retain their normal browser menu.
        if (event.button === 2) event.preventDefault();
      }}
    >
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <header className="border-b border-slate-800 bg-slate-950 p-7 text-center">
          <div aria-hidden="true" className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-700 bg-blue-950 text-xl font-black text-blue-200">S</div>
          <h1 className="text-2xl font-bold tracking-wider">SAFER</h1>
          <p className="mt-1 text-xs text-slate-400">Security Administration, Field Readiness, Evidence &amp; Reporting</p>
          <p className="mt-3 text-xs text-emerald-300">Verify. Defend. Stay Secure.</p>
        </header>
        <div className="space-y-5 p-6">
          {!isFirebaseConfigured && (
            <div className="rounded-lg border border-amber-700 bg-amber-950/40 p-3 text-xs text-amber-100">
              Firebase is not configured for this deployment. Configure the VITE_FIREBASE_* variables to enable account sign-in. Demo Guest remains available.
            </div>
          )}
          <label className="block text-xs font-semibold text-slate-300">
            {translate('language')}
            <select value={locale} onChange={(event) => handleLocaleChange(event.target.value as SupportedLocale)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white">
              {LOCALE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.nativeName} — {option.label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-800 p-1">
            {(['signin', 'register', 'reset'] as const).map((nextMode) => (
              <button key={nextMode} type="button" onClick={() => {setMode(nextMode); clearFeedback();}} className={`rounded-md px-2 py-2 text-xs font-semibold ${mode === nextMode ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {nextMode === 'signin' ? translate('login') : nextMode === 'register' ? translate('createAccount') : translate('resetPassword')}
              </button>
            ))}
          </div>
          {mode === 'verify' ? (
            <div className="space-y-3" role="status">
              <h2 className="font-semibold">{translate('verifyEmail')}</h2>
              <p className="text-sm text-slate-300">A verification link was requested for {verificationEmail || email}. Follow the link, then return here and sign in again.</p>
              <button type="button" onClick={handleRefreshVerification} className="w-full rounded-lg border border-slate-600 px-4 py-2.5 text-sm hover:bg-slate-800">I have verified — return to sign in</button>
              <button type="button" onClick={handleResendVerification} className="w-full text-xs text-blue-300 underline">Return to sign in to request another verification email</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">{translate('email')}
                <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400" />
              </label>
              {mode !== 'reset' && (
                <label className="block text-xs font-semibold text-slate-300">{translate('password')}
                  <span className="relative mt-1 block">
                    <input type={passwordVisible ? 'text' : 'password'} required autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 pr-11 text-sm text-white outline-none focus:border-blue-400" />
                    <button type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-pressed={passwordVisible} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400">
                      {passwordVisible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                    </button>
                  </span>
                </label>
              )}
              {mode === 'register' && (
                <label className="block text-xs font-semibold text-slate-300">{translate('confirmPassword')}
                  <span className="relative mt-1 block">
                    <input type={confirmPasswordVisible ? 'text' : 'password'} required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 pr-11 text-sm text-white outline-none focus:border-blue-400" />
                    <button type="button" onClick={() => setConfirmPasswordVisible((visible) => !visible)} aria-label={confirmPasswordVisible ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={confirmPasswordVisible} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400">
                      {confirmPasswordVisible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                    </button>
                  </span>
                </label>
              )}
              <button type="submit" disabled={busy || !isFirebaseConfigured || authObserverFailed} className="w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">{busy ? translate('pleaseWait') : mode === 'register' ? translate('createAccount') : mode === 'reset' ? translate('sendResetInstructions') : translate('login')}</button>
            </form>
          )}
          {mode === 'signin' && isFirebaseConfigured && (
            <button type="button" disabled={busy || authObserverFailed} onClick={handleGoogle} className="w-full rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">{translate('continueGoogle')}</button>
          )}
          {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-xs text-red-200">{error}</p>}
          {authObserverFailed && (
            <button type="button" onClick={retryAuthObserver} className="w-full rounded-lg border border-amber-600 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-950/40">
              Retry account verification
            </button>
          )}
          {message && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-3 text-xs text-emerald-200">{message}</p>}
          <div className="border-t border-slate-800 pt-4">
            <button type="button" onClick={() => {setDemoGuest(true); clearFeedback();}} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold hover:bg-slate-700">{translate('continueDemo')}</button>
            <p className="mt-2 text-center text-[10px] text-slate-500">Demo mode uses synthetic browser-local data. Do not enter real personal or operational information.</p>
          </div>
        </div>
      </section>
    </main>
  );
};
