import React, { useState } from 'react';
import { ShieldCheck, LockKeyhole, LogIn, UserPlus, Eye, EyeOff, MailCheck, Clock3, AlertTriangle } from 'lucide-react';
import { useSaferAuth } from '../context/SaferAuthContext.tsx';

interface AuthenticationGateProps {
  children: React.ReactNode;
  onContinueDemo: () => void;
  isDemoGuest: boolean;
}

export const AuthenticationGate: React.FC<AuthenticationGateProps> = ({
  children,
  onContinueDemo,
  isDemoGuest,
}) => {
  const {
    configured, loading, user, profile, error, signIn, register,
    signOut, requestPasswordReset, sendVerificationEmail,
    refreshEmailVerification, clearError,
  } = useSaferAuth();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const runAction = async (action: () => Promise<void>, successMessage?: string) => {
    setBusy(true);
    setFormError(null);
    setMessage(null);
    clearError();
    try {
      await action();
      if (successMessage) setMessage(successMessage);
    } catch (actionError: any) {
      const code = typeof actionError?.code === 'string' ? actionError.code : '';
      const safeMessage = code.includes('email-already-in-use')
        ? 'An account already exists for this email. Try signing in or requesting a password reset.'
        : code.includes('weak-password')
          ? 'Choose a stronger password that meets Firebase Authentication password policy.'
          : code.includes('too-many-requests')
            ? 'Too many attempts. Please wait before trying again.'
            : code.includes('invalid-credential') || code.includes('user-not-found') || code.includes('wrong-password')
              ? 'Unable to sign in with those details. Check the email and password.'
              : code.includes('network-request-failed')
                ? 'Network connection failed. Check your connection and try again.'
                : 'The account request could not be completed. Check the Firebase project configuration and try again.';
      setFormError(safeMessage);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'register') {
      if (!displayName.trim()) return setFormError('Display name is required.');
      if (password.length < 12) return setFormError('Use a password of at least 12 characters.');
      if (password !== confirmPassword) return setFormError('The passwords do not match.');
      void runAction(
        () => register(displayName.trim(), email.trim(), password),
        'Registration submitted. Check your email for verification. Account access remains pending until an administrator approves the role.'
      );
    } else {
      if (!email.trim() || !password) return setFormError('Enter your registered email and password.');
      void runAction(() => signIn(email.trim(), password));
    }
  };

  if (!loading && isDemoGuest && !user) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3"><ShieldCheck className="w-10 h-10 mx-auto text-teal-400" /><p className="font-semibold">Checking SAFER account…</p><p className="text-xs text-slate-400">Loading authentication and private account preferences.</p></div>
      </div>
    );
  }

  if (!configured || !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-6 sm:p-8 text-center border-b border-slate-800">
            <div className="w-14 h-14 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center mx-auto mb-4"><ShieldCheck className="w-8 h-8 text-blue-300" /></div>
            <h1 className="text-xl font-bold tracking-wide">SAFER</h1>
            <p className="text-xs text-slate-400 mt-1">Security Administration, Field Readiness, Evidence &amp; Reporting</p>
            <p className="text-xs text-teal-300 mt-3">Prepared. Accountable. Secure.</p>
          </div>
          <div className="p-6 space-y-4">
            {!configured ? (
              <div className="rounded-lg border border-amber-700/60 bg-amber-950/40 p-4 text-sm text-amber-100">
                <p className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Account services are not configured</p>
                <p className="mt-2 text-xs leading-relaxed text-amber-200">This deployment has no Firebase web configuration. You can use the independent demonstration mode, or configure the Firebase Spark project using FIREBASE_SETUP.md. No billing is required or enabled by SAFER.</p>
              </div>
            ) : (
              <>
                <div className="flex rounded-md bg-slate-800 p-1">
                  <button type="button" onClick={() => { setMode('signin'); setFormError(null); setMessage(null); }} className={`flex-1 py-2 rounded text-sm font-semibold ${mode === 'signin' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}><LogIn className="inline w-4 h-4 mr-1" />Sign In</button>
                  <button type="button" onClick={() => { setMode('register'); setFormError(null); setMessage(null); }} className={`flex-1 py-2 rounded text-sm font-semibold ${mode === 'register' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}><UserPlus className="inline w-4 h-4 mr-1" />Register</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                  {mode === 'register' && (
                    <label className="block text-xs font-semibold text-slate-300">Display name
                      <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={100} autoComplete="name" required className="mt-1 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-400" />
                    </label>
                  )}
                  <label className="block text-xs font-semibold text-slate-300">Email address
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required className="mt-1 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-400" />
                  </label>
                  <label className="block text-xs font-semibold text-slate-300">Password
                    <span className="mt-1 flex rounded-md border border-slate-600 bg-slate-800 focus-within:ring-2 focus-within:ring-blue-400">
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none" />
                      <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="px-3 text-slate-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </span>
                  </label>
                  {mode === 'register' && (
                    <>
                      <label className="block text-xs font-semibold text-slate-300">Confirm password
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required className="mt-1 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-400" />
                      </label>
                      <p className="text-[11px] text-slate-400">New accounts receive a pending role. Registration does not grant access or administrative privileges.</p>
                    </>
                  )}
                  {formError && <p role="alert" className="rounded-md bg-red-950/50 border border-red-800 p-3 text-xs text-red-200">{formError}</p>}
                  {message && <p role="status" className="rounded-md bg-emerald-950/50 border border-emerald-800 p-3 text-xs text-emerald-200">{message}</p>}
                  {error && <p role="alert" className="rounded-md bg-red-950/50 border border-red-800 p-3 text-xs text-red-200">Account service: Unable to load account data. Check Firebase setup and Firestore rules.</p>}
                  <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 hover:bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Please wait…' : mode === 'register' ? 'Create Account' : 'Sign In'}</button>
                </form>
                {mode === 'signin' && (
                  <button type="button" disabled={busy || !email.trim()} onClick={() => void runAction(() => requestPasswordReset(email.trim()), 'Password-reset instructions have been requested. Check your registered email.')} className="w-full text-xs text-blue-300 hover:text-blue-200 underline underline-offset-4 disabled:opacity-40">Forgot password?</button>
                )}
              </>
            )}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button type="button" onClick={onContinueDemo} className="w-full rounded-md border border-slate-600 bg-slate-800 hover:bg-slate-700 px-4 py-3 text-sm font-semibold">Continue as Demo Guest</button>
              <p className="text-[10px] text-center text-slate-500">Demo mode uses synthetic browser-local sample data. Do not enter real personal, health, confidential, or operational records.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-xl border border-slate-700 bg-slate-900 p-6 sm:p-8 space-y-4">
          <MailCheck className="w-10 h-10 text-amber-300" />
          <h1 className="text-xl font-bold">Verify your email</h1>
          <p className="text-sm text-slate-300">A verification link is required before accessing your SAFER account. Check {user.email || 'your registered email'}.</p>
          {message && <p role="status" className="text-xs text-emerald-300">{message}</p>}
          {formError && <p role="alert" className="text-xs text-red-300">{formError}</p>}
          <button type="button" disabled={busy} onClick={() => void runAction(sendVerificationEmail, 'Verification email requested.')} className="w-full rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold">Resend verification email</button>
          <button type="button" disabled={busy} onClick={() => void runAction(refreshEmailVerification, 'Verification status refreshed.')} className="w-full rounded-md border border-slate-600 px-4 py-2.5 text-sm">I have verified my email — refresh</button>
          <button type="button" disabled={busy} onClick={() => void signOut().then(onContinueDemo)} className="w-full text-xs text-slate-400 underline">Sign out and continue as Demo Guest</button>
        </div>
      </div>
    );
  }

  if (!profile || profile.status !== 'active' || profile.role === 'pending') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-xl border border-slate-700 bg-slate-900 p-6 sm:p-8 space-y-4">
          <Clock3 className="w-10 h-10 text-amber-300" />
          <h1 className="text-xl font-bold">{profile?.status === 'suspended' ? 'Account suspended' : 'Account awaiting approval'}</h1>
          <p className="text-sm text-slate-300">{profile?.status === 'suspended' ? 'This account is not currently authorized to access the application.' : 'Your email is verified. A SAFER administrator must approve the account and assign an appropriate role before access is granted.'}</p>
          <p className="text-xs text-slate-400">Current role: {profile?.role || 'Pending'}</p>
          <button type="button" onClick={() => void signOut()} className="w-full rounded-md border border-slate-600 px-4 py-2.5 text-sm">Sign Out</button>
          <button type="button" onClick={() => void signOut().then(onContinueDemo)} className="w-full text-xs text-slate-400 underline">Sign out and continue as Demo Guest</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-amber-50 border-b border-amber-300 text-amber-950 px-4 py-2 text-xs">
        <strong>Demonstration data only:</strong> Personnel, incident, cybersecurity and checklist records below remain browser-local sample/demo data. Authentication and account roles currently protect account profiles and personal preferences only—not operational records. Do not enter real PII, health, confidential, or operational data.
      </div>
      {children}
    </div>
  );
};
