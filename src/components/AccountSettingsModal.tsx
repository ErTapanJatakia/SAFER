import React, { useEffect, useState } from 'react';
import {
  UserRound, Palette, Accessibility, Bell, Languages, ShieldCheck,
  LockKeyhole, FileJson, Send, RotateCcw, X, Save, CheckCircle2,
  AlertCircle, MailCheck, KeyRound, Users,
} from 'lucide-react';
import { THEME_PRESETS } from '../utils/themePresets.ts';
import { getLocalISODate } from '../utils/dateUtils.ts';
import {
  DEFAULT_PERSONAL_SETTINGS,
  type PersonalSettings,
  type SaferProfile,
  type SaferRole,
  type AccountStatus,
  useSaferAuth,
} from '../context/SaferAuthContext.tsx';
import type { AccessibilitySettings } from '../types/theme.ts';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTheme: (themeId: string) => void;
  onApplyAccessibility: (settings: AccessibilitySettings) => void;
  onApplyDensity: (density: 'comfortable' | 'compact') => void;
}

type SettingsSection =
  | 'Profile'
  | 'Appearance'
  | 'Accessibility'
  | 'Notifications'
  | 'Language & Region'
  | 'Security'
  | 'Privacy & Data'
  | 'User Management';

const SECTIONS: { name: SettingsSection; icon: React.ElementType }[] = [
  { name: 'Profile', icon: UserRound },
  { name: 'Appearance', icon: Palette },
  { name: 'Accessibility', icon: Accessibility },
  { name: 'Notifications', icon: Bell },
  { name: 'Language & Region', icon: Languages },
  { name: 'Security', icon: ShieldCheck },
  { name: 'Privacy & Data', icon: LockKeyhole },
  { name: 'User Management', icon: Users },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Organization Admin',
  supervisor: 'Supervisor / Manager',
  personnel: 'Personnel / Employee',
  auditor: 'Read-only Auditor',
  pending: 'Pending Role Assignment',
};

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  onApplyTheme,
  onApplyAccessibility,
  onApplyDensity,
}) => {
  const {
    user, profile, settings, saveProfile, saveSettings,
    requestPasswordReset, sendVerificationEmail, submitPrivacyRequest,
    listUserAccounts, updateUserAccess,
  } = useSaferAuth();

  const [section, setSection] = useState<SettingsSection>('Profile');
  const [draft, setDraft] = useState<PersonalSettings>(settings);
  const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || '');
  const [requestType, setRequestType] = useState<'access' | 'correction' | 'deletion'>('access');
  const [requestDetails, setRequestDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminAccounts, setAdminAccounts] = useState<SaferProfile[]>([]);
  const [adminEdits, setAdminEdits] = useState<Record<string, { role: SaferRole; status: AccountStatus }>>({});
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [savingAccountUid, setSavingAccountUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(settings);
    setDisplayName(profile?.displayName || user?.displayName || '');
    setNotice(null);
    setError(null);
  }, [isOpen, settings, profile?.displayName, user?.displayName]);


  useEffect(() => {
    if (!isOpen || section !== 'User Management' || profile?.role !== 'super_admin') return;
    let active = true;
    setAdminLoading(true);
    setAdminError(null);
    listUserAccounts()
      .then((accounts) => {
        if (!active) return;
        setAdminAccounts(accounts);
        setAdminEdits(Object.fromEntries(accounts.map((account) => [
          account.uid,
          { role: account.role, status: account.status },
        ])));
      })
      .catch((loadError) => {
        if (active) setAdminError(loadError instanceof Error
          ? loadError.message
          : 'Unable to load account records.');
      })
      .finally(() => {
        if (active) setAdminLoading(false);
      });
    return () => { active = false; };
  }, [isOpen, section, profile?.role, listUserAccounts]);

  if (!isOpen) return null;

  const updateAppearance = (patch: Partial<PersonalSettings['appearance']>) => {
    setDraft((current) => ({
      ...current,
      appearance: { ...current.appearance, ...patch },
      accessibility: patch.textSize
        ? { ...current.accessibility, textSize: patch.textSize }
        : current.accessibility,
    }));
  };

  const updateAccessibility = (patch: Partial<AccessibilitySettings>) => {
    setDraft((current) => ({
      ...current,
      accessibility: { ...current.accessibility, ...patch },
      appearance: patch.textSize
        ? { ...current.appearance, textSize: patch.textSize }
        : current.appearance,
    }));
  };

  const updateNotifications = (key: keyof PersonalSettings['notifications'], value: boolean) => {
    setDraft((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: value },
    }));
  };

  const updateRegion = (patch: Partial<PersonalSettings['languageRegion']>) => {
    setDraft((current) => ({
      ...current,
      languageRegion: { ...current.languageRegion, ...patch },
    }));
  };

  const applyPreferences = (next: PersonalSettings) => {
    onApplyTheme(next.appearance.themeId);
    onApplyAccessibility(next.accessibility);
    onApplyDensity(next.appearance.interfaceDensity);
    document.documentElement.setAttribute('data-date-format', next.languageRegion.dateFormat);
    document.documentElement.setAttribute('data-time-zone', next.languageRegion.timeZone);
  };

  const handleSavePreferences = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await saveSettings(draft);
      applyPreferences(draft);
      setNotice('Your personal preferences have been saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save preferences.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPreferences = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await saveSettings(DEFAULT_PERSONAL_SETTINGS);
      setDraft(DEFAULT_PERSONAL_SETTINGS);
      applyPreferences(DEFAULT_PERSONAL_SETTINGS);
      setNotice('Personal preferences restored to their defaults. Account roles and operational records were not changed.');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset preferences.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await saveProfile(displayName);
      setNotice('Profile display name updated.');
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Unable to update profile.');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await requestPasswordReset(user.email);
      setNotice('Password-reset instructions have been requested. Check your registered email.');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to request a password reset.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerificationEmail = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await sendVerificationEmail();
      setNotice('Verification email requested. Follow the link sent by Firebase to your registered address.');
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Unable to send verification email.');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      application: 'SAFER',
      profile: profile ? {
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        status: profile.status,
        organizationId: profile.organizationId,
      } : null,
      personalSettings: draft,
      notice: 'This export contains account profile and preference data only. It does not include browser-local demonstration personnel or incident records.',
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SAFER-Account-Data-${getLocalISODate()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice('Account profile and personal preference export generated.');
  };

  const handlePrivacyRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await submitPrivacyRequest(requestType, requestDetails);
      setRequestDetails('');
      setNotice('Your privacy request has been submitted for manual review. Submission is not confirmation that a request has been completed.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit privacy request.');
    } finally {
      setBusy(false);
    }
  };


  const handleSaveAdminAccount = async (account: SaferProfile) => {
    const edit = adminEdits[account.uid] || { role: account.role, status: account.status };
    setSavingAccountUid(account.uid);
    setAdminError(null);
    setNotice(null);
    try {
      await updateUserAccess(account.uid, edit.role, edit.status);
      setAdminAccounts((current) => current.map((item) => item.uid === account.uid
        ? { ...item, role: edit.role, status: edit.status }
        : item));
      setNotice(`Account access updated for ${account.email || account.uid}.`);
    } catch (updateError) {
      setAdminError(updateError instanceof Error ? updateError.message : 'Unable to update account access.');
    } finally {
      setSavingAccountUid(null);
    }
  };

  const roleLabel = profile ? ROLE_LABELS[profile.role] || 'Unrecognized role' : 'Profile unavailable';

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="safer-account-settings-title">
      <div className="w-full max-w-5xl max-h-[94vh] bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden">
        <header className="bg-slate-950 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h2 id="safer-account-settings-title" className="font-bold text-lg">My Account &amp; Settings</h2>
            <p className="text-xs text-slate-300 mt-1">{user?.email || 'Authenticated account'} · Personal preferences are private to this account</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close account settings" className="p-2 rounded-md hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[210px_minmax(0,1fr)] min-h-0 flex-1">
          <nav aria-label="Account settings sections" className="bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-2 md:p-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-1 gap-1 content-start">
            {SECTIONS.filter(({ name }) => name !== 'User Management' || profile?.role === 'super_admin').map(({ name, icon: Icon }) => (
              <button key={name} type="button" onClick={() => { setSection(name); setNotice(null); setError(null); }}
                aria-current={section === name ? 'page' : undefined}
                className={`flex items-center gap-2 text-left rounded-md px-3 py-2.5 text-xs sm:text-sm font-semibold transition ${section === name ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'}`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{name}</span>
              </button>
            ))}
          </nav>

          <main className="min-h-0 overflow-y-auto p-4 sm:p-6">
            {notice && <div role="status" className="mb-4 p-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />{notice}</div>}
            {error && <div role="alert" className="mb-4 p-3 rounded-md border border-red-200 bg-red-50 text-red-900 text-sm flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}

            {section === 'Profile' && (
              <section className="space-y-4">
                <div><h3 className="font-bold text-lg">Profile</h3><p className="text-sm text-slate-600">Manage your personal account display information. Organization roles are read-only here.</p></div>
                <label className="block text-sm font-semibold">Display name
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={100} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal" />
                </label>
                <label className="block text-sm font-semibold">Registered email
                  <input value={user?.email || ''} disabled className="mt-1 w-full border border-slate-200 bg-slate-100 rounded-md px-3 py-2 font-normal text-slate-600" />
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Account role</p><p className="font-semibold mt-1">{roleLabel}</p></div>
                  <div className="rounded-lg border border-slate-200 p-3"><p className="text-xs uppercase tracking-wide text-slate-500">Account status</p><p className="font-semibold mt-1 capitalize">{profile?.status || 'Unavailable'}</p></div>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3">
                  <div><p className="text-sm font-semibold">Email verification</p><p className="text-xs text-slate-600">{user?.emailVerified ? 'Verified' : 'Not yet verified'}</p></div>
                  {user?.emailVerified ? <MailCheck className="w-5 h-5 text-emerald-700" /> : <button type="button" disabled={busy} onClick={handleVerificationEmail} className="text-xs font-semibold border rounded-md px-3 py-2 hover:bg-slate-50 disabled:opacity-50">Resend verification</button>}
                </div>
                <button type="button" disabled={busy} onClick={handleSaveProfile} className="inline-flex items-center gap-2 bg-slate-900 text-white rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"><Save className="w-4 h-4" />Save Profile</button>
              </section>
            )}

            {section === 'Appearance' && (
              <section className="space-y-4">
                <div><h3 className="font-bold text-lg">Appearance</h3><p className="text-sm text-slate-600">Choose from SAFER's existing theme presets. The established theme engine, operational modes, palettes, and camouflage trims remain authoritative.</p></div>
                <label className="block text-sm font-semibold">Theme
                  <select value={draft.appearance.themeId} onChange={(event) => updateAppearance({ themeId: event.target.value })} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal">
                    {THEME_PRESETS.map((theme) => <option key={theme.id} value={theme.id}>{theme.name} · {theme.category.replace('_', ' ')}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold">Interface density
                  <select value={draft.appearance.interfaceDensity} onChange={(event) => updateAppearance({ interfaceDensity: event.target.value as 'comfortable' | 'compact' })} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal">
                    <option value="comfortable">Comfortable</option><option value="compact">Compact</option>
                  </select>
                </label>
                <p className="text-xs text-slate-500">Text size is managed in Accessibility so it stays synchronized with SAFER's existing accessibility controls.</p>
                <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">Personal theme selection does not change organization branding, administrator policy, logo positions, or anyone else's preferences.</div>
              </section>
            )}

            {section === 'Accessibility' && (
              <section className="space-y-4">
                <div><h3 className="font-bold text-lg">Accessibility</h3><p className="text-sm text-slate-600">These preferences layer onto the existing accessibility controls.</p></div>
                <label className="block text-sm font-semibold">Text size
                  <select value={draft.accessibility.textSize} onChange={(event) => updateAccessibility({ textSize: event.target.value as AccessibilitySettings['textSize'] })} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal">
                    {['100','125','150','175','200'].map((value) => <option key={value} value={value}>{value}%</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold">Contrast
                  <select value={draft.accessibility.contrast} onChange={(event) => updateAccessibility({ contrast: event.target.value as AccessibilitySettings['contrast'] })} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal"><option value="normal">Normal</option><option value="high">High contrast</option></select>
                </label>
                <label className="block text-sm font-semibold">Colour mode
                  <select value={draft.accessibility.colorMode} onChange={(event) => updateAccessibility({ colorMode: event.target.value as AccessibilitySettings['colorMode'] })} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal"><option value="auto">Automatic</option><option value="light">Light</option><option value="dark">Dark</option></select>
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {([
                    ['reducedMotion', 'Reduce motion'],
                    ['focusRing', 'Visible focus indicator'],
                    ['largeTargets', 'Larger interactive targets'],
                    ['dyslexicFont', 'Dyslexia-friendly font'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 border border-slate-200 rounded-md p-3 text-sm"><input type="checkbox" checked={draft.accessibility[key]} onChange={(event) => updateAccessibility({ [key]: event.target.checked })} />{label}</label>
                  ))}
                </div>
                <label className="block text-sm font-semibold">Line spacing
                  <select value={draft.accessibility.lineSpacing} onChange={(event) => updateAccessibility({ lineSpacing: event.target.value as AccessibilitySettings['lineSpacing'] })} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal"><option value="normal">Normal</option><option value="relaxed">Relaxed</option><option value="loose">Loose</option></select>
                </label>
                <label className="block text-sm font-semibold">Letter spacing
                  <select value={draft.accessibility.letterSpacing} onChange={(event) => updateAccessibility({ letterSpacing: event.target.value as AccessibilitySettings['letterSpacing'] })} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal"><option value="normal">Normal</option><option value="wide">Wide</option></select>
                </label>
              </section>
            )}

            {section === 'Notifications' && (
              <section className="space-y-4">
                <div><h3 className="font-bold text-lg">Notifications</h3><p className="text-sm text-slate-600">Save your notification preferences. SAFER's current repository does not yet implement notification delivery, email alerts, SMS, or browser push.</p></div>
                {([
                  ['incidentAssignments', 'Incident assignments'],
                  ['taskUpdates', 'Task and checklist updates'],
                  ['qualificationReminders', 'Qualification reminders'],
                  ['accountSecurity', 'Account and security notices'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-3 border border-slate-200 rounded-md p-3 text-sm"><span>{label}</span><input type="checkbox" checked={draft.notifications[key]} onChange={(event) => updateNotifications(key, event.target.checked)} /></label>
                ))}
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-md">Essential security notices may not be disabled by these preferences. The switches currently store preferences only; they do not send notifications.</p>
              </section>
            )}

            {section === 'Language & Region' && (
              <section className="space-y-4">
                <div><h3 className="font-bold text-lg">Language &amp; Region</h3><p className="text-sm text-slate-600">English is currently the only fully implemented interface language.</p></div>
                <div className="rounded-md border border-slate-200 p-3"><p className="text-sm font-semibold">Interface language</p><p className="text-sm text-slate-600 mt-1">English · Current supported language</p></div>
                <label className="block text-sm font-semibold">Date format
                  <select value={draft.languageRegion.dateFormat} onChange={(event) => updateRegion({ dateFormat: event.target.value as PersonalSettings['languageRegion']['dateFormat'] })} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal"><option value="DD-MM-YYYY">DD-MM-YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option></select>
                </label>
                <label className="block text-sm font-semibold">Time zone
                  <select value={draft.languageRegion.timeZone} onChange={(event) => updateRegion({ timeZone: event.target.value })} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal">
                    {['Asia/Kolkata','UTC','Europe/London','Europe/Paris','America/New_York','Asia/Dubai','Asia/Singapore'].map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                  </select>
                </label>
                <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">Time display remains 24-hour format throughout the current operational records. This setting does not rewrite stored timestamps.</div>
              </section>
            )}

            {section === 'Security' && (
              <section className="space-y-4">
                <div><h3 className="font-bold text-lg">Security</h3><p className="text-sm text-slate-600">Account security is handled by Firebase Authentication.</p></div>
                <div className="rounded-lg border border-slate-200 p-4 flex items-center gap-3"><KeyRound className="w-6 h-6 text-slate-600" /><div className="flex-1"><p className="font-semibold text-sm">Password</p><p className="text-xs text-slate-600">Request a password-reset email for your registered address.</p></div><button type="button" disabled={busy || !user?.email} onClick={handlePasswordReset} className="text-xs font-semibold px-3 py-2 rounded-md border hover:bg-slate-50 disabled:opacity-50">Reset password</button></div>
                <div className="rounded-lg border border-slate-200 p-4"><p className="text-sm font-semibold">Multi-factor authentication</p><p className="text-xs text-slate-600 mt-1">MFA is not configured for this Firebase project. No simulated MFA controls are shown.</p></div>
                <div className="rounded-lg border border-slate-200 p-4"><p className="text-sm font-semibold">Session management</p><p className="text-xs text-slate-600 mt-1">This client does not currently provide a complete active-session inventory or remote session-revocation control.</p></div>
              </section>
            )}


            {section === 'User Management' && profile?.role === 'super_admin' && (
              <section className="space-y-4">
                <div>
                  <h3 className="font-bold text-lg">User Management</h3>
                  <p className="text-sm text-slate-600">Approve verified accounts and assign roles. Only an active Super Admin can manage accounts. Users cannot change their own role or status.</p>
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Organization membership and tenant-scoped operational permissions are not yet implemented. This panel manages account activation and role labels only; it does not secure browser-local personnel or incident records.
                </div>
                {adminError && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{adminError}</div>}
                {adminLoading ? (
                  <p className="text-sm text-slate-500">Loading account records…</p>
                ) : adminAccounts.length === 0 ? (
                  <p className="text-sm text-slate-500">No account records were returned.</p>
                ) : (
                  <div className="space-y-3">
                    {adminAccounts.map((account) => {
                      const edit = adminEdits[account.uid] || { role: account.role, status: account.status };
                      const isSelf = account.uid === profile.uid;
                      return (
                        <div key={account.uid} className="rounded-lg border border-slate-200 p-3 sm:p-4 space-y-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm break-words">{account.displayName || 'Name not supplied'}</p>
                            <p className="text-xs text-slate-600 break-all">{account.email}</p>
                            <p className="text-[10px] text-slate-400 font-mono break-all">UID: {account.uid}</p>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <label className="block text-xs font-semibold">Role
                              <select disabled={isSelf || savingAccountUid === account.uid} value={edit.role} onChange={(event) => setAdminEdits((current) => ({
                                ...current,
                                [account.uid]: { ...edit, role: event.target.value as SaferRole },
                              }))} className="mt-1 w-full border border-slate-300 rounded-md px-2 py-2 text-sm font-normal disabled:bg-slate-100">
                                <option value="pending">Pending</option>
                                <option value="personnel">Personnel / Employee</option>
                                <option value="supervisor">Supervisor / Manager</option>
                                <option value="auditor">Read-only Auditor</option>
                                <option value="org_admin">Organization Admin</option>
                                <option value="super_admin">Super Admin</option>
                              </select>
                            </label>
                            <label className="block text-xs font-semibold">Account status
                              <select disabled={isSelf || savingAccountUid === account.uid} value={edit.status} onChange={(event) => setAdminEdits((current) => ({
                                ...current,
                                [account.uid]: { ...edit, status: event.target.value as AccountStatus },
                              }))} className="mt-1 w-full border border-slate-300 rounded-md px-2 py-2 text-sm font-normal disabled:bg-slate-100">
                                <option value="pending">Pending approval</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                              </select>
                            </label>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            {isSelf ? <p className="text-[11px] text-slate-500">Your own role and status cannot be changed here.</p> : <span className="text-[11px] text-slate-500">Save to apply account access changes.</span>}
                            <button type="button" disabled={isSelf || savingAccountUid === account.uid || (edit.role === account.role && edit.status === account.status)} onClick={() => void handleSaveAdminAccount(account)} className="rounded-md bg-slate-900 text-white px-3 py-2 text-xs font-semibold disabled:opacity-40">{savingAccountUid === account.uid ? 'Saving…' : 'Save access'}</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-[11px] text-slate-500">Showing up to 50 accounts. For a first Super Admin account, use the trusted Firebase Console bootstrap procedure in FIREBASE_SETUP.md.</p>
              </section>
            )}

            {section === 'Privacy & Data' && (
              <section className="space-y-4">
                <div><h3 className="font-bold text-lg">Privacy &amp; Data</h3><p className="text-sm text-slate-600">Manage account-level data requests. Requests are recorded for manual review and are not automatically completed.</p><a href="/privacy-notice.html" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-sm font-semibold text-blue-800 underline underline-offset-4">Read SAFER Account Privacy Notice</a></div>
                <button type="button" onClick={handleExport} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"><FileJson className="w-4 h-4" />Export account profile and preferences (JSON)</button>
                <form onSubmit={handlePrivacyRequest} className="space-y-3 border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-sm">Submit a privacy request</h4>
                  <label className="block text-sm font-semibold">Request type
                    <select value={requestType} onChange={(event) => setRequestType(event.target.value as typeof requestType)} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal"><option value="access">Access / copy of account data</option><option value="correction">Correction of account data</option><option value="deletion">Deletion request (manual review)</option></select>
                  </label>
                  <label className="block text-sm font-semibold">Details
                    <textarea required maxLength={2000} rows={4} value={requestDetails} onChange={(event) => setRequestDetails(event.target.value)} className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal" placeholder="Describe the account data or action you are requesting." />
                  </label>
                  <button type="submit" disabled={busy || !requestDetails.trim()} className="inline-flex items-center gap-2 rounded-md bg-slate-900 text-white px-3 py-2 text-sm font-semibold disabled:opacity-50"><Send className="w-4 h-4" />Submit for review</button>
                </form>
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-3 text-xs">This workflow covers Firebase account profile and personal settings only. It does not delete browser-local demonstration records, and it does not itself establish legal compliance. Account deletion is not automated.</div>
              </section>
            )}

            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={handleResetPreferences} disabled={busy} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-md px-3 py-2 hover:bg-slate-50 disabled:opacity-50"><RotateCcw className="w-3.5 h-3.5" />Reset personal preferences</button>
              {section !== 'Profile' && section !== 'Security' && section !== 'Privacy & Data' && section !== 'User Management' && (
                <button type="button" onClick={handleSavePreferences} disabled={busy} className="inline-flex items-center gap-2 bg-slate-900 text-white rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"><Save className="w-4 h-4" />{busy ? 'Saving…' : 'Save Preferences'}</button>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
