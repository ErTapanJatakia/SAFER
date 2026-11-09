import React, {useEffect, useState} from 'react';
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
import {auth, isFirebaseConfigured} from '../lib/firebase.ts';

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
  const [demoGuest, setDemoGuest] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      if (nextUser && !nextUser.emailVerified) {
        setVerificationEmail(nextUser.email || '');
        setMode('verify');
        void signOut(auth);
        setUser(null);
      } else {
        setUser(nextUser);
      }
      setLoading(false);
    }, () => {
      setUser(null);
      setLoading(false);
      setError('Unable to verify the current account session. Please try again.');
    });
  }, []);

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
      const code = typeof err === 'object' && err && 'code' in err
        ? String((err as {code?: unknown}).code || '')
        : '';
      if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        setError('Unable to sign in with those details. Check your email and password.');
      } else if (code.includes('too-many-requests')) {
        setError('Too many attempts. Please wait before trying again.');
      } else if (code.includes('network-request-failed')) {
        setError('Network connection failed. Check your connection and retry.');
      } else if (code.includes('email-already-in-use')) {
        setError('This account could not be created. Try signing in or use password reset.');
      } else if (code.includes('popup-closed-by-user')) {
        setError('Google sign-in was closed before completion.');
      } else {
        setError('The account request could not be completed. Check the Firebase configuration and try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!auth) return;
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
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        setVerificationEmail(credential.user.email || email.trim());
        try {
          await sendEmailVerification(credential.user);
        } finally {
          await signOut(auth);
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
        await sendPasswordResetEmail(auth, email.trim());
        setMessage('If an account exists for that address, password-reset instructions have been sent.');
      });
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    void run(async () => {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!credential.user.emailVerified) {
        try {
          await sendEmailVerification(credential.user);
        } finally {
          setVerificationEmail(credential.user.email || email.trim());
          await signOut(auth);
          setMode('verify');
          setMessage('Email verification is required. A verification message has been requested.');
        }
      }
    });
  };

  const handleGoogle = () => {
    if (!auth) return;
    void run(async () => {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      if (!credential.user.emailVerified) {
        await signOut(auth);
        throw new Error('Google account email is not verified.');
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

  const leaveAccount = () => {
    if (!auth) return;
    void signOut(auth).finally(() => {
      setUser(null);
      setDemoGuest(false);
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100" role="status">Checking SAFER account session…</div>;
  }

  if (user || demoGuest) {
    return (
      <>
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-slate-950 px-4 py-2 text-xs text-slate-100">
          <span>{demoGuest ? 'Demo Guest session' : `Signed in: ${user?.email || 'verified account'}`}</span>
          <button type="button" onClick={leaveAccount} className="rounded border border-slate-600 px-3 py-1.5 hover:bg-slate-800">Sign out</button>
        </div>
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-950">
          <strong>Data boundary:</strong> Authentication currently gates application access only. Personnel, incident, checklist and other operational records remain browser-local and are not yet tenant-isolated or protected by Firestore rules. Use synthetic demonstration data only until the data migration and access-control phases are complete.
        </div>
        {children}
      </>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 flex items-center justify-center">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <header className="border-b border-slate-800 bg-slate-950 p-7 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-blue-700 bg-blue-950 text-xl font-black text-blue-200">S</div>
          <h1 className="text-2xl font-bold tracking-wider">SAFER</h1>
          <p className="mt-1 text-xs text-slate-400">Security Administration, Field Readiness, Evidence &amp; Reporting</p>
          <p className="mt-3 text-xs text-emerald-300">Check access. Protect information.</p>
        </header>
        <div className="space-y-5 p-6">
          {!isFirebaseConfigured && (
            <div className="rounded-lg border border-amber-700 bg-amber-950/40 p-3 text-xs text-amber-100">
              Firebase is not configured for this deployment. Configure the VITE_FIREBASE_* variables to enable account sign-in. Demo Guest remains available.
            </div>
          )}
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-800 p-1">
            {(['signin', 'register', 'reset'] as const).map((nextMode) => (
              <button key={nextMode} type="button" onClick={() => {setMode(nextMode); clearFeedback();}} className={`rounded-md px-2 py-2 text-xs font-semibold ${mode === nextMode ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {nextMode === 'signin' ? 'Sign in' : nextMode === 'register' ? 'Create account' : 'Reset password'}
              </button>
            ))}
          </div>
          {mode === 'verify' ? (
            <div className="space-y-3" role="status">
              <h2 className="font-semibold">Verify your email</h2>
              <p className="text-sm text-slate-300">A verification link was requested for {verificationEmail || email}. Follow the link, then return here and sign in again.</p>
              <button type="button" onClick={handleRefreshVerification} className="w-full rounded-lg border border-slate-600 px-4 py-2.5 text-sm hover:bg-slate-800">I have verified — return to sign in</button>
              <button type="button" onClick={handleResendVerification} className="w-full text-xs text-blue-300 underline">Return to sign in to request another verification email</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">Email address
                <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400" />
              </label>
              {mode !== 'reset' && (
                <label className="block text-xs font-semibold text-slate-300">Password
                  <input type="password" required autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400" />
                </label>
              )}
              {mode === 'register' && (
                <label className="block text-xs font-semibold text-slate-300">Confirm password
                  <input type="password" required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400" />
                </label>
              )}
              <button type="submit" disabled={busy || !isFirebaseConfigured} className="w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : mode === 'reset' ? 'Send reset instructions' : 'Sign in'}</button>
            </form>
          )}
          {mode === 'signin' && isFirebaseConfigured && (
            <button type="button" disabled={busy} onClick={handleGoogle} className="w-full rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">Continue with Google</button>
          )}
          {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-xs text-red-200">{error}</p>}
          {message && <p role="status" className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-3 text-xs text-emerald-200">{message}</p>}
          <div className="border-t border-slate-800 pt-4">
            <button type="button" onClick={() => {setDemoGuest(true); clearFeedback();}} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold hover:bg-slate-700">Continue as Demo Guest</button>
            <p className="mt-2 text-center text-[10px] text-slate-500">Demo mode uses synthetic browser-local data. Do not enter real personal or operational information.</p>
          </div>
        </div>
      </section>
    </main>
  );
};
