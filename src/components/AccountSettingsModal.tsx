import React, { useState } from 'react';
import { Download, RotateCcw, Save, UserRound, X } from 'lucide-react';
import { useModalFocus } from '../hooks/useModalFocus.ts';
import {
  ACCOUNT_SETTINGS_STORAGE_KEY,
  createAccountSettingsExport,
  DEFAULT_ACCOUNT_SETTINGS,
  normalizeAccountSettings,
  validateAccountProfile,
  type AccountSettings,
} from '../utils/accountSettings.ts';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}

function readStoredSettings(): AccountSettings {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_SETTINGS_STORAGE_KEY);
    return raw ? normalizeAccountSettings(JSON.parse(raw)) : normalizeAccountSettings(null);
  } catch {
    return normalizeAccountSettings(null);
  }
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose, onSaved }) => {
  const modalRef = useModalFocus<HTMLDivElement>(isOpen, onClose);
  const [settings, setSettings] = useState<AccountSettings>(readStoredSettings);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'data'>('profile');

  if (!isOpen) return null;

  const updateProfile = (field: keyof AccountSettings['profile'], value: string) => {
    setSettings((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
  };

  const save = () => {
    const errors = validateAccountProfile(settings.profile);
    if (errors.length) {
      setError(errors.join(' '));
      return;
    }
    try {
      window.localStorage.setItem(ACCOUNT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      setError(null);
      onSaved('Account preferences saved on this browser.');
    } catch {
      setError('Unable to save preferences in this browser. Your previous saved values remain unchanged.');
    }
  };

  const exportSettings = () => {
    try {
      const payload = createAccountSettingsExport(settings);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'safer-personal-preferences.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      onSaved('Personal preferences export prepared.');
    } catch {
      setError('Unable to create the preferences export.');
    }
  };

  const reset = () => {
    if (!window.confirm('Reset only this browser’s personal account preferences? Operational records, organisation branding, theme and accessibility settings will remain unchanged.')) return;
    try {
      window.localStorage.removeItem(ACCOUNT_SETTINGS_STORAGE_KEY);
      setSettings(normalizeAccountSettings(DEFAULT_ACCOUNT_SETTINGS));
      setError(null);
      onSaved('Personal account preferences reset. Operational records were not changed.');
    } catch {
      setError('Unable to reset preferences in this browser.');
    }
  };

  const inputClass = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900';
  const labelClass = 'block space-y-1 text-xs font-semibold text-slate-700';

  return (
    <div ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="account-settings-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4">
      <section className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] text-slate-900">
        <header className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UserRound className="w-6 h-6 text-cyan-300 shrink-0" />
            <div><h2 id="account-settings-title" className="font-bold text-base">My Account</h2>
              <p className="text-xs text-slate-300">Profile and personal workstation preferences</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close account settings" className="text-slate-300 hover:text-white p-2 rounded-md"><X className="w-5 h-5" /></button>
        </header>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
            <strong>Local-only profile:</strong> These fields and preferences are stored in this browser. They are not an authenticated identity, are not synchronized to a cloud account, and do not change sign-in credentials.
          </div>

          <div role="tablist" aria-label="Account settings sections" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {(['profile', 'preferences', 'data'] as const).map((tab) => (
              <button key={tab} type="button" role="tab" aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-md px-3 py-2 text-xs font-semibold capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                {tab === 'data' ? 'Data & privacy' : tab}
              </button>
            ))}
          </div>

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div><h3 className="font-semibold text-slate-900">Personal profile</h3><p className="text-xs text-slate-600 mt-1">Optional display details for this browser only.</p></div>
              <label className={labelClass}>Display name
                <input className={inputClass} maxLength={80} value={settings.profile.displayName} onChange={(event) => updateProfile('displayName', event.target.value)} placeholder="Your preferred display name" />
              </label>
              <label className={labelClass}>Call sign
                <input className={inputClass} maxLength={32} value={settings.profile.callSign} onChange={(event) => updateProfile('callSign', event.target.value)} placeholder="Optional call sign" />
              </label>
              <label className={labelClass}>Short bio
                <textarea className={inputClass} rows={3} maxLength={280} value={settings.profile.bio} onChange={(event) => updateProfile('bio', event.target.value)} placeholder="A short profile description" />
                <span className="font-normal text-slate-500">{settings.profile.bio.length}/280 characters</span>
              </label>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div><h3 className="font-semibold text-slate-900">Regional preferences</h3><p className="text-xs text-slate-600 mt-1">These preferences now control Privacy Console timestamps and counts plus the personnel export preview count. Other operational screens retain their existing display formats until their own safe integration is completed.</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={labelClass}>Date format
                  <select className={inputClass} value={settings.preferences.dateFormat} onChange={(event) => setSettings((current) => ({ ...current, preferences: { ...current.preferences, dateFormat: event.target.value as AccountSettings['preferences']['dateFormat'] } }))}>
                    <option value="DD-MM-YYYY">DD-MM-YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option><option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  </select>
                </label>
                <label className={labelClass}>Time format
                  <select className={inputClass} value={settings.preferences.timeFormat} onChange={(event) => setSettings((current) => ({ ...current, preferences: { ...current.preferences, timeFormat: event.target.value as AccountSettings['preferences']['timeFormat'] } }))}>
                    <option value="24h">24-hour</option><option value="12h">12-hour</option>
                  </select>
                </label>
                <label className={labelClass}>Timezone
                  <select className={inputClass} value={settings.preferences.timezone} onChange={(event) => setSettings((current) => ({ ...current, preferences: { ...current.preferences, timezone: event.target.value as AccountSettings['preferences']['timezone'] } }))}>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option><option value="UTC">UTC</option>
                  </select>
                </label>
                <label className={labelClass}>Number format
                  <select className={inputClass} value={settings.preferences.numberFormat} onChange={(event) => setSettings((current) => ({ ...current, preferences: { ...current.preferences, numberFormat: event.target.value as AccountSettings['preferences']['numberFormat'] } }))}>
                    <option value="en-IN">India (1,23,456.78)</option><option value="en-US">International (123,456.78)</option>
                  </select>
                </label>
                <label className={labelClass}>Default personnel export format
                  <select className={inputClass} value={settings.preferences.defaultExportFormat} onChange={(event) => setSettings((current) => ({ ...current, preferences: { ...current.preferences, defaultExportFormat: event.target.value as AccountSettings['preferences']['defaultExportFormat'] } }))}>
                    <option value="txt">Plain text (.TXT)</option><option value="csv">CSV (.CSV)</option><option value="xlsx">Excel (.XLSX)</option><option value="pdf">PDF (.PDF)</option><option value="docx">Word (.DOCX)</option>
                  </select>
                </label>
                <label className={labelClass}>Default personnel export redaction
                  <select className={inputClass} value={settings.preferences.defaultRedactionLevel} onChange={(event) => setSettings((current) => ({ ...current, preferences: { ...current.preferences, defaultRedactionLevel: event.target.value as AccountSettings['preferences']['defaultRedactionLevel'] } }))}>
                    <option value="standard">Standard — redact sensitive fields</option><option value="strict">Strict — redact every exportable field</option>
                  </select>
                </label>
                <p className="sm:col-span-2 text-xs text-slate-600">Strict redaction is the most protective option. Standard retains the existing sensitive-field defaults. You can review and change individual field selections before every export.</p>
              </div>
              <p className="text-xs text-slate-500">Theme and accessibility remain managed by their existing dedicated controls, avoiding duplicate settings stores.</p>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              <div><h3 className="font-semibold text-slate-900">Personal settings data</h3><p className="text-xs text-slate-600 mt-1">Export or reset only the local profile and regional preferences.</p></div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">Exports contain only the profile fields and regional preferences shown here. They exclude operational personnel records, incidents, evidence, organisation branding, authentication credentials and access tokens.</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={exportSettings} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"><Download className="w-4 h-4" /> Export preferences (JSON)</button>
                <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-md border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50"><RotateCcw className="w-4 h-4" /> Reset personal preferences</button>
              </div>
            </div>
          )}

          {error && <p role="alert" className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">{error}</p>}
        </div>

        <footer className="border-t border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap justify-between gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
          <button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"><Save className="w-4 h-4" /> Save preferences</button>
        </footer>
      </section>
    </div>
  );
};
